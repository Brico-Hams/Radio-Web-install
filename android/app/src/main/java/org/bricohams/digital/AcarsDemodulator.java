package org.bricohams.digital;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

/**
 * Receiver for ARINC 618 VHF ACARS audio at 12000 Hz: the signal is mixed to baseband around 1800 Hz and low-passed,
 * the tone of every bit is read from the sign of the phase advance over one bit (+90 degrees for 2400 Hz, -90 degrees
 * for 1200 Hz), NRZI decoding gives the data bits (1 = tone kept), and the bit sync "+*" SYN SYN pattern starts a block.
 * Bit timing is not tracked: all five sample phases of the 5 samples per bit are scanned and the duplicates merged.
 * Blocks are checked for odd parity and CRC and repaired with {@link AcarsFrame#parse(byte[])}.
 * The work budget is checked at least every 4096 samples; cancellation and exhaustion propagate as exceptions.
 * Instances hold no state and may be shared between threads.
 */
public final class AcarsDemodulator {
    public static final int SAMPLE_RATE = AcarsModulator.SAMPLE_RATE;
    private static final int SPB = AcarsModulator.SAMPLES_PER_BIT;
    // 1800 Hz at 12000 Hz repeats every 20 samples.
    private static final int MIX_PERIOD = 20;
    private static final int TAP_COUNT = 31;
    private static final int GROUP_DELAY = (TAP_COUNT - 1) / 2;
    private static final double CUTOFF_HZ = 2000;
    private static final int SYNC_BITS = 32;
    private static final int SYNC_MAX_ERRORS = 2;
    private static final int MIN_SAMPLES = 160 * SPB;
    // Results whose starts are closer than this are the same burst seen from different bit phases.
    private static final int CLUSTER_SAMPLES = 40 * SPB;
    private static final int MAX_RAW_BEFORE_BCS = AcarsFrame.HEADER + 1 + AcarsFrame.MAX_TEXT + 1;
    private static final double[] MIX_COS = new double[MIX_PERIOD];
    private static final double[] MIX_SIN = new double[MIX_PERIOD];
    private static final double[] TAPS = new double[TAP_COUNT];

    static {
        for (int k = 0; k < MIX_PERIOD; k++) {
            double angle = 2 * Math.PI * 1800.0 * k / SAMPLE_RATE;
            MIX_COS[k] = Math.cos(angle);
            MIX_SIN[k] = Math.sin(angle);
        }
        double cutoff = CUTOFF_HZ / SAMPLE_RATE;
        double sum = 0;
        for (int t = 0; t < TAP_COUNT; t++) {
            double x = t - GROUP_DELAY;
            double sinc = x == 0 ? 1 : Math.sin(2 * Math.PI * cutoff * x) / (2 * Math.PI * cutoff * x);
            double hamming = 0.54 - 0.46 * Math.cos(2 * Math.PI * t / (TAP_COUNT - 1));
            TAPS[t] = sinc * hamming;
            sum += TAPS[t];
        }
        for (int t = 0; t < TAP_COUNT; t++) TAPS[t] /= sum;
    }

    /** One received block. {@code levelDb} is the band power of the burst in dB relative to a full-scale sine's peak. */
    public static final class Result {
        public final AcarsFrame frame;
        public final boolean crcOk;
        public final int parityErrors;
        public final int correctedBits;
        public final double levelDb;
        /** First sample of the burst's bit sync in the 12000 Hz input. */
        public final int startSample;

        Result(AcarsFrame frame, boolean crcOk, int parityErrors, int correctedBits, double levelDb, int startSample) {
            this.frame = frame;
            this.crcOk = crcOk;
            this.parityErrors = parityErrors;
            this.correctedBits = correctedBits;
            this.levelDb = levelDb;
            this.startSample = startSample;
        }

        private int rank() {
            return (crcOk ? 0 : 1_000_000) + correctedBits * 1000 + parityErrors;
        }
    }

    /** Every block found, CRC-bad ones included, ordered by start sample. */
    public List<Result> demodulate(float[] samples, WorkBudget budget) throws CodecException {
        if (samples == null || budget == null) throw new IllegalArgumentException("Samples and budget required");
        budget.checkpoint();
        int n = samples.length;
        if (n < MIN_SAMPLES) return Collections.emptyList();
        float[] re = new float[n];
        float[] im = new float[n];
        baseband(samples, re, im, budget);
        float[] metric = new float[n];
        for (int j = SPB; j < n; j++) {
            if ((j & 4095) == 0) budget.checkpoint();
            // Imaginary part of z[j] * conj(z[j - SPB]): the sine of the phase advance over one bit.
            metric[j] = im[j] * re[j - SPB] - re[j] * im[j - SPB];
        }
        List<Result> found = new ArrayList<>();
        for (int offset = 0; offset < SPB; offset++) scan(offset, n, re, im, metric, found, budget);
        budget.checkpoint();
        return merge(found);
    }

    private static void baseband(float[] x, float[] re, float[] im, WorkBudget budget) throws CodecException {
        int n = x.length;
        float[] mixedRe = new float[n];
        float[] mixedIm = new float[n];
        for (int j = 0; j < n; j++) {
            if ((j & 4095) == 0) budget.checkpoint();
            int k = j % MIX_PERIOD;
            mixedRe[j] = (float) (x[j] * MIX_COS[k]);
            mixedIm[j] = (float) (-x[j] * MIX_SIN[k]);
        }
        for (int j = 0; j < n; j++) {
            if ((j & 4095) == 0) budget.checkpoint();
            double sumRe = 0;
            double sumIm = 0;
            int taps = Math.min(TAP_COUNT, j + 1);
            for (int t = 0; t < taps; t++) {
                sumRe += TAPS[t] * mixedRe[j - t];
                sumIm += TAPS[t] * mixedIm[j - t];
            }
            re[j] = (float) sumRe;
            im[j] = (float) sumIm;
        }
    }

    private static void scan(int offset, int n, float[] re, float[] im, float[] metric, List<Result> found,
            WorkBudget budget) throws CodecException {
        int count = (n - 1 - offset) / SPB;
        if (count < SYNC_BITS) return;
        // Bit i is decided at sample offset + SPB * (i + 1).
        byte[] data = new byte[count];
        data[0] = 1;
        boolean previous = metric[offset + SPB] > 0;
        for (int i = 1; i < count; i++) {
            if ((i & 4095) == 0) budget.checkpoint();
            boolean tone = metric[offset + SPB * (i + 1)] > 0;
            data[i] = (byte) (tone == previous ? 1 : 0);
            previous = tone;
        }
        int pattern = AcarsModulator.syncPattern();
        int register = 0;
        for (int i = 0; i < count; i++) {
            if ((i & 4095) == 0) budget.checkpoint();
            register = (register >>> 1) | (data[i] << 31);
            if (i >= SYNC_BITS - 1 && Integer.bitCount(register ^ pattern) <= SYNC_MAX_ERRORS) {
                int next = readFrame(data, i, offset, count, re, im, found);
                if (next > 0) {
                    i = next - 1;
                    register = 0;
                }
            }
        }
    }

    /** Reads the block that follows a sync ending at bit {@code syncEnd}; returns the bit after it, or -1. */
    private static int readFrame(byte[] data, int syncEnd, int offset, int count, float[] re, float[] im,
            List<Result> found) {
        int pos = syncEnd + 1;
        byte[] raw = new byte[AcarsFrame.MAX_BYTES + 1];
        int length = 0;
        boolean ended = false;
        while (length < MAX_RAW_BEFORE_BCS) {
            if (pos + 8 > count) return -1;
            int value = readByte(data, pos);
            pos += 8;
            raw[length++] = (byte) value;
            int character = value & 0x7F;
            if (length > AcarsFrame.HEADER && (character == AcarsFrame.ETX || character == AcarsFrame.ETB)) {
                ended = true;
                break;
            }
        }
        if (!ended || pos + 16 > count) return -1;
        for (int k = 0; k < 2; k++) {
            raw[length++] = (byte) readByte(data, pos);
            pos += 8;
        }
        if (pos + 8 <= count && (readByte(data, pos) & 0x7F) == AcarsFrame.DEL) pos += 8;
        AcarsFrame.Parsed parsed;
        try {
            parsed = AcarsFrame.parse(Arrays.copyOf(raw, length));
        } catch (CodecException notABlock) {
            return -1;
        }
        int from = offset + SPB * (syncEnd - SYNC_BITS + 1);
        int to = offset + SPB * pos;
        double power = 0;
        for (int j = from; j < to; j++) power += (double) re[j] * re[j] + (double) im[j] * im[j];
        // Mixing keeps half of a real tone's power in the baseband component.
        double level = 10 * Math.log10(2 * power / Math.max(1, to - from) + 1e-12);
        found.add(new Result(parsed.frame, parsed.crcOk, parsed.parityErrors, parsed.correctedBits, level,
                Math.max(0, from - GROUP_DELAY)));
        return pos;
    }

    /** Characters are sent LSB first. */
    private static int readByte(byte[] data, int pos) {
        int value = 0;
        for (int k = 0; k < 8; k++) value |= data[pos + k] << k;
        return value;
    }

    private static List<Result> merge(List<Result> found) {
        List<Result> sorted = new ArrayList<>(found);
        Collections.sort(sorted, (a, b) -> a.startSample != b.startSample
                ? Integer.compare(a.startSample, b.startSample) : a.frame.text.compareTo(b.frame.text));
        List<Result> merged = new ArrayList<>();
        for (Result result : sorted) {
            if (!merged.isEmpty()) {
                Result last = merged.get(merged.size() - 1);
                if (result.startSample - last.startSample < CLUSTER_SAMPLES) {
                    if (result.rank() < last.rank()) merged.set(merged.size() - 1, result);
                    continue;
                }
            }
            merged.add(result);
        }
        return Collections.unmodifiableList(merged);
    }
}
