package org.bricohams.radio

import kotlin.math.PI
import kotlin.math.asin
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.exp
import kotlin.math.hypot
import kotlin.math.ln
import kotlin.math.log10
import kotlin.math.min
import kotlin.math.pow
import kotlin.math.sin
import kotlin.math.sqrt

/** Amateur radio calculators; port of tools-core.js (same formulas, constants and tables). Pure Kotlin, no Android types. */
object RadioTools {
    const val EARTH_RADIUS_KM = 6371.0088
    const val SPEED_OF_LIGHT = 299.792458

    data class GreatCircle(val distanceKm: Double, val longPathKm: Double, val bearing: Double, val reverseBearing: Double)
    data class SwrResult(val swr: Double, val gamma: Double, val returnLossDb: Double, val mismatchLossDb: Double, val reflectedPercent: Double)
    data class CoaxResult(val dbPer100m: Double, val lossDb: Double, val powerOutW: Double, val efficiencyPercent: Double)
    data class PowerLevels(val watts: Double, val dBm: Double, val dBW: Double)
    data class ErpResult(val erpW: Double, val eirpW: Double)
    data class AntennaLengths(val wavelengthM: Double, val halfWaveM: Double, val quarterWaveM: Double)
    data class BandRange(val band: String, val minMHz: Double, val maxMHz: Double)
    enum class PowerUnit { W, DBM, DBW }

    private fun valid(point: Maidenhead.LatLon) =
        point.latitude.isFinite() && point.latitude in -90.0..90.0 && point.longitude.isFinite() && point.longitude in -180.0..180.0

    fun latLonToLocator(latitude: Double, longitude: Double, length: Int = 6) = Maidenhead.fromLatLon(latitude, longitude, length)

    fun greatCircle(a: Maidenhead.LatLon, b: Maidenhead.LatLon): GreatCircle {
        requireUi(valid(a) && valid(b)) { UiText(R.string.tools_err_coordinates) }
        val p1 = Math.toRadians(a.latitude)
        val p2 = Math.toRadians(b.latitude)
        val dLon = Math.toRadians(b.longitude - a.longitude)
        val h = sin((p2 - p1) / 2).pow(2) + cos(p1) * cos(p2) * sin(dLon / 2).pow(2)
        val distance = 2 * EARTH_RADIUS_KM * asin(min(1.0, sqrt(h)))
        fun initial(from: Double, to: Double, lon: Double): Double {
            val y = sin(lon) * cos(to)
            val x = cos(from) * sin(to) - sin(from) * cos(to) * cos(lon)
            return (Math.toDegrees(atan2(y, x)) + 360) % 360
        }
        return GreatCircle(distance, 2 * PI * EARTH_RADIUS_KM - distance, initial(p1, p2, dLon), initial(p2, p1, -dLon))
    }

    /** Samples of the short great-circle path from [a] to [b] (the first and last samples are the endpoints). */
    fun greatCirclePath(a: Maidenhead.LatLon, b: Maidenhead.LatLon, points: Int = 64): List<Maidenhead.LatLon> {
        requireUi(valid(a) && valid(b)) { UiText(R.string.tools_err_coordinates) }
        val count = points.coerceAtLeast(2)
        fun vector(p: Maidenhead.LatLon): DoubleArray {
            val lat = Math.toRadians(p.latitude)
            val lon = Math.toRadians(p.longitude)
            return doubleArrayOf(cos(lat) * cos(lon), cos(lat) * sin(lon), sin(lat))
        }
        val va = vector(a)
        val vb = vector(b)
        val chord = hypot(va[0] - vb[0], hypot(va[1] - vb[1], va[2] - vb[2]))
        val angle = 2 * asin((chord / 2).coerceAtMost(1.0))
        return List(count) { index ->
            val t = index.toDouble() / (count - 1)
            when {
                index == 0 -> a
                index == count - 1 -> b
                angle < 1e-9 -> a
                // Antipodal points have no unique path: go over the north pole.
                PI - angle < 1e-9 -> if (t < 0.5) Maidenhead.LatLon(a.latitude + (90 - a.latitude) * 2 * t, a.longitude)
                    else Maidenhead.LatLon(90 - (90 - b.latitude) * (2 * t - 1), b.longitude)
                else -> {
                    val wa = sin((1 - t) * angle) / sin(angle)
                    val wb = sin(t * angle) / sin(angle)
                    val x = wa * va[0] + wb * vb[0]
                    val y = wa * va[1] + wb * vb[1]
                    val z = wa * va[2] + wb * vb[2]
                    Maidenhead.LatLon(Math.toDegrees(atan2(z, hypot(x, y))), Math.toDegrees(atan2(y, x)))
                }
            }
        }
    }

    private fun swrResult(gamma: Double) = SwrResult(
        swr = (1 + gamma) / (1 - gamma),
        gamma = gamma,
        returnLossDb = if (gamma == 0.0) Double.POSITIVE_INFINITY else -20 * log10(gamma),
        mismatchLossDb = -10 * log10(1 - gamma * gamma),
        reflectedPercent = gamma * gamma * 100)

    fun swrFromPower(forwardW: Double, reflectedW: Double): SwrResult {
        requireUi(forwardW.isFinite() && reflectedW.isFinite() && forwardW > 0 && reflectedW >= 0) { UiText(R.string.tools_err_swr_power) }
        requireUi(reflectedW < forwardW) { UiText(R.string.tools_err_swr_reflected) }
        return swrResult(sqrt(reflectedW / forwardW))
    }

    fun swrFromRatio(swr: Double): SwrResult {
        requireUi(swr.isFinite() && swr >= 1) { UiText(R.string.tools_err_swr_ratio) }
        return swrResult((swr - 1) / (swr + 1))
    }

    /** Typical catalogue matched-line attenuation, dB per 100 m, by frequency in MHz (sorted by frequency). */
    val COAX_TABLE: Map<String, List<Pair<Double, Double>>> = linkedMapOf(
        "RG-58" to listOf(10.0 to 4.6, 50.0 to 10.8, 100.0 to 16.1, 200.0 to 23.0, 400.0 to 33.8, 1000.0 to 60.0),
        "RG-8X" to listOf(10.0 to 3.3, 50.0 to 8.2, 100.0 to 12.1, 200.0 to 17.7, 400.0 to 26.2, 1000.0 to 44.3),
        "RG-213" to listOf(10.0 to 2.0, 50.0 to 4.6, 100.0 to 6.6, 200.0 to 9.8, 400.0 to 14.8, 1000.0 to 26.2),
        "LMR-400" to listOf(30.0 to 2.2, 50.0 to 2.9, 150.0 to 4.9, 450.0 to 8.9, 900.0 to 12.8))

    /** Frequency span (MHz) covered by the attenuation table of [cable]. */
    fun coaxRange(cable: String): ClosedFloatingPointRange<Double> {
        val points = requireNotNullUi(COAX_TABLE[cable]) { UiText(R.string.tools_err_cable) }
        return points.first().first..points.last().first
    }

    /** Attenuation in dB/100 m, log-log interpolated between the table points. */
    fun coaxDbPer100m(cable: String, frequencyMHz: Double): Double {
        val points = requireNotNullUi(COAX_TABLE[cable]) { UiText(R.string.tools_err_cable) }
        val range = coaxRange(cable)
        requireUi(frequencyMHz.isFinite() && frequencyMHz in range) { UiText(R.string.tools_err_freq_range, range.start.format(), range.endInclusive.format()) }
        val upper = points.indexOfFirst { it.first >= frequencyMHz }
        if (points[upper].first == frequencyMHz) return points[upper].second
        val (f0, d0) = points[upper - 1]
        val (f1, d1) = points[upper]
        val t = ln(frequencyMHz / f0) / ln(f1 / f0)
        return exp(ln(d0) + t * ln(d1 / d0))
    }

    private fun Double.format() = if (this == kotlin.math.floor(this)) toLong().toString() else toString()

    fun coaxLoss(cable: String?, frequencyMHz: Double, lengthM: Double, powerW: Double, customDbPer100m: Double? = null): CoaxResult {
        requireUi(lengthM.isFinite() && lengthM >= 0) { UiText(R.string.tools_err_length) }
        requireUi(powerW.isFinite() && powerW >= 0) { UiText(R.string.tools_err_power_nonneg) }
        val db = if (customDbPer100m != null) {
            requireUi(customDbPer100m.isFinite() && customDbPer100m >= 0) { UiText(R.string.tools_err_attenuation) }
            customDbPer100m
        } else coaxDbPer100m(requireNotNullUi(cable) { UiText(R.string.tools_err_cable) }, frequencyMHz)
        val lossDb = db * lengthM / 100
        val efficiency = 10.0.pow(-lossDb / 10)
        return CoaxResult(db, lossDb, powerW * efficiency, efficiency * 100)
    }

    fun power(value: Double, unit: PowerUnit): PowerLevels {
        requireUi(value.isFinite()) { UiText(R.string.tools_err_power_value) }
        if (unit == PowerUnit.W) {
            requireUi(value > 0) { UiText(R.string.tools_err_power_w) }
            return PowerLevels(value, 10 * log10(value) + 30, 10 * log10(value))
        }
        val dBW = if (unit == PowerUnit.DBW) value else value - 30
        return PowerLevels(10.0.pow(dBW / 10), dBW + 30, dBW)
    }

    fun erp(powerW: Double, lossDb: Double, gainDbd: Double): ErpResult {
        requireUi(powerW.isFinite() && powerW > 0) { UiText(R.string.tools_err_erp_power) }
        requireUi(lossDb.isFinite() && lossDb >= 0) { UiText(R.string.tools_err_erp_loss) }
        requireUi(gainDbd.isFinite()) { UiText(R.string.tools_err_erp_gain) }
        val erp = powerW * 10.0.pow((gainDbd - lossDb) / 10)
        return ErpResult(erp, erp * 10.0.pow(0.215))
    }

    fun antennaLengths(frequencyMHz: Double, velocityFactor: Double = 0.95): AntennaLengths {
        requireUi(frequencyMHz.isFinite() && frequencyMHz > 0) { UiText(R.string.tools_err_antenna_freq) }
        requireUi(velocityFactor.isFinite() && velocityFactor in 0.5..1.0) { UiText(R.string.tools_err_vf) }
        val wavelength = SPEED_OF_LIGHT / frequencyMHz
        return AntennaLengths(wavelength, wavelength / 2 * velocityFactor, wavelength / 4 * velocityFactor)
    }

    // ITU Radio Regulations amateur allocations for regions 1, 2 and 3 (null: no allocation); national rules may be narrower.
    private val BAND_SPECS: List<Pair<String, List<Pair<Double, Double>?>>> = listOf(
        "160m" to listOf(1.81 to 2.0, 1.8 to 2.0, 1.8 to 2.0),
        "80m" to listOf(3.5 to 3.8, 3.5 to 4.0, 3.5 to 3.9),
        "60m" to listOf(5.3515 to 5.3665, 5.3515 to 5.3665, 5.3515 to 5.3665),
        "40m" to listOf(7.0 to 7.2, 7.0 to 7.3, 7.0 to 7.2),
        "30m" to listOf(10.1 to 10.15, 10.1 to 10.15, 10.1 to 10.15),
        "20m" to listOf(14.0 to 14.35, 14.0 to 14.35, 14.0 to 14.35),
        "17m" to listOf(18.068 to 18.168, 18.068 to 18.168, 18.068 to 18.168),
        "15m" to listOf(21.0 to 21.45, 21.0 to 21.45, 21.0 to 21.45),
        "12m" to listOf(24.89 to 24.99, 24.89 to 24.99, 24.89 to 24.99),
        "10m" to listOf(28.0 to 29.7, 28.0 to 29.7, 28.0 to 29.7),
        "6m" to listOf(50.0 to 52.0, 50.0 to 54.0, 50.0 to 54.0),
        "4m" to listOf(70.0 to 70.5, null, null),
        "2m" to listOf(144.0 to 146.0, 144.0 to 148.0, 144.0 to 148.0),
        "1.25m" to listOf(null, 222.0 to 225.0, null),
        "70cm" to listOf(430.0 to 440.0, 420.0 to 450.0, 430.0 to 440.0),
        "23cm" to listOf(1240.0 to 1300.0, 1240.0 to 1300.0, 1240.0 to 1300.0))

    val REGION_BANDS: Map<Int, List<BandRange>> = (1..3).associateWith { region ->
        BAND_SPECS.mapNotNull { (name, ranges) -> ranges[region - 1]?.let { BandRange(name, it.first, it.second) } }
    }

    fun bandOf(frequencyMHz: Double, region: Int = 1): String? {
        val bands = requireNotNullUi(REGION_BANDS[region]) { UiText(R.string.tools_err_region) }
        if (!frequencyMHz.isFinite()) return null
        return bands.firstOrNull { frequencyMHz >= it.minMHz && frequencyMHz <= it.maxMHz }?.band
    }

    /** RST meanings: string resources indexed by digit - 1. */
    val RST_READABILITY = listOf(R.string.rst_r1, R.string.rst_r2, R.string.rst_r3, R.string.rst_r4, R.string.rst_r5)
    val RST_STRENGTH = listOf(R.string.rst_s1, R.string.rst_s2, R.string.rst_s3, R.string.rst_s4, R.string.rst_s5,
        R.string.rst_s6, R.string.rst_s7, R.string.rst_s8, R.string.rst_s9)
    val RST_TONE = listOf(R.string.rst_t1, R.string.rst_t2, R.string.rst_t3, R.string.rst_t4, R.string.rst_t5,
        R.string.rst_t6, R.string.rst_t7, R.string.rst_t8, R.string.rst_t9)
}
