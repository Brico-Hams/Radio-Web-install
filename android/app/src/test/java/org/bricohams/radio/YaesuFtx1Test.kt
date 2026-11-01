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
}
