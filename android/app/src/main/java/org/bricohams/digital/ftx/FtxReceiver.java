package org.bricohams.digital.ftx;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import org.bricohams.digital.CodecException;
import org.bricohams.digital.DecodeRequest;
import org.bricohams.digital.DecodedMessage;
import org.bricohams.digital.PcmAudio;
import org.bricohams.digital.WorkBudget;
import org.bricohams.digital.dsp.Fft;
import org.bricohams.digital.fec.Crc14;
import org.bricohams.digital.fec.Ldpc174;

/**
 * Mode-independent receive engine for the 174-bit FTx family: spectrogram sync search, baseband correlation
 * refinement, soft symbols, LDPC, CRC, unpacking and iterative subtraction. All timing comes from an {@link FtxRxProfile}.
 * Instances are not thread-safe.
 */
public final class FtxReceiver {
    private static final int SAMPLE_RATE = FtxRxProfile.SAMPLE_RATE;
    private static final int BB_SYM = FtxRxProfile.BB_SYM;
    // Candidate sync score threshold as a multiple of the median score over the search area.
    private static final double SYNC_THRESHOLD = 1.5;
    private static final double MARGIN_HZ = 300;
    private static final int TIME_RANGE = 24;
    private static final int COARSE_TIME_STEP = 4;
    private static final double DUPLICATE_HZ = 20;
    private static final int MAX_PASSES = 3;

    private final FtxRxProfile profile;
    private final Ldpc174 ldpc;
    private final GfskSynth synth;
    private final byte[] xor = new byte[77];
    private int unsupportedCount;
    private long spectrogramNanos;
    private long syncNanos;
    private long refineLdpcNanos;
    private long pass2Nanos;

    public FtxReceiver(FtxRxProfile profile, Ldpc174 ldpc) {
        if (profile == null) throw new IllegalArgumentException("Profile required");
        if (ldpc == null) throw new IllegalArgumentException("LDPC tables required");
        this.profile = profile;
        this.ldpc = ldpc;
        this.synth = new GfskSynth(profile.samplesPerSymbol, profile.bt, profile.toneSpacingHz, SAMPLE_RATE, profile.ramp);
        for (int i = 0; i < 77; i++) xor[i] = (byte) (FtxFrames.FT4_XOR.charAt(i) - '0');
    }

    /** Count of CRC-valid frames dropped by Unpack77 in the last decode call. */
    public int unsupportedCount() {
        return unsupportedCount;
    }

    /** {spectrogram, sync, refine+LDPC, pass 2} nanoseconds of the last decode call. */
    public long[] lastPhaseNanos() {
        return new long[] {spectrogramNanos, syncNanos, refineLdpcNanos, pass2Nanos};
    }

    public List<DecodedMessage> decode(PcmAudio audio, DecodeRequest request) throws CodecException {
        if (audio == null || request == null) throw new IllegalArgumentException("Audio and request required");
        if (audio.sampleRate != SAMPLE_RATE) invalid("Decoding needs 12000 Hz audio");
        if (audio.samples.length < profile.minSamples || audio.samples.length > profile.maxSamples) {
            invalid("Decoding needs " + profile.minSamples + ".." + profile.maxSamples + " samples");
        }
        if (request.maxAudioHz + profile.tones * profile.toneSpacingHz > 6000) {
            invalid("Search band too close to Nyquist");
        }
        request.budget.checkpoint();
        unsupportedCount = 0;
        spectrogramNanos = 0;
        syncNanos = 0;
        refineLdpcNanos = 0;
        pass2Nanos = 0;
        return new Run(audio.samples, request).execute();
    }

    private static void invalid(String message) throws CodecException {
        throw new CodecException(CodecException.Reason.INVALID_AUDIO, message);
    }

    private static final class Hit {
        String text;
        double hz;
        double dt;
        double snr;
        double score;
        int[] tones;
        /** Start of the whole waveform (including lead intervals). */
        int start;
    }

    private static final class Candidate {
        int bin;
        int step;
        float score;
    }

    private final class Run {
        final FtxRxProfile p = profile;
        final int sps = p.samplesPerSymbol;
        final int hop = p.hop;
        final int fftSize = p.fftSize;
        final int symbols = p.symbols;
        final int decim = p.decim;
        final int firHalf = p.firHalf;
        final int bbSpan = 2 * TIME_RANGE + p.symbols * BB_SYM + 2;
        final int leadSamples = p.leadIntervals * sps;
        final int dataSyms = p.dataPos.length;
        final int bps = p.bitsPerSymbol;
        float[] x;
        final int len;
        final int minStep;
        final int maxStep;
        double noiseSigma2;
        boolean later;
        final DecodeRequest request;
        final WorkBudget budget;
        final double[] window = new double[sps];
        final double[][] cosT;
        final double[][] sinT;
        final double[] fir = new double[2 * firHalf + 1];
        final double[] hcRe = new double[2 * firHalf + 1];
        final double[] hcIm = new double[2 * firHalf + 1];
        final double[] bbRe = new double[bbSpan];
        final double[] bbIm = new double[bbSpan];
        double firPower;
        double mixHz;
        int bbFirst;
        final double[] amp;
        final double[] llr = new double[174];
        float[][] power;
        int binLo;
        int binHi;

        Run(float[] samples, DecodeRequest request) {
            this.x = samples;
            this.len = samples.length;
            this.request = request;
            this.budget = request.budget;
            cosT = new double[p.tones][BB_SYM];
            sinT = new double[p.tones][BB_SYM];
            amp = new double[p.tones];
            int lo = Math.floorDiv(p.startMin + leadSamples, hop);
            int hi = Math.floorDiv(p.startMax + leadSamples, hop);
            if (p.clampStart) {
                hi = Math.min(hi, Math.floorDiv(len - (symbols + p.leadIntervals) * sps, hop));
            }
            minStep = lo;
            maxStep = Math.max(lo, hi);
            for (int n = 0; n < sps; n++) window[n] = 0.5 - 0.5 * Math.cos(2 * Math.PI * n / sps);
            // Hamming-windowed sinc low-pass with unit DC gain.
            double sum = 0;
            for (int k = -firHalf; k <= firHalf; k++) {
                double a = 2 * p.firCutoffHz / SAMPLE_RATE;
                double sinc = k == 0 ? a : Math.sin(Math.PI * a * k) / (Math.PI * k);
                double w = 0.54 + 0.46 * Math.cos(Math.PI * k / firHalf);
                fir[k + firHalf] = sinc * w;
                sum += sinc * w;
            }
            for (int i = 0; i < fir.length; i++) {
                fir[i] /= sum;
                firPower += fir[i] * fir[i];
            }
        }

        List<DecodedMessage> execute() throws CodecException {
            int bMin = Math.max(2, (int) Math.ceil(request.minAudioHz / p.binHz));
            int bMax = (int) Math.floor(request.maxAudioHz / p.binHz);
            int marginBins = (int) Math.ceil(MARGIN_HZ / p.binHz);
            List<Hit> hits = new ArrayList<Hit>();
            if (bMax >= bMin) {
                binLo = Math.max(0, bMin - marginBins);
                binHi = Math.min(fftSize / 2, bMax + 2 * p.tones + marginBins);
                long t0 = System.nanoTime();
                spectrogram();
                spectrogramNanos = System.nanoTime() - t0;
                // Mean of an exponential power distribution is its median over ln 2; Hann sum of squares is 3/8 N.
                noiseSigma2 = bandNoise(bMin, bMax) / Math.log(2) / (0.375 * sps);
                runPass(hits, bMin, bMax);
                long p2 = System.nanoTime();
                later = true;
                final float[] original = x;
                float[] residual = null;
                int before = 0;
                for (int pass = 2; pass <= MAX_PASSES; pass++) {
                    int fromIndex = before;
                    before = hits.size();
                    if (fromIndex == before && pass > 2) break;
                    if (before == 0) break;
                    if (residual == null) residual = original.clone();
                    for (int i = fromIndex; i < before; i++) {
                        budget.checkpoint();
                        subtract(residual, hits.get(i));
                    }
                    x = residual;
                    spectrogram();
                    runPass(hits, bMin, bMax);
                }
                x = original;
                later = false;
                pass2Nanos = System.nanoTime() - p2;
            }
            Collections.sort(hits, new Comparator<Hit>() {
                public int compare(Hit a, Hit b) {
                    int c = Double.compare(a.dt, b.dt);
                    if (c == 0) c = Double.compare(a.hz, b.hz);
                    return c != 0 ? c : a.text.compareTo(b.text);
                }
            });
            List<DecodedMessage> out = new ArrayList<DecodedMessage>(hits.size());
            for (Hit h : hits) {
                out.add(new DecodedMessage(p.mode, p.profileId, h.text, request.frameStartUtcMillis,
                        h.hz, h.dt, h.snr));
            }
            return Collections.unmodifiableList(out);
        }

        void runPass(List<Hit> hits, int bMin, int bMax) throws CodecException {
            long t0 = System.nanoTime();
            List<Candidate> candidates = syncSearch(bMin, bMax);
            if (!later) syncNanos = System.nanoTime() - t0;
            List<double[]> processed = new ArrayList<double[]>();
            t0 = System.nanoTime();
            for (Candidate c : candidates) {
                budget.checkpoint();
                Hit hit = decodeCandidate(c, processed);
                if (hit == null) continue;
                if (later) {
                    boolean known = false;
                    for (Hit old : hits) {
                        if (old.text.equals(hit.text) && Math.abs(old.hz - hit.hz) <= DUPLICATE_HZ) {
                            known = true;
                            break;
                        }
                    }
                    if (known) continue;
                    hits.add(hit);
                } else {
                    addHit(hits, hit);
                }
            }
            if (!later) refineLdpcNanos = System.nanoTime() - t0;
        }

        /**
         * Least-squares amplitude of the regenerated waveform per interval (cosine and sine references from the
         * profile's synth), smoothed over +/-2 intervals, then removed from r.
         */
        void subtract(float[] r, Hit h) {
            int count = p.waveformIntervals();
            float[] ref0 = synth.synth(h.tones, h.hz, 0);
            float[] ref1 = synth.synth(h.tones, h.hz, Math.PI / 2);
            double[] a = new double[count];
            double[] b = new double[count];
            boolean[] ok = new boolean[count];
            for (int k = 0; k < count; k++) {
                int base = h.start + k * sps;
                int n0 = Math.max(0, -base);
                int n1 = Math.min(sps, len - base);
                if (n1 <= n0) continue;
                double scc = 0, sss = 0, scs = 0, sxc = 0, sxs = 0;
                for (int n = n0; n < n1; n++) {
                    double c = ref1[k * sps + n];
                    double s = ref0[k * sps + n];
                    double v = r[base + n];
                    scc += c * c;
                    sss += s * s;
                    scs += c * s;
                    sxc += v * c;
                    sxs += v * s;
                }
                double det = scc * sss - scs * scs;
                if (!(det > 1e-9 * (scc * sss) && scc * sss > 0)) continue;
                a[k] = (sxc * sss - sxs * scs) / det;
                b[k] = (sxs * scc - sxc * scs) / det;
                ok[k] = true;
            }
            for (int k = 0; k < count; k++) {
                double sa = 0, sb = 0;
                int used = 0;
                for (int j = Math.max(0, k - 2); j <= Math.min(count - 1, k + 2); j++) {
                    if (!ok[j]) continue;
                    sa += a[j];
                    sb += b[j];
                    used++;
                }
                if (used == 0) continue;
                sa /= used;
                sb /= used;
                int base = h.start + k * sps;
                int n0 = Math.max(0, -base);
                int n1 = Math.min(sps, len - base);
                for (int n = n0; n < n1; n++) {
                    r[base + n] -= (float) (sa * ref1[k * sps + n] + sb * ref0[k * sps + n]);
                }
            }
        }

        /** Median of the spectrogram power over the whole search band and all frames fully inside the buffer. */
        double bandNoise(int bMin, int bMax) {
            int lo = bMin - binLo;
            int hi = Math.min(binHi - binLo, bMax + 2 * p.tones - binLo);
            int frames = power.length;
            float[] buf = new float[frames * (hi - lo + 1)];
            int count = 0;
            for (int f = 0; f < frames; f++) {
                int first = (minStep + f) * hop;
                if (first < 0 || first + sps > len) continue;
                float[] row = power[f];
                for (int i = lo; i <= hi; i++) buf[count++] = row[i];
            }
            if (count == 0) return 0;
            Arrays.sort(buf, 0, count);
            return buf[count / 2];
        }

        void addHit(List<Hit> hits, Hit hit) {
            for (int i = 0; i < hits.size(); i++) {
                Hit old = hits.get(i);
                if (old.text.equals(hit.text) && Math.abs(old.hz - hit.hz) <= DUPLICATE_HZ) {
                    if (hit.score > old.score) hits.set(i, hit);
                    return;
                }
            }
            hits.add(hit);
        }

        /** Hann-windowed power for every hop; two real frames share one complex FFT. */
        void spectrogram() throws CodecException {
            int frames = maxStep + 4 * (symbols - 1) - minStep + 1;
            int width = binHi - binLo + 1;
            if (power == null) power = new float[frames][width];
            Fft fft = new Fft(fftSize);
            double[] re = new double[fftSize];
            double[] im = new double[fftSize];
            for (int f = 0; f < frames; f += 2) {
                budget.checkpoint();
                Arrays.fill(re, 0);
                Arrays.fill(im, 0);
                load(re, (minStep + f) * hop);
                boolean pair = f + 1 < frames;
                if (pair) load(im, (minStep + f + 1) * hop);
                fft.forward(re, im);
                float[] rowA = power[f];
                float[] rowB = pair ? power[f + 1] : null;
                for (int k = binLo; k <= binHi; k++) {
                    int nk = k == 0 ? 0 : fftSize - k;
                    double ar = 0.5 * (re[k] + re[nk]);
                    double ai = 0.5 * (im[k] - im[nk]);
                    rowA[k - binLo] = (float) (ar * ar + ai * ai);
                    if (pair) {
                        double br = 0.5 * (im[k] + im[nk]);
                        double bi = -0.5 * (re[k] - re[nk]);
                        rowB[k - binLo] = (float) (br * br + bi * bi);
                    }
                }
            }
        }

        void load(double[] dst, int first) {
            for (int n = 0; n < sps; n++) {
                int at = first + n;
                if (at >= 0 && at < len) dst[n] = x[at] * window[n];
            }
        }

        List<Candidate> syncSearch(int bMin, int bMax) throws CodecException {
            int steps = maxStep - minStep + 1;
            int bins = bMax - bMin + 1;
            int blocks = p.syncStart.length;
            int blockLen = p.syncTones[0].length;
            boolean[][] blockOk = new boolean[steps][blocks];
            int[] okCount = new int[steps];
            for (int s = 0; s < steps; s++) {
                int start = (minStep + s) * hop;
                for (int blk = 0; blk < blocks; blk++) {
                    int from = start + sps * p.syncStart[blk];
                    if (from >= 0 && from + blockLen * sps <= len) {
                        blockOk[s][blk] = true;
                        okCount[s]++;
                    }
                }
            }
            double allSum = 0;
            long allCount = 0;
            for (float[] row : power) {
                if (row == null) continue;
                for (float v : row) allSum += v;
                allCount += row.length;
            }
            double floor = 1e-6 * (allCount > 0 ? allSum / allCount : 0) + 1e-30;
            float[] score = new float[bins * steps];
            int valid = 0;
            int others = p.tones - 1;
            for (int bi = 0; bi < bins; bi++) {
                budget.checkpoint();
                int base = bMin + bi - binLo;
                for (int s = 0; s < steps; s++) {
                    int at = bi * steps + s;
                    score[at] = -1;
                    if (okCount[s] < p.minBlocks) continue;
                    double sigSum = 0;
                    double otherSum = 0;
                    int count = 0;
                    for (int blk = 0; blk < blocks; blk++) {
                        if (!blockOk[s][blk]) continue;
                        int[] seq = p.syncTones[blk];
                        for (int i = 0; i < blockLen; i++) {
                            float[] row = power[s + 4 * (p.syncStart[blk] + i)];
                            double signal = row[base + 2 * seq[i]];
                            double total = 0;
                            for (int t = 0; t < p.tones; t++) total += row[base + 2 * t];
                            double other = (total - signal) / others;
                            sigSum += signal;
                            otherSum += other;
                            count++;
                        }
                    }
                    if (count > 0 && sigSum > 2 * otherSum) {
                        score[at] = (float) (sigSum / (otherSum + count * floor));
                        valid++;
                    }
                }
            }
            List<Candidate> picked = new ArrayList<Candidate>();
            if (valid == 0) return picked;
            float[] sorted = new float[valid];
            int n = 0;
            for (float v : score) if (v >= 0) sorted[n++] = v;
            Arrays.sort(sorted);
            double median = sorted[valid / 2];
            if (!(median > 0)) return picked;
            double limit = SYNC_THRESHOLD * median;
            int above = 0;
            for (float v : score) if (v >= limit) above++;
            long[] keys = new long[above];
            n = 0;
            for (int i = 0; i < score.length; i++) {
                if (score[i] >= limit) keys[n++] = ((long) Float.floatToIntBits(score[i]) << 32) | i;
            }
            Arrays.sort(keys);
            for (int k = keys.length - 1; k >= 0 && picked.size() < request.maxCandidates; k--) {
                int idx = (int) (keys[k] & 0xffffffffL);
                int bi = idx / steps;
                int s = idx % steps;
                boolean near = false;
                for (Candidate c : picked) {
                    if (Math.abs(c.bin - (bMin + bi)) <= 4 && Math.abs(c.step - s) <= 3) {
                        near = true;
                        break;
                    }
                }
                if (near) continue;
                Candidate c = new Candidate();
                c.bin = bMin + bi;
                c.step = s;
                c.score = score[idx];
                picked.add(c);
            }
            return picked;
        }

        /** Mixes the audio by mix Hz and low-pass filters/decimates to bbRate from baseband index first. */
        void buildBaseband(double mix, int first) {
            mixHz = mix;
            bbFirst = first;
            double w = 2 * Math.PI * mix / SAMPLE_RATE;
            for (int k = -firHalf; k <= firHalf; k++) {
                double h = fir[k + firHalf];
                hcRe[k + firHalf] = h * Math.cos(w * k);
                hcIm[k + firHalf] = -h * Math.sin(w * k);
            }
            for (int i = 0; i < bbSpan; i++) {
                int n = decim * (first + i);
                int k0 = Math.max(-firHalf, -n);
                int k1 = Math.min(firHalf, len - 1 - n);
                double aRe = 0;
                double aIm = 0;
                for (int k = k0; k <= k1; k++) {
                    double v = x[n + k];
                    aRe += v * hcRe[k + firHalf];
                    aIm += v * hcIm[k + firHalf];
                }
                double cycles = mix * (first + i) / p.bbRate;
                double phi = 2 * Math.PI * (cycles - Math.floor(cycles));
                double c = Math.cos(phi);
                double s = Math.sin(phi);
                bbRe[i] = aRe * c + aIm * s;
                bbIm[i] = aIm * c - aRe * s;
            }
        }

        /** Fills the tones x 32 complex tables for tone-0 frequency f0 relative to the baseband mix frequency. */
        void buildTables(double f0) {
            for (int t = 0; t < p.tones; t++) {
                double w = 2 * Math.PI * (f0 - mixHz + p.toneSpacingHz * t) / p.bbRate;
                double[] ct = cosT[t];
                double[] st = sinT[t];
                for (int n = 0; n < BB_SYM; n++) {
                    ct[n] = Math.cos(w * n);
                    st[n] = Math.sin(w * n);
                }
            }
        }

        /** Noncoherent energy of a tone over one baseband symbol, scaled like a full-symbol 12 kHz correlation. */
        double toneEnergy(int tone, int at) {
            double[] ct = cosT[tone];
            double[] st = sinT[tone];
            double re = 0;
            double im = 0;
            for (int n = 0; n < BB_SYM; n++) {
                double yr = bbRe[at + n];
                double yi = bbIm[at + n];
                re += yr * ct[n] + yi * st[n];
                im += yi * ct[n] - yr * st[n];
            }
            return (double) decim * decim * (re * re + im * im);
        }

        double syncEnergy(int s) {
            double sum = 0;
            for (int blk = 0; blk < p.syncStart.length; blk++) {
                int[] seq = p.syncTones[blk];
                for (int i = 0; i < seq.length; i++) sum += toneEnergy(seq[i], s + BB_SYM * (p.syncStart[blk] + i));
            }
            return sum;
        }

        double syncAt(double f0, int s) {
            buildTables(f0);
            return syncEnergy(s);
        }

        Hit decodeCandidate(Candidate c, List<double[]> processed) throws CodecException {
            double f0 = c.bin * p.binHz;
            int first = (minStep + c.step) * (hop / decim) - TIME_RANGE;
            buildBaseband(f0 + p.bandCenterHz, first);
            int maxS = 2 * TIME_RANGE;
            double bestE = -1;
            double bestF = f0;
            int bestS = TIME_RANGE;
            for (double df = -p.refineHz; df <= p.refineHz + 1e-9; df += p.hzStep) {
                budget.checkpoint();
                buildTables(f0 + df);
                for (int s = 0; s <= maxS; s += COARSE_TIME_STEP) {
                    double e = syncEnergy(s);
                    if (e > bestE) {
                        bestE = e;
                        bestF = f0 + df;
                        bestS = s;
                    }
                }
            }
            double centerF = bestF;
            int centerS = bestS;
            for (int i = -2; i <= 2; i++) {
                double f = centerF + p.hzStep * i;
                buildTables(f);
                for (int s = Math.max(0, centerS - COARSE_TIME_STEP + 1);
                        s <= Math.min(maxS, centerS + COARSE_TIME_STEP - 1); s++) {
                    double e = syncEnergy(s);
                    if (e > bestE) {
                        bestE = e;
                        bestF = f;
                        bestS = s;
                    }
                }
            }
            double fineS = bestS;
            if (bestS >= 1 && bestS < maxS) {
                double lo = syncAt(bestF, bestS - 1);
                double hi = syncAt(bestF, bestS + 1);
                fineS += parabolic(lo, bestE, hi);
            }
            double refinedF = bestF;
            {
                double lo = syncAt(bestF - p.hzStep, bestS);
                double hi = syncAt(bestF + p.hzStep, bestS);
                refinedF += p.hzStep * parabolic(lo, bestE, hi);
            }
            bestF = refinedF;
            int bestT = (int) Math.round((first + fineS) * decim);
            int start = (first + bestS) * decim;
            buildTables(bestF);
            for (double[] q : processed) {
                if (Math.abs(q[0] - bestF) <= p.dupRefinedHz && Math.abs(q[1] - bestT) <= hop) return null;
            }
            processed.add(new double[] {bestF, bestT});
            for (int attempt = 0; attempt < 2; attempt++) {
                if (!softBits(bestS, start, attempt == 1)) return null;
                byte[] word;
                try {
                    word = ldpc.decode(llr, request.maxIterations, budget);
                } catch (CodecException e) {
                    if (e.reason == CodecException.Reason.INVALID_AUDIO) continue;
                    throw e;
                }
                byte[] payload = Arrays.copyOf(word, 77);
                int crc = 0;
                for (int i = 77; i < 91; i++) crc = (crc << 1) | word[i];
                if (Crc14.compute(payload) != crc) continue;
                if (p.scrambled) for (int i = 0; i < 77; i++) payload[i] ^= xor[i];
                String text = Unpack77.unpack(payload);
                if (text == null) {
                    unsupportedCount++;
                    return null;
                }
                Hit hit = new Hit();
                hit.text = text;
                hit.hz = bestF;
                hit.start = bestT - leadSamples;
                hit.dt = (double) hit.start / SAMPLE_RATE - 0.5;
                hit.score = c.score;
                hit.tones = p.coreTones(word);
                hit.snr = snr(hit.tones, bestS);
                return hit;
            }
            return null;
        }

        /** Vertex offset in [-0.5, 0.5] of the parabola through three equally spaced samples. */
        double parabolic(double lo, double mid, double hi) {
            double d = lo - 2 * mid + hi;
            if (!(d < 0)) return 0;
            return Math.max(-0.5, Math.min(0.5, 0.5 * (lo - hi) / d));
        }

        /** Computes normalised LLRs into the llr field; false when the soft symbols carry no information. */
        boolean softBits(int s, int start, boolean logDomain) {
            double meanPower = 0;
            if (logDomain) {
                for (int k = 0; k < dataSyms; k++) {
                    for (int t = 0; t < p.tones; t++) meanPower += toneEnergy(t, s + p.dataPos[k] * BB_SYM);
                }
                meanPower /= dataSyms * p.tones;
            }
            double eps = 1e-9 * meanPower + 1e-30;
            for (int k = 0; k < dataSyms; k++) {
                int sym = p.dataPos[k];
                for (int t = 0; t < p.tones; t++) {
                    double e = toneEnergy(t, s + sym * BB_SYM);
                    amp[t] = logDomain ? Math.log(e + eps) : Math.sqrt(e);
                }
                for (int b = 0; b < bps; b++) {
                    double best0 = Double.NEGATIVE_INFINITY;
                    double best1 = Double.NEGATIVE_INFINITY;
                    for (int t = 0; t < p.tones; t++) {
                        if (((p.toneToValue[t] >> (bps - 1 - b)) & 1) == 0) best0 = Math.max(best0, amp[t]);
                        else best1 = Math.max(best1, amp[t]);
                    }
                    llr[bps * k + b] = best0 - best1;
                }
            }
            boolean[] inside = new boolean[dataSyms];
            int insideSyms = 0;
            for (int k = 0; k < dataSyms; k++) {
                int from = start + p.dataPos[k] * sps;
                inside[k] = from >= 0 && from + sps <= len;
                if (inside[k]) insideSyms++;
            }
            boolean onlyInside = insideSyms * 58 >= 40 * dataSyms;
            double mean = 0;
            int used = 0;
            for (int i = 0; i < 174; i++) {
                if (onlyInside && !inside[i / bps]) continue;
                mean += llr[i];
                used++;
            }
            mean /= used;
            double var = 0;
            for (int i = 0; i < 174; i++) {
                if (onlyInside && !inside[i / bps]) continue;
                var += (llr[i] - mean) * (llr[i] - mean);
            }
            double sd = Math.sqrt(var / used);
            if (!(sd > 0) || Double.isInfinite(sd)) return false;
            for (int i = 0; i < 174; i++) llr[i] *= p.llrScale / sd;
            return true;
        }

        /** SNR in the 2500 Hz reference bandwidth from the decoded tones and the band spectrogram noise level. */
        double snr(int[] tones, int s) {
            double sigma2 = noiseSigma2;
            if (!(sigma2 > 0)) return Double.NaN;
            // Noise bias of a baseband correlation, scaled like the 12 kHz one (filter noise power gain decim * sum h^2).
            double bias = sps * sigma2 * decim * firPower;
            double signal = 0;
            for (int k = 0; k < symbols; k++) signal += toneEnergy(tones[k], s + k * BB_SYM) - bias;
            signal = signal / symbols * 2 / ((double) sps * sps);
            double noiseRef = sigma2 * 2500 / (SAMPLE_RATE / 2.0);
            if (!(signal > 1e-3 * noiseRef)) signal = 1e-3 * noiseRef;
            return Math.round(10 * Math.log10(signal / noiseRef));
        }
    }
}
