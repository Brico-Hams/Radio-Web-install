package org.bricohams.radio

import kotlin.math.exp
import kotlin.math.min
import kotlin.math.roundToInt

/**
 * Normalized FTX-1 meter model, mirrored from data/remote-meter-model.json (remote-meters.cjs is the reference and
 * MeterModelTest compares the numbers). Sources: FTX-1 CAT Operation Reference Manual 2508-C (RM/SM raw 000-255) and the
 * host-side scales of bg7nzl-ftx1ctl ftx1cat.py. These are uncalibrated estimates.
 */
object MeterModel {
    /** Tune is refused above this configured power; the operator lowers it, it is never lowered automatically. */
    const val TUNE_POWER_MAX_W = 10

    data class Reading(val raw: Int, val value: Double?, val unit: String, val text: String, val pending: Boolean = false)

    private val PO_POINTS = listOf(55 to 0.5, 73 to 1.0, 113 to 3.0, 139 to 5.0, 164 to 7.5, 189 to 10.0, 255 to 15.0)
    private val S_STEPS = listOf(0 to 0, 14 to 1, 42 to 3, 81 to 5, 103 to 7)
    private val S_OVER = listOf(202 to 20.0, 233 to 40.0, 255 to 60.0)
    private const val S9_RAW = 128

    private fun lerp(points: List<Pair<Int, Double>>, x: Int, origin: Pair<Int, Double> = 0 to 0.0): Double {
        if (x <= origin.first) return origin.second
        var (x0, y0) = origin
        for ((x1, y1) in points) {
            if (x <= x1) return y0 + (y1 - y0) * (x - x0) / (x1 - x0)
            x0 = x1; y0 = y1
        }
        return y0
    }

    private fun round(value: Double, digits: Int = 2): Double {
        var scale = 1.0
        repeat(digits) { scale *= 10 }
        return Math.round(value * scale) / scale
    }

    fun swrFromRaw(raw: Int): Double = when {
        raw >= 255 -> Double.POSITIVE_INFINITY
        raw <= 0 -> 1.0
        else -> 1 + 0.333 * (exp(0.0151 * raw) - 1)
    }

    fun sMeter(raw: Int): Reading {
        val r = raw.coerceIn(0, 255)
        if (r < S9_RAW) {
            val units = S_STEPS.last { r >= it.first }.second
            return Reading(r, units.toDouble(), "S", "S$units")
        }
        val over = round(lerp(S_OVER, r, S9_RAW to 0.0), 1)
        return Reading(r, 9.0, "S", if (over > 0) "S9+${over.roundToInt()} dB" else "S9")
    }

    /** [head] is the PC P1 digit: 1 field head, 2 SPA-1. PO is only scaled for the field head, otherwise it is pendiente de fuente. */
    fun poWatts(raw: Int, head: Int?): Reading {
        val r = raw.coerceIn(0, 255)
        if (head != 1) return Reading(r, null, "raw", "$r/255 (pendiente de fuente)", pending = true)
        val watts = round(lerp(PO_POINTS.map { it.first to it.second }, r))
        return Reading(r, watts, "W", "$watts W")
    }

    fun swr(raw: Int): Reading {
        val r = raw.coerceIn(0, 255)
        val ratio = swrFromRaw(r)
        return if (ratio.isInfinite()) Reading(r, null, "", "∞:1") else Reading(r, round(ratio), "", "${round(ratio)}:1")
    }

    fun alcPercent(raw: Int): Reading {
        val r = raw.coerceIn(0, 255)
        val value = min(200.0, r * 200.0 / 252.0)
        return Reading(r, round(value, 1), "%", "${value.roundToInt()} %")
    }

    fun compDb(raw: Int): Reading = scaled(raw, 30.0 / 255, "dB")
    fun drainAmps(raw: Int): Reading = scaled(raw, 3.0 / 255, "A")
    fun vddVolts(raw: Int): Reading = scaled(raw, 13.8 / 203, "V")

    private fun scaled(raw: Int, factor: Double, unit: String): Reading {
        val r = raw.coerceIn(0, 255)
        val value = round(r * factor)
        return Reading(r, value, unit, "${round(value, 1)} $unit")
    }

    /** Null when tune may start; otherwise "unknown" (power unreadable) or "high" (above [TUNE_POWER_MAX_W]). */
    fun tunePowerRefusal(watts: Int?): String? = when {
        watts == null -> "unknown"
        watts > TUNE_POWER_MAX_W -> "high"
        else -> null
    }
}
