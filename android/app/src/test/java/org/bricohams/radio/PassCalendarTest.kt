package org.bricohams.radio

import org.junit.Assert.*
import org.junit.Test

class PassCalendarTest {
    private fun look(time: Long, az: Double, el: Double) = SatelliteLook(time, az, el, 1000.0)
    private fun track(name: String, aos: Long): PassTrack {
        val pass = SatellitePass(look(aos, 10.0, 0.0), look(aos + 300_000, 90.0, 45.4), look(aos + 600_000, 170.0, 0.0), false, false)
        return PassTrack(SatellitePlan(SatellitesTest.tle.copy(name = name), SatellitesTest.observer, 145_800_000, pass), emptyList())
    }

    @Test fun buildsCrlfCalendarWithOneEventPerPass() {
        val text = PassCalendar.ics(listOf(track("ISS", 1_700_000_000_000), track("SO-50", 1_700_010_000_000)), 1_699_999_000_000)
        assertTrue(text.startsWith("BEGIN:VCALENDAR\r\nVERSION:2.0\r\n"))
        assertTrue(text.endsWith("END:VCALENDAR\r\n"))
        assertEquals(2, Regex("BEGIN:VEVENT").findAll(text).count())
        assertFalse(text.replace("\r\n", "").contains('\n'))
        assertTrue(text.contains("DTSTART:20231114T221320Z"))
        assertTrue(text.contains("SUMMARY:ISS max 45°"))
        assertTrue(text.contains("UID:25544-1700000000000@radicodex"))
        assertThrows(IllegalArgumentException::class.java) { PassCalendar.ics(emptyList(), 0) }
    }

    @Test fun foldsLongLinesAndEscapesText() {
        val text = PassCalendar.ics(listOf(track("A,B;" + "é".repeat(80), 1_700_000_000_000)), 0)
        assertTrue(text.contains("SUMMARY:A\\,B\\;"))
        for (line in text.split("\r\n")) assertTrue(line.toByteArray(Charsets.UTF_8).size <= 75)
        val unfolded = text.replace("\r\n ", "")
        assertTrue(unfolded.contains("é".repeat(80) + " max 45°"))
    }

    @Test fun neverContainsObserverPosition() {
        val text = PassCalendar.ics(listOf(track("ISS", 1_700_000_000_000)), 0)
        assertFalse(text.contains("40.41"))
        assertFalse(text.contains("3.70"))
    }
}
