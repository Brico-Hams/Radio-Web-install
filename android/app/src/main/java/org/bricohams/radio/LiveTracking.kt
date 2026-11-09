package org.bricohams.radio

import kotlin.math.abs
import kotlin.math.roundToInt
import kotlin.math.sin
import kotlin.math.sqrt

/** Pure geometry of the live pass view; no Android classes so it is testable on the JVM. */
object PassGeometry {
    private const val EARTH_KM = 6371.0
    private const val LIGHT_KM_S = 299792.458

    /** How to move a handheld antenna: turn > 0 is right, raise > 0 is up; null when the phone value is unknown. */
    data class Pointing(val turn: Double?, val targetElevation: Double, val raise: Double?)

    fun wrap(degrees: Double) = ((degrees % 360) + 360) % 360

    /** Signed shortest turn from heading to azimuth in [-180, 180): positive = right. */
    fun turn(heading: Double, azimuth: Double) = wrap(azimuth - heading + 180) - 180

    /** Circular low-pass so the rotating radar does not jitter. */
    fun smooth(previous: Double, next: Double, factor: Double) = wrap(previous + factor * turn(previous, next))

    /** Offset from the radar centre; north up at heading 0, otherwise [headingUp] points to the top of the screen. */
    fun project(azimuth: Double, elevation: Double, radius: Float, headingUp: Double = 0.0): Pair<Float, Float> =
        SatellitePasses.polar(SatelliteLook(0, wrap(azimuth - headingUp), elevation, 0.0), radius)

    /** The phone top raised by x degrees reads pitch = -x, so phone elevation is -pitch. */
    fun pointing(heading: Double?, target: SatelliteLook, phoneElevation: Double?) = Pointing(
        heading?.let { turn(it, target.azimuth) }, target.elevation.coerceIn(0.0, 90.0),
        phoneElevation?.let { target.elevation.coerceIn(0.0, 90.0) - it.coerceIn(-90.0, 90.0) })

    /** Spherical-Earth altitude from slant range and elevation; a few km off the SGP4 geodetic value. */
    fun altitudeKm(look: SatelliteLook, observerHeightKm: Double = 0.0): Double {
        val base = EARTH_KM + observerHeightKm
        val radiusSquared = base * base + look.rangeKm * look.rangeKm +
            2 * base * look.rangeKm * sin(Math.toRadians(look.elevation))
        return sqrt(radiusSquared) - EARTH_KM
    }

    /** Range rate in km/s (positive = receding) from the sampled track; 0 at the very edges of the pass. */
    fun rangeRateKmS(track: List<SatelliteLook>, now: Long): Double =
        SatellitePasses.at(track, now + 500)?.let { later ->
            SatellitePasses.at(track, now - 500)?.let { later.rangeKm - it.rangeKm }
        } ?: 0.0

    /** Frequency to tune/transmit so it matches the nominal one at the satellite: down is shifted by -v/c, up by +v/c. */
    fun dopplerHz(nominalHz: Long, rateKmS: Double, uplink: Boolean = false): Double =
        nominalHz * (1 + (if (uplink) 1 else -1) * rateKmS / LIGHT_KM_S)
}

/** Formats a turn as whole degrees; kept here so tests and UI agree on rounding. */
fun turnDegrees(turn: Double) = abs(turn).roundToInt()
