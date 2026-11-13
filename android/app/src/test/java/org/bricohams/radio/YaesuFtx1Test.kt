package org.bricohams.radio

import org.junit.Assert.*
import org.junit.Test
import java.io.IOException

class YaesuFtx1Test {
    @Test fun commandsAreFormatted() {
        assertEquals("FA014250000;", YaesuFtx1.setFrequency(Vfo.A, 14_250_000))
        assertEquals("FB145800000;", YaesuFtx1.setFrequency(Vfo.B, 145_800_000))
        assertEquals("FA;", YaesuFtx1.readFrequency(Vfo.A))
        assertEquals("FB;", YaesuFtx1.readFrequency(Vfo.B))
        assertEquals("MD02;", YaesuFtx1.setMode(RigMode.USB))
        assertEquals("MD0B;", YaesuFtx1.setMode(RigMode.FM_N))
        assertEquals("MD0;", YaesuFtx1.readMode())
        assertEquals("TX1;", YaesuFtx1.ptt(true))
        assertEquals("TX0;", YaesuFtx1.ptt(false))
        assertEquals("ST1;", YaesuFtx1.split(true))
        assertEquals("ST0;", YaesuFtx1.split(false))
        assertEquals("MR00005;", YaesuFtx1.readMemory(5))
        assertEquals("MT00005;", YaesuFtx1.readTag(5))
        assertThrows(IllegalArgumentException::class.java) { YaesuFtx1.setMode(RigMode.WFM) }
    }
    @Test fun answersAreParsed() {
        assertEquals(14_250_000L, YaesuFtx1.parseFrequency("FA014250000;", Vfo.A))
        assertEquals(145_800_000L, YaesuFtx1.parseFrequency("FB145800000;", Vfo.B))
        assertThrows(IllegalArgumentException::class.java) { YaesuFtx1.parseFrequency("FA0142500;", Vfo.A) }
        assertThrows(IllegalArgumentException::class.java) { YaesuFtx1.parseFrequency("FB145800000;", Vfo.A) }
        assertEquals(RigMode.USB, YaesuFtx1.parseMode("MD02;"))
        assertEquals(RigMode.FM_N, YaesuFtx1.parseMode("MD0B;"))
        assertEquals(RigMode.AM, YaesuFtx1.parseMode("MD0D;"))
        assertNull(YaesuFtx1.parseMode("MD0Z;"))
    }
    private val memory = "MR" + "00005" + "145800000" + "+0000" + "0" + "0" + "4" + "0" + "0" + "00" + "0" + ";"
    @Test fun memoryAndTagAreParsed() {
        assertEquals(30, memory.length)
        assertEquals(RigMemory(5, 145_800_000, RigMode.FM, ""), YaesuFtx1.parseMemory(memory))
        assertEquals("ISS", YaesuFtx1.parseTag("MT00005" + "ISS".padEnd(12) + ";"))
        assertThrows(IllegalArgumentException::class.java) { YaesuFtx1.parseMemory("MR00005;") }
        assertThrows(IllegalArgumentException::class.java) { YaesuFtx1.parseTag("MT00005ISS;") }
    }
    @Test fun idIsChecked() {
        YaesuFtx1.checkId("ID0840;")
        assertThrows(IllegalArgumentException::class.java) { YaesuFtx1.checkId("ID0000;") }
        assertEquals("FTX-1 ID0840", Ftx1Rig(ScriptedRadio { ascii("ID0840;") }).identify())
        assertThrows(IllegalArgumentException::class.java) { Ftx1Rig(ScriptedRadio { ascii("ID0900;") }).identify() }
    }
    @Test fun questionMarkIsARejection() {
        val error = assertThrows(IOException::class.java) { Ftx1Rig(ScriptedRadio { ascii("?;") }).frequency(Vfo.A) }
        assertTrue(error is LocalizedError)
    }
    @Test fun setFrequencyIsReadBack() {
        var main = 0L
        val transport = ScriptedRadio { request ->
            val text = String(request, Charsets.US_ASCII)
            if (text.length > 3) { main = text.substring(2, 11).toLong(); ByteArray(0) } else ascii("FA%09d;".format(main))
        }
        val rig = Ftx1Rig(transport)
        rig.setFrequency(Vfo.A, 145_800_000)
        assertEquals(listOf("FA145800000;", "FA;"), transport.writes.map { String(it, Charsets.US_ASCII) })
        assertThrows(IllegalArgumentException::class.java) { rig.setFrequency(Vfo.A, 500_000_000) }
    }
    @Test fun memoriesSkipBlankChannels() {
        val transport = ScriptedRadio { request ->
            when (String(request, Charsets.US_ASCII)) {
                "MR00001;" -> ascii(memory)
                "MT00001;" -> ascii("MT00001" + "SAT".padEnd(12) + ";")
                else -> ascii("?;")
            }
        }
        val list = Ftx1Rig(transport).memories(1..2)
        assertEquals(listOf(RigMemory(5, 145_800_000, RigMode.FM, "SAT")), list)
    }
    @Test fun setCommandsAreConfirmedByTheirReadCommand() {
        var tx = "TX0;"
        var keepTransmitting = false
        val transport = ScriptedRadio { request ->
            when (val text = String(request, Charsets.US_ASCII)) {
                "TX1;" -> { tx = "TX1;"; ByteArray(0) }
                "TX0;" -> { tx = if (keepTransmitting) "TX2;" else "TX0;"; ByteArray(0) }
                "TX;" -> ascii(tx)
                "ST1;" -> ByteArray(0)
                "ST;" -> ascii("ST0;")
                else -> error(text)
            }
        }
        val rig = Ftx1Rig(transport)
        rig.ptt(true)
        rig.ptt(false)
        keepTransmitting = true
        assertThrows(IllegalStateException::class.java) { rig.ptt(false) }
        assertThrows(IllegalStateException::class.java) { rig.setSplit(true) }
    }
    /** FTX-1 channel store that answers MR/MT/MZ from what MW/MT/MZ wrote; [corrupt] flips the stored frequency. */
    private fun channelStore(corrupt: Boolean = false): ScriptedRadio {
        var mw = ""
        var mt = ""
        var mz = ""
        return ScriptedRadio { request ->
            val text = String(request, Charsets.US_ASCII)
            when {
                text.startsWith("MW") -> { mw = text; ByteArray(0) }
                text.startsWith("MT") && text.length > 8 -> { mt = text; ByteArray(0) }
                text.startsWith("MZ") && text.length > 8 -> { mz = text; ByteArray(0) }
                text.startsWith("MR") -> ascii("MR" + mw.substring(2, 7) + (if (corrupt) "145900000" else mw.substring(7, 16)) + mw.substring(16))
                text.startsWith("MT") -> ascii(mt)
                text.startsWith("MZ") -> ascii(mz)
                else -> ascii("?;")
            }
        }
    }
    @Test fun writeCommandsAreFormatted() {
        assertEquals("MW00001145800000+000000410000;", YaesuFtx1.writeMemory(1, 145_800_000, RigMode.FM))
        assertEquals(30, YaesuFtx1.writeMemory(999, 30_000, RigMode.DATA_U).length)
        assertEquals(RigMode.FM, YaesuFtx1.parseMemory("MR" + YaesuFtx1.writeMemory(1, 145_800_000, RigMode.FM).drop(2)).mode)
        assertThrows(IllegalArgumentException::class.java) { YaesuFtx1.writeMemory(0, 145_800_000, RigMode.FM) }
        assertThrows(IllegalArgumentException::class.java) { YaesuFtx1.writeMemory(1, 500_000_000, RigMode.FM) }
        assertThrows(IllegalArgumentException::class.java) { YaesuFtx1.writeMemory(1, 145_800_000, RigMode.WFM) }
        assertEquals("MT00001" + "ISS".padEnd(12) + ";", YaesuFtx1.writeTag(1, "ISS"))
        assertEquals("MT00001" + "A B C       " + ";", YaesuFtx1.writeTag(1, "A;B\u00e9C"))
        assertEquals(20, YaesuFtx1.writeTag(1, "ABCDEFGHIJKLMNOP").length)
        assertEquals("MZ00001" + "0" + "145800000" + ";", YaesuFtx1.writeSplit(1, null, 145_800_000))
        assertEquals("MZ00001" + "1" + "435800000" + ";", YaesuFtx1.writeSplit(1, 435_800_000, 145_800_000))
        assertEquals(18, YaesuFtx1.writeSplit(1, 435_800_000, 145_800_000).length)
        assertEquals("MZ00007;", YaesuFtx1.readSplit(7))
    }
    @Test fun splitIsParsed() {
        assertNull(YaesuFtx1.parseSplit("MZ000010000000000;"))
        assertEquals(435_800_000L, YaesuFtx1.parseSplit("MZ000011435800000;"))
        assertThrows(IllegalArgumentException::class.java) { YaesuFtx1.parseSplit("MZ00001;") }
        assertThrows(IllegalArgumentException::class.java) { YaesuFtx1.parseSplit("MZ00001x435800000;") }
    }
    @Test fun memoryWriteIsReadBack() {
        val transport = channelStore()
        val rig = Ftx1Rig(transport)
        assertTrue(rig.supportsMemoryWrite)
        rig.writeMemory(RigMemory(1, 145_800_000, RigMode.FM, "ISS", 435_800_000))
        assertEquals(listOf(RigMemory(1, 145_800_000, RigMode.FM, "ISS", 435_800_000)), rig.memories(1..1))
        rig.writeMemory(RigMemory(2, 29_600_000, RigMode.USB, "", null))
        assertEquals(listOf(RigMemory(2, 29_600_000, RigMode.USB, "", null)), rig.memories(2..2))
        assertThrows(IllegalArgumentException::class.java) { rig.writeMemory(RigMemory(1, 500_000_000, RigMode.FM, "X")) }
    }
    @Test fun memoryWriteMismatchIsReported() {
        val rig = Ftx1Rig(channelStore(corrupt = true))
        val error = assertThrows(IllegalStateException::class.java) { rig.writeMemory(RigMemory(1, 145_800_000, RigMode.FM, "ISS")) }
        assertTrue(error is LocalizedError)
    }
    @Test fun otherRigsCannotWriteMemories() {
        val memory = RigMemory(1, 145_800_000, RigMode.FM, "X")
        val rigs = listOf(YaesuFiveByteRig(ScriptedRadio { ByteArray(0) }, RigModel.FT857), IcomCivRig(ScriptedRadio { ByteArray(0) }),
            TruSdxRig(ScriptedRadio { ByteArray(0) }))
        for (rig in rigs) {
            assertFalse(rig.supportsMemoryWrite)
            assertThrows(UnsupportedOperationException::class.java) { rig.writeMemory(memory) }
        }
    }
    @Test fun memoriesCarryTheSplitFrequency() {
        val transport = ScriptedRadio { request ->
            when (String(request, Charsets.US_ASCII)) {
                "MR00005;" -> ascii(memory)
                "MT00005;" -> ascii("MT00005" + "SAT".padEnd(12) + ";")
                "MZ00005;" -> ascii("MZ000051435800000;")
                else -> ascii("?;")
            }
        }
        assertEquals(listOf(RigMemory(5, 145_800_000, RigMode.FM, "SAT", 435_800_000)), Ftx1Rig(transport).memories(5..5))
    }
    /** Replies captured from a real FTX-1 (MAIN firmware >= 1.08) on 2026-11-01, CAT-1 at 38400 bps. */
    @Test fun repliesCapturedFromARealRadioParse() {
        val replies = mapOf("ID;" to "ID0840;", "FA;" to "FA439275000;", "MD0;" to "MD0H;",
            "MR00001;" to "MR00001029670000+000000410000;", "MT00001;" to "MT00001ED1YBQ      ;",
            "MR00005;" to "MR00005144925000+000000412000;", "MT00005;" to "MT00005EA1GBH      ;")
        val rig = Ftx1Rig(ScriptedRadio { ascii(replies[String(it, Charsets.US_ASCII)] ?: "?;") })
        assertEquals("FTX-1 ID0840", rig.identify())
        assertEquals(RigStatus(439_275_000, RigMode.DV), rig.status())
        assertEquals(listOf(RigMemory(1, 29_670_000, RigMode.FM, "ED1YBQ"), RigMemory(5, 144_925_000, RigMode.FM, "EA1GBH")),
            rig.memories(1..5))
    }
    /** Channel 98 (simplex) and channel 412 (written by this app's strings) read back from a real FTX-1 on 2026-11-02. */
    @Test fun splitRepliesCapturedFromARealRadioParse() {
        assertNull(YaesuFtx1.parseSplit("MZ000980145725000;"))
        assertEquals(437_800_000L, YaesuFtx1.parseSplit("MZ004121437800000;"))
        assertEquals("MZ004121437800000;", YaesuFtx1.writeSplit(412, 437_800_000, 145_800_000))
        assertEquals("MR00412145800000+000000410000;", "MR" + YaesuFtx1.writeMemory(412, 145_800_000, RigMode.FM).drop(2))
        assertEquals("ISS", YaesuFtx1.parseTag("MT00412ISS         ;"))
    }

    // CAT Operation Reference Manual 2508-C: SM, RM, AG, RG, SQ, SH, IS, GT, PA, RA, PC (no TX command is involved)
    @Test fun receiverCommandsAreByteExact() {
        assertEquals("SM0;", YaesuFtx1.readSMeter())
        assertEquals("RM6;", YaesuFtx1.readMeter(6))
        assertEquals("AG0128;", YaesuFtx1.setAfGain(0, 128))
        assertEquals("AG1;", YaesuFtx1.readAfGain(1))
        assertEquals("RG0255;", YaesuFtx1.setRfGain(0, 255))
        assertEquals("SQ1007;", YaesuFtx1.setSquelch(1, 7))
        assertEquals("SH0012;", YaesuFtx1.setWidth(0, 12))
        assertEquals("SH0;", YaesuFtx1.readWidth(0))
        assertEquals("Tabla 5: 07", YaesuFtx1.widthText(7))
        assertEquals("IS00+0400;", YaesuFtx1.setIfShift(0, 400))
        assertEquals("IS00-1200;", YaesuFtx1.setIfShift(0, -1200))
        assertEquals("IS00+0000;", YaesuFtx1.setIfShift(0, 0))
        assertEquals("GT04;", YaesuFtx1.setAgc(0, 4))
        assertEquals("GT0;", YaesuFtx1.readAgc(0))
        assertEquals("PA02;", YaesuFtx1.setPreamp(0, 2))
        assertEquals("PA11;", YaesuFtx1.setPreamp(1, 1))
        assertEquals("PA2;", YaesuFtx1.readPreamp(2))
        assertEquals("RA01;", YaesuFtx1.setAttenuator(true))
        assertEquals("RA0;", YaesuFtx1.readAttenuator())
        assertEquals("PC1010;", YaesuFtx1.setPower(1, 10))
        assertEquals("PC2100;", YaesuFtx1.setPower(2, 100))
        assertEquals("PC;", YaesuFtx1.readPower())
    }
    @Test fun receiverRepliesParse() {
        assertEquals(120, YaesuFtx1.parseSMeter("SM0120;"))
        assertEquals(200, YaesuFtx1.parseMeter("RM1200000;", 1))
        assertEquals(64, YaesuFtx1.parseAfGain("AG0064;", 0))
        assertEquals(255, YaesuFtx1.parseRfGain("RG0255;", 0))
        assertEquals(3, YaesuFtx1.parseSquelch("SQ0003;", 0))
        assertEquals(12, YaesuFtx1.parseWidth("SH0012;", 0))
        assertEquals(-600, YaesuFtx1.parseIfShift("IS00-0600;", 0))
        assertEquals(5, YaesuFtx1.parseAgc("GT05;", 0))
        assertTrue(YaesuFtx1.agcMatches(4, 6))
        assertFalse(YaesuFtx1.agcMatches(1, 2))
        assertEquals(2, YaesuFtx1.parsePreamp("PA02;", 0))
        assertTrue(YaesuFtx1.parseAttenuator("RA01;"))
        assertEquals(2 to 50, YaesuFtx1.parsePower("PC2050;"))
        assertThrows(IllegalArgumentException::class.java) { YaesuFtx1.parseSMeter("SM0300;") }
        assertThrows(IllegalArgumentException::class.java) { YaesuFtx1.parseSMeter("SM1120;") }
        assertThrows(IllegalArgumentException::class.java) { YaesuFtx1.parseAgc("GT07;", 0) }
        assertThrows(IllegalArgumentException::class.java) { YaesuFtx1.parsePreamp("PA13;", 1) }
        assertThrows(IllegalArgumentException::class.java) { YaesuFtx1.parseIfShift("IS00+1220;", 0) }
    }
    @Test fun outOfRangeValuesAreRejectedBeforeSending() {
        val range = IllegalArgumentException::class.java
        assertThrows(range) { YaesuFtx1.setAfGain(0, 256) }
        assertThrows(range) { YaesuFtx1.setAfGain(0, -1) }
        assertThrows(range) { YaesuFtx1.setAfGain(2, 10) }
        assertThrows(range) { YaesuFtx1.setSquelch(0, 300) }
        assertThrows(range) { YaesuFtx1.setWidth(0, 24) }
        assertThrows(range) { YaesuFtx1.setIfShift(0, 1220) }
        assertThrows(range) { YaesuFtx1.setIfShift(0, 30) }
        assertThrows(range) { YaesuFtx1.setAgc(0, 5) }
        assertThrows(range) { YaesuFtx1.setPreamp(0, 3) }
        assertThrows(range) { YaesuFtx1.setPreamp(1, 2) }
        assertThrows(range) { YaesuFtx1.setPreamp(3, 0) }
        assertThrows(range) { YaesuFtx1.readMeter(9) }
        assertThrows(range) { YaesuFtx1.setPower(1, 11) }
        assertThrows(range) { YaesuFtx1.setPower(1, 4) }
        assertThrows(range) { YaesuFtx1.setPower(2, 101) }
        assertThrows(range) { YaesuFtx1.setPower(3, 10) }
    }
    @Test fun setsAreReadBackAndPowerNeverExceedsTheReportedHead() {
        var gain = "AG0000;"
        val radio = ScriptedRadio {
            when (val text = String(it, Charsets.US_ASCII)) {
                "AG0100;" -> { gain = text; ByteArray(0) }
                "AG0;" -> ascii(gain)
                "PC;" -> ascii("PC1005;")
                "SM0;" -> ascii("SM0120;")
                else -> ascii("?;")
            }
        }
        val rig = Ftx1Rig(radio)
        rig.setAfGain(0, 100)
        assertEquals(120, rig.signal())
        assertThrows(IllegalArgumentException::class.java) { rig.setPower(50) }
        assertTrue(radio.writes.none { String(it, Charsets.US_ASCII).startsWith("PC") && it.size > 3 })
        assertTrue(radio.writes.none { String(it, Charsets.US_ASCII).startsWith("TX") })
    }
    @Test fun speechTextAndBar() {
        assertEquals("145,800 megahercios, FM, señal 120",
            RigSpeech.text(145_800_000, "FM", 120, java.util.Locale("es", "ES"), "megahercios", "señal"))
        assertEquals("14.250 megahertz", RigSpeech.text(14_250_000, null, null, java.util.Locale.US, "megahertz", "signal"))
        assertEquals("----------", RigSpeech.bar(0))
        assertEquals("#####-----", RigSpeech.bar(128))
        assertEquals("##########", RigSpeech.bar(999))
    }
}
