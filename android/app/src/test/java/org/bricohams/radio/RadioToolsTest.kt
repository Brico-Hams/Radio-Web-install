package org.bricohams.radio

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class RadioToolsTest {
    @Test fun locatorFromCoordinates() {
        assertEquals("IN80dk", RadioTools.latLonToLocator(40.4168, -3.7038))
        assertEquals("FN31pr", RadioTools.latLonToLocator(41.7147, -72.7272))
    }

    @Test fun greatCircleMadridNewYork() {
        val gc = RadioTools.greatCircle(Maidenhead.LatLon(40.4168, -3.7038), Maidenhead.LatLon(40.7128, -74.0060))
        assertEquals(5768.0, gc.distanceKm, 5.0)
        assertEquals(294.9, gc.bearing, 0.5)
    }

    @Test fun swrFromPower() {
        val r = RadioTools.swrFromPower(100.0, 4.0)
        assertEquals(1.5, r.swr, 0.001)
        assertEquals(13.98, r.returnLossDb, 0.01)
        assertEquals(0.177, r.mismatchLossDb, 0.001)
    }

    @Test fun coaxLossRg213() {
        val r = RadioTools.coaxLoss("RG-213", 100.0, 30.0, 100.0)
        assertEquals(1.98, r.lossDb, 0.01)
        assertEquals(63.4, r.powerOutW, 0.1)
    }

    @Test fun halfWaveDipole() {
        assertEquals(10.028, RadioTools.antennaLengths(14.2).halfWaveM, 0.001)
    }

    @Test fun bandsByRegion() {
        assertNull(RadioTools.bandOf(7.25, 1))
        assertEquals("40m", RadioTools.bandOf(7.25, 2))
    }

    @Test fun pathEndpoints() {
        val a = Maidenhead.LatLon(40.4168, -3.7038)
        val b = Maidenhead.LatLon(40.7128, -74.0060)
        val path = RadioTools.greatCirclePath(a, b)
        assertEquals(64, path.size)
        assertEquals(a, path.first())
        assertEquals(b, path.last())
    }
}
