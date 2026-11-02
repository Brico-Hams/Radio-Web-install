package org.bricohams.digital;

/**
 * Original offline, symmetric Blackman-windowed sinc interpolation.
 *
 * Cutoff is 90% of the smaller Nyquist; support radius is ceil(48 / scale)
 * input samples, scale = min(1, outputRate/inputRate). Each fractional kernel
 * is normalized to unity DC. Outside the capture, the nearest endpoint is held.
 *
 * Output sample j evaluates the source at j*inputRate/outputRate: the symmetric
 * kernel uses future samples, compensating the radius-sample causal group delay
 * offline. There is no leading delay or tail extension; length uses exact floor.
 * The top 10% of the smaller Nyquist is a transition guard, not a flat passband.
 *
 * No amplitude clipping or automatic gain is applied. Sinc ringing that exceeds
 * the PCM range is an explicit INVALID_AUDIO error; callers must supply headroom.
 * Same-rate conversion is an exact independently owned copy without filtering.
 */
public final class WindowedSincResampler implements Resampler {
    public PcmAudio convert(PcmAudio input, int outputSampleRate, WorkBudget budget) throws CodecException {
        if (budget == null) throw invalid("Work budget required");
        budget.checkpoint();
        if (input == null || outputSampleRate < 8000 || outputSampleRate > 192000) {
            throw invalid("PCM input and output rate 8000..192000 required");
        }
        Progress progress = new Progress(budget);
        float[] source = input.samples;
        for (float value : source) {
            if (!Float.isFinite(value) || value < -1 || value > 1) {
                throw invalid("Input PCM was mutated to invalid samples");
            }
            progress.sample();
        }
        int length = (int) ((long) source.length * outputSampleRate / input.sampleRate);
        float[] result = new float[length];
        if (outputSampleRate == input.sampleRate) {
            for (int i = 0; i < length; i++) {
                result[i] = source[i];
                progress.sample();
            }
        } else if (length != 0) {
            double scale = Math.min(1.0, outputSampleRate / (double) input.sampleRate);
            double cutoff = 0.9 * scale;
            int radius = (int) Math.ceil(48 / scale);
            for (int j = 0; j < length; j++) {
                double position = (long) j * input.sampleRate / (double) outputSampleRate;
                int first = (int) Math.ceil(position - radius);
                int last = (int) Math.floor(position + radius);
                double weighted = 0;
                double normalization = 0;
                for (int k = first; k <= last; k++) {
                    double distance = k - position;
                    double phase = Math.PI * distance / radius;
                    double window = 0.42 + 0.5 * Math.cos(phase) + 0.08 * Math.cos(2 * phase);
                    double argument = Math.PI * cutoff * distance;
                    double sinc = argument == 0 ? 1 : Math.sin(argument) / argument;
                    double weight = cutoff * sinc * window;
                    int at = Math.max(0, Math.min(source.length - 1, k));
                    weighted += source[at] * weight;
                    normalization += weight;
                    progress.sample();
                }
                if (!Double.isFinite(normalization) || normalization <= 0) {
                    throw invalid("Invalid sinc normalization");
                }
                float value = (float) (weighted / normalization);
                if (!Float.isFinite(value) || value < -1 || value > 1) {
                    throw invalid("Resampling exceeds PCM range; input needs headroom");
                }
                result[j] = value;
                progress.sample();
            }
        }
        budget.checkpoint();
        return new PcmAudio(outputSampleRate, result, budget);
    }

    private static CodecException invalid(String message) {
        return new CodecException(CodecException.Reason.INVALID_AUDIO, message);
    }

    private static final class Progress {
        private final WorkBudget budget;
        private int pending;

        Progress(WorkBudget budget) { this.budget = budget; }

        void sample() throws CodecException {
            if (++pending == 4096) {
                budget.checkpoint();
                pending = 0;
            }
        }
    }
}
