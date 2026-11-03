package org.bricohams.radio

import org.junit.Assert.*
import org.junit.Test
import java.io.IOException

class TruSdxTest {
    @Test fun commandsAreFramed() {
        assertEquals("FA00014195000;", KenwoodTs480Subset.setFrequency(14_195_000))
        assertEquals("FA;", KenwoodTs480Subset.readFrequency())
        assertEquals(14_074_000L, KenwoodTs480Subset.parseFrequency("FA00014074000;"))
        assertEquals("MD2;", KenwoodTs480Subset.setMode(RigMode.USB))
        assertEquals("MD5;", KenwoodTs480Subset.setMode(RigMode.AM))
        assertEquals(RigMode.CW, KenwoodTs480Subset.parseMode("MD3;"))
        assertNull(KenwoodTs480Subset.parseMode("MD9;"))
        assertThrows(IllegalArgumentException::class.java) { KenwoodTs480Subset.setMode(RigMode.DATA_U) }
        assertEquals(";TX0;", KenwoodTs480Subset.ptt(true))
        assertEquals(";RX;", KenwoodTs480Subset.ptt(false))
        KenwoodTs480Subset.checkId("ID020;")
        assertThrows(IllegalArgumentException::class.java) { KenwoodTs480Subset.checkId("ID019;") }
    }
    @Test fun unsupportedOperationsAndRange() {
        val rig = TruSdxRig(ScriptedRadio())
        assertThrows(UnsupportedOperationException::class.java) { rig.frequency(Vfo.B) }
        assertThrows(UnsupportedOperationException::class.java) { rig.setSplit(true) }
        assertThrows(UnsupportedOperationException::class.java) { rig.memories(1..2) }
        assertThrows(IllegalArgumentException::class.java) { rig.setFrequency(Vfo.A, 145_800_000) }
    }
    @Test fun streamEncodingNeverContainsSemicolon() {
        val encoded = TruSdxStream.encode(ShortArray(65536) { (it - 32768).toShort() })
        assertFalse(encoded.any { it == 0x3B.toByte() })
        assertEquals(128, encoded[32768].toInt() and 255)
        assertEquals(0x3A, TruSdxStream.encode(shortArrayOf(((0x3B - 128) shl 8).toShort()))[0].toInt())
    }
    @Test fun decoderIgnoresCatRepliesOutsideTheStream() {
        val input = ascii("US") + bytes(0x80, 0x90) + ascii(";FA00014074000;US") + bytes(0x70) + ascii(";")
        val decoder = TruSdxStream.decoder()
        val first = decoder.feed(input.copyOf(3))
        val rest = decoder.feed(input.copyOfRange(3, input.size))
        assertArrayEquals(shortArrayOf(0, 4096, -4096), first + rest)
    }
    @Test fun transmitAlwaysReleasesTheRadio() {
        val release = ascii(";RX;UA0;")
        val transport = ScriptedRadio()
        var calls = 0
        TruSdxRig(transport).transmitAudio(ShortArray(5000)) { ++calls <= 1 }
        assertEquals("UA2;TX0;US", String(transport.writes.first(), Charsets.US_ASCII))
        assertEquals(3, transport.writes.size)
        assertArrayEquals(release, transport.writes.last())

        val failing = ScriptedRadio { request -> if (request.size == 1152) throw IOException("boom") else ByteArray(0) }
        assertThrows(IOException::class.java) { TruSdxRig(failing).transmitAudio(ShortArray(5000)) { true } }
        assertArrayEquals(release, failing.writes.last())

        assertThrows(IllegalArgumentException::class.java) { TruSdxRig(transport).transmitAudio(ShortArray(110 * 11520 + 1)) { true } }
    }
    @Test fun receiveAudioDecodesAndStopsTheStream() {
        val transport = ScriptedRadio { request ->
            if (String(request, Charsets.US_ASCII) == "UA2;") ascii("US") + ByteArray(300) { 0x90.toByte() } else ByteArray(0)
        }
        var reads = 0
        val audio = TruSdxRig(transport, clock = { 0L }).receiveAudio(1) { ++reads <= 1 }
        assertEquals(7825, audio.sampleRate)
        assertEquals(254, audio.samples.size)
        assertEquals(4096, audio.samples[0].toInt())
        assertEquals("UA0;", String(transport.writes.last(), Charsets.US_ASCII))
    }
    /** A real (tr)uSDX answers "?;" to ID; and may send an unsolicited IF frame after opening; identify uses FA; only. */
    @Test fun identifiesWithFaAndNotId() {
        var first = true
        val transport = ScriptedRadio { request ->
            when (String(request, Charsets.US_ASCII)) {
                "ID;" -> ascii("?;")
                "FA;" -> if (first) { first = false; ascii("IF0000702300000000+000000000010000000;") } else ascii("FA00007074000;")
                "MD;" -> ascii("MD1;")
                else -> ByteArray(0)
            }
        }
        val delays = mutableListOf<Long>()
        val rig = TruSdxRig(transport, sleep = { delays.add(it) })
        assertEquals("(tr)uSDX 7.074000 MHz", rig.identify())
        assertEquals(listOf(1500L), delays)
        assertFalse(transport.writes.any { String(it, Charsets.US_ASCII) == "ID;" })
        assertEquals(RigStatus(7_074_000, RigMode.LSB), rig.status())
    }
}
