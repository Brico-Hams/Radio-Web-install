package org.bricohams.digital;

public final class ModeProfile {
    public final Mode mode;
    public final String id;
    public final int sampleRate;
    public final long slotNanos;

    /** Versioned IDs end in "-v" followed by decimal digits, as in the pinned IDs. */
    public ModeProfile(Mode mode, String id, int sampleRate, long slotNanos) {
        if (mode == null || id == null || !id.matches("\\S+-v[0-9]+") || slotNanos < 0) {
            throw new IllegalArgumentException("Mode, versioned profile ID and nonnegative slot required");
        }
        PcmAudio.checkRate(sampleRate);
        this.mode = mode;
        this.id = id;
        this.sampleRate = sampleRate;
        this.slotNanos = slotNanos;
    }
}
