package org.bricohams.radio

import org.junit.Assert.*
import org.junit.Test
import java.time.ZoneOffset

class SatellitePassesTest {
    private fun look(time: Long, azimuth: Double, elevation: Double) = SatelliteLook(time, azimuth, elevation, 1000.0)
    @Test fun polarPlotPutsNorthUpEastRightAndZenithAtCentre() {
        fun assertPoint(x: Float, y: Float, point: Pair<Float, Float>) {
            assertEquals(x, point.first, 0.001f); assertEquals(y, point.second, 0.001f)
        }
        assertPoint(0f, -100f, SatellitePasses.polar(look(0, 0.0, 0.0), 100f))
        assertPoint(100f, 0f, SatellitePasses.polar(look(0, 90.0, 0.0), 100f))
        assertPoint(0f, 50f, SatellitePasses.polar(look(0, 180.0, 45.0), 100f))
        assertPoint(0f, 0f, SatellitePasses.polar(look(0, 270.0, 90.0), 100f))
        assertPoint(-100f, 0f, SatellitePasses.polar(look(0, 270.0, -3.0), 100f))
    }
    @Test fun interpolationWrapsAzimuthThroughNorthAndStaysInsideThePass() {
        val track = listOf(look(0, 350.0, 10.0), look(1000, 10.0, 20.0))
        val middle = requireNotNull(SatellitePasses.at(track, 500))
        assertEquals(0.0, middle.azimuth % 360, 0.0001)
        assertEquals(15.0, middle.elevation, 0.0001)
        assertEquals(5.0, requireNotNull(SatellitePasses.at(track, 750)).azimuth, 0.0001)
        assertNull(SatellitePasses.at(track, -1))
        assertNull(SatellitePasses.at(track, 1001))
        assertNull(SatellitePasses.at(track.take(1), 0))
    }
    @Test fun sampledTrackFollowsSgp4AndCardsCountDownToAosAndLos() {
        SatellitesTest.orbit().use { orbit ->
            val pass = orbit.predict(SatellitesTest.start).first()
            val track = SatellitePasses.sample(pass) { orbit.look(it) }
            assertEquals(60, track.size)
            assertEquals(pass.aos.time, track.first().time)
            assertEquals(pass.los.time, track.last().time)
            assertEquals(pass.maximum.elevation, track.maxOf { it.elevation }, 1.0)
            val middle = (track[20].time + track[21].time) / 2
            assertEquals(orbit.look(middle).elevation, requireNotNull(SatellitePasses.at(track, middle)).elevation, 0.5)
            val entry = PassTrack(SatellitePlan(SatellitesTest.tle, SatellitesTest.observer, 145800000, pass), track)
            val card = SatellitePasses.card(entry, pass.aos.time - 125000, ZoneOffset.UTC)
            assertTrue(card, card.startsWith("ISS (25544)\nAOS 19/10 ") && card.contains("AOS en 2:05") && card.contains(" 5 min"))
            assertTrue(SatellitePasses.card(entry, pass.aos.time - 7500000, ZoneOffset.UTC).contains("AOS en 2 h 05 min"))
            assertTrue(SatellitePasses.detail(entry, pass.maximum.time).contains("Ahora az"))
            assertTrue(SatellitePasses.detail(entry, pass.los.time + 1).endsWith("Terminado"))
            assertThrows(IllegalArgumentException::class.java) { SatellitePasses.sample(pass, 1) { orbit.look(it) } }
        }
    }
}
