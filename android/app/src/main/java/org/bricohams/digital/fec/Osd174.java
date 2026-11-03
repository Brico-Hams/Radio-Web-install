package org.bricohams.digital.fec;

import java.util.Arrays;
import org.bricohams.digital.CodecException;
import org.bricohams.digital.WorkBudget;

/**
 * Ordered-statistics decoder for the LDPC(174,91) code, used after belief propagation fails.
 *
 * <p>Textbook scheme: the 174 bits are sorted by reliability, the generator matrix (derived from the code's own
 * encoder) is reduced to systematic form on the 91 most reliable independent positions, and the codewords reached by
 * flipping up to {@code order} of those positions are compared by soft distance to the received word. Only the
 * closest codeword is returned, and only if its CRC-14 holds and it lies close enough to the hard decisions:
 * testing the CRC on every trial codeword would multiply the false-alarm rate by the number of trials.
 * Instances are immutable after construction and thread-safe.
 */
public final class Osd174 {
    private static final int K = 91;
    private static final int N = 174;
    private static final int WORDS = 3;

    /** Closest valid codeword found. */
    public static final class Result {
        /** 174 bits: 77 payload, 14 CRC, 83 parity. */
        public final byte[] word;
        /** Sum of |LLR| over the bits where the word disagrees with the hard decisions. */
        public final double distance;
        /** Number of bits where the word disagrees with the hard decisions. */
        public final int hardErrors;

        Result(byte[] word, double distance, int hardErrors) {
            this.word = word;
            this.distance = distance;
            this.hardErrors = hardErrors;
        }
    }

    private final Ldpc174 ldpc;
    // generator[r] holds the codeword of the r-th unit message, bit c at word c >> 6, position c & 63.
    private final long[][] generator = new long[K][WORDS];

    public Osd174(Ldpc174 ldpc) {
        if (ldpc == null) throw new IllegalArgumentException("LDPC tables required");
        this.ldpc = ldpc;
        for (int r = 0; r < K; r++) {
            byte[] unit = new byte[K];
            unit[r] = 1;
            byte[] word = ldpc.encode(unit);
            for (int c = 0; c < N; c++) if (word[c] != 0) generator[r][c >> 6] |= 1L << (c & 63);
        }
    }

    /**
     * @param llr174 positive means bit 0; finite
     * @param order 0, 1 or 2 flips of the most reliable independent bits
     * @param maxHardErrors the closest word is rejected when it disagrees with more hard decisions than this
     * @param fixedAbove independent bits with |LLR| at or above this value are never flipped (a-priori bits);
     *     pass Double.POSITIVE_INFINITY to flip any of them
     * @return the CRC-valid closest word, or null
     */
    public Result decode(double[] llr174, int order, int maxHardErrors, double fixedAbove, WorkBudget budget)
            throws CodecException {
        if (llr174 == null || llr174.length != N || order < 0 || order > 2 || budget == null) {
            throw new IllegalArgumentException("174 LLRs, an order of 0..2 and a budget are required");
        }
        for (double v : llr174) {
            if (Double.isNaN(v) || Double.isInfinite(v)) throw new IllegalArgumentException("LLRs must be finite");
        }
        budget.checkpoint();

        long[] keys = new long[N];
        for (int i = 0; i < N; i++) {
            keys[i] = ((long) Float.floatToIntBits((float) Math.abs(llr174[i])) << 32) | i;
        }
        Arrays.sort(keys);
        int[] perm = new int[N];
        for (int k = 0; k < N; k++) perm[k] = (int) (keys[N - 1 - k] & 0xffffffffL);

        long[][] rows = new long[K][WORDS];
        for (int r = 0; r < K; r++) {
            for (int k = 0; k < N; k++) {
                int src = perm[k];
                if ((generator[r][src >> 6] >>> (src & 63) & 1L) != 0) rows[r][k >> 6] |= 1L << (k & 63);
            }
        }
        int[] pivot = new int[K];
        int rank = 0;
        for (int col = 0; col < N && rank < K; col++) {
            int w = col >> 6;
            long m = 1L << (col & 63);
            int p = -1;
            for (int r = rank; r < K; r++) {
                if ((rows[r][w] & m) != 0) {
                    p = r;
                    break;
                }
            }
            if (p < 0) continue;
            long[] t = rows[p];
            rows[p] = rows[rank];
            rows[rank] = t;
            long[] pr = rows[rank];
            for (int r = 0; r < K; r++) {
                if (r != rank && (rows[r][w] & m) != 0) {
                    rows[r][0] ^= pr[0];
                    rows[r][1] ^= pr[1];
                    rows[r][2] ^= pr[2];
                }
            }
            pivot[rank++] = col;
        }
        if (rank < K) return null;

        double[] abs = new double[N];
        long[] hard = new long[WORDS];
        for (int k = 0; k < N; k++) {
            double v = llr174[perm[k]];
            abs[k] = Math.abs(v);
            if (v < 0) hard[k >> 6] |= 1L << (k & 63);
        }
        long[] base = new long[WORDS];
        for (int r = 0; r < K; r++) {
            if ((hard[pivot[r] >> 6] >>> (pivot[r] & 63) & 1L) != 0) {
                base[0] ^= rows[r][0];
                base[1] ^= rows[r][1];
                base[2] ^= rows[r][2];
            }
        }
        int flippable = 0;
        int[] flips = new int[K];
        for (int r = 0; r < K; r++) if (abs[pivot[r]] < fixedAbove) flips[flippable++] = r;

        long[] best = base.clone();
        double bestDistance = distance(base, hard, abs);
        long[] trial = new long[WORDS];
        if (order >= 1) {
            for (int a = 0; a < flippable; a++) {
                if ((a & 7) == 0) budget.checkpoint();
                long[] ra = rows[flips[a]];
                for (int i = 0; i < WORDS; i++) trial[i] = base[i] ^ ra[i];
                bestDistance = keepBetter(trial, hard, abs, best, bestDistance);
                if (order < 2) continue;
                for (int b = a + 1; b < flippable; b++) {
                    long[] rb = rows[flips[b]];
                    for (int i = 0; i < WORDS; i++) trial[i] = base[i] ^ ra[i] ^ rb[i];
                    bestDistance = keepBetter(trial, hard, abs, best, bestDistance);
                }
            }
        }

        int errors = 0;
        byte[] word = new byte[N];
        for (int k = 0; k < N; k++) {
            int bit = (int) (best[k >> 6] >>> (k & 63) & 1L);
            word[perm[k]] = (byte) bit;
            if (bit != (int) (hard[k >> 6] >>> (k & 63) & 1L)) errors++;
        }
        if (errors > maxHardErrors) return null;
        byte[] payload = Arrays.copyOf(word, 77);
        int crc = 0;
        for (int i = 77; i < K; i++) crc = (crc << 1) | word[i];
        if (Crc14.compute(payload) != crc) return null;
        if (!ldpc.checksPass(word)) return null;
        return new Result(word, bestDistance, errors);
    }

    private static double keepBetter(long[] trial, long[] hard, double[] abs, long[] best, double bestDistance) {
        double d = distance(trial, hard, abs);
        if (d < bestDistance) {
            best[0] = trial[0];
            best[1] = trial[1];
            best[2] = trial[2];
            return d;
        }
        return bestDistance;
    }

    private static double distance(long[] word, long[] hard, double[] abs) {
        double sum = 0;
        for (int w = 0; w < WORDS; w++) {
            long diff = word[w] ^ hard[w];
            while (diff != 0) {
                sum += abs[(w << 6) + Long.numberOfTrailingZeros(diff)];
                diff &= diff - 1;
            }
        }
        return sum;
    }
}
