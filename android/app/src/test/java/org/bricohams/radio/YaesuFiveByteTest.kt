package org.bricohams.radio

import org.junit.Assert.*
import org.junit.Test
import java.io.IOException

class YaesuFiveByteTest {
    @Test fun frequencyIsFramedAsBcdTenHertzUnits() {
        assertArrayEquals(bytes(0x14, 0x58, 0x00, 0x00, 0x01), YaesuFiveByte.frequencyCommand(145_800_000))
        assertArrayEquals(bytes(0x43, 0x97, 0x00, 0x00, 0x01), YaesuFiveByte.frequencyCommand(439_700_000))
        assertArrayEquals(bytes(0x00, 0x70, 0x74, 0x00, 0x01), YaesuFiveByte.frequencyCommand(7_074_000))
        assertThrows(IllegalArgumentException::class.java) { YaesuFiveByte.frequencyCommand(7_074_005) }
    }
    @Test fun answerIsDecodedAndNonBcdRejected() {
        assertEquals(145_800_000L to RigMode.FM, YaesuFiveByte.decodeFrequencyMode(bytes(0x14, 0x58, 0x00, 0x00, 0x08)))
        assertEquals(RigMode.FM_N, YaesuFiveByte.decodeFrequencyMode(bytes(0x14, 0x58, 0x00, 0x00, 0x88)).second)
        assertNull(YaesuFiveByte.decodeFrequencyMode(bytes(0x14, 0x58, 0x00, 0x00, 0x55)).second)
        assertThrows(IllegalArgumentException::class.java) { YaesuFiveByte.decodeFrequencyMode(bytes(0x1A, 0x58, 0x00, 0x00, 0x08)) }
        assertThrows(IllegalArgumentException::class.java) { YaesuFiveByte.decodeFrequencyMode(bytes(0x14, 0x58, 0x00, 0x08)) }
    }
    @Test fun modesAndSimpleCommands() {
        assertArrayEquals(bytes(0x01, 0, 0, 0, 0x07), YaesuFiveByte.modeCommand(RigMode.USB))
        assertThrows(IllegalArgumentException::class.java) { YaesuFiveByte.modeCommand(RigMode.DV) }
        assertArrayEquals(bytes(0, 0, 0, 0, 0x08), YaesuFiveByte.ptt(true))
        assertArrayEquals(bytes(0, 0, 0, 0, 0x88), YaesuFiveByte.ptt(false))
        assertArrayEquals(bytes(0, 0, 0, 0, 0x81), YaesuFiveByte.toggleVfo())
        assertArrayEquals(bytes(0, 0, 0, 0, 0x02), YaesuFiveByte.split(true))
        assertArrayEquals(bytes(0, 0, 0, 0, 0x82), YaesuFiveByte.split(false))
    }
    private fun radio(applied: Boolean = true): ScriptedRadio {
        var frequency = bytes(0x14, 0x58, 0x00, 0x00)
        return ScriptedRadio { request ->
            when (request[4].toInt() and 255) {
                0x01 -> { if (applied) frequency = request.copyOf(4); ByteArray(0) }
                0x03 -> frequency + 0x08.toByte()
                else -> ByteArray(0)
            }
        }
    }
    @Test fun vfoBIsReachedByToggling() {
        val transport = radio()
        val rig = YaesuFiveByteRig(transport, RigModel.FT857)
        rig.setFrequency(Vfo.B, 435_200_004)
        assertEquals(listOf(0x81, 0x01, 0x03, 0x81), transport.writes.map { it[4].toInt() and 255 })
        assertArrayEquals(bytes(0x43, 0x52, 0x00, 0x00, 0x01), transport.writes[1])
        assertEquals(RigStatus(435_200_000, RigMode.FM), rig.status())
    }
    @Test fun unconfirmedAndOutOfRangeAreRejected() {
        assertThrows(IllegalStateException::class.java) {
            YaesuFiveByteRig(radio(applied = false), RigModel.FT817).setFrequency(Vfo.A, 145_900_000)
        }
        val transport = radio()
        assertThrows(IllegalArgumentException::class.java) { YaesuFiveByteRig(transport, RigModel.FT817).setFrequency(Vfo.B, 2_400_000_000) }
        assertTrue(transport.writes.isEmpty())
        assertThrows(UnsupportedOperationException::class.java) { YaesuFiveByteRig(transport, RigModel.FT817).memories(1..2) }
    }
    @Test fun silentRadioTimesOut() {
        assertThrows(IOException::class.java) { YaesuFiveByteRig(ScriptedRadio(), RigModel.FT897).status() }
    }
}
