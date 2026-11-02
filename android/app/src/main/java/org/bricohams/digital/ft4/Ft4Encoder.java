package org.bricohams.digital.ft4;

import org.bricohams.digital.CodecException;
import org.bricohams.digital.PcmAudio;
import org.bricohams.digital.fec.Ldpc174;
import org.bricohams.digital.ftx.FtxFrames;
import org.bricohams.digital.ftx.GfskSynth;
import org.bricohams.digital.ftx.Pack77;

/** FT4 transmit chain: message text to 60480 samples at 12000 Hz. */
public final class Ft4Encoder {
    public static final int SAMPLE_RATE = 12000;
    public static final double TONE_SPACING_HZ = 12000.0 / 576;
    private static final GfskSynth SYNTH =
            new GfskSynth(576, 1.0, TONE_SPACING_HZ, SAMPLE_RATE, GfskSynth.RampMode.EXTRA_SYMBOLS);

    private final Ldpc174 ldpc;

    public Ft4Encoder(Ldpc174 ldpc) {
        if (ldpc == null) throw new IllegalArgumentException("LDPC tables required");
        this.ldpc = ldpc;
    }

    public int[] tones(String message) throws CodecException {
        return tonesFromPayload(Pack77.pack(message));
    }

    public int[] tonesFromPayload(byte[] payload77) {
        return FtxFrames.ft4CoreTones(FtxFrames.codeword(payload77, true, ldpc));
    }

    public PcmAudio encode(String message, double tone0Hz) throws CodecException {
        FtxFrames.checkBand(tone0Hz, TONE_SPACING_HZ, 4);
        return new PcmAudio(SAMPLE_RATE, SYNTH.synth(tones(message), tone0Hz));
    }
}
