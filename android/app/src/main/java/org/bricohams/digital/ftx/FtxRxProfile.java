package org.bricohams.digital.ftx;

import org.bricohams.digital.Mode;

/** Immutable receive parameters of one FTx-family profile (see ft8-rx-contract.md and ft4-ft2-rx-contract.md). */
public final class FtxRxProfile {
    public static final int SAMPLE_RATE = 12000;
    /** Baseband samples per symbol after decimation. */
    static final int BB_SYM = 32;

    public final String profileId;
    public final Mode mode;
    public final int tones;
    public final int samplesPerSymbol;
    /** Core symbols (the waveform has leadIntervals extra tone-0 intervals before and after them). */
    public final int symbols;
    public final int leadIntervals;
    public final double toneSpacingHz;
    final int[] syncStart;
    final int[][] syncTones;
    final int[] dataPos;
    final int bitsPerSymbol;
    final int[] toneToValue;
    final boolean scrambled;
    final int minSamples;
    final int maxSamples;
    /** Search range of the waveform start (including lead intervals) relative to sample 0, in samples. */
    final int startMin;
    final int startMax;
    /** Limit the latest start so the whole waveform lies inside the buffer. */
    final boolean clampStart;
    final int minBlocks;
    final double bt;
    final GfskSynth.RampMode ramp;
    final int firHalf;
    final double firCutoffHz;
    final double refineHz;
    final double hzStep;
    final double llrScale;
    final int hop;
    final int fftSize;
    final double binHz;
    final int decim;
    final double bbRate;
    final double bandCenterHz;
    final double dupRefinedHz;

    private FtxRxProfile(String profileId, Mode mode, int tones, int sps, int symbols, int lead, int[] syncStart,
            int[][] syncTones, int[] dataPos, int bitsPerSymbol, int[] toneToValue, boolean scrambled,
            int minSamples, int maxSamples, int startMin, int startMax, boolean clampStart, int minBlocks,
            double bt, GfskSynth.RampMode ramp, int firHalf, double firCutoffHz, double refineHz, double hzStep) {
        this.profileId = profileId;
        this.mode = mode;
        this.tones = tones;
        this.samplesPerSymbol = sps;
        this.symbols = symbols;
        this.leadIntervals = lead;
        this.toneSpacingHz = (double) SAMPLE_RATE / sps;
        this.syncStart = syncStart;
        this.syncTones = syncTones;
        this.dataPos = dataPos;
        this.bitsPerSymbol = bitsPerSymbol;
        this.toneToValue = toneToValue;
        this.scrambled = scrambled;
        this.minSamples = minSamples;
        this.maxSamples = maxSamples;
        this.startMin = startMin;
        this.startMax = startMax;
        this.clampStart = clampStart;
        this.minBlocks = minBlocks;
        this.bt = bt;
        this.ramp = ramp;
        this.firHalf = firHalf;
        this.firCutoffHz = firCutoffHz;
        this.refineHz = refineHz;
        this.hzStep = hzStep;
        this.llrScale = 2.8;
        this.hop = sps / 4;
        this.fftSize = 2 * sps;
        this.binHz = (double) SAMPLE_RATE / fftSize;
        this.decim = sps / BB_SYM;
        this.bbRate = (double) SAMPLE_RATE / decim;
        this.bandCenterHz = (tones - 1) / 2.0 * toneSpacingHz;
        this.dupRefinedHz = 0.32 * toneSpacingHz;
        if (dataPos.length * bitsPerSymbol != 174) throw new IllegalArgumentException("Profile must carry 174 bits");
    }

    /** Tones of the whole core for a decoded 174-bit codeword (as received, before payload descrambling). */
    int[] coreTones(byte[] word) {
        return scrambled ? FtxFrames.ft4CoreTones(word) : FtxFrames.ft8Tones(word);
    }

    /** Samples per interval times the number of waveform intervals. */
    int waveformIntervals() {
        return symbols + 2 * leadIntervals;
    }

    public static FtxRxProfile ft8() {
        return Holder.FT8;
    }

    public static FtxRxProfile ft4() {
        return Holder.FT4;
    }

    public static FtxRxProfile ft2Candidate() {
        return Holder.FT2;
    }

    private static int[] range(int from, int to) {
        int[] r = new int[to - from + 1];
        for (int i = 0; i < r.length; i++) r[i] = from + i;
        return r;
    }

    private static int[] concat(int[]... parts) {
        int n = 0;
        for (int[] p : parts) n += p.length;
        int[] out = new int[n];
        int at = 0;
        for (int[] p : parts) {
            System.arraycopy(p, 0, out, at, p.length);
            at += p.length;
        }
        return out;
    }

    private static final class Holder {
        static final int[][] FT4_SYNC = {{0, 1, 3, 2}, {1, 0, 2, 3}, {2, 3, 1, 0}, {3, 2, 0, 1}};
        static final int[] FT4_DATA = concat(range(4, 32), range(37, 65), range(70, 98));
        static final int[] FT4_VALUE = {0, 1, 3, 2};

        static final FtxRxProfile FT8 = new FtxRxProfile("ft8-standard-77-v1", Mode.FT8, 8, 1920, 79, 0,
                new int[] {0, 36, 72},
                new int[][] {{3, 1, 4, 0, 6, 5, 2}, {3, 1, 4, 0, 6, 5, 2}, {3, 1, 4, 0, 6, 5, 2}},
                concat(range(7, 35), range(43, 71)), 3, new int[] {0, 1, 3, 2, 6, 4, 5, 7}, false,
                151680, 180000, -18000, 30000, false, 2, 2.0, GfskSynth.RampMode.FT8_EDGE_240, 140, 110, 2.5, 0.25);

        static final FtxRxProfile FT4 = new FtxRxProfile("ft4-standard-77-v1", Mode.FT4, 4, 576, 103, 1,
                new int[] {0, 33, 66, 99}, FT4_SYNC, FT4_DATA, 2, FT4_VALUE, true,
                60480, 90000, -12000, 30000, true, 3, 1.0, GfskSynth.RampMode.EXTRA_SYMBOLS, 72, 4 * 12000.0 / 576,
                8.0, 0.5);

        static final FtxRxProfile FT2 = new FtxRxProfile("ft2-legacy-candidate-v1", Mode.FT2_LEGACY, 4, 288, 103, 1,
                new int[] {0, 33, 66, 99}, FT4_SYNC, FT4_DATA, 2, FT4_VALUE, true,
                30240, 45000, -6000, 15000, true, 3, 1.0, GfskSynth.RampMode.EXTRA_SYMBOLS, 36, 4 * 12000.0 / 288,
                16.0, 1.0);
    }
}
