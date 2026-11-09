package org.bricohams.radio

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class PassPointingTest {
    private fun look(time: Long, az: Double, el: Double) = SatelliteLook(time, az, el, 1000.0)
    private val phrases = PassPointing.Phrases(
        { "Gira $it° a la izquierda" }, { "Gira $it° a la derecha" }, { "Sube $it°" }, { "Baja $it°" }, "En el blanco")

    @Test fun trackRunsFromAosToLosEveryStepAndEndsExactlyAtLos() {
        val pass = SatellitePass(look(0, 10.0, 0.0), look(300_000, 90.0, 40.0), look(605_000, 170.0, 0.0), false, false)
        val track = PassPointing.sampleTrack(pass, 10) { look(it, it / 10000.0, 0.0) }
        assertEquals(0L, track.first().time)
        assertEquals(605_000L, track.last().time)
        assertEquals(62, track.size)
        assertEquals(listOf(590_000L, 600_000L, 605_000L), track.takeLast(3).map { it.time })
        assertTrue(track.zipWithNext().all { (a, b) -> b.time > a.time && b.time - a.time <= 10_000 })
    }

    @Test fun trackRejectsEmptyPassOrBadStep() {
        val pass = SatellitePass(look(0, 0.0, 0.0), look(0, 0.0, 0.0), look(0, 0.0, 0.0), false, false)
        assertTrue(runCatching { PassPointing.sampleTrack(pass) { look(it, 0.0, 0.0) } }.isFailure)
        val ok = SatellitePass(look(0, 0.0, 0.0), look(5, 0.0, 9.0), look(10_000, 0.0, 0.0), false, false)
        assertTrue(runCatching { PassPointing.sampleTrack(ok, 0) { look(it, 0.0, 0.0) } }.isFailure)
    }

    @Test fun azimuthAndElevationMapToPolarXY() {
        val north = SatellitePasses.polar(look(0, 0.0, 0.0), 100f)
        assertEquals(0f, north.first, 0.01f); assertEquals(-100f, north.second, 0.01f)
        val east45 = SatellitePasses.polar(look(0, 90.0, 45.0), 100f)
        assertEquals(50f, east45.first, 0.01f); assertEquals(0f, east45.second, 0.01f)
        val zenith = SatellitePasses.polar(look(0, 200.0, 90.0), 100f)
        assertEquals(0f, zenith.first, 0.01f); assertEquals(0f, zenith.second, 0.01f)
    }

    @Test fun headingRelativeRotationWrapsAround360() {
        // Phone at 350 deg, satellite at 10 deg: 20 deg to the right; and the reverse is 20 to the left.
        assertEquals(20.0, PassGeometry.turn(350.0, 10.0), 1e-9)
        assertEquals(-20.0, PassGeometry.turn(10.0, 350.0), 1e-9)
        val (x, y) = PassGeometry.project(10.0, 0.0, 100f, 350.0)
        assertEquals(100 * Math.sin(Math.toRadians(20.0)).toFloat(), x, 0.01f)
        assertTrue(y < 0f)
        // Low-pass across north must not swing through 180.
        val smoothed = PassGeometry.smooth(359.0, 1.0, 0.5)
        assertTrue(smoothed < 0.01 || smoothed > 359.99)
    }

    @Test fun declinationShiftsMagneticToTrueNorth() {
        assertEquals(15.0, PassPointing.trueAzimuth(10.0, 5.0), 1e-9)
        assertEquals(5.0, PassPointing.trueAzimuth(355.0, 10.0), 1e-9)
        assertEquals(355.0, PassPointing.trueAzimuth(5.0, -10.0), 1e-9)
    }

    @Test fun phoneTopDirectionFlatAndUpright() {
        // Identity: flat on a table, top edge towards magnetic north.
        val flat = floatArrayOf(1f, 0f, 0f, 0f, 1f, 0f, 0f, 0f, 1f)
        val (az, el) = PassPointing.topDirection(flat)
        assertEquals(0.0, az, 1e-6); assertEquals(0.0, el, 1e-6)
        // Top edge tilted up 30 deg and facing east: Y column = (cos el, 0, sin el) in (east, north, up).
        val e = Math.toRadians(30.0).toFloat()
        val tilted = floatArrayOf(1f, Math.cos(e.toDouble()).toFloat() , 0f, 0f, 0f, 0f, 0f, Math.sin(e.toDouble()).toFloat(), 0f)
        val (az2, el2) = PassPointing.topDirection(tilted)
        assertEquals(90.0, az2, 1e-4); assertEquals(30.0, el2, 1e-4)
        // Upright, top edge to the sky.
        val upright = floatArrayOf(1f, 0f, 0f, 0f, 0f, 0f, 0f, 1f, 0f)
        assertEquals(90.0, PassPointing.topDirection(upright).second, 1e-6)
    }

    @Test fun instructionTellsHowToTurnAndRaise() {
        val aim = PassPointing.aim(350.0, 20.0, look(0, 13.0, 32.0))
        assertEquals(23.0, aim.turn, 1e-9)
        assertEquals(12.0, aim.raise, 1e-9)
        assertEquals("Gira 23° a la derecha · Sube 12°", PassPointing.instruction(aim, phrases))
        assertEquals("Gira 40° a la izquierda · Baja 10°", PassPointing.instruction(PassPointing.aim(50.0, 40.0, look(0, 10.0, 30.0)), phrases))
        assertEquals("Sube 10°", PassPointing.instruction(PassPointing.aim(10.0, 20.0, look(0, 10.0, 30.0)), phrases))
    }

    @Test fun onTargetWithinFiveDegreesInBothAxes() {
        val sat = look(0, 100.0, 40.0)
        assertTrue(PassPointing.aim(95.0, 35.0, sat).onTarget)
        assertTrue(PassPointing.aim(104.9, 44.9, sat).onTarget)
        assertFalse(PassPointing.aim(94.9, 40.0, sat).onTarget)
        assertFalse(PassPointing.aim(100.0, 34.9, sat).onTarget)
        assertEquals("En el blanco", PassPointing.instruction(PassPointing.aim(102.0, 38.0, sat), phrases))
        // 0/360 wrap does not break the threshold.
        assertTrue(PassPointing.aim(358.0, 10.0, look(0, 2.0, 12.0)).onTarget)
    }
}
