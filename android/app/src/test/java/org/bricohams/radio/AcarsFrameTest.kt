package org.bricohams.radio

import org.bricohams.digital.AcarsFrame
import org.bricohams.digital.CodecException
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Test

class AcarsFrameTest {
    private val frame = AcarsFrame.of('2', "N12345", "H1", '1', "M01AABCDEF HELLO")
    private fun block() = frame.toBytes().copyOf(frame.toBytes().size - 1)

    @Test fun buildParseRoundtrip() {
        val parsed = AcarsFrame.parse(frame.toBytes())
        assertTrue(parsed.crcOk)
        assertEquals(0, parsed.parityErrors)
        assertEquals(0, parsed.correctedBits)
        assertEquals(frame, parsed.frame)
        assertEquals(".N12345", parsed.frame.address)
        assertEquals("N12345", parsed.frame.registration())
        assertEquals("M01A", parsed.frame.messageNumber())
        assertEquals("ABCDEF", parsed.frame.flightId())
        assertEquals("2|N12345|H1|1|M01AABCDEF HELLO", parsed.frame.messageText())
    }

    @Test fun framesWithoutTextOrWithEtbRoundtrip() {
        val empty = AcarsFrame.of('2', "N1", "_d", '3', "")
        assertEquals(empty, AcarsFrame.parse(empty.toBytes()).frame)
        val continued = AcarsFrame.of('2', "N1", AcarsFrame.NAK.toChar(), "H1", '4', "PART", true)
        assertTrue(AcarsFrame.parse(continued.toBytes()).frame.continued)
    }

    @Test fun everyCharacterCarriesOddParity() {
        val bytes = frame.toBytes()
        for (i in 0 until bytes.size - 3) assertTrue(AcarsFrame.parityOk(bytes[i].toInt()))
    }

    @Test fun parityErrorIsDetectedAndReported() {
        val raw = block()
        raw[16] = (raw[16].toInt() xor 0x01).toByte()
        raw[17] = (raw[17].toInt() xor 0x03).toByte() // two flips keep the parity valid but break the CRC
        val parsed = AcarsFrame.parse(raw)
        assertEquals(1, parsed.parityErrors)
        assertFalse(parsed.crcOk)
    }

    @Test fun oneBitErrorIsCorrected() {
        val raw = block()
        raw[20] = (raw[20].toInt() xor 0x10).toByte()
        val parsed = AcarsFrame.parse(raw)
        assertEquals(1, parsed.parityErrors)
        assertTrue(parsed.crcOk)
        assertEquals(1, parsed.correctedBits)
        assertEquals(frame, parsed.frame)
    }

    @Test fun twoBitErrorsInTwoCharactersAreCorrected() {
        val raw = block()
        raw[15] = (raw[15].toInt() xor 0x04).toByte()
        raw[22] = (raw[22].toInt() xor 0x40).toByte()
        val parsed = AcarsFrame.parse(raw)
        assertEquals(2, parsed.parityErrors)
        assertTrue(parsed.crcOk)
        assertEquals(2, parsed.correctedBits)
        assertEquals(frame, parsed.frame)
    }

    @Test fun bcsBitErrorIsCorrected() {
        val raw = block()
        raw[raw.size - 1] = (raw[raw.size - 1].toInt() xor 0x20).toByte()
        val parsed = AcarsFrame.parse(raw)
        assertTrue(parsed.crcOk)
        assertEquals(frame, parsed.frame)
    }

    @Test fun invalidInputIsRejected() {
        assertThrows(CodecException::class.java) { AcarsFrame.of('2', "N12345", "H1", '1', "x".repeat(221)) }
        assertThrows(CodecException::class.java) { AcarsFrame.of('2', "TOOLONGREG", "H1", '1', "") }
        assertThrows(CodecException::class.java) { AcarsFrame.of('2', "N1", "H", '1', "") }
        assertThrows(CodecException::class.java) { AcarsFrame.parse(ByteArray(5)) }
    }
}
