package org.bricohams.radio

import kotlin.math.abs
import kotlin.math.max

/**
 * Checks a sampled pass against the rotor's mechanics before arming it. The firmware stops tracking when the
 * mechanical azimuth would cross its ±180° cable stop, when an axis must move faster than the motor profile allows
 * and above 89° elevation; the app warns in advance and proposes where to point the cable cut.
 */
object RotorPlanner {
    const val ZENITH_LIMIT = 89.0
    const val ACQUISITION_TOLERANCE = 15.0

    data class Plan(
        /** Mechanical AZ/EL to pre-position before AOS. */
        val aosAzimuth: Double,
        val aosElevation: Double,
        val crossesCableStop: Boolean,
        val maxRateDegS: Double,
        val tooFast: Boolean,
        val zenith: Boolean,
        /** True azimuth the mechanical ±180° cut currently points to. */
        val cutAzimuth: Double,
        /** Best true azimuth for the cut (middle of the sky arc the pass never visits), null if every azimuth is used. */
        val suggestedCutAzimuth: Double?,
        /** Fraction (0..1) of the visible samples the firmware can follow without stopping. */
        val trackable: Double,
    ) {
        val clean get() = !crossesCableStop && !tooFast && !zenith
    }

    fun wrap(degrees: Double): Double = ((degrees % 360) + 360) % 360
    fun difference(a: Double, b: Double): Double = wrap(a - b + 180) - 180
    fun mechanical(trueAzimuth: Double, northOffset: Double) = difference(trueAzimuth, northOffset)

    fun plan(track: List<SatelliteLook>, northOffset: Double, maxDegPerSecond: Double): Plan {
        val visible = track.filter { it.elevation >= 0 }
        requireUi(visible.size >= 2) { UiText(R.string.rotor_err_track) }
        requireUi(northOffset.isFinite() && maxDegPerSecond.isFinite() && maxDegPerSecond > 0) { UiText(R.string.rotor_err_track) }
        var crosses = false
        var maxRate = 0.0
        var good = 1
        var blocked = false
        var unwrapped = visible.first().azimuth
        var low = unwrapped
        var high = unwrapped
        for (index in 1 until visible.size) {
            val a = visible[index - 1]
            val b = visible[index]
            val seconds = (b.time - a.time) / 1000.0
            val turn = difference(b.azimuth, a.azimuth)
            unwrapped += turn
            low = minOf(low, unwrapped); high = max(high, unwrapped)
            val jump = abs(mechanical(b.azimuth, northOffset) - mechanical(a.azimuth, northOffset)) > 180
            val rate = if (seconds > 0) max(abs(turn), abs(b.elevation - a.elevation)) / seconds else 0.0
            maxRate = max(maxRate, rate)
            if (jump) crosses = true
            if (jump || rate > maxDegPerSecond || b.elevation >= ZENITH_LIMIT) blocked = true
            if (!blocked) good++
        }
        val span = high - low
        val suggested = if (span < 360) wrap(high + (360 - span) / 2) else null
        val first = visible.first()
        return Plan(
            aosAzimuth = mechanical(first.azimuth, northOffset),
            aosElevation = first.elevation.coerceIn(0.0, 90.0),
            crossesCableStop = crosses,
            maxRateDegS = maxRate,
            tooFast = maxRate > maxDegPerSecond,
            zenith = visible.any { it.elevation >= ZENITH_LIMIT },
            cutAzimuth = wrap(northOffset + 180),
            suggestedCutAzimuth = suggested,
            trackable = good.toDouble() / visible.size,
        )
    }
}
