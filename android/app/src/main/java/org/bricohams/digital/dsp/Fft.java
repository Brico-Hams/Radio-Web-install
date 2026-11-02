package org.bricohams.digital.dsp;

/**
 * In-place forward complex FFT for sizes whose prime factors are 2, 3 and 5 (Stockham autosort,
 * mixed radix). Twiddles are computed once per instance. Instances own scratch buffers and are not thread-safe.
 */
public final class Fft {
    private final int n;
    private final int[] radices;
    private final int[][] weights;
    private final double[] cos;
    private final double[] sin;
    private final double[] scratchRe;
    private final double[] scratchIm;
    private final double[] aRe = new double[5];
    private final double[] aIm = new double[5];

    public Fft(int n) {
        if (n < 1) throw new IllegalArgumentException("FFT size must be positive");
        int rest = n;
        int count = 0;
        int[] found = new int[32];
        for (int p = 2; p <= 5; p++) {
            if (p == 4) continue;
            while (rest % p == 0) {
                found[count++] = p;
                rest /= p;
            }
        }
        if (rest != 1) throw new IllegalArgumentException("FFT size must have only prime factors 2, 3 and 5");
        this.n = n;
        this.radices = java.util.Arrays.copyOf(found, count);
        this.weights = new int[count][];
        for (int s = 0; s < count; s++) {
            int p = radices[s];
            weights[s] = new int[p * p];
            for (int r = 0; r < p; r++) {
                for (int k = 0; k < p; k++) weights[s][r * p + k] = ((r * k) % p) * (n / p);
            }
        }
        this.cos = new double[n];
        this.sin = new double[n];
        for (int k = 0; k < n; k++) {
            double angle = -2 * Math.PI * k / n;
            cos[k] = Math.cos(angle);
            sin[k] = Math.sin(angle);
        }
        this.scratchRe = new double[n];
        this.scratchIm = new double[n];
    }

    public int size() {
        return n;
    }

    /** X[k] = sum x[j] * exp(-2 pi i j k / n), computed in place. */
    public void forward(double[] re, double[] im) {
        if (re == null || im == null || re.length != n || im.length != n) {
            throw new IllegalArgumentException("Arrays must have the FFT size");
        }
        double[] srcRe = re;
        double[] srcIm = im;
        double[] dstRe = scratchRe;
        double[] dstIm = scratchIm;
        int length = n;
        int stride = 1;
        int stage = 0;
        for (int p : radices) {
            int[] w = weights[stage++];
            int m = length / p;
            int unit = n / length;
            for (int j = 0; j < m; j++) {
                for (int q = 0; q < stride; q++) {
                    for (int r = 0; r < p; r++) {
                        int at = q + stride * (j + m * r);
                        aRe[r] = srcRe[at];
                        aIm[r] = srcIm[at];
                    }
                    for (int k = 0; k < p; k++) {
                        double sr = 0;
                        double si = 0;
                        for (int r = 0; r < p; r++) {
                            int wi = w[r * p + k];
                            sr += aRe[r] * cos[wi] - aIm[r] * sin[wi];
                            si += aRe[r] * sin[wi] + aIm[r] * cos[wi];
                        }
                        int t = j * k * unit;
                        int out = q + stride * (p * j + k);
                        dstRe[out] = sr * cos[t] - si * sin[t];
                        dstIm[out] = sr * sin[t] + si * cos[t];
                    }
                }
            }
            double[] swap = srcRe;
            srcRe = dstRe;
            dstRe = swap;
            swap = srcIm;
            srcIm = dstIm;
            dstIm = swap;
            length = m;
            stride *= p;
        }
        if (srcRe != re) {
            System.arraycopy(srcRe, 0, re, 0, n);
            System.arraycopy(srcIm, 0, im, 0, n);
        }
    }
}
