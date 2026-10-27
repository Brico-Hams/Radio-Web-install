package org.bricohams.radio

class SatelliteTracking(
    private val target: (Long) -> SatelliteTarget,
    private val tune: (Long, () -> Boolean) -> CatState,
    private val clock: () -> Long = System::currentTimeMillis,
    private val monotonic: () -> Long = { System.nanoTime() / 1_000_000 }
) {
    @Volatile var active = true
        private set
    private var lastUtc: Long? = null
    private var lastElapsed: Long? = null
    fun cancel() { active = false }
    fun step(): SatelliteTarget? {
        checkUi(active) { UiText(R.string.err_tracking_cancelled) }
        try {
            val now = clock()
            val elapsed = monotonic()
            val oldUtc = lastUtc
            val oldElapsed = lastElapsed
            if (oldUtc != null && oldElapsed != null) {
                requireUi(now > oldUtc && now - oldUtc <= 2000 && elapsed > oldElapsed &&
                    elapsed - oldElapsed <= 2000 && kotlin.math.abs((now - oldUtc) - (elapsed - oldElapsed)) <= 500) {
                    UiText(R.string.err_tracking_clock)
                }
            }
            val next = target(now)
            checkUi(active) { UiText(R.string.err_tracking_cancelled_before_set) }
            lastUtc = now; lastElapsed = elapsed
            val state = tune(next.frequency10Hz) { active }
            if (!active) return null
            requireUi(clock() - now in 0..1999 && monotonic() - elapsed in 0..1999) { UiText(R.string.err_cat_response_late) }
            requireUi(state.active && state.remote && !state.pending && state.frequency10Hz == next.frequency10Hz) {
                UiText(R.string.err_doppler_unconfirmed)
            }
            return next
        } catch (error: Exception) {
            active = false
            throw error
        }
    }
}
