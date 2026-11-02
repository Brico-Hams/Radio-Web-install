package org.bricohams.digital;

/**
 * Mono PCM. Construction copies the input; the public array is not immutable.
 * Transfer ownership on submission and do not mutate it while another operation uses it.
 */
public final class PcmAudio {
    public final int sampleRate;
    public final float[] samples;

    public PcmAudio(int sampleRate, float[] samples) {
        checkRate(sampleRate);
        if (samples == null || samples.length > 120L * sampleRate) {
            throw new IllegalArgumentException("PCM must be non-null and at most 120 seconds");
        }
        float[] copy = samples.clone();
        for (float sample : copy) {
            if (!Float.isFinite(sample) || sample < -1 || sample > 1) {
                throw new IllegalArgumentException("PCM samples must be finite and in [-1,1]");
            }
        }
        this.sampleRate = sampleRate;
        this.samples = copy;
    }

    /** Budgeted defensive copy for internally produced resampler output. */
    PcmAudio(int sampleRate, float[] samples, WorkBudget budget) throws CodecException {
        checkRate(sampleRate);
        if (samples == null || samples.length > 120L * sampleRate || budget == null) {
            throw new IllegalArgumentException("Invalid budgeted PCM construction");
        }
        budget.checkpoint();
        this.sampleRate = sampleRate;
        this.samples = new float[samples.length];
        for (int i = 0; i < samples.length; i++) {
            if (i != 0 && (i & 4095) == 0) budget.checkpoint();
            float value = samples[i];
            if (!Float.isFinite(value) || value < -1 || value > 1) {
                throw new CodecException(CodecException.Reason.INVALID_AUDIO, "Invalid resampled PCM");
            }
            this.samples[i] = value;
        }
        budget.checkpoint();
    }

    static void checkRate(int sampleRate) {
        if (sampleRate < 8000 || sampleRate > 192000) {
            throw new IllegalArgumentException("PCM sample rate must be 8000..192000");
        }
    }
}
