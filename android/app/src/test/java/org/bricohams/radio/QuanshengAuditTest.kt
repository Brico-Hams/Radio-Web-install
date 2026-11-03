package org.bricohams.radio

import org.junit.Assert.*
import org.junit.Test
import java.io.IOException
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.util.ArrayDeque

class QuanshengAuditTest {
    /** Records every request and answers the read-only extended commands the Diagnostics screen may use. */
    private class ExtRadio(var answer: Boolean = true) : RadioBytes {
        val sent = ArrayList<Pair<Int, ByteArray>>()
        private val out = ArrayDeque<Byte>()
        var ardfStatus = 0
        val presets = ByteArray(208).also {
            "BHSP".toByteArray().copyInto(it)
            it[4] = 1; it[5] = 1
            ByteBuffer.wrap(it).order(ByteOrder.LITTLE_ENDIAN).putInt(204, QuanshengMemory.crc32(it.copyOfRange(0, 204)).toInt())
        }
        private fun le(size: Int) = ByteBuffer.allocate(size).order(ByteOrder.LITTLE_ENDIAN)
        private fun reply(type: Int, data: ByteArray) = QuanshengFrames.encode(type, data).forEach(out::add)
        override fun write(bytes: ByteArray, timeoutMs: Int) {
            if (bytes.size == 1) return
            val (type, request) = QuanshengFrames.decode(bytes)
            sent.add(type to request)
            if (!answer && type != 0x0514) return
            when (type) {
                0x0514 -> if (answer) reply(0x0515, "F4HWN v6.1.0".toByteArray().copyOf(16))
                0x0720 -> reply(0x0721, ByteArray(66).also {
                    it[0] = request[0]
                    ByteBuffer.wrap(it).order(ByteOrder.LITTLE_ENDIAN).putInt(2, 0x31424d46)
                    "SLOT${request[0]}".toByteArray().copyInto(it, 18)
                })
                0x7b10 -> {
                    val half = if (request[1].toInt() == 0) 0 else 104
                    reply(0x7b11, request.copyOfRange(0, 6).also { it[1] = 0 } + presets.copyOfRange(half, half + 104))
                }
                0x7b20 -> reply(0x7b21, ByteArray(140).also {
                    it[0] = 1; it[1] = ardfStatus.toByte(); it[2] = 1; it[3] = 2
                    it[4] = request[2]; it[5] = request[3]
                    ByteBuffer.wrap(it).order(ByteOrder.LITTLE_ENDIAN).putInt(8, 7).putInt(12, 30000).putInt(16, 1000)
                })
                0x7b30 -> {
                    val operation = request[1].toInt()
                    val count = request[11].toInt()
                    val body = if (operation == 4) ByteArray(count * 32).also { records ->
                        for (item in 0 until count) {
                            val v = ByteBuffer.wrap(records).order(ByteOrder.LITTLE_ENDIAN)
                            v.putInt(item * 32, 25544)
                            "ISS".toByteArray().copyInto(records, item * 32 + 4)
                            v.putInt(item * 32 + 12, 1_700_000_000)
                            records[item * 32 + 20] = 45
                            v.putInt(item * 32 + 28, 14_580_000)
                        }
                    } else ByteArray(0)
                    val head = ByteArray(12).also { it[0] = 1; it[2] = operation.toByte(); it[3] = 5; it[10] = 64; it[11] = 32 }
                    reply(0x7b31, head + body)
                }
                else -> Unit
            }
        }
        override fun read(length: Int, timeoutMs: Int): ByteArray {
            if (out.size < length) throw IOException("Mock timeout")
            return ByteArray(length) { out.removeFirst() }
        }
        override fun close() = Unit
    }

    private fun memory(radio: RadioBytes) = QuanshengMemory(radio).apply { identify() }

    @Test fun quanshengLinesAssertDtrOnlyOnCdcAndNothingOnTheJack() {
        val cdc = SerialRadio.quanshengSettings(true)
        assertEquals(1, SerialRadio.cdcLines(cdc))
        assertEquals(true, cdc.dtr)
        assertEquals(false, cdc.rts)
        val jack = SerialRadio.quanshengSettings(false)
        assertEquals(false, jack.dtr)
        assertEquals(false, jack.rts)
        assertEquals(38400, jack.baud)
    }

    @Test fun slotInfoReadsAllFiveSlots() {
        val slots = QuanshengReadOnly(memory(ExtRadio())).slots()
        assertEquals(listOf("SLOT0", "SLOT1", "SLOT2", "SLOT3", "SLOT4"), slots.map { it.name })
        assertEquals(0x31424d46L, slots[0].magic)
        assertThrows(IllegalArgumentException::class.java) { QuanshengReadOnly(memory(ExtRadio())).slotInfo(5) }
    }

    @Test fun spectrumPresetsAreReadInTwoHalvesAndValidated() {
        val radio = ExtRadio()
        assertArrayEquals(radio.presets, QuanshengReadOnly(memory(radio), random = { 42 }).spectrumPresets())
        assertEquals(listOf(0, 1), radio.sent.filter { it.first == 0x7b10 }.map { it.second[1].toInt() })
        radio.presets[10] = 1
        assertFalse(QuanshengReadOnly.isValidPresetFile(radio.presets))
        assertFalse(QuanshengReadOnly.isValidPresetFile(ByteArray(10)))
    }

    @Test fun ardfStatsAreParsedAndAnIdleRadioIsNotAnError() {
        val radio = ExtRadio()
        val stats = QuanshengReadOnly(memory(radio)).ardfStats()!!
        assertEquals(7L, stats.session)
        assertEquals(2, stats.foxCount)
        assertEquals(30000L, stats.durationMs)
        assertTrue(stats.active)
        radio.ardfStatus = 3
        assertNull(QuanshengReadOnly(memory(radio)).ardfStats())
    }

    @Test fun passTableIsReadWithAZeroHostTimeSoTheRadioClockIsUntouched() {
        val radio = ExtRadio()
        val table = QuanshengReadOnly(memory(radio)).passTable()
        assertEquals(5, table.count)
        assertEquals(5, table.passes.size)
        assertEquals("ISS", table.passes[0].name)
        assertEquals(25544L, table.passes[0].norad)
        val requests = radio.sent.filter { it.first == 0x7b30 }
        assertEquals(listOf(0, 4, 4), requests.map { it.second[1].toInt() })
        for ((_, request) in requests) assertEquals(0, ByteBuffer.wrap(request).order(ByteOrder.LITTLE_ENDIAN).getInt(6))
    }

    @Test fun diagnosticsNeverSendsAWriteTransmitOrMutatingCommand() {
        val radio = ExtRadio()
        var now = 0L
        val runner = DiagnosticsRunner({ "s$it" }, clock = { now }, sleep = { now += it })
        val results = runner.runQuanshengAll(QuanshengMemory(radio), CatProtocol(radio, clock = { now }, sleep = { now += it }))
        assertEquals(QuanshengModule.values().size, results.size)
        val allowed = setOf(0x0514, 0x7b00, 0x7b02, 0x051b, 0x0738, 0x073e, 0x0720, 0x7b10, 0x7b20, 0x7b30)
        for ((type, request) in radio.sent) {
            assertTrue("0x%04x".format(type), type in allowed)
            if (type == 0x7b02) assertEquals("PTT only as a query", 0, request[1].toInt())
            if (type == 0x7b30) assertTrue(request[1].toInt() == 0 || request[1].toInt() == 4)
            if (type == 0x7b10) assertTrue(request[1].toInt() == 0 || request[1].toInt() == 1)
            if (type == 0x7b00) assertNotEquals("CAT tune is not part of the read-only modules while not armed", 1, request[1].toInt())
        }
        assertTrue(results.first { it.module == "s${R.string.diag_mod_passes}" }.passed)
        assertTrue(results.first { it.module == "s${R.string.diag_mod_presets}" }.passed)
    }

    @Test fun silentLinkSkipsTheRestInsteadOfHammeringTheRadio() {
        val radio = ExtRadio(answer = false)
        var now = 0L
        val runner = DiagnosticsRunner({ "s$it" }, clock = { now }, sleep = { now += it })
        val results = runner.runQuanshengAll(QuanshengMemory(radio), CatProtocol(radio, clock = { now }, sleep = { now += it }))
        assertFalse(results[0].passed)
        assertTrue(results.drop(1).all { it.steps.single().skipped && it.passed })
        assertTrue(radio.sent.all { it.first == 0x0514 })
    }

    @Test fun pendingStepsDoNotFailAModuleButFailuresStillDo() {
        assertTrue(DiagResult("m", listOf(DiagStep("a", true, ""), DiagStep("b", false, "x", skipped = true))).passed)
        assertFalse(DiagResult("m", listOf(DiagStep("a", true, ""), DiagStep("b", false, "x"))).passed)
        val text = DiagnosticsReport.build("1", "tel", "hoy", emptyList(),
            listOf(DiagResult("m", listOf(DiagStep("b", false, "x", skipped = true)))))
        assertTrue(text.contains("[PENDIENTE] b: x"))
    }

    @Test fun proModeOnlyWaivesTheBackupNotTheFirmwareSafetyChecks() {
        assertTrue(WritePolicy.mayWrite(proMode = true, hasBackup = false))
        assertFalse(WritePolicy.mayWrite(proMode = false, hasBackup = false))
        assertFalse(WritePolicy.mustVerifyBackup(proMode = true, hasBackup = true))
        // PRO is not even known to QuanshengMemory: a radio that has not identified as >= v6.1 stays read-only whatever the policy says.
        assertTrue(QuanshengMemory(ExtRadio()).legacyReadOnly)
    }
}
