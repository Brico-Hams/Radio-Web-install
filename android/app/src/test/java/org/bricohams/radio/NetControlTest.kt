package org.bricohams.radio

import org.json.JSONObject
import org.junit.After
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.annotation.Config
import java.time.Instant

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [28], qualifiers = "es")
class NetControlTest {
    private val context get() = RuntimeEnvironment.getApplication()
    @Before fun clean() { context.deleteDatabase("bricohams.db") }
    @After fun cleanAfter() { context.deleteDatabase("bricohams.db") }

    private fun fails(id: Int, block: () -> Unit) {
        try {
            block()
            fail("Expected validation error")
        } catch (error: LocalizedArgumentException) {
            assertEquals(id, error.text.id)
        }
    }

    private fun checkIn(call: String = "EA1AAA", type: NetStationType = NetStationType.MOBILE, power: Int = 20,
        town: String = "Leon", locator: String = "", at: String = "2026-10-25T16:05:09Z") = NetCheckIn(
        order = 1, call = call, utc = Instant.parse(at), frequencyMHz = "145.500", mode = "FM",
        stationType = type, powerWatts = power, town = town, locator = locator)

    private fun session() = NetSession(id = "net-1", name = "Red Guardia", controlCall = "EA1ABC", frequencyMHz = "145.500",
        mode = "FM", startUtc = Instant.parse("2026-10-25T16:00:00Z"), endUtc = Instant.parse("2026-10-25T17:00:00Z"))
        .withCheckIn(checkIn().copy(name = "José", temperatureC = 21.5, pressureHpa = 1013, rain = NetRain.LIGHT,
            wind = NetWind.MODERATE, windKmh = 20, windDirection = "NW", sky = NetSky.CLEAR, visibilityKm = 10.0,
            rstSent = "59", rstReceived = "57", readability = 5, antenna = "Vertical", equipment = "Yaesu FT-891",
            priority = NetPriority.EMERGENCY, message = "Necesito, apoyo"))
        .withCheckIn(checkIn("EA1BBB", NetStationType.BASE, 50, town = "", locator = "im88ab", at = "2026-10-25T16:06:00Z"))
        .withCheckIn(checkIn("EA1CCC", NetStationType.MOBILE, 10, town = "Gijón", at = "2026-10-25T16:07:00Z")
            .copy(powerSource = NetPowerSource.SOLAR_BATTERY))

    @Test fun validatesCallsignPowerAndLocation() {
        checkIn().normalized().validated()
        fails(R.string.err_call_invalid) { checkIn("A").validated() }
        fails(R.string.err_call_invalid) { checkIn("ABCDEF").validated() }
        fails(R.string.net_err_power) { checkIn(power = 4).validated() }
        fails(R.string.net_err_power) { checkIn(power = 51).validated() }
        checkIn(power = 5).validated(); checkIn(power = 50).validated()
        fails(R.string.net_err_location) { checkIn(town = " ", locator = "").normalized().validated() }
        fails(R.string.profile_locator_invalid) { checkIn(town = "", locator = "ZZ99").validated() }
        assertEquals("IM88ab", checkIn(town = "", locator = "im88ab").normalized().validated().locator)
        assertEquals("EA1AAA", checkIn("ea1aaa").normalized().call)
    }

    @Test fun mobileStationsDefaultToBatteries() {
        assertEquals(NetPowerSource.BATTERY, NetCheckIn.defaultPowerSource(NetStationType.MOBILE))
        assertEquals(NetPowerSource.BATTERY, checkIn(type = NetStationType.MOBILE).powerSource)
        assertEquals(NetPowerSource.AC, checkIn(type = NetStationType.BASE).powerSource)
    }

    @Test fun orderNumbersAndRepeatedData() {
        val s = session()
        assertEquals(listOf(1, 2, 3), s.checkIns.map { it.order })
        assertEquals(listOf(1, 2), s.withoutCheckIn(s.checkIns[0].id).checkIns.map { it.order })
        val last = NetSession.lastKnown("ea1aaa", listOf(s))!!
        val again = last.repeating(4, Instant.parse("2026-10-26T10:00:00Z"), "145.500", "FM")
        assertEquals(last.powerWatts, again.powerWatts); assertEquals(last.antenna, again.antenna)
        assertNull(again.temperatureC); assertEquals(NetPriority.ROUTINE, again.priority)
        assertNull(NetSession.lastKnown("EA9ZZZ", listOf(s)))
    }

    @Test fun summaryStatistics() {
        val summary = session().summary()
        assertEquals(3, summary.checkIns); assertEquals(3, summary.stations)
        assertEquals(2, summary.mobile); assertEquals(1, summary.base)
        assertEquals(10, summary.powerMin); assertEquals(50, summary.powerMax)
        assertEquals(80.0 / 3, summary.powerAverage!!, 1e-9)
        assertEquals(mapOf(NetPowerSource.AC to 1, NetPowerSource.SOLAR_BATTERY to 1, NetPowerSource.BATTERY to 1), summary.powerSources)
        assertEquals(1, summary.emergency)
        val repeated = session().withCheckIn(checkIn(power = 30, at = "2026-10-25T16:20:00Z"))
        val again = repeated.summary()
        assertEquals(4, again.checkIns); assertEquals(3, again.stations)
        assertEquals(30.0, again.powerAverage!!, 1e-9); assertEquals(10, again.powerMin); assertEquals(50, again.powerMax)
    }

    @Test fun csvJsonAndAdifExports() {
        val s = session()
        val csv = NetExport.csv(s).split("\r\n")
        assertEquals(NetExport.CSV_COLUMNS.joinToString(","), csv[0])
        assertEquals(5, csv.size)
        assertTrue(csv[1], csv[1].startsWith("Red Guardia,EXERCISE,EA1ABC,2026-10-25T16:00:00Z,2026-10-25T17:00:00Z,1,EA1AAA,José,"))
        assertTrue(csv[1], csv[1].contains(",145.500,FM,MOBILE,20,Leon,,BATTERY,21.5,1013,LIGHT,MODERATE,20,NW,CLEAR,10.0," +
            "59,57,5,Vertical,Yaesu FT-891,EMERGENCY,\"Necesito, apoyo\","))
        assertTrue(csv[2], csv[2].contains(",EA1BBB,,2026-10-25T16:06:00Z,145.500,FM,BASE,50,,IM88ab,AC,"))

        val json = JSONObject(NetExport.json(s))
        assertEquals(3, json.getInt("stationCount")); assertEquals(3, json.getInt("checkInCount"))
        assertEquals("Red Guardia", json.getString("name")); assertEquals("EXERCISE", json.getString("purpose"))
        val rows = json.getJSONArray("checkIns")
        assertEquals("EA1AAA", rows.getJSONObject(0).getString("call"))
        assertEquals(21.5, rows.getJSONObject(0).getDouble("temperatureC"), 0.0)
        assertTrue(rows.getJSONObject(1).isNull("temperatureC"))
        assertEquals("SOLAR_BATTERY", rows.getJSONObject(2).getString("powerSource"))
        assertEquals("Necesito, apoyo", rows.getJSONObject(0).getString("message"))

        val adif = NetExport.adif(s, "IN73eg")
        for (tag in Regex("<([A-Z_]+):\\d+>").findAll(adif).map { it.groupValues[1] }.toSet()) {
            assertTrue(tag, tag in setOf("ADIF_VER", "PROGRAMID", "CALL", "QSO_DATE", "TIME_ON", "BAND", "FREQ", "MODE", "RST_SENT",
                "RST_RCVD", "TX_PWR", "GRIDSQUARE", "QTH", "NAME", "STATION_CALLSIGN", "MY_GRIDSQUARE", "COMMENT", "NOTES"))
        }
        assertEquals(3, Regex("<EOR>").findAll(adif).count())
        for (field in listOf("<CALL:6>EA1AAA", "<QSO_DATE:8>20261025", "<TIME_ON:6>160509", "<BAND:2>2m", "<FREQ:7>145.500",
            "<MODE:2>FM", "<RST_SENT:2>59", "<RST_RCVD:2>57", "<TX_PWR:2>20", "<QTH:4>Leon", "<NAME:4>Jose",
            "<MY_GRIDSQUARE:6>IN73eg", "<GRIDSQUARE:6>IM88ab", "<TX_PWR:2>50", "<QTH:5>Gijon", "<STATION_CALLSIGN:6>EA1ABC")) {
            assertTrue(field, adif.contains(field))
        }
        assertTrue(adif.contains("PRIORITY=EMERGENCY")); assertTrue(adif.contains("MSG: Necesito, apoyo"))
    }

    @Test fun backupRoundTripAndOldBackups() {
        val s = session()
        assertEquals(s, NetSession.fromJson(s.toJson()))
        val backup = RadioStore(context).use { store ->
            store.saveNetSession(s)
            assertEquals(listOf(s), store.netSessions())
            store.export()
        }
        assertEquals(1, JSONObject(backup).getJSONArray("netSessions").length())
        context.deleteDatabase("bricohams.db")
        RadioStore(context).use { store ->
            assertEquals(1, store.importSnapshot(backup))
            assertEquals(listOf(s), store.netSessions())
            assertEquals(0, store.importSnapshot(backup))
            val changed = JSONObject(backup).apply { getJSONArray("netSessions").getJSONObject(0).put("name", "Otro") }
            fails(R.string.err_row_conflict) { store.importSnapshot(changed.toString()) }
            assertEquals(listOf(s), store.netSessions())
            store.deleteNetSession(s.id)
            assertTrue(store.netSessions().isEmpty())
        }
        context.deleteDatabase("bricohams.db")
        val old = JSONObject(backup).apply { remove("netSessions") }.toString()
        val v1 = """{"format":"bricohams-android-field-data","version":1,"contacts":[],"sessions":[],"observations":[]}"""
        RadioStore(context).use { store ->
            assertEquals(0, store.importSnapshot(old))
            assertEquals(0, store.importSnapshot(v1))
            assertTrue(store.netSessions().isEmpty())
        }
    }
}
