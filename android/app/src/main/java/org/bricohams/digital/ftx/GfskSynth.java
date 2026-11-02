package org.bricohams.digital.ftx;

import java.util.HashMap;
import java.util.Map;

/** Gaussian-filtered FSK synthesizer parameterised by timing, bandwidth-time product and ramp policy. */
public final class GfskSynth {
    public enum RampMode {
        /** Raised cosine over the first and last symbol/8 samples inside the frame. */
        FT8_EDGE_240,
        /** One extra tone-0 interval before and after, raised cosine over each whole interval. */
        EXTRA_SYMBOLS
    }

    private static final double AMPLITUDE = 0.5;
    private static final double TWO_PI = 2 * Math.PI;
    private static final double SQRT_PI = Math.sqrt(Math.PI);
    private static final Map<String, double[]> PULSES = new HashMap<String, double[]>();

    private final int sps;
    private final double spacingHz;
    private final int sampleRate;
    private final RampMode mode;
    private final double[] pulse;
    private final double[] ramp;

    public GfskSynth(int samplesPerSymbol, double bt, double toneSpacingHz, int sampleRate, RampMode rampMode) {
        if (samplesPerSymbol < 8 || !(bt > 0) || Double.isInfinite(bt) || !(toneSpacingHz > 0)
                || Double.isInfinite(toneSpacingHz) || sampleRate < 8000 || rampMode == null) {
            throw new IllegalArgumentException("Invalid GFSK parameters");
        }
        this.sps = samplesPerSymbol;
        this.spacingHz = toneSpacingHz;
        this.sampleRate = sampleRate;
        this.mode = rampMode;
        this.pulse = pulseTable(samplesPerSymbol, bt);
        int length = rampMode == RampMode.FT8_EDGE_240 ? samplesPerSymbol / 8 : samplesPerSymbol;
        this.ramp = new double[length];
        for (int i = 0; i < length; i++) ramp[i] = 0.5 * (1 - Math.cos(Math.PI * i / length));
    }

    /** Number of output samples for the given number of tones. */
    public int frameLength(int toneCount) {
        return (toneCount + (mode == RampMode.EXTRA_SYMBOLS ? 2 : 0)) * sps;
    }

    public float[] synth(int[] tones, double tone0Hz) {
        return synth(tones, tone0Hz, 0);
    }

    /** As synth(tones, tone0Hz) with the carrier phase starting at startPhase radians (pi/2 gives the cosine form). */
    public float[] synth(int[] tones, double tone0Hz, double startPhase) {
        if (tones == null || tones.length == 0 || !(tone0Hz >= 0) || Double.isInfinite(tone0Hz)) {
            throw new IllegalArgumentException("Tones and a finite tone-0 frequency required");
        }
        int pad = mode == RampMode.EXTRA_SYMBOLS ? 1 : 0;
        int symbols = tones.length + 2 * pad;
        int[] seq = new int[symbols];
        for (int j = 0; j < tones.length; j++) {
            if (tones[j] < 0) throw new IllegalArgumentException("Negative tone");
            seq[j + pad] = tones[j];
        }
        int total = symbols * sps;
        double[] track = new double[total];
        for (int j = -1; j <= symbols; j++) {
            int tone = seq[j < 0 ? 0 : (j >= symbols ? symbols - 1 : j)];
            if (tone == 0) continue;
            int start = (j - 1) * sps;
            int from = Math.max(0, start);
            int to = Math.min(total, start + 3 * sps);
            double w = tone;
            for (int i = from; i < to; i++) track[i] += w * pulse[i - start];
        }

        float[] out = new float[total];
        double step = TWO_PI / sampleRate;
        double phase = startPhase;
        int rampLength = ramp.length;
        for (int i = 0; i < total; i++) {
            double env = 1;
            if (i < rampLength) env = ramp[i];
            int fromEnd = total - 1 - i;
            if (fromEnd < rampLength) env = Math.min(env, ramp[fromEnd]);
            out[i] = (float) (AMPLITUDE * env * Math.sin(phase));
            phase += step * (tone0Hz + spacingHz * track[i]);
            if (phase >= TWO_PI) phase -= TWO_PI * Math.floor(phase / TWO_PI);
        }
        return out;
    }

    private static double[] pulseTable(int sps, double bt) {
        String key = sps + ":" + Double.doubleToLongBits(bt);
        synchronized (PULSES) {
            double[] table = PULSES.get(key);
            if (table == null) {
                double k = Math.PI * Math.sqrt(2 / Math.log(2));
                table = new double[3 * sps];
                for (int m = 0; m < table.length; m++) {
                    double x = (m - 1.5 * sps) / sps;
                    table[m] = (erf(k * bt * (x + 0.5)) - erf(k * bt * (x - 0.5))) / 2;
                }
                PULSES.put(key, table);
            }
            return table;
        }
    }

    /**
     * erf(x): for |x| < 3 the non-alternating series
     * 2/sqrt(pi) * exp(-x^2) * sum 2^n x^(2n+1) / (1*3*...*(2n+1)); for larger |x|
     * erfc from its continued fraction exp(-x^2)/sqrt(pi) / (x + (1/2)/(x + 1/(x + (3/2)/(x + ...)))),
     * evaluated 60 levels deep. Both are accurate to about 1e-15.
     */
    static double erf(double x) {
        double a = Math.abs(x);
        double result;
        if (a < 3) {
            double term = a;
            double sum = a;
            for (int n = 1; n < 200 && term > 1e-18 * sum; n++) {
                term *= 2 * a * a / (2 * n + 1);
                sum += term;
            }
            result = 2 / SQRT_PI * Math.exp(-a * a) * sum;
        } else if (a > 6.5) {
            result = 1;
        } else {
            double t = a;
            for (int k = 60; k >= 1; k--) t = a + (k / 2.0) / t;
            result = 1 - Math.exp(-a * a) / (SQRT_PI * t);
        }
        return x < 0 ? -result : result;
    }
}
