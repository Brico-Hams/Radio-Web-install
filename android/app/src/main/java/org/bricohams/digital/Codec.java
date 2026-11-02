package org.bricohams.digital;

import java.util.List;

/**
 * Finite text frame codec, with no automatic resampling.
 * Implementations must reject empty/mismatched audio and bands beyond Nyquist,
 * validate their message subset and occupied band, and honor the work budget.
 * Decode returns an immutable, deduplicated list ordered by time/frequency/text,
 * bounded by maxCandidates. Cancellation/exhaustion must propagate, not return partial results.
 */
public interface Codec {
    ModeProfile profile();
    PcmAudio encode(String message, double audioHz) throws CodecException;
    List<DecodedMessage> decode(PcmAudio audio, DecodeRequest request) throws CodecException;
}
