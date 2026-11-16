package org.bricohams.digital;

import java.util.Arrays;
import java.util.Objects;

/**
 * Immutable ARINC 618 (VHF ACARS, "plain old ACARS") block: mode, 7-character aircraft address, technical
 * acknowledgement, label, block id and up to 220 text characters. {@link #toBytes()} builds the byte frame from SOH to
 * the DEL suffix (7-bit characters with odd parity in bit 8, BCS appended low byte first); {@link #parse(byte[])}
 * reads it back, checks parity and CRC and repairs one or two flipped bits that the parity points to, like acarsdec.
 */
public final class AcarsFrame {
    public static final int SOH = 0x01;
    public static final int STX = 0x02;
    public static final int ETX = 0x03;
    public static final int SYN = 0x16;
    public static final int NAK = 0x15;
    public static final int ETB = 0x17;
    public static final int DEL = 0x7F;
    public static final int ADDRESS_LENGTH = 7;
    public static final int MAX_TEXT = 220;
    public static final char PAD = '.';
    /** Bytes before the text: SOH, mode, address, technical ack, label and block id. */
    static final int HEADER = 13;
    /** Longest frame handed to {@link #parse(byte[])}: header, STX, text, ETX/ETB and BCS (no DEL). */
    static final int MAX_BYTES = HEADER + 1 + MAX_TEXT + 1 + 2;

    public final char mode;
    /** Always {@value #ADDRESS_LENGTH} characters, left-padded with '.'. */
    public final String address;
    public final char ack;
    public final String label;
    public final char blockId;
    public final String text;
    /** True when the block ends with ETB (more blocks follow) instead of ETX. */
    public final boolean continued;

    /** Result of {@link #parse(byte[])}. {@code parityErrors} counts the received characters with bad parity. */
    public static final class Parsed {
        public final AcarsFrame frame;
        public final boolean crcOk;
        public final int parityErrors;
        public final int correctedBits;

        Parsed(AcarsFrame frame, boolean crcOk, int parityErrors, int correctedBits) {
            this.frame = frame;
            this.crcOk = crcOk;
            this.parityErrors = parityErrors;
            this.correctedBits = correctedBits;
        }
    }

    private AcarsFrame(char mode, String address, char ack, String label, char blockId, String text, boolean continued) {
        this.mode = mode;
        this.address = address;
        this.ack = ack;
        this.label = label;
        this.blockId = blockId;
        this.text = text;
        this.continued = continued;
    }

    public static AcarsFrame of(char mode, String registration, String label, char blockId, String text)
            throws CodecException {
        return of(mode, registration, (char) NAK, label, blockId, text, false);
    }

    public static AcarsFrame of(char mode, String registration, char ack, String label, char blockId, String text,
            boolean continued) throws CodecException {
        if (!printable(mode)) throw invalid("ACARS mode must be a printable ASCII character");
        if (registration == null || registration.isEmpty() || registration.length() > ADDRESS_LENGTH) {
            throw invalid("ACARS registration must have 1.." + ADDRESS_LENGTH + " characters");
        }
        for (int i = 0; i < registration.length(); i++) {
            if (!printable(registration.charAt(i))) throw invalid("ACARS registration must be printable ASCII");
        }
        if (ack != (char) NAK && !printable(ack)) throw invalid("ACARS technical ack must be printable ASCII or NAK");
        if (label == null || label.length() != 2 || !labelChar(label.charAt(0)) || !labelChar(label.charAt(1))) {
            throw invalid("ACARS label must have 2 characters");
        }
        if (!printable(blockId)) throw invalid("ACARS block id must be a printable ASCII character");
        if (text == null || text.length() > MAX_TEXT) throw invalid("ACARS text is limited to " + MAX_TEXT + " characters");
        for (int i = 0; i < text.length(); i++) {
            char c = text.charAt(i);
            if (!printable(c) && c != '\r' && c != '\n') throw invalid("ACARS text must be printable ASCII");
        }
        StringBuilder address = new StringBuilder(ADDRESS_LENGTH);
        for (int i = registration.length(); i < ADDRESS_LENGTH; i++) address.append(PAD);
        address.append(registration);
        return new AcarsFrame(mode, address.toString(), ack, label, blockId, text, continued);
    }

    /** Aircraft registration without the '.' padding. */
    public String registration() {
        int start = 0;
        while (start < address.length() && address.charAt(start) == PAD) start++;
        return address.substring(start);
    }

    /** Downlink blocks carry a digit '0'..'9' as block id; uplinks use letters. */
    public boolean isDownlink() {
        return blockId >= '0' && blockId <= '9';
    }

    /** First 4 text characters of a downlink, empty otherwise. */
    public String messageNumber() {
        return isDownlink() && text.length() >= 4 ? text.substring(0, 4) : "";
    }

    /** Text characters 4..9 of a downlink, empty otherwise. */
    public String flightId() {
        return isDownlink() && text.length() >= 10 ? text.substring(4, 10) : "";
    }

    /** Text without the message number and flight id of a downlink. */
    public String body() {
        return isDownlink() && text.length() >= 10 ? text.substring(10) : text;
    }

    /** The "MODE|REG|LABEL|BLOCKID|TEXT" form accepted by {@code AcarsCodec.encode}. */
    public String messageText() {
        return mode + "|" + registration() + "|" + label + "|" + blockId + "|" + text;
    }

    /** SOH .. ETX/ETB, BCS (low byte first), DEL; characters carry odd parity, the BCS bytes do not. */
    public byte[] toBytes() {
        int textBytes = text.isEmpty() ? 0 : 1 + text.length();
        byte[] out = new byte[HEADER + textBytes + 4];
        int i = 0;
        out[i++] = (byte) withParity(SOH);
        out[i++] = (byte) withParity(mode);
        for (int k = 0; k < ADDRESS_LENGTH; k++) out[i++] = (byte) withParity(address.charAt(k));
        out[i++] = (byte) withParity(ack);
        out[i++] = (byte) withParity(label.charAt(0));
        out[i++] = (byte) withParity(label.charAt(1));
        out[i++] = (byte) withParity(blockId);
        if (textBytes != 0) {
            out[i++] = (byte) withParity(STX);
            for (int k = 0; k < text.length(); k++) out[i++] = (byte) withParity(text.charAt(k));
        }
        out[i++] = (byte) withParity(continued ? ETB : ETX);
        int crc = AcarsCrc.compute(out, 1, i);
        out[i++] = (byte) (crc & 0xFF);
        out[i++] = (byte) (crc >>> 8);
        out[i] = (byte) withParity(DEL);
        return out;
    }

    /**
     * Parses SOH .. ETX/ETB plus the two BCS bytes (a trailing DEL is ignored). Throws INVALID_MESSAGE when the
     * structure is not an ACARS block; a block whose CRC cannot be verified or repaired is still returned, with
     * {@code crcOk} false and bad-parity characters shown as '?'.
     */
    public static Parsed parse(byte[] raw) throws CodecException {
        if (raw == null) throw new IllegalArgumentException("Frame bytes required");
        int terminator = -1;
        for (int i = HEADER; i < raw.length; i++) {
            int c = raw[i] & 0x7F;
            if (c == ETX || c == ETB) {
                terminator = i;
                break;
            }
        }
        if (terminator < 0 || raw.length < terminator + 3 || (raw[0] & 0x7F) != SOH) {
            throw invalid("Not an ACARS block");
        }
        if (terminator != HEADER && ((raw[HEADER] & 0x7F) != STX || terminator - HEADER - 1 > MAX_TEXT)) {
            throw invalid("Malformed ACARS text");
        }
        byte[] data = Arrays.copyOf(raw, terminator + 3);
        int[] bad = new int[terminator];
        int badCount = 0;
        for (int i = 1; i <= terminator; i++) {
            if (!parityOk(data[i])) bad[badCount++] = i;
        }
        boolean crcOk = residueIsZero(data);
        int corrected = 0;
        if (!crcOk) {
            int fixed = correct(data, terminator, bad, badCount);
            if (fixed > 0) {
                crcOk = true;
                corrected = fixed;
            }
        }
        StringBuilder address = new StringBuilder(ADDRESS_LENGTH);
        for (int i = 2; i < 2 + ADDRESS_LENGTH; i++) address.append(character(data, i, crcOk));
        String label = "" + character(data, 10, crcOk) + character(data, 11, crcOk);
        StringBuilder text = new StringBuilder();
        for (int i = HEADER + 1; i < terminator; i++) text.append(character(data, i, crcOk));
        AcarsFrame frame = new AcarsFrame(character(data, 1, crcOk), address.toString(), character(data, 9, crcOk),
                label, character(data, 12, crcOk), text.toString(), (data[terminator] & 0x7F) == ETB);
        return new Parsed(frame, crcOk, badCount, corrected);
    }

    /** Odd-parity byte: 7-bit character in bits 0..6, parity in bit 7. */
    public static int withParity(int character) {
        int c = character & 0x7F;
        return Integer.bitCount(c) % 2 == 0 ? c | 0x80 : c;
    }

    public static boolean parityOk(int value) {
        return Integer.bitCount(value & 0xFF) % 2 == 1;
    }

    private static char character(byte[] data, int index, boolean clean) {
        return !clean && !parityOk(data[index]) ? '?' : (char) (data[index] & 0x7F);
    }

    private static boolean residueIsZero(byte[] data) {
        return AcarsCrc.compute(data, 1, data.length) == 0;
    }

    private static void flip(byte[] data, int index, int bit) {
        data[index] ^= 1 << bit;
    }

    /**
     * Repairs one or two flipped bits through the CRC. Parity only locates errors in the characters it covers, so a
     * bad-parity character gets one flipped bit (any of its 8), optionally with one more in the unprotected BCS; with no
     * parity error only a single BCS bit is tried. Returns the number of repaired bits, 0 when nothing fits.
     */
    private static int correct(byte[] data, int terminator, int[] bad, int badCount) {
        int bcs = terminator + 1;
        if (badCount == 0) {
            for (int bit = 0; bit < 16; bit++) {
                flip(data, bcs + (bit >> 3), bit & 7);
                if (residueIsZero(data)) return 1;
                flip(data, bcs + (bit >> 3), bit & 7);
            }
            return 0;
        }
        if (badCount == 1) {
            for (int bit = 0; bit < 8; bit++) {
                flip(data, bad[0], bit);
                if (residueIsZero(data)) return 1;
                flip(data, bad[0], bit);
            }
            for (int bit = 0; bit < 8; bit++) {
                flip(data, bad[0], bit);
                for (int other = 0; other < 16; other++) {
                    flip(data, bcs + (other >> 3), other & 7);
                    if (residueIsZero(data)) return 2;
                    flip(data, bcs + (other >> 3), other & 7);
                }
                flip(data, bad[0], bit);
            }
            return 0;
        }
        if (badCount == 2) {
            for (int first = 0; first < 8; first++) {
                flip(data, bad[0], first);
                for (int second = 0; second < 8; second++) {
                    flip(data, bad[1], second);
                    if (residueIsZero(data)) return 2;
                    flip(data, bad[1], second);
                }
                flip(data, bad[0], first);
            }
        }
        return 0;
    }

    private static boolean printable(char c) {
        return c >= 0x20 && c <= 0x7E;
    }

    private static boolean labelChar(char c) {
        return printable(c) || c == (char) DEL;
    }

    private static CodecException invalid(String message) {
        return new CodecException(CodecException.Reason.INVALID_MESSAGE, message);
    }

    @Override public boolean equals(Object other) {
        if (this == other) return true;
        if (!(other instanceof AcarsFrame)) return false;
        AcarsFrame o = (AcarsFrame) other;
        return mode == o.mode && ack == o.ack && blockId == o.blockId && continued == o.continued
                && address.equals(o.address) && label.equals(o.label) && text.equals(o.text);
    }

    @Override public int hashCode() {
        return Objects.hash(mode, address, ack, label, blockId, text, continued);
    }

    @Override public String toString() {
        return "AcarsFrame[" + messageText() + "]";
    }
}
