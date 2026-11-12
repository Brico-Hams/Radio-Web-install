package org.bricohams.radio

/** Last status the rotor screen received, shared read-only so other views can show where the rotor points. */
object RotorLink {
    private const val MAX_AGE_MS = 10_000L
    private data class Sample(val azimuth: Double, val elevation: Double, val atMs: Long)
    @Volatile private var latest: Sample? = null

    fun publish(status: RotorStatus, nowMs: Long = System.currentTimeMillis()) {
        val azimuth = PassGeometry.wrap(status.azMechanical + status.northOffset)
        latest = if (azimuth.isFinite() && status.elevation.isFinite() && status.calibrated)
            Sample(azimuth, status.elevation, nowMs) else null
    }

    fun clear() { latest = null }

    /** True azimuth and elevation reported by a connected rotor, or null when none is connected or the report is stale. */
    fun pointing(nowMs: Long = System.currentTimeMillis()): Pair<Double, Double>? =
        latest?.takeIf { nowMs - it.atMs <= MAX_AGE_MS }?.let { Pair(it.azimuth, it.elevation) }
}
