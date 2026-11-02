package org.bricohams.digital.ft8;

import java.util.List;
import org.bricohams.digital.CodecException;
import org.bricohams.digital.DecodeRequest;
import org.bricohams.digital.DecodedMessage;
import org.bricohams.digital.PcmAudio;
import org.bricohams.digital.fec.Ldpc174;
import org.bricohams.digital.ftx.FtxReceiver;
import org.bricohams.digital.ftx.FtxRxProfile;

/** FT8 receive chain: the shared {@link FtxReceiver} engine with the FT8 profile. */
public final class Ft8Decoder {
    public static final String PROFILE_ID = "ft8-standard-77-v1";

    private final FtxReceiver receiver;
    /** Count of CRC-valid frames dropped by Unpack77 in the last decode call. */
    int unsupportedCount;
    /** Nanoseconds spent in each phase of the last decode call (pass-1 phases; pass2Nanos covers passes 2 and 3). */
    long spectrogramNanos;
    long syncNanos;
    long refineLdpcNanos;
    long pass2Nanos;

    public Ft8Decoder(Ldpc174 ldpc) {
        if (ldpc == null) throw new IllegalArgumentException("LDPC tables required");
        this.receiver = new FtxReceiver(FtxRxProfile.ft8(), ldpc);
    }

    /** {spectrogram, sync, refine+LDPC, pass 2} nanoseconds of the last decode call. */
    public long[] lastPhaseNanos() {
        return receiver.lastPhaseNanos();
    }

    public List<DecodedMessage> decode(PcmAudio audio, DecodeRequest request) throws CodecException {
        try {
            return receiver.decode(audio, request);
        } finally {
            unsupportedCount = receiver.unsupportedCount();
            long[] phases = receiver.lastPhaseNanos();
            spectrogramNanos = phases[0];
            syncNanos = phases[1];
            refineLdpcNanos = phases[2];
            pass2Nanos = phases[3];
        }
    }
}
