package org.bricohams.digital.ft2;

import java.util.List;
import org.bricohams.digital.CodecException;
import org.bricohams.digital.DecodeRequest;
import org.bricohams.digital.DecodedMessage;
import org.bricohams.digital.PcmAudio;
import org.bricohams.digital.fec.Ldpc174;
import org.bricohams.digital.ftx.FtxReceiver;
import org.bricohams.digital.ftx.FtxRxProfile;

/** Receiver for the legacy FT2 candidate profile (288 samples per symbol); not a registered codec. */
public final class LegacyFt2CandidateDecoder {
    public static final String PROFILE_ID = "ft2-legacy-candidate-v1";

    private final FtxReceiver receiver;

    public LegacyFt2CandidateDecoder(Ldpc174 ldpc) {
        if (ldpc == null) throw new IllegalArgumentException("LDPC tables required");
        this.receiver = new FtxReceiver(FtxRxProfile.ft2Candidate(), ldpc);
    }

    public List<DecodedMessage> decode(PcmAudio audio, DecodeRequest request) throws CodecException {
        return receiver.decode(audio, request);
    }
}
