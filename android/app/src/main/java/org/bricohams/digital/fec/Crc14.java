package org.bricohams.digital.fec;

/** CRC-14, polynomial 0x6757, MSB first, zero init, no reflection, no final XOR. */
public final class Crc14 {
    private static final int LOW_MASK = 0x2757;
    private static final int WIDTH_MASK = 0x3FFF;

    private Crc14() {}

    /** CRC of the 77 payload bits followed by 19 zero bits. */
    public static int compute(byte[] payload77) {
        requireBits(payload77, 77, "payload77");
        int reg = 0;
        for (int i = 0; i < 96; i++) {
            int in = i < 77 ? payload77[i] : 0;
            int top = (reg >>> 13) & 1;
            reg = ((reg << 1) & WIDTH_MASK) | in;
            if (top != 0) reg ^= LOW_MASK;
        }
        return reg;
    }

    /** Returns payload77 followed by the 14 CRC bits, MSB first. */
    public static byte[] appendCrc(byte[] payload77) {
        int crc = compute(payload77);
        byte[] out = new byte[91];
        System.arraycopy(payload77, 0, out, 0, 77);
        for (int i = 0; i < 14; i++) out[77 + i] = (byte) ((crc >>> (13 - i)) & 1);
        return out;
    }

    static void requireBits(byte[] bits, int length, String name) {
        if (bits == null || bits.length != length) {
            throw new IllegalArgumentException(name + " must contain " + length + " bits");
        }
        for (byte bit : bits) {
            if (bit != 0 && bit != 1) throw new IllegalArgumentException(name + " bits must be 0 or 1");
        }
    }
}
