package org.bricohams.radio

import java.util.Locale

/**
 * Next satellite pass shared between SatelliteActivity (writer) and the home screen (reader) through the
 * "satellite-observer" preference "next-pass", stored as one line: norad|name|aosMs|losMs|maxElevationDeg|computedAtMs.
 */
data class NextPassSummary(
    val norad: Int,
    val name: String,
    val aosMs: Long,
    val losMs: Long,
    val maxElevationDeg: Double,
    val computedAtMs: Long
) {
    fun encode(): String {
        val safeName = name.replace('|', '/').replace(Regex("[\\r\\n]+"), " ").trim()
        return listOf(norad, safeName, aosMs, losMs, String.format(Locale.ROOT, "%.1f", maxElevationDeg), computedAtMs)
            .joinToString("|")
    }

    fun isOver(nowMs: Long) = nowMs >= losMs
    fun isInProgress(nowMs: Long) = nowMs in aosMs until losMs
    fun minutesToAos(nowMs: Long) = maxOf(0L, (aosMs - nowMs + 59_999) / 60_000)
    fun minutesSinceComputed(nowMs: Long) = maxOf(0L, (nowMs - computedAtMs) / 60_000)

    companion object {
        /** Returns null for anything that is not a well-formed summary line. */
        fun decode(line: String?): NextPassSummary? {
            val parts = line?.split('|') ?: return null
            if (parts.size != 6) return null
            val norad = parts[0].toIntOrNull() ?: return null
            val name = parts[1].trim()
            val aos = parts[2].toLongOrNull() ?: return null
            val los = parts[3].toLongOrNull() ?: return null
            val elevation = parts[4].toDoubleOrNull() ?: return null
            val computed = parts[5].toLongOrNull() ?: return null
            if (norad <= 0 || name.isEmpty() || aos < 0 || los <= aos || computed < 0) return null
            if (!elevation.isFinite() || elevation < 0.0 || elevation > 90.0) return null
            return NextPassSummary(norad, name, aos, los, elevation, computed)
        }
    }
}
