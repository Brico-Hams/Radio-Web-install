package org.bricohams.radio

import org.junit.Assert.*
import org.junit.Test

class MaidenheadTest {
    // Reference examples: ARRL HQ station W1AW, Newington CT (41.7148N 72.7273W) is widely published as FN31pr; equator/Greenwich is
    // JJ00aa; the grid corners follow from the standard algorithm (IARU, Wikipedia "Maidenhead Locator System").
    @Test fun knownConversions() {
        assertEquals("FN31pr", Maidenhead.fromLatLon(41.714775, -72.727260))
        assertEquals("JN58td", Maidenhead.fromLatLon(48.1459, 11.6250))
        assertEquals("JJ00aa", Maidenhead.fromLatLon(0.0, 0.0))
        assertEquals("AA00aa", Maidenhead.fromLatLon(-90.0, -180.0))
        assertEquals("RR99xx", Maidenhead.fromLatLon(90.0, 180.0))
    }

    @Test fun centreAndRoundTrip() {
        val centre = Maidenhead.toLatLon("JN58td")
        assertEquals(48.14583, centre.latitude, 1e-4)
        assertEquals(11.625, centre.longitude, 1e-4)
        val square = Maidenhead.toLatLon("JJ00")
        assertEquals(0.5, square.latitude, 1e-9)
        assertEquals(1.0, square.longitude, 1e-9)
        for (locator in listOf("IM98", "IM98ib", "JN58td", "AA00aa", "RR99xx", "IM98ib42", "JJ00")) {
            val position = Maidenhead.toLatLon(locator)
            val expected = Maidenhead.format(locator).take(if (locator.length == 4) 4 else 6)
            assertEquals(expected, Maidenhead.fromLatLon(position.latitude, position.longitude).take(expected.length))
        }
        assertEquals(Maidenhead.toLatLon("IM98ib").latitude, Maidenhead.toLatLon("IM98ib55").latitude, 1.0 / 24 / 2)
    }

    @Test fun formatsFieldUpperAndSubsquareLower() {
        assertEquals("IM98ib", Maidenhead.format("im98IB"))
        assertEquals("IM98ib42", Maidenhead.format(" IM98IB42 "))
        assertEquals("IM98", Maidenhead.format("im98"))
    }

    @Test fun invalidInputIsRejected() {
        for (bad in listOf("", "IM", "IM9", "IM98i", "IM98ibx", "SM98", "IM98yy", "IM98ib4", "IM98ib423", "98IMib", "IM 98")) {
            assertFalse(bad, Maidenhead.isValid(bad))
            assertThrows(IllegalArgumentException::class.java) { Maidenhead.toLatLon(bad) }
        }
        assertThrows(IllegalArgumentException::class.java) { Maidenhead.fromLatLon(91.0, 0.0) }
        assertThrows(IllegalArgumentException::class.java) { Maidenhead.fromLatLon(0.0, 181.0) }
        assertThrows(IllegalArgumentException::class.java) { Maidenhead.fromLatLon(Double.NaN, 0.0) }
    }
}
