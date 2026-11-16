package org.bricohams.digital;

/**
 * Block check sequence of ARINC 618 / ACARS: CRC-16/KERMIT (polynomial 0x1021 reflected as 0x8408, initial value 0,
 * no final XOR). It runs over the frame bytes from the mode character to the ETX/ETB inclusive, parity bits included,
 * and is sent low byte first, so running it over the frame plus its BCS leaves a zero residue.
 */
public final class AcarsCrc {
    private static final int POLY_REFLECTED = 0x8408;
    private static final int[] TABLE = new int[256];

    static {
        for (int i = 0; i < 256; i++) {
            int crc = i;
            for (int bit = 0; bit < 8; bit++) {
                crc = (crc & 1) != 0 ? (crc >>> 1) ^ POLY_REFLECTED : crc >>> 1;
            }
            TABLE[i] = crc;
        }
    }

    private AcarsCrc() {}

    public static int update(int crc, int value) {
        return ((crc & 0xFFFF) >>> 8) ^ TABLE[(crc ^ value) & 0xFF];
    }

    public static int compute(byte[] data) {
        if (data == null) throw new IllegalArgumentException("Data required");
        return compute(data, 0, data.length);
    }

    /** CRC of data[from, to). */
    public static int compute(byte[] data, int from, int to) {
        if (data == null || from < 0 || to < from || to > data.length) {
            throw new IllegalArgumentException("Invalid CRC range");
        }
        int crc = 0;
        for (int i = from; i < to; i++) crc = update(crc, data[i]);
        return crc;
    }
}
