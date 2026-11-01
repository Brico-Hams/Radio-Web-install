package org.bricohams.radio

import org.junit.Assert.*
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [28])
class SatelliteCatalogTest {
    @get:Rule val folder = TemporaryFolder()
    private val fixture = SatellitesTest.tle
    @Test fun celestrakPaddingIsTrimmedAndSatnogsKeepsOnlyReceivableActiveDownlinks() {
        val padded = "ISS (ZARYA)             \r\n${fixture.line1}  \r\n${fixture.line2}\r\n"
        val catalog = SatelliteSources.parseTle(padded.toByteArray())
        assertEquals("ISS (ZARYA)", catalog.single().name)
        assertEquals(fixture.line1, catalog.single().line1)
        val json = """[
            {"norad_cat_id":25544,"alive":true,"status":"active","downlink_low":145800000,"mode":"FM","description":"Voice"},
            {"norad_cat_id":25544,"alive":true,"status":"active","downlink_low":145825000,"mode":"AFSK","description":"APRS"},
            {"norad_cat_id":25544,"alive":true,"status":"active","downlink_low":437800000,"mode":null,"description":"Repeater"},
            {"norad_cat_id":25544,"alive":true,"status":"active","downlink_low":2400000000,"mode":"FM","description":"S band"},
            {"norad_cat_id":25544,"alive":false,"status":"active","downlink_low":145990000,"mode":"FM","description":"dead"},
            {"norad_cat_id":25544,"alive":true,"status":"inactive","downlink_low":145990000,"mode":"FM","description":"off"},
            {"norad_cat_id":25544,"alive":true,"status":"active","downlink_low":null,"mode":"FM","description":"no downlink"},
            {"norad_cat_id":43017,"alive":true,"status":"active","downlink_low":145960000,"mode":"FM","description":"Other"}
        ]"""
        val list = SatelliteSources.parseTransmitters(json, setOf(25544))
        assertEquals(listOf(145800000L, 145825000L, 437800000L), list.map { it.downlinkHz })
        assertEquals(listOf("FM", "AFSK", "?"), list.map { it.mode })
        assertThrows(IllegalArgumentException::class.java) { SatelliteSources.parseTransmitters("{", setOf(1)) }
        assertThrows(IllegalArgumentException::class.java) { SatelliteSources.parseTle("1 broken".toByteArray()) }
    }
    @Test fun uplinkAndInvertAreParsedAndStored() {
        val json = """[
            {"norad_cat_id":25544,"alive":true,"status":"active","downlink_low":145800000,"uplink_low":435200000,"invert":true,"mode":"SSB"},
            {"norad_cat_id":25544,"alive":true,"status":"active","downlink_low":145810000,"uplink_low":435200005,"mode":"FM"},
            {"norad_cat_id":25544,"alive":true,"status":"active","downlink_low":145820000,"uplink_low":null,"mode":"FM"},
            {"norad_cat_id":25544,"alive":true,"status":"active","downlink_low":145830000,"uplink_low":0,"invert":false,"mode":"FM"},
            {"norad_cat_id":25544,"alive":true,"status":"active","downlink_low":145840000,"mode":"FM"}
        ]"""
        val list = SatelliteSources.parseTransmitters(json, setOf(25544))
        assertEquals(listOf<Long?>(435200000L, null, null, null, null), list.map { it.uplinkHz })
        assertEquals(listOf(true, false, false, false, false), list.map { it.invert })
        val store = SatelliteStore(folder.newFolder("sat2"))
        store.saveCatalog(listOf(fixture), list)
        assertEquals(list, store.transmitters())
    }
    @Test fun storeRoundTripsAndOnlyAcceptsHttps() {
        val store = SatelliteStore(folder.newFolder("sat"))
        assertTrue(store.catalog().isEmpty() && store.transmitters().isEmpty())
        val list = listOf(Transmitter(25544, "Voice", 145800000, "FM"))
        store.saveCatalog(listOf(fixture), list)
        assertEquals(listOf(fixture), store.catalog())
        assertEquals(list, store.transmitters())
        assertTrue(store.updated > 0)
        assertThrows(java.io.IOException::class.java) { SatelliteSources.fetch("http://celestrak.org/", 10) }
    }
}
