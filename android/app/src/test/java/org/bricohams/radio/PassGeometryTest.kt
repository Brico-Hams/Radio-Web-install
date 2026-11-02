package org.bricohams.radio

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class PassGeometryTest {
    private fun look(az: Double, el: Double, range: Double = 1000.0) = SatelliteLook(0, az, el, range)
    private fun assertXY(x: Float, y: Float, point: Pair<Float, Float>) {
        assertEquals(x, point.first, 0.01f); assertEquals(y, point.second, 0.01f)
    }

    @Test fun northUpPlacesAzimuthAndElevationOnTheRadar() {
        assertXY(0f, 0f, PassGeometry.project(123.0, 90.0, 100f))
        assertXY(0f, -100f, PassGeometry.project(0.0, 0.0, 100f))
        assertXY(100f, 0f, PassGeometry.project(90.0, 0.0, 100f))
        assertXY(0f, 100f, PassGeometry.project(180.0, 0.0, 100f))
        assertXY(-50f, 0f, PassGeometry.project(270.0, 45.0, 100f))
    }

    @Test fun compassModeRotatesSoThePhoneHeadingIsAtTheTop() {
        assertXY(0f, -100f, PassGeometry.project(90.0, 0.0, 100f, 90.0))
        // North is a quarter turn to the left when the phone looks east.
        assertXY(-100f, 0f, PassGeometry.project(0.0, 0.0, 100f, 90.0))
        assertXY(0f, -50f, PassGeometry.project(350.0, 45.0, 100f, 350.0))
        // Wrap-around: heading 350 and azimuth 10 is 20 degrees to the right.
        val (x, y) = PassGeometry.project(10.0, 0.0, 100f, 350.0)
        assertEquals(100 * Math.sin(Math.toRadians(20.0)).toFloat(), x, 0.01f)
        assertTrue(y < 0f)
    }

    @Test fun headingZeroIsIdenticalToNorthUp() {
        val a = PassGeometry.project(37.0, 22.0, 120f)
        val b = PassGeometry.project(37.0, 22.0, 120f, 0.0)
        assertXY(a.first, a.second, b)
        assertXY(a.first, a.second, SatellitePasses.polar(look(37.0, 22.0), 120f))
    }

    @Test fun turnIsTheShortestSignedAngle() {
        assertEquals(20.0, PassGeometry.turn(350.0, 10.0), 1e-9)
        assertEquals(-20.0, PassGeometry.turn(10.0, 350.0), 1e-9)
        assertEquals(90.0, PassGeometry.turn(0.0, 90.0), 1e-9)
        assertEquals(0.0, PassGeometry.turn(123.0, 123.0), 1e-9)
        assertEquals(-170.0, PassGeometry.turn(0.0, 190.0), 1e-9)
    }

    @Test fun pointingGivesLeftRightAndRaise() {
        val right = PassGeometry.pointing(100.0, look(130.0, 40.0), 10.0)
        assertEquals(30.0, requireNotNull(right.turn), 1e-9)
        assertEquals(40.0, right.targetElevation, 1e-9)
        assertEquals(30.0, requireNotNull(right.raise), 1e-9)
        val left = PassGeometry.pointing(100.0, look(70.0, 40.0), 60.0)
        assertEquals(-30.0, requireNotNull(left.turn), 1e-9)
        assertEquals(-20.0, requireNotNull(left.raise), 1e-9)
        val unknown = PassGeometry.pointing(null, look(70.0, 40.0), null)
        assertNull(unknown.turn); assertNull(unknown.raise)
        assertEquals(0.0, PassGeometry.pointing(0.0, look(0.0, -5.0), null).targetElevation, 1e-9)
    }

    @Test fun smoothingAveragesAcrossNorth() {
        assertEquals(2.0, PassGeometry.smooth(350.0, 20.0, 0.4), 1e-9)
        assertEquals(20.0, PassGeometry.smooth(350.0, 20.0, 1.0), 1e-9)
    }

    @Test fun altitudeFromRangeAndElevation() {
        assertEquals(400.0, PassGeometry.altitudeKm(look(0.0, 90.0, 400.0)), 1e-6)
        // At the horizon: sqrt(R^2 + d^2) - R, with R = 6371.
        assertEquals(Math.sqrt(6371.0 * 6371.0 + 2300.0 * 2300.0) - 6371.0, PassGeometry.altitudeKm(look(0.0, 0.0, 2300.0)), 1e-6)
    }

    @Test fun dopplerShiftsDownlinkAndUplinkInOppositeDirections() {
        assertEquals(145800000.0, PassGeometry.dopplerHz(145800000, 0.0), 1e-6)
        // Approaching (negative range rate): downlink higher, uplink lower.
        assertTrue(PassGeometry.dopplerHz(145800000, -7.0) > 145800000)
        assertTrue(PassGeometry.dopplerHz(145800000, -7.0, true) < 145800000)
        assertEquals(145800000 * (1 + 7.0 / 299792.458), PassGeometry.dopplerHz(145800000, -7.0), 1e-3)
    }

    @Test fun rangeRateFollowsTheTrackAndIsZeroOutsideIt() {
        val track = (0..10).map { SatelliteLook(it * 10000L, 0.0, 30.0, 1000.0 + it * 70.0) }
        assertEquals(7.0, PassGeometry.rangeRateKmS(track, 50000), 1e-9)
        assertEquals(0.0, PassGeometry.rangeRateKmS(track, 500000), 1e-9)
        assertNotNull(SatellitePasses.at(track, 50000))
    }
}
