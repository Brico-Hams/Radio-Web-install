package org.bricohams.digital;

import java.util.Collections;
import java.util.Set;

/** No direction-complete, independently gated codecs have been admitted. */
public final class CodecRegistry {
    public Codec require(String profileId) throws CodecException {
        throw new CodecException(CodecException.Reason.UNSUPPORTED_PROFILE,
                "No supported codec for profile: " + profileId);
    }

    public Set<String> availableProfiles() {
        return Collections.emptySet();
    }
}
