package org.bricohams.digital;

/**
 * AM-MSK audio synthesis for ARINC 618 VHF ACARS: 2400 bit/s as continuous-phase 1200 Hz / 2400 Hz tones at 12000 Hz
 * (five samples per bit). The bits are NRZI coded as in acarsdec: a 1 keeps the tone and a 0 switches it, so the
 * pre-key of ones is a steady tone. Burst layout: pre-key, bit sync "+*", SYN SYN, the block (SOH..DEL), a short tail.
 *
 * Output is audio for loopback tests and WAV export only. Transmitting on aeronautical frequencies is illegal for
 * amateur stations: nothing in the app routes this audio to a radio or keys PTT.
 */
public final class AcarsModulator {
    public static final int SAMPLE_RATE = 12000;
    public static final int BIT_RATE = 2400;
    public static final int SAMPLES_PER_BIT = SAMPLE_RATE / BIT_RATE;
    public static final double LOW_HZ = 1200;
    public static final double HIGH_HZ = 2400;
    public static final int PREKEY_BITS = 32;
    public static final int TAIL_BITS = 8;
    private static final float AMPLITUDE = 0.5f;

    /** Data bits of one burst (0/1 per element, before NRZI coding), pre-key and tail included. */
    public static byte[] bits(AcarsFrame frame) {
        if (frame == null) throw new IllegalArgumentException("Frame required");
        byte[] block = frame.toBytes();
        int bytes = 4 + block.length;
        byte[] bits = new byte[PREKEY_BITS + 8 * bytes + TAIL_BITS];
        int n = 0;
        for (int i = 0; i < PREKEY_BITS; i++) bits[n++] = 1;
        n = put(bits, n, AcarsFrame.withParity('+'));
        n = put(bits, n, AcarsFrame.withParity('*'));
        n = put(bits, n, AcarsFrame.SYN);
        n = put(bits, n, AcarsFrame.SYN);
        for (byte value : block) n = put(bits, n, value & 0xFF);
        for (int i = 0; i < TAIL_BITS; i++) bits[n++] = 1;
        return bits;
    }

    /** The 32-bit pattern "+*" SYN SYN with the first transmitted bit in bit 0. */
    static int syncPattern() {
        return AcarsFrame.withParity('+') | AcarsFrame.withParity('*') << 8 | AcarsFrame.SYN << 16 | AcarsFrame.SYN << 24;
    }

    public PcmAudio modulate(AcarsFrame frame) {
        byte[] bits = bits(frame);
        float[] out = new float[bits.length * SAMPLES_PER_BIT];
        double phase = 0;
        boolean high = true;
        int n = 0;
        for (byte bit : bits) {
            if (bit == 0) high = !high;
            double step = 2 * Math.PI * (high ? HIGH_HZ : LOW_HZ) / SAMPLE_RATE;
            for (int i = 0; i < SAMPLES_PER_BIT; i++) {
                phase += step;
                out[n++] = (float) (AMPLITUDE * Math.sin(phase));
            }
        }
        return new PcmAudio(SAMPLE_RATE, out);
    }

    private static int put(byte[] bits, int at, int value) {
        for (int k = 0; k < 8; k++) bits[at + k] = (byte) ((value >> k) & 1);
        return at + 8;
    }
}
