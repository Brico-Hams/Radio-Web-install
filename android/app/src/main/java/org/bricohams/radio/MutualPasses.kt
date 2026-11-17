package org.bricohams.radio

/** Overlap of the pass lists of two stations, i.e. when both can work the same satellite. */
object MutualPasses {
    data class Window(val start: Long, val end: Long, val maxHere: Double, val maxDx: Double)

    fun intersect(here: List<SatellitePass>, dx: List<SatellitePass>): List<Window> {
        val windows = ArrayList<Window>()
        for (a in here) for (b in dx) {
            val start = maxOf(a.aos.time, b.aos.time)
            val end = minOf(a.los.time, b.los.time)
            if (end > start) windows.add(Window(start, end, a.maximum.elevation, b.maximum.elevation))
        }
        return windows.sortedBy { it.start }
    }
}
