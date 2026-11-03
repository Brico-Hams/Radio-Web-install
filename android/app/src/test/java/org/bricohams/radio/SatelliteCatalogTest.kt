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
    @Test fun satnogsJsonKeepsOnlyListedSatellitesAndSkipsBadChecksums() {
        val bad = fixture.line1.dropLast(1) + ((fixture.line1.last() - '0' + 1) % 10)
        val json = """[
            {"tle0":"0 ISS (ZARYA)","tle1":"${fixture.line1}","tle2":"${fixture.line2}","norad_cat_id":25544},
            {"tle0":"0 BAD","tle1":"$bad","tle2":"${fixture.line2}","norad_cat_id":25544},
            {"tle0":"0 OTHER","tle1":"${fixture.line1}","tle2":"${fixture.line2}","norad_cat_id":99999}
        ]"""
        val list = SatelliteSources.parseSatnogsTle(json, setOf(25544))
        assertEquals(listOf("ISS (ZARYA)"), list.map { it.name })
        assertTrue(SatelliteSources.parseSatnogsTle(json, setOf(1)).isEmpty())
        assertThrows(IllegalArgumentException::class.java) { SatelliteSources.parseSatnogsTle("{", setOf(1)) }
    }
    @Test fun nasabareThreeLineFormatIsParsed() {
        val text = "ISS\n${fixture.line1}\n${fixture.line2}\n"
        assertEquals(fixture.line2, SatelliteSources.parseNasabare(text.toByteArray()).single().line2)
    }
    private fun fresh(): Tle {
        val now = java.util.Calendar.getInstance(java.util.TimeZone.getTimeZone("UTC"))
        val epoch = "%02d%03d.00000000".format(java.util.Locale.ROOT, now.get(java.util.Calendar.YEAR) % 100, now.get(java.util.Calendar.DAY_OF_YEAR))
        val base = fixture.line1.substring(0, 18) + epoch + fixture.line1.substring(32, 68)
        return Tle("ISS", base + base.sumOf { if (it in '0'..'9') it - '0' else if (it == '-') 1 else 0 } % 10, fixture.line2)
    }
    private val transmitterJson = """[{"norad_cat_id":25544,"alive":true,"status":"active","downlink_low":145800000,"mode":"FM","description":"V"}]"""
    @Test fun fallbackOrderIsCelestrakThenSatnogsThenAmsat() {
        val tle = fresh()
        val satnogs = """[{"tle0":"0 ISS","tle1":"${tle.line1}","tle2":"${tle.line2}","norad_cat_id":25544}]"""
        val nasa = "ISS\n${tle.line1}\n${tle.line2}\n"
        val requests = ArrayList<String>()
        fun fetcher(failing: Set<String>): (String, Int) -> ByteArray = { url, _ ->
            requests.add(url)
            if (url in failing) throw java.io.IOException("timeout")
            when (url) {
                SatelliteSources.TLE_URL, SatelliteSources.AMSAT_TLE_URL -> nasa.toByteArray()
                SatelliteSources.SATNOGS_TLE_URL -> satnogs.toByteArray()
                else -> transmitterJson.toByteArray()
            }
        }
        var result = SatelliteSources.download(fetcher(emptySet()))
        assertEquals(SatelliteSources.TleSource.CELESTRAK, result.source)
        assertEquals(listOf(SatelliteSources.TLE_URL, SatelliteSources.TRANSMITTERS_URL), requests)
        requests.clear()
        result = SatelliteSources.download(fetcher(setOf(SatelliteSources.TLE_URL)))
        assertEquals(SatelliteSources.TleSource.SATNOGS, result.source)
        assertEquals(1, result.transmitters.size)
        assertEquals(listOf(SatelliteSources.TLE_URL, SatelliteSources.TRANSMITTERS_URL, SatelliteSources.SATNOGS_TLE_URL), requests)
        requests.clear()
        result = SatelliteSources.download(fetcher(setOf(SatelliteSources.TLE_URL, SatelliteSources.SATNOGS_TLE_URL)))
        assertEquals(SatelliteSources.TleSource.AMSAT, result.source)
        assertEquals(
            listOf(SatelliteSources.TLE_URL, SatelliteSources.TRANSMITTERS_URL, SatelliteSources.SATNOGS_TLE_URL,
                SatelliteSources.AMSAT_TLE_URL, SatelliteSources.TRANSMITTERS_URL), requests)
    }
    @Test fun staleEpochsFallThroughAndTotalFailureThrows() {
        val stale = "ISS\n${fixture.line1}\n${fixture.line2}\n"
        val error = assertThrows(java.io.IOException::class.java) {
            SatelliteSources.download({ url, _ ->
                if (url == SatelliteSources.TRANSMITTERS_URL) transmitterJson.toByteArray() else stale.toByteArray()
            })
        }
        assertTrue(error.message, error.message!!.contains("CelesTrak") && error.message!!.contains("AMSAT"))
        assertThrows(java.io.IOException::class.java) { SatelliteSources.download({ _, _ -> throw java.io.IOException("x") }) }
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
