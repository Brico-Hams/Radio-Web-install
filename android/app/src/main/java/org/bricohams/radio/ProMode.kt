package org.bricohams.radio

/**
 * PRO mode, like Bricohams-Studio: session-only (never persisted, off by default). Normal mode needs a verified full backup
 * before any write; PRO mode lets an experienced user skip that step and accepts the risk.
 */
object WritePolicy {
    /** True when a write may start: a verified backup exists, or PRO mode was accepted for this session. */
    fun mayWrite(proMode: Boolean, hasBackup: Boolean): Boolean = proMode || hasBackup
    /** The backup is re-verified right before writing only when there is one and PRO mode did not waive it. */
    fun mustVerifyBackup(proMode: Boolean, hasBackup: Boolean): Boolean = hasBackup && !proMode
}
