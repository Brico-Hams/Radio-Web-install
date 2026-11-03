package org.bricohams.radio

import org.junit.Assert.*
import org.junit.Test
import java.io.IOException
import java.net.InetAddress
import java.net.Socket
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.util.ArrayDeque
import java.util.Locale

/** Text-CAT radio simulator: ';' framing, FA read/set with a per-rig digit count, optional silence and stale read-backs. */
private class AsciiRadio(
    val digits: Int,
    val id: String,
    var frequency: Long,
    val staleReads: Int = 0,
    var silentFa: Int = 0,
    val ignoreSets: Boolean = false
) : RadioBytes {
    val writes = ArrayList<String>()
    private val out = ArrayDeque<Byte>()
    private var pending: Long? = null
    private var staleLeft = 0
    private fun reply(text: String) = text.toByteArray(Charsets.US_ASCII).forEach(out::add)
    override fun write(bytes: ByteArray, timeoutMs: Int) {
        val text = String(bytes, Charsets.US_ASCII)
        writes.add(text)
        for (command in text.split(';').filter { it.isNotEmpty() }) {
            when {
                command == "ID" -> reply("$id;")
                command == "VN" -> reply("VN1_00_021QMX;")
                command == "FA" -> {
                    if (silentFa > 0) { silentFa--; continue }
                    pending?.let {
                        if (staleLeft > 0) staleLeft-- else { frequency = it; pending = null }
                    }
                    reply(String.format(Locale.ROOT, "FA%0${digits}d;", frequency))
                }
                command.startsWith("FA") -> if (!ignoreSets) { pending = command.substring(2).toLong(); staleLeft = staleReads }
                else -> reply("?;")
            }
        }
    }
    override fun read(length: Int, timeoutMs: Int): ByteArray {
        if (out.size < length) throw IOException("Mock timeout")
        return ByteArray(length) { out.removeFirst() }
    }
    override fun close() = Unit
}

/** Minimal Quansheng CAT firmware: hello plus the 0x7B00 query/tune/stop exchange. */
private class FakeQuansheng(var active: Boolean = true) : RadioBytes {
    private val out = ArrayDeque<Byte>()
    var remote = false
    var applied = 14580000L
    val operations = ArrayList<Int>()
    override fun write(bytes: ByteArray, timeoutMs: Int) {
        val (type, request) = QuanshengFrames.decode(bytes)
        if (type == 0x0514) {
            QuanshengFrames.encode(0x0515, "F4HWN BricoHams v6".toByteArray(Charsets.US_ASCII).copyOf(24)).forEach(out::add)
            return
        }
        val operation = request[1].toInt()
        operations.add(operation)
        if (operation == 1) { applied = ByteBuffer.wrap(request).order(ByteOrder.LITTLE_ENDIAN).getInt(4).toLong(); remote = true }
        if (operation == 2) { applied = 14580000L; remote = false }
        val response = ByteBuffer.allocate(16).order(ByteOrder.LITTLE_ENDIAN)
            .put(1).put(if (operation == 0) 0 else 1).put(request[2]).put(request[3]).putInt(7)
            .putInt(if (active) applied.toInt() else 0)
            .putInt(if (active) 1 or (if (remote) 2 else 0) else 0).array()
        QuanshengFrames.encode(0x7b01, response).forEach(out::add)
    }
    override fun read(length: Int, timeoutMs: Int): ByteArray {
        if (out.size < length) throw IOException("Mock timeout")
        return ByteArray(length) { out.removeFirst() }
    }
    override fun close() = Unit
}

class RigReliabilityTest {
    private val runner = DiagnosticsRunner({ "s$it" })

    // --- rig command formats ---
    @Test fun frequencyFormatsPerRig() {
        assertEquals("FA145800000;", YaesuFtx1.setFrequency(Vfo.A, 145_800_000))
        assertEquals("FA00007100000;", KenwoodTs480Subset.setFrequency(7_100_000))
        assertEquals("FA00007100000;", QrpLabsCat.setFrequency(Vfo.A, 7_100_000))
        assertEquals("FA;", QrpLabsCat.readFrequency(Vfo.A))
    }

    // --- serial settings ---
    @Test fun rigSerialSettingsNeverDrivesControlLines() {
        for (model in RigModel.values()) {
            val settings = rigSerialSettings(model, model.defaultBaud, 0)
            assertEquals(false, settings.dtr)
            assertEquals(false, settings.rts)
        }
        assertEquals(38400, RigModel.FTX1.defaultBaud)
        assertEquals(38400, RigModel.TRUSDX.defaultBaud)
        assertEquals(1, RigModel.FTX1.stopBits)
    }

    @Test fun ftx1AlwaysUsesTheCp2105EnhancedPort() {
        assertEquals(0, rigSerialSettings(RigModel.FTX1, 38400, 1, enhancedPort = 0).portIndex)
        assertEquals(1, rigSerialSettings(RigModel.TRUSDX, 38400, 1, enhancedPort = 0).portIndex)
    }

    @Test fun cdcControlLinesDefaultToAssertedUnlessExplicit() {
        assertEquals(3, SerialRadio.cdcLines(SerialSettings()))
        assertEquals(0, SerialRadio.cdcLines(SerialSettings(dtr = false, rts = false)))
        assertEquals(1, SerialRadio.cdcLines(SerialSettings(dtr = true, rts = false)))
    }

    // --- AsciiLink: retry, read-back, serialisation ---
    @Test fun requestIsRetriedAfterASilentAttempt() {
        val radio = AsciiRadio(9, "ID0840;", 145_500_000, silentFa = 1)
        val rig = Ftx1Rig(radio)
        assertEquals(145_500_000L, rig.frequency(Vfo.A))
        assertEquals(listOf("FA;", "FA;"), radio.writes)
    }

    @Test fun staleReadBackIsPolledAgainBeforeFailing() {
        val radio = AsciiRadio(9, "ID0840;", 145_500_000, staleReads = 1)
        Ftx1Rig(radio).setFrequency(Vfo.A, 145_800_000)
        assertEquals(145_800_000L, radio.frequency)
    }

    @Test fun unconfirmedSetStillFailsExplicitly() {
        val radio = AsciiRadio(9, "ID0840;", 145_500_000, ignoreSets = true)
        assertThrows(IllegalStateException::class.java) { Ftx1Rig(radio).setFrequency(Vfo.A, 145_800_000) }
    }

    @Test fun commandsAreSerialisedAndPaced() {
        var now = 0L
        val sleeps = ArrayList<Long>()
        val radio = AsciiRadio(9, "ID0840;", 145_500_000)
        val link = AsciiLink(radio, clock = { now }, sleep = { sleeps.add(it); now += it })
        link.request("FA;", "FA")
        link.request("FA;", "FA")
        assertEquals(listOf(AsciiLink.MIN_GAP_MS), sleeps)
    }

    @Test fun concurrentSetAndReadBackDoNotInterleave() {
        val radio = AsciiRadio(9, "ID0840;", 145_500_000)
        val rig = Ftx1Rig(radio)
        val threads = (1..4).map { index ->
            Thread { repeat(3) { rig.setFrequency(Vfo.A, 145_000_000L + index * 100_000L) } }
        }
        threads.forEach(Thread::start)
        threads.forEach(Thread::join)
        // Every SET is immediately followed by its own read-back.
        radio.writes.forEachIndexed { index, write ->
            if (write.startsWith("FA") && write.length > 3) assertEquals("FA;", radio.writes[index + 1])
        }
    }

    // --- diagnostics runner with fake ports ---
    @Test fun ftx1SelfTestPassesAndRestoresTheFrequencyWithoutTransmitting() {
        val radio = AsciiRadio(9, "ID0840;", 145_500_000)
        val result = runner.runRig(Ftx1Rig(radio))
        assertTrue(result.steps.toString(), result.passed)
        assertEquals(5, result.steps.size)
        assertEquals(145_500_000L, radio.frequency)
        assertTrue(radio.writes.contains("FA145800000;"))
        assertTrue(radio.writes.none { it.startsWith("TX") || it.startsWith("PC") })
    }

    @Test fun trusdxAndQmxSelfTestsUseElevenDigitFrequencies() {
        val sdx = AsciiRadio(11, "ID020;", 7_074_000)
        assertTrue(runner.runRig(TruSdxRig(sdx)).passed)
        assertTrue(sdx.writes.contains("FA00007100000;"))
        assertEquals(7_074_000L, sdx.frequency)
        val qmx = AsciiRadio(11, "ID020;", 14_074_000)
        assertTrue(runner.runRig(QrpLabsRig(qmx, RigModel.QMX)).passed)
        assertEquals(14_074_000L, qmx.frequency)
    }

    @Test fun selfTestReportsAFailedStepAndSkipsTheDependentOnes() {
        val silent = AsciiRadio(9, "ID0840;", 145_500_000, silentFa = 1000)
        val result = runner.runRig(Ftx1Rig(silent))
        assertFalse(result.passed)
        assertTrue(result.steps[0].ok)
        assertFalse(result.steps[1].ok)
        assertEquals(5, result.steps.size)
        assertTrue(result.steps.drop(2).none { it.ok })
        assertTrue(silent.writes.none { it.length > 3 && it.startsWith("FA") })
    }

    @Test fun selfTestFailsWhenTheRadioDoesNotConfirmTheNewFrequency() {
        val radio = AsciiRadio(9, "ID0840;", 145_500_000, ignoreSets = true)
        val result = runner.runRig(Ftx1Rig(radio))
        assertFalse(result.passed)
        assertFalse(result.steps[2].ok)
    }

    @Test fun quanshengSelfTestHelloTuneLeaseAndRelease() {
        var now = 0L
        val radio = FakeQuansheng()
        val cat = CatProtocol(radio, clock = { now }, sleep = { now += it })
        val timed = DiagnosticsRunner({ "s$it" }, clock = { now }, sleep = { now += it })
        val result = timed.runQuansheng(cat)
        assertTrue(result.steps.toString(), result.passed)
        assertEquals(4, result.steps.size)
        assertEquals(2, radio.operations.last())
        assertEquals(14580000L, radio.applied)
    }

    @Test fun quanshengNotArmedIsReportedAsAFailedTuneNotACrash() {
        var now = 0L
        val radio = FakeQuansheng(active = false)
        val cat = CatProtocol(radio, clock = { now }, sleep = { now += it })
        val result = DiagnosticsRunner({ "s$it" }, clock = { now }, sleep = { now += it }).runQuansheng(cat)
        assertFalse(result.passed)
        assertTrue(result.steps[0].ok)
        assertFalse(result.steps[1].ok)
        assertFalse(result.steps[2].ok)
    }

    @Test fun reportListsDevicesAndStepsAsText() {
        val entries = listOf(UsbEntry("CP2105", 0x10C4, 0xEA70, "Cp21xx", 2, RadioIdentifier.identify(0x10C4, 0xEA70)))
        val text = DiagnosticsReport.build("1.0", "Galaxy S20 FE", "hoy", entries,
            listOf(DiagResult("FTX-1", listOf(DiagStep("Leer", true, "145 MHz"), DiagStep("Fijar", false, "sin respuesta")))))
        assertTrue(text.contains("10C4:EA70"))
        assertTrue(text.contains("Yaesu FTX-1"))
        assertTrue(text.contains("[OK] Leer"))
        assertTrue(text.contains("[FALLO] Fijar: sin respuesta"))
        assertTrue(text.contains("FTX-1: FALLO"))
    }

    @Test fun usbIdsIdentifyTheFourRadios() {
        assertEquals(RadioKind.QUANSHENG, RadioIdentifier.identify(0x36B7, 0x0001))
        assertEquals(RadioKind.FTX1, RadioIdentifier.identify(0x10C4, 0xEA70))
        assertEquals(RadioKind.TRUSDX, RadioIdentifier.identify(0x1A86, 0x7523))
        assertEquals(RadioKind.QMX, RadioIdentifier.identify(0x26AA, 0x0001))
        assertEquals(RadioKind.UNKNOWN, RadioIdentifier.identify(0x0403, 0x6001))
    }

    // --- TCP bridge ---
    @Test fun tcpBridgeForwardsBytesBothWays() {
        val radio = AsciiRadio(9, "ID0840;", 145_500_000)
        val bridge = TcpBridge(radio, port = 0, bindAddress = InetAddress.getLoopbackAddress())
        bridge.start()
        try {
            Socket(InetAddress.getLoopbackAddress(), bridge.localPort).use { socket ->
                socket.soTimeout = 3000
                socket.getOutputStream().write("ID;".toByteArray())
                socket.getOutputStream().flush()
                val reply = ByteArray(7)
                var read = 0
                while (read < reply.size) read += socket.getInputStream().read(reply, read, reply.size - read)
                assertEquals("ID0840;", String(reply, Charsets.US_ASCII))
            }
        } finally {
            bridge.stop()
        }
    }

    // --- location fallback ---
    private fun fix(source: String, accuracy: Float?, ageMs: Long, now: Long = 10_000_000L, lat: Double = 40.0, lon: Double = -3.0) =
        PositionFix(source, lat, lon, null, accuracy, now - ageMs)

    @Test fun freshFixesPreferTheMostAccurate() {
        val now = 10_000_000L
        val best = LocationSelector.best(listOf(fix("network", 800f, 10_000), fix("gps", 8f, 30_000), fix("fused", 30f, 5_000)), now)
        assertEquals("gps", best?.source)
    }

    @Test fun staleFixesFallBackToTheNewest() {
        val now = 10_000_000L
        val best = LocationSelector.best(listOf(fix("gps", 5f, 3_600_000), fix("network", 900f, 600_000)), now)
        assertEquals("network", best?.source)
    }

    @Test fun veryOldOrInvalidFixesAreRejected() {
        val now = 100_000_000L
        assertNull(LocationSelector.best(listOf(fix("gps", 5f, LocationSelector.STALE_MS + 1, now)), now))
        assertNull(LocationSelector.best(listOf(fix("gps", 5f, 1000, now, lat = 0.0, lon = 0.0)), now))
        assertNull(LocationSelector.best(listOf(fix("gps", 5f, 1000, now, lat = 91.0)), now))
        assertNull(LocationSelector.best(emptyList(), now))
    }

    @Test fun fixWithoutAccuracyLosesToOneWithAccuracy() {
        val now = 10_000_000L
        val best = LocationSelector.best(listOf(fix("passive", null, 1000), fix("network", 500f, 60_000)), now)
        assertEquals("network", best?.source)
    }

    // --- PRO mode ---
    @Test fun proModeWaivesTheBackupOnlyWhenAccepted() {
        assertFalse(WritePolicy.mayWrite(proMode = false, hasBackup = false))
        assertTrue(WritePolicy.mayWrite(proMode = false, hasBackup = true))
        assertTrue(WritePolicy.mayWrite(proMode = true, hasBackup = false))
        assertTrue(WritePolicy.mustVerifyBackup(proMode = false, hasBackup = true))
        assertFalse(WritePolicy.mustVerifyBackup(proMode = true, hasBackup = true))
        assertFalse(WritePolicy.mustVerifyBackup(proMode = false, hasBackup = false))
    }
}
