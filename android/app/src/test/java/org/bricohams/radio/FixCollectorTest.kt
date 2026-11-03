package org.bricohams.radio

import org.junit.Assert.*
import org.junit.Test

class FixCollectorTest {
    private val start = 1_000_000L
    private fun fix(source: String, accuracy: Float?, at: Long, lat: Double = 40.0, lon: Double = -3.0) =
        PositionFix(source, lat, lon, null, accuracy, at)

    @Test fun waitsUpTo180SecondsWithoutAnyFix() {
        val c = FixCollector(start)
        assertEquals(180_000L, FixCollector.TIMEOUT_MS)
        assertFalse(c.finished(start + 179_999))
        assertTrue(c.finished(start + 180_000))
        assertNull(c.result(start + 180_000))
    }

    @Test fun firstFixOfAnyProviderStartsTenSecondRefinement() {
        val c = FixCollector(start)
        c.addLive(fix("network", 800f, start + 40_000), start + 40_000)
        assertFalse(c.finished(start + 49_999))
        assertTrue(c.finished(start + 50_000))
        assertEquals("network", c.result(start + 50_000)?.source)
    }

    @Test fun betterAccuracyWithinRefinementWins() {
        val c = FixCollector(start)
        c.addLive(fix("network", 800f, start + 5_000), start + 5_000)
        c.addLive(fix("gps", 35f, start + 9_000), start + 9_000)
        assertFalse(c.finished(start + 10_000))
        assertEquals("gps", c.result(start + 15_000)?.source)
    }

    @Test fun veryAccurateFixEndsEarly() {
        val c = FixCollector(start)
        c.addLive(fix("gps", 8f, start + 3_000), start + 3_000)
        assertTrue(c.finished(start + 3_000))
    }

    @Test fun refinementNeverOutlivesTheTimeout() {
        val c = FixCollector(start)
        c.addLive(fix("gps", 90f, start + 175_000), start + 175_000)
        assertEquals(start + 180_000, c.deadlineMs())
    }

    @Test fun lastKnownOnlyUsedWhenNothingLive() {
        val c = FixCollector(start)
        c.addLastKnown(fix("gps", 5f, start - 3_600_000))
        assertFalse(c.haveLiveFix)
        assertEquals("gps", c.result(start + 180_000)?.source)
        c.addLive(fix("network", 900f, start + 1_000), start + 1_000)
        assertEquals("network", c.result(start + 20_000)?.source)
    }

    @Test fun networkHintWhenDisabledOrSilent() {
        val c = FixCollector(start)
        assertTrue(c.networkHint(start, networkEnabled = false))
        assertFalse(c.networkHint(start + 5_000, networkEnabled = true))
        assertTrue(c.networkHint(start + FixCollector.NETWORK_HINT_MS, networkEnabled = true))
        c.addLive(fix("network", 500f, start + 2_000), start + 2_000)
        assertFalse(c.networkHint(start + 60_000, networkEnabled = true))
    }

    @Test fun remainingCountsDownToDeadline() {
        val c = FixCollector(start)
        assertEquals(170_000L, c.remainingMs(start + 10_000))
        assertEquals(0L, c.remainingMs(start + 999_999))
    }
}
