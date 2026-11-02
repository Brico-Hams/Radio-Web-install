package org.bricohams.digital;

public final class DecodeRequest {
    public final long frameStartUtcMillis;
    public final double minAudioHz, maxAudioHz;
    public final int maxCandidates, maxIterations;
    public final WorkBudget budget;

    /** A future codec must also check this band against its input Nyquist. */
    public DecodeRequest(long frameStartUtcMillis, double minAudioHz, double maxAudioHz,
            int maxCandidates, int maxIterations, WorkBudget budget) {
        if (budget == null || !Double.isFinite(minAudioHz) || !Double.isFinite(maxAudioHz)
                || minAudioHz < 0 || minAudioHz >= maxAudioHz
                || maxCandidates < 1 || maxCandidates > 64 || maxIterations < 1 || maxIterations > 100) {
            throw new IllegalArgumentException("Invalid decode band, limits or budget");
        }
        this.frameStartUtcMillis = frameStartUtcMillis;
        this.minAudioHz = minAudioHz;
        this.maxAudioHz = maxAudioHz;
        this.maxCandidates = maxCandidates;
        this.maxIterations = maxIterations;
        this.budget = budget;
    }
}
