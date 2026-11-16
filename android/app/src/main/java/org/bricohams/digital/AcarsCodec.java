package org.bricohams.digital;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Native VHF ACARS (ARINC 618 POA, AM-MSK 2400 bit/s) at 12000 Hz.
 * Message format for encode: "MODE|REG|LABEL|BLOCKID|TEXT" (TEXT may be empty or contain '|'); the audio frequency is
 * fixed by the standard and must be given as 0 or 1800. Decode returns only blocks whose CRC is valid, so every
 * message is confirmed; {@link #decodeFrames} also exposes damaged blocks.
 * ACARS is receive-only for amateurs: transmitting on aeronautical frequencies is illegal.
 */
public final class AcarsCodec implements Codec {
    public static final String PROFILE_ID = "acars-vhf-2400-v1";
    public static final int SAMPLE_RATE = AcarsModulator.SAMPLE_RATE;
    public static final double CENTER_HZ = 1800;
    private static final ModeProfile PROFILE = new ModeProfile(Mode.ACARS, PROFILE_ID, SAMPLE_RATE, 0L);

    private final AcarsModulator modulator = new AcarsModulator();
    private final AcarsDemodulator demodulator = new AcarsDemodulator();

    @Override public ModeProfile profile() {
        return PROFILE;
    }

    @Override public PcmAudio encode(String message, double audioHz) throws CodecException {
        if (audioHz != 0 && audioHz != CENTER_HZ) {
            throw new IllegalArgumentException("ACARS tones are fixed: audio frequency must be 0 or 1800 Hz");
        }
        return encode(parse(message));
    }

    public PcmAudio encode(AcarsFrame frame) {
        return modulator.modulate(frame);
    }

    @Override public List<DecodedMessage> decode(PcmAudio audio, DecodeRequest request) throws CodecException {
        if (request == null) throw new IllegalArgumentException("Request required");
        List<AcarsDemodulator.Result> results = decodeFrames(audio, request, false);
        List<DecodedMessage> out = new ArrayList<>();
        for (AcarsDemodulator.Result result : results) {
            if (out.size() >= request.maxCandidates) break;
            out.add(new DecodedMessage(Mode.ACARS, PROFILE_ID, result.frame.messageText(),
                    request.frameStartUtcMillis, CENTER_HZ, result.startSample / (double) SAMPLE_RATE,
                    result.levelDb));
        }
        return Collections.unmodifiableList(out);
    }

    /** Blocks found in the audio ordered by time; with {@code includeBad} the CRC-failed ones are kept too. */
    public List<AcarsDemodulator.Result> decodeFrames(PcmAudio audio, DecodeRequest request, boolean includeBad)
            throws CodecException {
        if (audio == null || request == null) throw new IllegalArgumentException("Audio and request required");
        WorkBudget budget = request.budget;
        budget.checkpoint();
        if (audio.samples.length == 0) {
            throw new CodecException(CodecException.Reason.INVALID_AUDIO, "Audio is empty");
        }
        if (request.minAudioHz > 2400 || request.maxAudioHz < 1200 || request.maxAudioHz > audio.sampleRate / 2.0) {
            throw new CodecException(CodecException.Reason.INVALID_AUDIO, "Band outside the ACARS tones or Nyquist");
        }
        PcmAudio work = audio;
        if (audio.sampleRate != SAMPLE_RATE) {
            work = new WindowedSincResampler().convert(audio, SAMPLE_RATE, budget);
        }
        List<AcarsDemodulator.Result> all = demodulator.demodulate(work.samples, budget);
        List<AcarsDemodulator.Result> kept = new ArrayList<>();
        for (AcarsDemodulator.Result result : all) {
            if (includeBad || result.crcOk) kept.add(result);
        }
        return Collections.unmodifiableList(kept);
    }

    static AcarsFrame parse(String message) throws CodecException {
        if (message == null) throw new CodecException(CodecException.Reason.INVALID_MESSAGE, "Message required");
        String[] parts = message.split("\\|", 5);
        if (parts.length != 5 || parts[0].length() != 1 || parts[2].length() != 2 || parts[3].length() != 1) {
            throw new CodecException(CodecException.Reason.INVALID_MESSAGE,
                    "Expected MODE|REG|LABEL|BLOCKID|TEXT");
        }
        return AcarsFrame.of(parts[0].charAt(0), parts[1], parts[2], parts[3].charAt(0), parts[4]);
    }
}
