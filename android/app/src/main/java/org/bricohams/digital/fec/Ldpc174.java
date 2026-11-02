package org.bricohams.digital.fec;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import org.bricohams.digital.CodecException;
import org.bricohams.digital.WorkBudget;

/** Systematic LDPC(174,91) encoder and parity checker driven by the admitted data file. */
public final class Ldpc174 {
    private static final int K = 91;
    private static final int N = 174;
    private static final int M = 83;
    private static final int MAX_JSON_BYTES = 4 * 1024 * 1024;
    // Bound on belief-propagation messages so tanh/atanh stay finite.
    private static final double MESSAGE_LIMIT = 30;

    private final long[] rowHigh = new long[M];
    private final long[] rowLow = new long[M];
    private final int[] checkRows = new int[N * 3];
    private final int[] checkStart = new int[M + 1];
    private final int[] checkEdges = new int[N * 3];
    private int maxCheckDegree;

    private Ldpc174() {}

    /** Reads generator.rows and parity_check.columns; the caller's stream is not closed. */
    public static Ldpc174 load(InputStream json) throws IOException {
        if (json == null) throw new IllegalArgumentException("Input stream required");
        ByteArrayOutputStream buffer = new ByteArrayOutputStream(1 << 16);
        byte[] chunk = new byte[8192];
        int read;
        while ((read = json.read(chunk)) >= 0) {
            if (buffer.size() + read > MAX_JSON_BYTES) throw new IOException("LDPC JSON too large");
            buffer.write(chunk, 0, read);
        }
        String text = new String(buffer.toByteArray(), StandardCharsets.UTF_8);
        Ldpc174 code = new Ldpc174();
        int at = keyEnd(text, "generator", 0);
        at = keyEnd(text, "rows", at);
        at = code.readRows(text, at);
        at = keyEnd(text, "parity_check", 0);
        at = keyEnd(text, "columns", at);
        code.readColumns(text, at);
        code.buildCheckAdjacency();
        return code;
    }

    /** Groups the variable-edge indexes (3 * column + slot) by check row. */
    private void buildCheckAdjacency() {
        int[] degree = new int[M];
        for (int e = 0; e < 3 * N; e++) degree[checkRows[e]]++;
        int at = 0;
        int widest = 0;
        for (int m = 0; m < M; m++) {
            checkStart[m] = at;
            at += degree[m];
            widest = Math.max(widest, degree[m]);
        }
        checkStart[M] = at;
        maxCheckDegree = widest;
        int[] fill = new int[M];
        for (int e = 0; e < 3 * N; e++) {
            int m = checkRows[e];
            checkEdges[checkStart[m] + fill[m]++] = e;
        }
    }

    /**
     * Sum-product belief propagation. Positive LLR means bit 0. Returns the 174-bit codeword as soon as
     * the hard decisions satisfy every parity check; otherwise INVALID_AUDIO after maxIterations updates.
     */
    public byte[] decode(double[] llr174, int maxIterations, WorkBudget budget) throws CodecException {
        if (llr174 == null || llr174.length != N || maxIterations < 1 || budget == null) {
            throw new IllegalArgumentException("174 LLRs, a positive iteration limit and a budget are required");
        }
        for (double v : llr174) {
            if (Double.isNaN(v) || Double.isInfinite(v)) throw new IllegalArgumentException("LLRs must be finite");
        }
        budget.checkpoint();
        double[] c2v = new double[3 * N];
        double[] v2c = new double[3 * N];
        byte[] bits = new byte[N];
        double[] th = new double[maxCheckDegree];
        double[] prefix = new double[maxCheckDegree + 1];
        double[] suffix = new double[maxCheckDegree + 1];
        for (int iteration = 0; ; iteration++) {
            for (int c = 0; c < N; c++) {
                int b = 3 * c;
                double total = llr174[c] + c2v[b] + c2v[b + 1] + c2v[b + 2];
                bits[c] = (byte) (total < 0 ? 1 : 0);
                v2c[b] = clamp(total - c2v[b], MESSAGE_LIMIT);
                v2c[b + 1] = clamp(total - c2v[b + 1], MESSAGE_LIMIT);
                v2c[b + 2] = clamp(total - c2v[b + 2], MESSAGE_LIMIT);
            }
            if (parityHolds(bits)) return bits;
            if (iteration >= maxIterations) break;
            budget.checkpoint();
            for (int m = 0; m < M; m++) {
                int from = checkStart[m];
                int degree = checkStart[m + 1] - from;
                prefix[0] = 1;
                for (int i = 0; i < degree; i++) {
                    // tanh(v/2) = (e^v - 1) / (e^v + 1); one exp instead of Math.tanh.
                    double e = Math.exp(v2c[checkEdges[from + i]]);
                    th[i] = (e - 1) / (e + 1);
                    prefix[i + 1] = prefix[i] * th[i];
                }
                suffix[degree] = 1;
                for (int i = degree - 1; i >= 0; i--) suffix[i] = suffix[i + 1] * th[i];
                for (int i = 0; i < degree; i++) {
                    double x = clamp(prefix[i] * suffix[i + 1], 1 - 1e-12);
                    c2v[checkEdges[from + i]] = clamp(Math.log((1 + x) / (1 - x)), MESSAGE_LIMIT);
                }
            }
        }
        throw new CodecException(CodecException.Reason.INVALID_AUDIO, "LDPC decoding did not converge");
    }

    /** Allocation-free parity test on a trusted 174-entry 0/1 array. */
    private boolean parityHolds(byte[] bits) {
        for (int m = 0; m < M; m++) {
            int parity = 0;
            for (int i = checkStart[m], end = checkStart[m + 1]; i < end; i++) parity ^= bits[checkEdges[i] / 3];
            if (parity != 0) return false;
        }
        return true;
    }

    private static double clamp(double v, double limit) {
        return v > limit ? limit : (v < -limit ? -limit : v);
    }

    /** Index just after the colon of the first quoted key `name` at or after from. */
    private static int keyEnd(String text, String name, int from) throws IOException {
        String quoted = "\"" + name + "\"";
        int at = from;
        while ((at = text.indexOf(quoted, at)) >= 0) {
            int i = skipSpace(text, at + quoted.length());
            if (i < text.length() && text.charAt(i) == ':') return i + 1;
            at += quoted.length();
        }
        throw new IOException("Missing key " + name);
    }

    private static int skipSpace(String text, int i) {
        while (i < text.length() && Character.isWhitespace(text.charAt(i))) i++;
        return i;
    }

    private static int expect(String text, int i, char c) throws IOException {
        i = skipSpace(text, i);
        if (i >= text.length() || text.charAt(i) != c) throw new IOException("Expected '" + c + "' in LDPC JSON");
        return i + 1;
    }

    private int readRows(String text, int i) throws IOException {
        i = expect(text, i, '[');
        for (int r = 0; r < M; r++) {
            if (r > 0) i = expect(text, i, ',');
            i = expect(text, i, '"');
            if (i + K >= text.length()) throw new IOException("Truncated generator row");
            long high = 0;
            long low = 0;
            for (int b = 0; b < K; b++) {
                char c = text.charAt(i + b);
                if (c != '0' && c != '1') throw new IOException("Generator row " + r + " is not 91 binary characters");
                long bit = c - '0';
                if (b < 64) high |= bit << (63 - b);
                else low |= bit << (127 - b);
            }
            if (text.charAt(i + K) != '"') throw new IOException("Generator row " + r + " is not 91 binary characters");
            rowHigh[r] = high;
            rowLow[r] = low;
            i += K + 1;
        }
        return expect(text, i, ']');
    }

    private void readColumns(String text, int i) throws IOException {
        i = expect(text, i, '[');
        for (int c = 0; c < N; c++) {
            if (c > 0) i = expect(text, i, ',');
            i = expect(text, i, '[');
            for (int t = 0; t < 3; t++) {
                if (t > 0) i = expect(text, i, ',');
                i = skipSpace(text, i);
                int start = i;
                int value = 0;
                while (i < text.length() && text.charAt(i) >= '0' && text.charAt(i) <= '9') {
                    value = value * 10 + (text.charAt(i) - '0');
                    if (value > 1000) throw new IOException("Parity row index out of range");
                    i++;
                }
                if (i == start || value < 1 || value > M) throw new IOException("Parity row index out of range");
                checkRows[3 * c + t] = value - 1;
            }
            i = expect(text, i, ']');
        }
        expect(text, i, ']');
    }

    /** Returns message91 followed by 83 parity bits. */
    public byte[] encode(byte[] message91) {
        Crc14.requireBits(message91, K, "message91");
        long high = 0;
        long low = 0;
        for (int b = 0; b < K; b++) {
            if (b < 64) high |= (long) message91[b] << (63 - b);
            else low |= (long) message91[b] << (127 - b);
        }
        byte[] out = new byte[N];
        System.arraycopy(message91, 0, out, 0, K);
        for (int j = 0; j < M; j++) {
            out[K + j] = (byte) ((Long.bitCount(rowHigh[j] & high) + Long.bitCount(rowLow[j] & low)) & 1);
        }
        return out;
    }

    /** True when the parity-check matrix times the codeword is zero. */
    public boolean checksPass(byte[] codeword174) {
        Crc14.requireBits(codeword174, N, "codeword174");
        int[] syndrome = new int[M];
        for (int c = 0; c < N; c++) {
            if (codeword174[c] == 0) continue;
            syndrome[checkRows[3 * c]] ^= 1;
            syndrome[checkRows[3 * c + 1]] ^= 1;
            syndrome[checkRows[3 * c + 2]] ^= 1;
        }
        for (int s : syndrome) if (s != 0) return false;
        return true;
    }
}
