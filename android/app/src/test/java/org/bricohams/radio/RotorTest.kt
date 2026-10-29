package org.bricohams.radio

import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import java.io.IOException

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [28])
class RotorTest {
    private class FakeTransport(private val replies: Map<String, RotorResponse>) : RotorTransport {
        val calls = ArrayList<Triple<String, String, JSONObject?>>()
        override fun exchange(method: String, path: String, body: JSONObject?): RotorResponse {
            calls.add(Triple(method, path, body))
            return replies[path] ?: RotorResponse(200, JSONObject().put("ok", true))
        }
    }

    private fun look(seconds: Int, azimuth: Double, elevation: Double) =
        SatelliteLook(1_000_000L + seconds * 1000L, azimuth, elevation, 1000.0)

    @Test fun requestIsFramedAndReassembledWithStartAndEndFlags() {
        val request = RotorProtocol.request(7, "POST", "/api/stop", "x".repeat(32), null)
        val text = String(request, Charsets.UTF_8)
        assertTrue(text.endsWith("\n"))
        val json = JSONObject(text.trim())
        assertEquals(1, json.getInt("v")); assertEquals(7L, json.getLong("id")); assertEquals("/api/stop", json.getString("path"))
        val frames = RotorProtocol.frames(request)
        assertEquals((request.size + 15) / 16, frames.size)
        frames.forEachIndexed { index, frame ->
            assertEquals(RotorProtocol.MAGIC, frame[0])
            assertTrue(frame.size in 5..20)
            assertEquals(index, (frame[2].toInt() and 255) or ((frame[3].toInt() and 255) shl 8))
        }
        assertEquals(RotorProtocol.START, frames.first()[1].toInt() and RotorProtocol.START)
        assertEquals(RotorProtocol.END, frames.last()[1].toInt() and RotorProtocol.END)
        val assembler = RotorProtocol.Assembler()
        val results = frames.map { assembler.feed(it) }
        assertTrue(results.dropLast(1).all { it == null })
        assertEquals(text, results.last())
    }

    @Test fun newStartFramePreemptsPartialMessageAndSequenceGapsFail() {
        val long = RotorProtocol.frames("""{"v":1,"id":1,"code":200,"data":{"mode":"IDLE","pad":"0123456789"}}""".toByteArray())
        val stop = RotorProtocol.frames("""{"v":1,"id":2,"code":200,"data":{}}""".toByteArray())
        val assembler = RotorProtocol.Assembler()
        assertNull(assembler.feed(long[0])); assertNull(assembler.feed(long[1]))
        val reply = stop.map { assembler.feed(it) }.last()
        val (id, code, _) = RotorProtocol.envelope(requireNotNull(reply))
        assertEquals(2L, id); assertEquals(200, code)
        assertNull(assembler.feed(long[0]))
        assertThrows(IOException::class.java) { assembler.feed(long[2]) }
        assertThrows(IOException::class.java) { assembler.feed(byteArrayOf(0x11, 3, 0, 0, 65)) }
        assertThrows(IOException::class.java) { RotorProtocol.envelope("{\"id\":1}") }
    }

    @Test fun oversizedRequestAndBadTokenAreRejected() {
        val body = JSONObject().put("text", "A".repeat(RotorProtocol.MAX_REQUEST))
        assertThrows(IOException::class.java) { RotorProtocol.request(1, "POST", "/api/tle", "x".repeat(32), body) }
        assertFalse(RotorProtocol.validToken("short"))
        assertFalse(RotorProtocol.validToken("x".repeat(30) + "\u00f1"))
        assertTrue(RotorProtocol.validToken("x".repeat(24)))
    }

    @Test fun tleTextIsThreeLineAsciiAcceptedByFirmware() {
        val tle = SatellitesTest.tle.copy(name = "  ISS \u00d1 ZARYA  ")
        val text = RotorProtocol.tleText(listOf(tle))
        assertEquals("0 ISS ? ZARYA\n${tle.line1}\n${tle.line2}\n", text)
        assertEquals("${tle.line1}\n${tle.line2}\n", RotorProtocol.tleText(listOf(tle.copy(name = ""))))
    }

    @Test fun statusParsesApiV2AndDefaultsForApiV1() {
        val v2 = RotorStatus.parse(JSONObject("""{"apiVersion":2,"mode":"TRACKING","utcValid":true,"timeSource":"app",
            "maxDegPerSecond":5.94,"microsteps":8,"homed":true}"""))
        assertTrue(v2.busy); assertTrue(v2.supportsAppTime); assertEquals("app", v2.timeSource)
        assertEquals(5.94, v2.maxDegPerSecond, 1e-9); assertEquals(8, v2.microsteps)
        val v1 = RotorStatus.parse(JSONObject("""{"apiVersion":1,"mode":"IDLE","utcValid":true}"""))
        assertFalse(v1.busy); assertFalse(v1.supportsAppTime); assertEquals("gnss", v1.timeSource)
        assertEquals(RotorStatus.REFERENCE_DEG_PER_SECOND, v1.maxDegPerSecond, 1e-9)
    }

    @Test fun clientMapsTimeSyncAndLoadsSatelliteThenSelectsIt() {
        val app = FakeTransport(emptyMap())
        assertEquals(RotorTimeSync.APP, RotorClient(app).syncTime(1_800_000_000_000L))
        assertEquals(1_800_000_000_000L, app.calls.single().third!!.getLong("utcMs"))
        assertEquals(RotorTimeSync.UNSUPPORTED,
            RotorClient(FakeTransport(mapOf("/api/time" to RotorResponse(404, JSONObject())))).syncTime(1))
        assertEquals(RotorTimeSync.GNSS, RotorClient(FakeTransport(mapOf("/api/time" to
            RotorResponse(409, JSONObject().put("error", "UTC GNSS activa; tiene prioridad"))))).syncTime(1))
        val busy = RotorClient(FakeTransport(mapOf("/api/time" to RotorResponse(409, JSONObject().put("error", "ocupado")))))
        assertEquals(409, assertThrows(RotorException::class.java) { busy.syncTime(1) }.code)

        val load = FakeTransport(emptyMap())
        RotorClient(load).loadSatellite(SatellitesTest.tle)
        assertEquals(listOf("/api/tle", "/api/select"), load.calls.map { it.second })
        assertTrue(load.calls[0].third!!.getString("text").contains(SatellitesTest.tle.line2))
        assertEquals(0, load.calls[1].third!!.getInt("id"))

        val site = FakeTransport(emptyMap())
        RotorClient(site).setSite(ObserverPosition(40.4, -3.7, 0.667))
        assertEquals(667.0, site.calls.single().third!!.getDouble("alt"), 1e-6)
        assertTrue(site.calls.single().third!!.getBoolean("manual"))
    }

    @Test fun clientRequiresAcceptedCodesAndValidatesAngles() {
        val moving = FakeTransport(mapOf("/api/move" to RotorResponse(202, JSONObject())))
        RotorClient(moving).move(-170.0, 10.0)
        assertEquals(-170.0, moving.calls.single().third!!.getDouble("az"), 1e-9)
        assertThrows(IllegalArgumentException::class.java) { RotorClient(moving).move(190.0, 10.0) }
        val refused = RotorClient(FakeTransport(mapOf("/api/home" to RotorResponse(409, JSONObject().put("error", "BLE controla")))))
        val error = assertThrows(RotorException::class.java) { refused.home() }
        assertEquals("BLE controla", error.detail)
        val calibration = FakeTransport(emptyMap())
        RotorClient(calibration).calibrate(-10.0)
        assertEquals(350.0, calibration.calls.single().third!!.getDouble("trueAz"), 1e-9)
        assertTrue(calibration.calls.single().third!!.getBoolean("levelConfirmed"))
    }

    @Test fun plannerFindsCableCrossingAndSuggestsUnusedCut() {
        // South-going pass from 120° to 240° true crosses a cut placed at 180° (north offset 0).
        val track = (0..12).map { look(it * 10, 120.0 + it * 10, if (it in 1..11) 20.0 else 0.0) }
        val crossing = RotorPlanner.plan(track, 0.0, 2.25)
        assertTrue(crossing.crossesCableStop); assertFalse(crossing.clean)
        assertEquals(180.0, crossing.cutAzimuth, 1e-9)
        assertEquals(0.0, requireNotNull(crossing.suggestedCutAzimuth), 1e-9)
        assertTrue(crossing.trackable < 1.0)
        // Re-placing the cut at the suggestion (north offset = cut - 180) makes it clean.
        val fixed = RotorPlanner.plan(track, RotorPlanner.wrap(0.0 - 180), 2.25)
        assertFalse(fixed.crossesCableStop); assertTrue(fixed.clean)
        assertEquals(1.0, fixed.trackable, 1e-9)
        assertEquals(RotorPlanner.mechanical(120.0, 180.0), fixed.aosAzimuth, 1e-9)
        assertEquals(-60.0, fixed.aosAzimuth, 1e-9)
    }

    @Test fun plannerFlagsFastAndZenithPassesAndRejectsShortTracks() {
        val overhead = listOf(look(0, 10.0, 0.0), look(1, 10.0, 45.0), look(2, 190.0, 89.5), look(3, 190.0, 40.0))
        val plan = RotorPlanner.plan(overhead, 90.0, 5.94)
        assertTrue(plan.tooFast); assertTrue(plan.zenith); assertTrue(plan.maxRateDegS > 100)
        assertEquals(1.0 / 4, plan.trackable, 1e-9)
        assertThrows(IllegalArgumentException::class.java) { RotorPlanner.plan(listOf(look(0, 1.0, 1.0)), 0.0, 2.0) }
        assertEquals(-180.0, RotorPlanner.difference(180.0, 0.0), 1e-9)
        assertEquals(10.0, RotorPlanner.mechanical(5.0, 355.0), 1e-9)
    }
}
