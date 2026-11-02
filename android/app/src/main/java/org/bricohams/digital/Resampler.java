package org.bricohams.digital;

public interface Resampler {
    /** Output length is floor(input length * output rate / input rate); origin is unchanged. */
    PcmAudio convert(PcmAudio input, int outputSampleRate, WorkBudget budget) throws CodecException;
}
