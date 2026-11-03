package org.bricohams.digital.ftx;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Locale;
import org.bricohams.digital.CodecException;

/**
 * A-priori knowledge for decoding: the operator's own call and the call of the station being worked.
 * Each hypothesis fixes some bits of the 77-bit message (before scrambling): a1 = "CQ ...", a2 = "MyCall ...",
 * a3 = "MyCall DxCall ...". A decode found under a hypothesis is only reported after CRC-14 passes and the
 * known bits are confirmed in the result.
 */
public final class ApContext {
    /** Known message bits of one hypothesis. */
    public static final class Pattern {
        public final String tag;
        public final byte[] value = new byte[77];
        public final boolean[] known = new boolean[77];

        Pattern(String tag, byte[] bits, int callBits) {
            this.tag = tag;
            for (int i = 0; i < callBits; i++) mark(i, bits);
            for (int i = 74; i < 77; i++) mark(i, bits);
        }

        private void mark(int i, byte[] bits) {
            known[i] = true;
            value[i] = bits[i];
        }

        public int knownCount() {
            int n = 0;
            for (boolean k : known) if (k) n++;
            return n;
        }
    }

    // A syntactically valid third-party call used only to fill the message bits that stay unknown.
    private static final String FILLER = "AA0AAA";

    public final String myCall;
    public final String dxCall;
    private final List<Pattern> patterns;

    /** Blank or unpackable calls are ignored; the CQ hypothesis is always present. */
    public ApContext(String myCall, String dxCall) {
        this.myCall = clean(myCall);
        this.dxCall = this.myCall == null ? null : clean(dxCall);
        List<Pattern> list = new ArrayList<Pattern>(3);
        try {
            list.add(new Pattern("a1", Pack77.pack("CQ " + FILLER), 29));
            if (this.myCall != null) {
                list.add(new Pattern("a2", Pack77.pack(this.myCall + " " + FILLER), 29));
                if (this.dxCall != null) {
                    list.add(new Pattern("a3", Pack77.pack(this.myCall + " " + this.dxCall), 58));
                }
            }
        } catch (CodecException e) {
            throw new IllegalStateException("Validated AP calls failed to pack", e);
        }
        this.patterns = Collections.unmodifiableList(list);
    }

    public List<Pattern> patterns() {
        return patterns;
    }

    private static String clean(String call) {
        if (call == null) return null;
        String c = call.trim().toUpperCase(Locale.ROOT);
        if (c.isEmpty()) return null;
        try {
            Pack77.pack(c + " " + FILLER);
            Pack77.pack(FILLER + " " + c);
            return c;
        } catch (CodecException e) {
            return null;
        }
    }
}
