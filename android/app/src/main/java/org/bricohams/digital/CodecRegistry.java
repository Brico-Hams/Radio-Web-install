package org.bricohams.digital;

import java.util.Collections;
import java.util.List;
import java.util.Set;
import org.bricohams.digital.fec.Ldpc174;
import org.bricohams.digital.ft2.LegacyFt2CandidateDecoder;
import org.bricohams.digital.ft2.LegacyFt2CandidateEncoder;

/**
 * Codecs admitted as supported. FT2 is exposed as a beta: it is the project's own clean-room implementation
 * (12000 S/s, 3.75 s slot) and its decoder uses BP, OSD and a-priori passes, all gated by CRC-14.
 */
public final class CodecRegistry {
    public static final String FT2_PROFILE_ID = "ft2-legacy-candidate-v1";
    /** Label shown next to the codec until it has been validated on air. */
    public static final String FT2_LABEL = "beta";

    private static final ModeProfile FT2_PROFILE = new ModeProfile(Mode.FT2_LEGACY, FT2_PROFILE_ID, 12000, 3_750_000_000L);

    private final Ldpc174 ldpc;

    /** A registry with no codecs, as before. */
    public CodecRegistry() {
        this(null);
    }

    public CodecRegistry(Ldpc174 ldpc) {
        this.ldpc = ldpc;
    }

    public Codec require(String profileId) throws CodecException {
        if (ldpc != null && FT2_PROFILE_ID.equals(profileId)) return new Ft2Codec(ldpc);
        throw new CodecException(CodecException.Reason.UNSUPPORTED_PROFILE,
                "No supported codec for profile: " + profileId);
    }

    public Set<String> availableProfiles() {
        return ldpc == null ? Collections.<String>emptySet() : Collections.singleton(FT2_PROFILE_ID);
    }

    private static final class Ft2Codec implements Codec {
        private final LegacyFt2CandidateEncoder encoder;
        private final LegacyFt2CandidateDecoder decoder;

        Ft2Codec(Ldpc174 ldpc) {
            this.encoder = new LegacyFt2CandidateEncoder(ldpc);
            this.decoder = new LegacyFt2CandidateDecoder(ldpc);
        }

        @Override public ModeProfile profile() {
            return FT2_PROFILE;
        }

        @Override public PcmAudio encode(String message, double audioHz) throws CodecException {
            return encoder.encode(message, audioHz);
        }

        @Override public List<DecodedMessage> decode(PcmAudio audio, DecodeRequest request) throws CodecException {
            return decoder.decode(audio, request);
        }
    }
}
