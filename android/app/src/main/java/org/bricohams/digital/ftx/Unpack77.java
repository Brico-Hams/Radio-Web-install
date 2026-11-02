package org.bricohams.digital.ftx;

/** Inverse of the Pack77 grammar (type 1 and type 2). */
public final class Unpack77 {
    private static final String A0 = " 0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    private static final String A1 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    private static final String A2 = "0123456789";
    private static final String A3 = " ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    private static final int C28_BASE = 6257896;
    private static final int G15_GRID_END = 32400;
    private static final int G15_NONE = 32401;
    private static final int G15_RRR = 32402;
    private static final int G15_RR73 = 32403;
    private static final int G15_73 = 32404;
    private static final int G15_REPORT = 32435;

    private Unpack77() {}

    /** Returns the message text, or null for payloads outside the supported grammar. */
    public static String unpack(byte[] payload77) {
        if (payload77 == null || payload77.length != 77) {
            throw new IllegalArgumentException("payload77 must contain 77 bits");
        }
        for (byte b : payload77) if (b != 0 && b != 1) throw new IllegalArgumentException("payload bits must be 0/1");
        int i3 = get(payload77, 74, 3);
        if (i3 != 1 && i3 != 2) return null;
        int c1 = get(payload77, 0, 28);
        boolean flag1 = payload77[28] == 1;
        int c2 = get(payload77, 29, 28);
        boolean flag2 = payload77[57] == 1;
        boolean ack = payload77[58] == 1;
        int g15 = get(payload77, 59, 15);
        String suffix = i3 == 1 ? "/R" : "/P";

        String first;
        boolean special = c1 < C28_BASE;
        if (special) {
            if (flag1 || c1 > 2) return null;
            first = c1 == 0 ? "DE" : (c1 == 1 ? "QRZ" : "CQ");
        } else {
            first = callText(c1);
            if (first == null) return null;
            if (flag1) first += suffix;
        }
        if (c2 < C28_BASE) return null;
        String second = callText(c2);
        if (second == null) return null;
        if (flag2) second += suffix;

        String extra;
        if (g15 < G15_GRID_END) {
            extra = "" + (char) ('A' + g15 / 1800) + (char) ('A' + (g15 / 100) % 18)
                    + (char) ('0' + (g15 / 10) % 10) + (char) ('0' + g15 % 10);
            if (ack) {
                if (special) return null;
                extra = "R " + extra;
            }
        } else if (special) {
            if (g15 != G15_NONE || ack) return null;
            extra = null;
        } else if (g15 == G15_NONE) {
            if (ack) return null;
            extra = null;
        } else if (g15 == G15_RRR || g15 == G15_RR73 || g15 == G15_73) {
            if (ack) return null;
            extra = g15 == G15_RRR ? "RRR" : (g15 == G15_RR73 ? "RR73" : "73");
        } else if (g15 > G15_73 && g15 <= G15_REPORT + 49 && g15 >= G15_REPORT - 30) {
            int r = g15 - G15_REPORT;
            int magnitude = Math.abs(r);
            extra = (ack ? "R" : "") + (r < 0 ? "-" : "+") + (char) ('0' + magnitude / 10) + (char) ('0' + magnitude % 10);
        } else {
            return null;
        }
        return extra == null ? first + " " + second : first + " " + second + " " + extra;
    }

    private static String callText(int c28) {
        int n = c28 - C28_BASE;
        if (n < 0) return null;
        int a5 = n % 27;
        n /= 27;
        int a4 = n % 27;
        n /= 27;
        int a3 = n % 27;
        n /= 27;
        int a2 = n % 10;
        n /= 10;
        int a1 = n % 36;
        n /= 36;
        if (n >= 37) return null;
        String padded = "" + A0.charAt(n) + A1.charAt(a1) + A2.charAt(a2) + A3.charAt(a3) + A3.charAt(a4) + A3.charAt(a5);
        String call = padded.trim();
        if (call.length() < 3 || call.length() > 6) return null;
        for (int i = 0; i < call.length(); i++) {
            char c = call.charAt(i);
            if (!((c >= '0' && c <= '9') || (c >= 'A' && c <= 'Z'))) return null;
        }
        StringBuilder norm = new StringBuilder(6);
        if (!isDigit(call.charAt(2)) && isDigit(call.charAt(1))) norm.append(' ');
        norm.append(call);
        while (norm.length() < 6) norm.append(' ');
        return norm.toString().equals(padded) ? call : null;
    }

    private static boolean isDigit(char c) {
        return c >= '0' && c <= '9';
    }

    private static int get(byte[] bits, int start, int width) {
        int v = 0;
        for (int i = 0; i < width; i++) v = (v << 1) | bits[start + i];
        return v;
    }
}
