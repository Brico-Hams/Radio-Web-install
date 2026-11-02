package org.bricohams.digital.ftx;

import org.bricohams.digital.fec.Crc14;
import org.bricohams.digital.fec.Ldpc174;

/** Bit-to-tone framing shared by FT8, FT4 and the legacy FT2 candidate. */
public final class FtxFrames {
    public static final String FT4_XOR =
            "01001010010111101000100110110100101100001000101001111001010101011011111000101";

    private static final byte[] XOR_BITS = new byte[77];
    private static final int[] FT8_GRAY = {0, 1, 3, 2, 5, 6, 4, 7};
    private static final int[] FT4_GRAY = {0, 1, 3, 2};
    private static final int[] FT8_COSTAS = {3, 1, 4, 0, 6, 5, 2};
    private static final int[][] FT4_SYNC = {{0, 1, 3, 2}, {1, 0, 2, 3}, {2, 3, 1, 0}, {3, 2, 0, 1}};

    static {
        if (FT4_XOR.length() != 77) throw new ExceptionInInitializerError("FT4_XOR length");
        for (int i = 0; i < 77; i++) XOR_BITS[i] = (byte) (FT4_XOR.charAt(i) - '0');
    }

    private FtxFrames() {}

    public static byte[] codeword(byte[] payload77, boolean scrambleFt4, Ldpc174 ldpc) {
        if (ldpc == null) throw new IllegalArgumentException("LDPC tables required");
        if (payload77 == null || payload77.length != 77) {
            throw new IllegalArgumentException("payload77 must contain 77 bits");
        }
        byte[] bits = payload77.clone();
        if (scrambleFt4) for (int i = 0; i < 77; i++) bits[i] ^= XOR_BITS[i];
        byte[] word = ldpc.encode(Crc14.appendCrc(bits));
        if (!ldpc.checksPass(word)) throw new IllegalStateException("Encoded word fails parity checks");
        return word;
    }

    public static int[] ft8Tones(byte[] codeword174) {
        requireCodeword(codeword174);
        int[] tones = new int[79];
        for (int s = 0; s < 3; s++) {
            for (int i = 0; i < 7; i++) tones[36 * s + i] = FT8_COSTAS[i];
        }
        for (int k = 0; k < 58; k++) {
            int v = (codeword174[3 * k] << 2) | (codeword174[3 * k + 1] << 1) | codeword174[3 * k + 2];
            tones[(k < 29 ? 7 : 14) + k] = FT8_GRAY[v];
        }
        return tones;
    }

    public static int[] ft4CoreTones(byte[] codeword174) {
        requireCodeword(codeword174);
        int[] tones = new int[103];
        for (int b = 0; b < 4; b++) {
            for (int i = 0; i < 4; i++) tones[33 * b + i] = FT4_SYNC[b][i];
        }
        for (int k = 0; k < 87; k++) {
            int v = (codeword174[2 * k] << 1) | codeword174[2 * k + 1];
            int at = k < 29 ? 4 + k : (k < 58 ? 8 + k : 12 + k);
            tones[at] = FT4_GRAY[v];
        }
        return tones;
    }

    /** Requires the band tone0-2*spacing .. tone0+(toneCount+1)*spacing to lie within 100..5000 Hz. */
    public static void checkBand(double tone0Hz, double spacingHz, int toneCount) {
        if (Double.isNaN(tone0Hz) || Double.isInfinite(tone0Hz)) {
            throw new IllegalArgumentException("tone0Hz must be finite");
        }
        double low = tone0Hz - 2 * spacingHz;
        double high = tone0Hz + (toneCount + 1) * spacingHz;
        if (low < 100 || high > 5000) {
            throw new IllegalArgumentException("Occupied band " + low + ".." + high + " Hz outside 100..5000 Hz");
        }
    }

    private static void requireCodeword(byte[] word) {
        if (word == null || word.length != 174) throw new IllegalArgumentException("codeword must have 174 bits");
        for (byte bit : word) if (bit != 0 && bit != 1) throw new IllegalArgumentException("codeword bits must be 0/1");
    }
}
