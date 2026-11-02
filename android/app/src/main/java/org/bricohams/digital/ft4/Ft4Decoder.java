package org.bricohams.digital.ft4;

import java.util.List;
import org.bricohams.digital.CodecException;
import org.bricohams.digital.DecodeRequest;
import org.bricohams.digital.DecodedMessage;
import org.bricohams.digital.PcmAudio;
import org.bricohams.digital.fec.Ldpc174;
import org.bricohams.digital.ftx.FtxReceiver;
import org.bricohams.digital.ftx.FtxRxProfile;

/** FT4 receive chain: the shared {@link FtxReceiver} engine with the FT4 profile. */
public final class Ft4Decoder {
    public static final String PROFILE_ID = "ft4-standard-77-v1";

    private final FtxReceiver receiver;

    public Ft4Decoder(Ldpc174 ldpc) {
        if (ldpc == null) throw new IllegalArgumentException("LDPC tables required");
        this.receiver = new FtxReceiver(FtxRxProfile.ft4(), ldpc);
    }

    public List<DecodedMessage> decode(PcmAudio audio, DecodeRequest request) throws CodecException {
        return receiver.decode(audio, request);
    }
}
