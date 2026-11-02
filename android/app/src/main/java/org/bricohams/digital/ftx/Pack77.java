package org.bricohams.digital.ftx;

import org.bricohams.digital.CodecException;

/** Packs the ftx-standard-77-v1 message grammar (type 1 and type 2) into 77 bits. */
public final class Pack77 {
    private static final String A0 = " 0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    private static final String A1 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    private static final String A2 = "0123456789";
    private static final String A3 = " ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    private static final int C28_BASE = 6257896;
    private static final int G15_NONE = 32401;
    private static final int G15_RRR = 32402;
    private static final int G15_73 = 32404;
    private static final int G15_REPORT = 32435;

    private Pack77() {}

    private static final class Call {
        int c28;
        boolean rover;
        boolean portable;
    }

    public static byte[] pack(String message) throws CodecException {
        if (message == null) throw invalid("null");
        String[] tokens = message.split(" ", -1);
        for (String token : tokens) {
            if (token.isEmpty()) throw invalid(message);
            for (int i = 0; i < token.length(); i++) {
                char c = token.charAt(i);
                boolean ok = (c >= '0' && c <= '9') || (c >= 'A' && c <= 'Z') || c == '/' || c == '+' || c == '-';
                if (!ok) throw invalid(message);
            }
        }
        if (tokens.length < 2 || tokens.length > 4) throw invalid(message);

        int first = special(tokens[0]);
        Call call1 = new Call();
        int next = 1;
        if (first >= 0) {
            call1.c28 = first;
        } else {
            call1 = call(tokens[0], message);
        }
        Call call2 = call(tokens[next++], message);
        boolean ack = false;
        int g15 = G15_NONE;
        int remaining = tokens.length - next;
        if (remaining > 0) {
            String extra = tokens[next];
            if (first >= 0) {
                if (remaining != 1 || !isGrid(extra)) throw invalid(message);
                g15 = grid(extra);
            } else if (remaining == 2) {
                if (!"R".equals(extra) || !isGrid(tokens[next + 1])) throw invalid(message);
                ack = true;
                g15 = grid(tokens[next + 1]);
            } else if (remaining == 1) {
                if ("RRR".equals(extra)) {
                    g15 = G15_RRR;
                } else if ("73".equals(extra)) {
                    g15 = G15_73;
                } else if (isGrid(extra)) {
                    g15 = grid(extra);
                } else {
                    String number = extra;
                    if (extra.charAt(0) == 'R') {
                        ack = true;
                        number = extra.substring(1);
                    }
                    g15 = G15_REPORT + report(number, message);
                }
            } else {
                throw invalid(message);
            }
        }

        boolean anyRover = call1.rover || call2.rover;
        boolean anyPortable = call1.portable || call2.portable;
        if (anyRover && anyPortable) throw invalid(message);
        int i3 = anyPortable ? 2 : 1;

        byte[] bits = new byte[77];
        put(bits, 0, 28, call1.c28);
        put(bits, 28, 1, call1.rover || call1.portable ? 1 : 0);
        put(bits, 29, 28, call2.c28);
        put(bits, 57, 1, call2.rover || call2.portable ? 1 : 0);
        put(bits, 58, 1, ack ? 1 : 0);
        put(bits, 59, 15, g15);
        put(bits, 74, 3, i3);
        return bits;
    }

    private static int special(String token) {
        if ("DE".equals(token)) return 0;
        if ("QRZ".equals(token)) return 1;
        if ("CQ".equals(token)) return 2;
        return -1;
    }

    private static Call call(String token, String message) throws CodecException {
        Call result = new Call();
        String base = token;
        if (token.endsWith("/R")) {
            result.rover = true;
            base = token.substring(0, token.length() - 2);
        } else if (token.endsWith("/P")) {
            result.portable = true;
            base = token.substring(0, token.length() - 2);
        }
        if (base.length() < 3 || base.length() > 6) throw invalid(message);
        for (int i = 0; i < base.length(); i++) {
            char c = base.charAt(i);
            if (!((c >= '0' && c <= '9') || (c >= 'A' && c <= 'Z'))) throw invalid(message);
        }
        StringBuilder norm = new StringBuilder(6);
        if (!isDigit(base.charAt(2)) && isDigit(base.charAt(1))) norm.append(' ');
        norm.append(base);
        if (norm.length() > 6) throw invalid(message);
        while (norm.length() < 6) norm.append(' ');
        int a0 = A0.indexOf(norm.charAt(0));
        int a1 = A1.indexOf(norm.charAt(1));
        int a2 = A2.indexOf(norm.charAt(2));
        int a3 = A3.indexOf(norm.charAt(3));
        int a4 = A3.indexOf(norm.charAt(4));
        int a5 = A3.indexOf(norm.charAt(5));
        if (a0 < 0 || a1 < 0 || a2 < 0 || a3 < 0 || a4 < 0 || a5 < 0) throw invalid(message);
        if ((norm.charAt(3) == ' ' && norm.charAt(4) != ' ')
                || (norm.charAt(4) == ' ' && norm.charAt(5) != ' ')) {
            throw invalid(message);
        }
        int n = ((((a0 * 36 + a1) * 10 + a2) * 27 + a3) * 27 + a4) * 27 + a5;
        result.c28 = C28_BASE + n;
        return result;
    }

    private static boolean isDigit(char c) {
        return c >= '0' && c <= '9';
    }

    private static boolean isGrid(String t) {
        return t.length() == 4 && t.charAt(0) >= 'A' && t.charAt(0) <= 'R'
                && t.charAt(1) >= 'A' && t.charAt(1) <= 'R' && isDigit(t.charAt(2)) && isDigit(t.charAt(3));
    }

    private static int grid(String t) {
        return ((t.charAt(0) - 'A') * 18 + (t.charAt(1) - 'A')) * 100
                + (t.charAt(2) - '0') * 10 + (t.charAt(3) - '0');
    }

    private static int report(String t, String message) throws CodecException {
        if (t.length() != 3 || (t.charAt(0) != '+' && t.charAt(0) != '-')
                || !isDigit(t.charAt(1)) || !isDigit(t.charAt(2))) {
            throw invalid(message);
        }
        int value = (t.charAt(1) - '0') * 10 + (t.charAt(2) - '0');
        if (t.charAt(0) == '-') value = -value;
        if (value < -30 || value > 49) throw invalid(message);
        return value;
    }

    private static void put(byte[] bits, int start, int width, int value) {
        for (int i = 0; i < width; i++) bits[start + i] = (byte) ((value >>> (width - 1 - i)) & 1);
    }

    private static CodecException invalid(String message) {
        return new CodecException(CodecException.Reason.INVALID_MESSAGE,
                "Unsupported message: \"" + message + "\"");
    }
}
