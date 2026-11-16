package org.bricohams.radio

import org.junit.Assert.*
import org.junit.Test

class MutualPassesTest {
    private fun pass(start: Long, end: Long, el: Double) = SatellitePass(
        SatelliteLook(start, 0.0, 0.0, 0.0), SatelliteLook((start + end) / 2, 0.0, el, 0.0), SatelliteLook(end, 0.0, 0.0, 0.0), false, false)

    @Test fun overlapIsClippedToBothPasses() {
        val windows = MutualPasses.intersect(listOf(pass(100, 500, 30.0)), listOf(pass(300, 800, 60.0)))
        assertEquals(listOf(MutualPasses.Window(300, 500, 30.0, 60.0)), windows)
    }

    @Test fun disjointOrTouchingPassesGiveNothing() {
        assertTrue(MutualPasses.intersect(listOf(pass(100, 200, 10.0)), listOf(pass(300, 400, 10.0))).isEmpty())
        assertTrue(MutualPasses.intersect(listOf(pass(100, 200, 10.0)), listOf(pass(200, 400, 10.0))).isEmpty())
    }

    @Test fun containedPassIsReturnedWhole() {
        val windows = MutualPasses.intersect(listOf(pass(100, 900, 20.0)), listOf(pass(300, 400, 50.0)))
        assertEquals(1, windows.size)
        assertEquals(300L, windows[0].start)
        assertEquals(400L, windows[0].end)
    }

    @Test fun resultIsSortedByStart() {
        val windows = MutualPasses.intersect(
            listOf(pass(1000, 2000, 10.0), pass(100, 600, 10.0)),
            listOf(pass(1500, 1800, 10.0), pass(200, 300, 10.0)))
        assertEquals(listOf(200L, 1500L), windows.map { it.start })
    }
}
