package org.bricohams.radio

import java.util.Locale
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class PassSkyTest {
    private fun look(az: Double, el: Double) = SatelliteLook(0, az, el, 1000.0)

    // Meeus, Astronomical Algorithms 2nd ed., example 25.a: 1992 Oct 13, 0h TD -> RA 198.38083, Dec -7.78507.
    @Test fun sunMatchesMeeusExample25a() {
        val (ra, dec) = PassSky.sunEquatorial(2448908.5)
        assertEquals(198.38083, ra, 0.02)
        assertEquals(-7.78507, dec, 0.02)
    }

    // Meeus example 47.a: 1992 Apr 12, 0h TD -> RA 134.688470, Dec +13.768368, horizontal parallax 0.991990.
    // The low-precision series is good to a few tenths of a degree.
    @Test fun moonMatchesMeeusExample47aWithinLowPrecision() {
        val (ra, dec, parallax) = PassSky.moonEquatorial(2448724.5)
        assertEquals(134.688470, ra, 0.5)
        assertEquals(13.768368, dec, 0.5)
        assertEquals(0.991990, parallax, 0.01)
    }

    // Meeus example 13.b: Venus, 1987 Apr 10 19h21m00s UT at Washington (+38.92139, -77.06556): A = 68.0337 from the
    // south, i.e. 248.0337 from the north, h = 15.1249.
    @Test fun horizontalMatchesMeeusExample13b() {
        val result = PassSky.horizontal(347.3193, -6.719892, 2446896.30625, 38.92139, -77.06556)
        assertEquals(248.0337, result.azimuth, 0.05)
        assertEquals(15.1249, result.elevation, 0.05)
    }

    @Test fun motionBearingFollowsTheChartDirection() {
        // Rising in the north towards the zenith moves down the north-up chart (south).
        assertEquals(180.0, PassSky.motionBearing(look(0.0, 0.0), look(0.0, 45.0))!!, 1e-6)
        // Along the east horizon towards the zenith moves left (west).
        assertEquals(270.0, PassSky.motionBearing(look(90.0, 0.0), look(90.0, 45.0))!!, 1e-6)
        assertNull(PassSky.motionBearing(look(10.0, 20.0), look(10.0, 20.0)))
    }

    @Test fun shareTextMatchesTheReferenceFormat() {
        val template = "%1\$s: próximo pase. Rumbo (Az) %2\$.1f°, Elevación (El) %3\$.1f°. RX %4\$.4f MHz."
        assertEquals("JAS-2 (FO-29): próximo pase. Rumbo (Az) 157,2°, Elevación (El) 44,3°. RX 435,7897 MHz.",
            PassSky.shareText(template, "JAS-2 (FO-29)", 157.2, 44.3, 435_789_700.0, Locale("es", "ES")))
    }

    @Test fun bookmarkToggleAddsThenRemoves() {
        val key = PassSky.bookmarkKey(24278, 1000L)
        val added = PassSky.toggle(emptySet(), key)
        assertEquals(setOf("24278:1000"), added)
        assertEquals(emptySet<String>(), PassSky.toggle(added, key))
    }
}
