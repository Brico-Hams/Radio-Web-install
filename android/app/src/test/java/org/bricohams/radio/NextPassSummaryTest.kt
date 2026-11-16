package org.bricohams.radio

import org.junit.Assert.*
import org.junit.Test

class NextPassSummaryTest {
    private val sample = NextPassSummary(25544, "ISS (ZARYA)", 1_000_000, 1_600_000, 42.5, 900_000)

    @Test fun roundTrips() {
        assertEquals("25544|ISS (ZARYA)|1000000|1600000|42.5|900000", sample.encode())
        assertEquals(sample, NextPassSummary.decode(sample.encode()))
    }

    @Test fun separatorInNameIsEncodedSafely() {
        val decoded = NextPassSummary.decode(sample.copy(name = "A|B").encode())
        assertEquals("A/B", decoded?.name)
    }

    @Test fun rejectsMalformedInput() {
        assertNull(NextPassSummary.decode(null))
        assertNull(NextPassSummary.decode(""))
        assertNull(NextPassSummary.decode("25544|ISS|1000|2000|40.0"))
        assertNull(NextPassSummary.decode("25544|ISS|1000|2000|40.0|5|6"))
        assertNull(NextPassSummary.decode("x|ISS|1000|2000|40.0|5"))
        assertNull(NextPassSummary.decode("25544|ISS|abc|2000|40.0|5"))
        assertNull(NextPassSummary.decode("25544|ISS|1000|2000|high|5"))
        assertNull(NextPassSummary.decode("25544||1000|2000|40.0|5"))
        assertNull(NextPassSummary.decode("-1|ISS|1000|2000|40.0|5"))
        assertNull(NextPassSummary.decode("25544|ISS|-1|2000|40.0|5"))
        assertNull(NextPassSummary.decode("25544|ISS|1000|2000|-3.0|5"))
        assertNull(NextPassSummary.decode("25544|ISS|1000|2000|40.0|-5"))
    }

    @Test fun rejectsLosNotAfterAos() {
        assertNull(NextPassSummary.decode("25544|ISS|2000|2000|40.0|5"))
        assertNull(NextPassSummary.decode("25544|ISS|2000|1000|40.0|5"))
    }

    @Test fun timingHelpers() {
        assertEquals(10, sample.minutesToAos(400_000))
        assertFalse(sample.isInProgress(400_000))
        assertTrue(sample.isInProgress(1_000_000))
        assertTrue(sample.isOver(1_600_000))
        assertEquals(5, sample.minutesSinceComputed(1_200_000))
    }
}
