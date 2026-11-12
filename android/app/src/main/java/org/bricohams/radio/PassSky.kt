package org.bricohams.radio

import java.util.Locale
import kotlin.math.asin
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.sin
import kotlin.math.tan

/** Pure sky maths for the pass chart (sun, moon, direction of motion, share text); no Android classes. */
object PassSky {
    /** Azimuth (0 = north, clockwise) and elevation in degrees. */
    data class Horizontal(val azimuth: Double, val elevation: Double)

    private const val J2000 = 2451545.0
    private fun rad(deg: Double) = Math.toRadians(deg)
    private fun deg(rad: Double) = Math.toDegrees(rad)

    fun julianDay(epochMs: Long) = epochMs / 86400000.0 + 2440587.5

    /** Mean obliquity and the main nutation term, Meeus, Astronomical Algorithms 2nd ed., ch. 22 and 25. */
    private fun obliquity(t: Double, omega: Double) = 23.439291 - 0.0130042 * t + 0.00256 * cos(rad(omega))

    /** Equatorial coordinates (right ascension, declination, degrees) from ecliptic longitude/latitude. */
    private fun equatorial(lambda: Double, beta: Double, epsilon: Double): Pair<Double, Double> {
        val l = rad(lambda); val b = rad(beta); val e = rad(epsilon)
        val ra = atan2(sin(l) * cos(e) - tan(b) * sin(e), cos(l))
        val dec = asin(sin(b) * cos(e) + cos(b) * sin(e) * sin(l))
        return Pair(PassGeometry.wrap(deg(ra)), deg(dec))
    }

    /** Sun right ascension and declination, Meeus ch. 25 (low-accuracy method, about 0.01 degree). */
    fun sunEquatorial(jd: Double): Pair<Double, Double> {
        val t = (jd - J2000) / 36525
        val l0 = 280.46646 + 36000.76983 * t + 0.0003032 * t * t
        val m = rad(357.52911 + 35999.05029 * t - 0.0001537 * t * t)
        val c = (1.914602 - 0.004817 * t - 0.000014 * t * t) * sin(m) + (0.019993 - 0.000101 * t) * sin(2 * m) + 0.000289 * sin(3 * m)
        val omega = 125.04 - 1934.136 * t
        val lambda = l0 + c - 0.00569 - 0.00478 * sin(rad(omega))
        return equatorial(lambda, 0.0, obliquity(t, omega))
    }

    /**
     * Moon right ascension, declination and horizontal parallax (degrees), from the low-precision lunar series of the
     * Astronomical Almanac (section D, "Moon, low precision"); about 0.3 degree in longitude.
     */
    fun moonEquatorial(jd: Double): Triple<Double, Double, Double> {
        val t = (jd - J2000) / 36525
        fun s(a: Double, b: Double) = sin(rad(a + b * t))
        fun c(a: Double, b: Double) = cos(rad(a + b * t))
        val lambda = 218.32 + 481267.881 * t + 6.29 * s(135.0, 477198.87) - 1.27 * s(259.3, -413335.36) +
            0.66 * s(235.7, 890534.22) + 0.21 * s(269.9, 954397.74) - 0.19 * s(357.5, 35999.05) - 0.11 * s(186.5, 966404.03)
        val beta = 5.13 * s(93.3, 483202.02) + 0.28 * s(228.2, 960400.89) - 0.28 * s(318.3, 6003.15) - 0.17 * s(217.6, -407332.21)
        val parallax = 0.9508 + 0.0518 * c(135.0, 477198.87) + 0.0095 * c(259.3, -413335.36) +
            0.0078 * c(235.7, 890534.22) + 0.0028 * c(269.9, 954397.74)
        val (ra, dec) = equatorial(lambda, beta, obliquity(t, 125.04 - 1934.136 * t))
        return Triple(ra, dec, parallax)
    }

    /** Equatorial to horizontal, Meeus ch. 13 (eqs. 13.5, 13.6) with mean sidereal time from ch. 12 (eq. 12.4). */
    fun horizontal(raDeg: Double, decDeg: Double, jd: Double, latitude: Double, longitudeEast: Double): Horizontal {
        val t = (jd - J2000) / 36525
        val gmst = 280.46061837 + 360.98564736629 * (jd - J2000) + 0.000387933 * t * t - t * t * t / 38710000
        val h = rad(PassGeometry.wrap(gmst + longitudeEast - raDeg))
        val phi = rad(latitude); val delta = rad(decDeg)
        val southAzimuth = atan2(sin(h), cos(h) * sin(phi) - tan(delta) * cos(phi))
        val elevation = asin(sin(phi) * sin(delta) + cos(phi) * cos(delta) * cos(h))
        return Horizontal(PassGeometry.wrap(deg(southAzimuth) + 180), deg(elevation))
    }

    fun sun(epochMs: Long, observer: ObserverPosition): Horizontal {
        val jd = julianDay(epochMs)
        val (ra, dec) = sunEquatorial(jd)
        return horizontal(ra, dec, jd, observer.latitude, observer.longitude)
    }

    /** Moon with the topocentric parallax correction (Meeus ch. 40: altitude drops by about the parallax times cos(h)). */
    fun moon(epochMs: Long, observer: ObserverPosition): Horizontal {
        val jd = julianDay(epochMs)
        val (ra, dec, parallax) = moonEquatorial(jd)
        val geocentric = horizontal(ra, dec, jd, observer.latitude, observer.longitude)
        return geocentric.copy(elevation = geocentric.elevation - parallax * cos(rad(geocentric.elevation)))
    }

    /**
     * Direction of travel on the chart, in radians as used by canvas drawing (0 = right, clockwise, y down), from two
     * consecutive chart positions; null when they coincide.
     */
    fun motionAngle(ax: Float, ay: Float, bx: Float, by: Float): Double? {
        val dx = (bx - ax).toDouble(); val dy = (by - ay).toDouble()
        return if (dx * dx + dy * dy < 1e-12) null else atan2(dy, dx)
    }

    /** Chart direction between two track points, north up, degrees clockwise from the top of the chart. */
    fun motionBearing(a: SatelliteLook, b: SatelliteLook): Double? {
        val (ax, ay) = SatellitePasses.polar(a, 1f)
        val (bx, by) = SatellitePasses.polar(b, 1f)
        return motionAngle(ax, ay, bx, by)?.let { PassGeometry.wrap(deg(it) + 90) }
    }

    /** Compass word for a bearing, e.g. for the radar description; index into 8 names starting at north. */
    fun octant(bearing: Double) = (PassGeometry.wrap(bearing + 22.5) / 45).toInt() % 8

    fun shareText(template: String, name: String, azimuth: Double, elevation: Double, rxHz: Double, locale: Locale): String =
        String.format(locale, template, name, azimuth, elevation, rxHz / 1e6)

    fun bookmarkKey(norad: Int, aosMs: Long) = "$norad:$aosMs"

    /** Toggles [key] in [saved] and returns the new set. */
    fun toggle(saved: Set<String>, key: String): Set<String> = if (key in saved) saved - key else saved + key
}
