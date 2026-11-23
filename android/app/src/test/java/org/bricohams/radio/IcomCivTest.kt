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

    /** Minimal IC-705 behind CI-V: VFO A selected (25 00), VFO B unselected (25 01). */
    private class Ic705 {
        val vfo = longArrayOf(145_800_000, 435_200_000)
        val modes = intArrayOf(0x01, 0x01)
        var signal = 120
        var power = 100
        var data = false
        var tx = false
        var split = false
        fun answer(body: ByteArray): ByteArray {
            val set = body.size > 2
            return when (body[0].toInt() and 255) {
                0x03 -> bytes(0x03) + IcomCiv.encodeFrequency(vfo[0])
                0x04 -> bytes(0x04, modes[0], 0x01)
                0x0F -> { split = body[1].toInt() == 1; bytes(0xFB) }
                0x14 -> if (set) { power = IcomCiv.decodeLevel(body, 2); bytes(0xFB) } else body.copyOf(2) + IcomCiv.encodeLevel(power)
                0x15 -> body.copyOf(2) + IcomCiv.encodeLevel(signal)
                0x19 -> bytes(0x19, 0x00, 0xA4)
                0x1A -> if (body[1].toInt() != 6) bytes(0xFA)
                    else if (set) { data = body[2].toInt() == 1; bytes(0xFB) }
                    else body.copyOf(2) + bytes(if (data) 1 else 0, if (data) 1 else 0)
                0x1C -> if (set) { tx = body[2].toInt() == 1; bytes(0xFB) } else body.copyOf(2) + bytes(if (tx) 1 else 0)
                0x25 -> if (set) { vfo[body[1].toInt()] = IcomCiv.decodeFrequency(body, 2); bytes(0xFB) }
                    else body.copyOf(2) + IcomCiv.encodeFrequency(vfo[body[1].toInt()])
                0x26 -> if (set) { modes[body[1].toInt()] = body[2].toInt(); bytes(0xFB) }
                    else body.copyOf(2) + bytes(modes[body[1].toInt()], 0x00, 0x01)
                else -> bytes(0xFA)
            }
        }
    }
    private fun bodies(radio: ScriptedRadio) = radio.writes.map { it.copyOfRange(4, it.size - 1) }

    @Test fun newCommandFramesMatchTheGuide() {
        val to = 0xA4
        assertArrayEquals(bytes(0xFE, 0xFE, 0xA4, 0xE0, 0x15, 0x02, 0xFD), IcomCiv.frame(to, IcomCiv.readSMeter()))
        assertArrayEquals(bytes(0xFE, 0xFE, 0xA4, 0xE0, 0x14, 0x0A, 0xFD), IcomCiv.frame(to, IcomCiv.readRfPower()))
        assertArrayEquals(bytes(0xFE, 0xFE, 0xA4, 0xE0, 0x14, 0x0A, 0x01, 0x28, 0xFD), IcomCiv.frame(to, IcomCiv.setRfPower(128)))
        assertArrayEquals(bytes(0x14, 0x0A, 0x00, 0x00), IcomCiv.setRfPower(0))
        assertArrayEquals(bytes(0x14, 0x0A, 0x02, 0x55), IcomCiv.setRfPower(255))
        assertThrows(IllegalArgumentException::class.java) { IcomCiv.setRfPower(256) }
        assertThrows(IllegalArgumentException::class.java) { IcomCiv.setRfPower(-1) }
        assertArrayEquals(bytes(0xFE, 0xFE, 0xA4, 0xE0, 0x1C, 0x00, 0xFD), IcomCiv.frame(to, IcomCiv.readTxStatus()))
        assertArrayEquals(bytes(0xFE, 0xFE, 0xA4, 0xE0, 0x15, 0x12, 0xFD), IcomCiv.frame(to, IcomCiv.readSwr()))
        assertEquals(120, IcomCiv.decodeLevel(bytes(0x15, 0x12, 0x01, 0x20), 2))
        assertArrayEquals(bytes(0xFE, 0xFE, 0xA4, 0xE0, 0x19, 0x00, 0xFD), IcomCiv.frame(to, IcomCiv.readId()))
        assertArrayEquals(bytes(0x1A, 0x06), IcomCiv.readDataMode())
        assertArrayEquals(bytes(0x1A, 0x06, 0x01, 0x01), IcomCiv.setDataMode(true))
        assertArrayEquals(bytes(0x1A, 0x06, 0x01, 0x03), IcomCiv.setDataMode(true, 3))
        assertArrayEquals(bytes(0x1A, 0x06, 0x00, 0x00), IcomCiv.setDataMode(false))
        assertThrows(IllegalArgumentException::class.java) { IcomCiv.setDataMode(true, 4) }
        assertArrayEquals(bytes(0x26, 0x01), IcomCiv.readVfoMode(Vfo.B))
        assertArrayEquals(bytes(0x26, 0x01, 0x05), IcomCiv.setVfoMode(Vfo.B, RigMode.FM))
        assertThrows(IllegalArgumentException::class.java) { IcomCiv.setVfoMode(Vfo.B, RigMode.DATA_U) }
    }
    @Test fun levelsAreFourBcdDigits() {
        assertEquals(120, IcomCiv.decodeLevel(bytes(0x15, 0x02, 0x01, 0x20), 2))
        assertEquals(241, IcomCiv.decodeLevel(bytes(0x02, 0x41)))
        assertEquals(0, IcomCiv.decodeLevel(bytes(0x00, 0x00)))
        assertThrows(IllegalArgumentException::class.java) { IcomCiv.decodeLevel(bytes(0x02, 0x56)) }
        assertThrows(IllegalArgumentException::class.java) { IcomCiv.decodeLevel(bytes(0x00, 0x0A)) }
        assertThrows(IllegalArgumentException::class.java) { IcomCiv.decodeLevel(bytes(0x01)) }
    }
    @Test fun extrasAreReadAndSet() {
        val radio = Ic705()
        val rig = IcomCivRig(civ(radio::answer))
        assertTrue(rig.supportsMeter && rig.supportsRfPower && rig.supportsTxStatus && rig.supportsDataMode && rig.supportsVfoMode)
        assertEquals("IC-705 @A4h ID A4h", rig.identify())
        assertEquals(120, rig.signalLevel())
        assertFalse(rig.isTransmitting())
        radio.tx = true
        assertTrue(rig.isTransmitting())
        rig.setRfPower(200)
        assertEquals(200, radio.power)
        assertEquals(200, rig.rfPower())
        rig.setDataMode(true)
        assertTrue(radio.data && rig.dataModeOn())
        rig.setDataMode(false)
        assertFalse(rig.dataModeOn())
        rig.setVfoMode(Vfo.B, RigMode.FM)
        assertEquals(RigMode.FM, rig.vfoMode(Vfo.B))
        assertEquals(0x05, radio.modes[1])
        assertEquals(0x01, radio.modes[0])
    }
    @Test fun ngAndBadRepliesAreReported() {
        val rejecting = IcomCivRig(civ { bytes(0xFA) })
        assertTrue(assertThrows(IOException::class.java) { rejecting.signalLevel() } is LocalizedError)
        assertThrows(IOException::class.java) { rejecting.rfPower() }
        assertThrows(IOException::class.java) { rejecting.setRfPower(10) }
        assertThrows(IOException::class.java) { rejecting.isTransmitting() }
        assertThrows(IOException::class.java) { rejecting.setDataMode(true) }
        assertThrows(IOException::class.java) { rejecting.vfoMode(Vfo.B) }
        assertThrows(IOException::class.java) { rejecting.identify() }
        val garbled = IcomCivRig(civ { body -> body.copyOf(2) + bytes(0x02, 0x00) })
        assertThrows(IllegalArgumentException::class.java) { garbled.isTransmitting() }
        assertThrows(IllegalArgumentException::class.java) { garbled.dataModeOn() }
        val unconfirmed = IcomCivRig(civ { body -> if (body.size > 2) bytes(0xFB) else body.copyOf(2) + IcomCiv.encodeLevel(7) })
        assertThrows(IllegalStateException::class.java) { unconfirmed.setRfPower(10) }
    }
    @Test fun satelliteUsesSplitWithDownlinkOnAAndUplinkOnB() {
        val state = Ic705()
        val scripted = civ(state::answer)
        val rig = IcomCivRig(scripted)
        var now = 0L
        var rate = 0.0
        val tracker = RigTracker(rig, 145_800_000, 435_200_000, { rate }, { SatelliteLook(it, 0.0, 30.0, 1000.0) }, 100, { now })
        val first = tracker.start()
        assertTrue(first.sentDownlink && first.sentUplink)
        assertTrue(state.split)
        assertEquals(145_800_000L, state.vfo[0])
        assertEquals(435_200_000L, state.vfo[1])
        // Reading the TX status (1C 00, no data) is how the tracker holds VFO writes during TX; it is not a TX command.
        val isTxRead = { b: ByteArray -> b.size == 2 && b[0].toInt() == 0x1C && b[1].toInt() == 0 }
        val written = bodies(scripted).count { !isTxRead(it) }
        rate = 0.05 // below the 100 Hz step on both links: nothing is sent
        now = 1000
        val quiet = tracker.step()
        assertFalse(quiet.sentDownlink || quiet.sentUplink)
        assertEquals(written, bodies(scripted).count { !isTxRead(it) })
        rate = 3.0
        now = 2000
        val moved = tracker.step()
        assertEquals(moved.downlinkHz, state.vfo[0])
        assertEquals(requireNotNull(moved.uplinkHz), state.vfo[1])
        assertTrue(state.vfo[0] < 145_800_000L && state.vfo[1] > 435_200_000L)
        tracker.stop()
        assertFalse(state.split)
        assertTrue(bodies(scripted).none { it[0].toInt() == 0x1C && !isTxRead(it) })
        assertFalse(state.tx)
    }
    @Test fun receiveOnlySatelliteNeverTouchesVfoBSplitOrTx() {
        val state = Ic705()
        val scripted = civ(state::answer)
        val tracker = RigTracker(IcomCivRig(scripted), 145_800_000, null, { 3.0 }, { SatelliteLook(it, 0.0, 30.0, 1000.0) }, 100, { 0L })
        tracker.start()
        tracker.stop()
        val sent = bodies(scripted)
        assertTrue(sent.none { it[0].toInt() == 0x0F || (it[0].toInt() == 0x1C && !(it.size == 2 && it[1].toInt() == 0)) })
        assertTrue(sent.none { it[0].toInt() == 0x25 && it[1].toInt() == 1 && it.size > 2 })
        assertEquals(435_200_000L, state.vfo[1])
    }
    @Test fun otherRigsReportTheExtrasAsUnsupported() {
        val rigs = listOf(YaesuFiveByteRig(ScriptedRadio(), RigModel.FT857),
            TruSdxRig(ScriptedRadio()), QrpLabsRig(ScriptedRadio(), RigModel.QMX))
        for (rig in rigs) {
            assertFalse(rig.supportsMeter || rig.supportsRfPower || rig.supportsTxStatus || rig.supportsDataMode || rig.supportsVfoMode)
            assertThrows(UnsupportedOperationException::class.java) { rig.signalLevel() }
            assertThrows(UnsupportedOperationException::class.java) { rig.setRfPower(10) }
            assertThrows(UnsupportedOperationException::class.java) { rig.isTransmitting() }
            assertThrows(UnsupportedOperationException::class.java) { rig.setDataMode(true) }
            assertThrows(UnsupportedOperationException::class.java) { rig.vfoMode(Vfo.B) }
        }
    }
}
