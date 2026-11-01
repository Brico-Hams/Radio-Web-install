package org.bricohams.radio

import org.junit.Assert.*
import org.junit.Test
import java.io.IOException

class IcomCivTest {
    @Test fun frequencyIsBcdLeastSignificantPairFirst() {
        assertArrayEquals(bytes(0x00, 0x89, 0x67, 0x45, 0x01), IcomCiv.encodeFrequency(145_678_900))
        assertArrayEquals(bytes(0x00, 0x40, 0x07, 0x07, 0x00), IcomCiv.encodeFrequency(7_074_000))
        assertArrayEquals(bytes(0, 0, 0, 0, 0), IcomCiv.encodeFrequency(0))
        assertEquals(145_678_900L, IcomCiv.decodeFrequency(bytes(0x00, 0x89, 0x67, 0x45, 0x01)))
        assertEquals(7_074_000L, IcomCiv.decodeFrequency(bytes(0x00, 0x40, 0x07, 0x07, 0x00)))
        assertEquals(0L, IcomCiv.decodeFrequency(bytes(0, 0, 0, 0, 0)))
        assertEquals(7_074_000L, IcomCiv.decodeFrequency(bytes(0x25, 0x00, 0x40, 0x07, 0x07, 0x00), 1))
        assertThrows(IllegalArgumentException::class.java) { IcomCiv.decodeFrequency(bytes(0x0A, 0, 0, 0, 0)) }
    }
    @Test fun framesAreBuiltForTheDocumentedCommands() {
        val hz = 145_678_900L
        val to = 0xA4
        assertArrayEquals(bytes(0xFE, 0xFE, 0xA4, 0xE0, 0x05, 0x00, 0x89, 0x67, 0x45, 0x01, 0xFD),
            IcomCiv.frame(to, IcomCiv.setOperatingFrequency(hz)))
        assertArrayEquals(bytes(0xFE, 0xFE, 0xA4, 0xE0, 0x25, 0x01, 0x00, 0x89, 0x67, 0x45, 0x01, 0xFD),
            IcomCiv.frame(to, IcomCiv.setVfoFrequency(Vfo.B, hz)))
        assertArrayEquals(bytes(0xFE, 0xFE, 0xA4, 0xE0, 0x1C, 0x00, 0x01, 0xFD), IcomCiv.frame(to, IcomCiv.ptt(true)))
        assertArrayEquals(bytes(0xFE, 0xFE, 0xA4, 0xE0, 0x0F, 0x01, 0xFD), IcomCiv.frame(to, IcomCiv.split(true)))
        assertArrayEquals(bytes(0xFE, 0xFE, 0xA4, 0xE0, 0x1A, 0x00, 0x00, 0x00, 0x00, 0x42, 0xFD), IcomCiv.frame(to, IcomCiv.readMemory(42)))
        assertArrayEquals(bytes(0x06, 0x05), IcomCiv.setMode(RigMode.FM))
        assertThrows(IllegalArgumentException::class.java) { IcomCiv.setMode(RigMode.DATA_U) }
        assertThrows(IllegalArgumentException::class.java) { IcomCiv.readMemory(100) }
    }
    @Test fun parserSkipsEchoBroadcastAndGarbage() {
        val stream = bytes(0x01, 0x02, 0xFE) +
            bytes(0xFE, 0xFE, 0xA4, 0xE0, 0x03, 0xFD) + // our own request echoed back
            bytes(0xFE, 0xFE, 0x00, 0xA4, 0x00, 0x00, 0x00, 0x07, 0x00, 0xFD) + // broadcast from the dial
            bytes(0xFE, 0xFE, 0xE0, 0xA4, 0x03, 0x00, 0xFE, 0xFE, 0xE0, 0xA4, 0xFB, 0xFD) // truncated frame, then a reply
        val frame = requireNotNull(IcomCiv.parse(stream))
        assertEquals(0xA4, frame.from)
        assertArrayEquals(bytes(0xFB), frame.body)
        assertNull(IcomCiv.parse(bytes(0xFE, 0xFE, 0xA4, 0xE0, 0x03, 0xFD)))
        assertNull(IcomCiv.parse(ByteArray(300) { 0x11 } + bytes(0xFD)))
    }
    private fun civ(reply: (ByteArray) -> ByteArray?) = ScriptedRadio { request ->
        val body = request.copyOfRange(4, request.size - 1)
        request + (reply(body)?.let { IcomCiv.frame(0xE0, it, 0xA4) } ?: ByteArray(0))
    }
    @Test fun setFrequencyIsVerifiedAndNgIsRejected() {
        var vfoB = IcomCiv.encodeFrequency(1)
        val transport = civ { body ->
            when (body[0].toInt() and 255) {
                0x25 -> if (body.size > 2) { vfoB = body.copyOfRange(2, 7); bytes(0xFB) } else body.copyOf(2) + vfoB
                else -> bytes(0xFA)
            }
        }
        val rig = IcomCivRig(transport)
        rig.setFrequency(Vfo.B, 145_678_900)
        assertEquals(145_678_900L, rig.frequency(Vfo.B))
        assertThrows(IllegalArgumentException::class.java) { rig.setFrequency(Vfo.A, 3_000_000_000) }
        val error = assertThrows(IOException::class.java) { rig.setMode(RigMode.USB) }
        assertTrue(error is LocalizedError)
        assertThrows(IOException::class.java) { IcomCivRig(ScriptedRadio()).ptt(true) }
    }
    @Test fun memoryReplyIsParsed() {
        val data = ByteArray(115) { if (it >= 99) ' '.code.toByte() else 0 }
        data[3] = 0x12
        IcomCiv.encodeFrequency(145_500_000).copyInto(data, 5)
        data[10] = 0x05
        "ISS".toByteArray().copyInto(data, 99)
        assertEquals(RigMemory(12, 145_500_000, RigMode.FM, "ISS"), IcomCiv.memory(data))
        assertEquals("", IcomCiv.memory(data.copyOf(60))?.name)
        assertNull(IcomCiv.memory(bytes(0x00, 0x00, 0x00, 0x12, 0xFF)))
        assertThrows(IllegalArgumentException::class.java) { IcomCiv.memory(bytes(0x00, 0x00)) }
    }
    @Test fun memoriesSkipBlankChannels() {
        val transport = civ { body ->
            val channel = body[5].toInt()
            val data = ByteArray(115)
            data[3] = channel.toByte()
            if (channel == 1) IcomCiv.encodeFrequency(433_500_000).copyInto(data, 5) else data[4] = 0xFF.toByte()
            data[10] = 0x01
            body.copyOf(2) + data
        }
        val list = IcomCivRig(transport).memories(0..2)
        assertEquals(listOf(RigMemory(1, 433_500_000, RigMode.USB, "")), list)
        assertTrue(IcomCivRig(transport).memories(0..2) { false }.isEmpty())
    }
    @Test fun ngMemoryChannelIsSkipped() {
        val transport = civ { body ->
            val channel = body[5].toInt()
            if (channel == 0) bytes(0xFA) else {
                val data = ByteArray(115)
                data[3] = channel.toByte()
                IcomCiv.encodeFrequency(145_500_000).copyInto(data, 5)
                data[10] = 0x05
                body.copyOf(2) + data
            }
        }
        assertEquals(listOf(1), IcomCivRig(transport).memories(0..1).map { it.channel })
    }
}
