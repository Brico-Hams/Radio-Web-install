package org.bricohams.digital;

public final class DecodedMessage {
    public final Mode mode;
    public final String profileId, text;
    public final long frameStartUtcMillis;
    public final double audioHz, timeOffsetSeconds, snrDb;

    public DecodedMessage(Mode mode, String profileId, String text, long frameStartUtcMillis,
            double audioHz, double timeOffsetSeconds, double snrDb) {
        if (mode == null || profileId == null || profileId.isEmpty() || text == null || text.isEmpty()
                || !Double.isFinite(audioHz) || audioHz < 0 || !Double.isFinite(timeOffsetSeconds)
                || Double.isInfinite(snrDb)) {
            throw new IllegalArgumentException("Invalid decoded message fields");
        }
        this.mode = mode;
        this.profileId = profileId;
        this.text = text;
        this.frameStartUtcMillis = frameStartUtcMillis;
        this.audioHz = audioHz;
        this.timeOffsetSeconds = timeOffsetSeconds;
        this.snrDb = snrDb;
    }
}
