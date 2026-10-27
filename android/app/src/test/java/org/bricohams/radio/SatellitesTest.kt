package org.bricohams.radio

import org.junit.Assert.*
import org.junit.Test
import java.io.File
import java.time.Instant
import java.security.MessageDigest

class SatellitesTest {
    companion object {
        val tle = Tle("ISS", "1 25544U 98067A   26291.78980200  .00007771  00000-0  14938-3 0  9994",
            "2 25544  51.6325  48.4339 0006764 280.4294  79.5932 15.48929442590914")
        val observer = ObserverPosition(40.4168, -3.7038, 0.667)
        val start = Instant.parse("2026-10-19T06:00:00Z").toEpochMilli()
        fun orbit() = SatelliteOrbit(tle, observer,
            File("src/main/assets/satellite-6.0.1.js").readText(), File("src/main/assets/orbital-engine.js").readText())
    }
    @Test fun sgp4EngineMatchesPinnedWebDistributionAndNumericReferences() {
        val bytes = File("src/main/assets/satellite-6.0.1.js").readBytes()
        assertEquals("91fdd46e9523c6b232d24ff69fd5e9cade8471d20624a154df7d9c91dc212639",
            MessageDigest.getInstance("SHA-256").digest(bytes).joinToString("") { "%02x".format(it) })
        orbit().use { orbit ->
            assertEquals(1792349838893L, orbit.epoch)
            val point = orbit.look(1792390010000)
            assertEquals(17.4611507668, point.elevation, 0.00001)
            assertEquals(343.8035125726, point.azimuth, 0.00001)
            assertEquals(1137.9478392333, point.rangeKm, 0.001)
        }
    }
    @Test fun passesAndDopplerMatchWebAndRespectTimeBandAndAge() {
        orbit().use { orbit ->
            val pass = orbit.predict(start).first()
            assertEquals(1792389865781L.toDouble(), pass.aos.time.toDouble(), 500.0)
            assertEquals(1792390151406L.toDouble(), pass.los.time.toDouble(), 500.0)
            assertEquals(1792390010000L, pass.maximum.time)
            assertFalse(pass.partialStart); assertFalse(pass.partialEnd)
            val plan = SatellitePlan(tle, observer, 145800000, pass)
            assertEquals(14579996L, orbit.target(plan, pass.maximum.time).frequency10Hz)
            for (time in listOf(pass.aos.time - 1, pass.los.time)) {
                assertThrows(IllegalArgumentException::class.java) { orbit.target(plan, time) }
            }
            assertThrows(IllegalArgumentException::class.java) { orbit.target(plan.copy(downlinkHz = 200000000), pass.maximum.time) }
            assertThrows(IllegalArgumentException::class.java) { orbit.look(orbit.epoch + 7 * 86400000 + 1) }
            assertThrows(IllegalArgumentException::class.java) { orbit.look(orbit.epoch - 86400001) }
            assertThrows(IllegalArgumentException::class.java) { orbit.predict(orbit.epoch + 7 * 86400000 - 1000, hours = 1) }
        }
    }
    @Test fun tleCatalogPreservesLinesAndRejectsInvalidOrDuplicateData() {
        assertEquals(listOf(tle), Tle.parseCatalog("0 ISS\r\n${tle.line1}\r\n${tle.line2}\r\n"))
        assertEquals(25544, Tle.parseCatalog("${tle.line1}\n${tle.line2}").single().norad)
        for (text in listOf("", tle.line1, "ISS\n${tle.line1.dropLast(1)}0\n${tle.line2}",
            "ISS\n${tle.line1}\n${tle.line2}\nISS again\n${tle.line1}\n${tle.line2}")) {
            assertThrows(IllegalArgumentException::class.java) { Tle.parseCatalog(text) }
        }
        assertThrows(IllegalArgumentException::class.java) { ObserverPosition(Double.NaN, 0.0, 0.0).validated() }
        assertThrows(IllegalArgumentException::class.java) { ObserverPosition(0.0, 181.0, 0.0).validated() }
    }
    @Test fun sharedEngineServesSeveralOrbitsAndGivesSubpoints() {
        OrbitalEngine(File("src/main/assets/satellite-6.0.1.js").readText(), File("src/main/assets/orbital-engine.js").readText()).use { engine ->
            val first = SatelliteOrbit(tle, observer, engine)
            val second = SatelliteOrbit(tle, ObserverPosition(-33.45, -70.66, 0.5), engine)
            val time = 1792390010000
            assertEquals(17.4611507668, first.look(time).elevation, 0.00001)
            assertNotEquals(first.look(time).elevation, second.look(time).elevation, 1.0)
            val point = first.geo(time)
            assertEquals(point, second.geo(time))
            assertTrue(point.altitudeKm in 380.0..450.0 && kotlin.math.abs(point.latitude) <= 52.0)
            second.close()
            assertEquals(17.4611507668, first.look(time).elevation, 0.00001)
            val started = System.nanoTime()
            val passes = first.predict(start)
            println("predict 24 h: ${(System.nanoTime() - started) / 1_000_000} ms, ${passes.size} passes")
            assertEquals(1792389865781L.toDouble(), passes.first().aos.time.toDouble(), 500.0)
        }
    }
}
