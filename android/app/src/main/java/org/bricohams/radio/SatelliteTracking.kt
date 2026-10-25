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
        check(active) { "Seguimiento CAT cancelado." }
        try {
            val now = clock()
            val elapsed = monotonic()
            val oldUtc = lastUtc
            val oldElapsed = lastElapsed
            if (oldUtc != null && oldElapsed != null) {
                require(now > oldUtc && now - oldUtc <= 2000 && elapsed > oldElapsed &&
                    elapsed - oldElapsed <= 2000 && kotlin.math.abs((now - oldUtc) - (elapsed - oldElapsed)) <= 500) {
                    "Reloj o intervalo CAT discontinuo. Reinicia el seguimiento."
                }
            }
            val next = target(now)
            check(active) { "Seguimiento CAT cancelado antes de SET." }
            lastUtc = now; lastElapsed = elapsed
            val state = tune(next.frequency10Hz) { active }
            if (!active) return null
            require(clock() - now in 0..1999 && monotonic() - elapsed in 0..1999) { "Respuesta CAT demasiado tardia." }
            require(state.active && state.remote && !state.pending && state.frequency10Hz == next.frequency10Hz) {
                "La radio no confirma Doppler aplicado."
            }
            return next
        } catch (error: Exception) {
            active = false
            throw error
        }
    }
}
