package org.bricohams.digital;

public final class CodecException extends Exception {
    private static final long serialVersionUID = 1L;

    public enum Reason {
        UNSUPPORTED_PROFILE, INVALID_MESSAGE, INVALID_AUDIO, CANCELLED,
        BUDGET_EXCEEDED, SPEC_DATA_MISSING
    }

    public final Reason reason;

    public CodecException(Reason reason, String message) {
        super(message);
        if (reason == null || message == null || message.isEmpty()) {
            throw new IllegalArgumentException("Typed reason and diagnostic required");
        }
        this.reason = reason;
    }
}
