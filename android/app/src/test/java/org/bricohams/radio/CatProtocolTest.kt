package org.bricohams.radio

import org.junit.Assert.*
import org.junit.Test
import java.io.IOException
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.util.ArrayDeque

class CatProtocolTest {
    private class Radio : RadioBytes {
        val buffer = ArrayDeque<Byte>()
        val operations = ArrayList<Int>()
        var applied = 14580000L
        var target = applied
        var active = true
        var remote = false
        var pending = false
        var neverApply = false
        var wrongSequence = false
        var wrongCrc = false
        var firmware = "F4HWN v6.1.0"
        override fun write(bytes: ByteArray, timeoutMs: Int) {
            val (type, request) = QuanshengFrames.decode(bytes)
            if (type == 0x0514) {
                QuanshengFrames.encode(0x0515, firmware.toByteArray(Charsets.US_ASCII).copyOf(16)).forEach(buffer::add)
                return
            }
            assertEquals(0x7b00, type)
            val view = ByteBuffer.wrap(request).order(ByteOrder.LITTLE_ENDIAN)
            val operation = request[1].toInt()
            operations.add(operation)
            if (operation == 0 && pending && !neverApply) {
                applied = target; pending = false
            }
            if (operation == 1) { target = view.getInt(4).toLong(); pending = true; remote = true }
            if (operation == 2) { target = 14580000; pending = true; remote = false }
            val seq = (view.getShort(2).toInt() + if (wrongSequence) 1 else 0).toShort()
            val response = ByteBuffer.allocate(16).order(ByteOrder.LITTLE_ENDIAN)
                .put(1).put(if (operation == 0) 0 else 1).putShort(seq).putInt(7)
                .putInt(if (active) applied.toInt() else 0)
                .putInt(if (active) 1 or (if (remote) 2 else 0) or (if (pending) 4 else 0) else 0).array()
            val frame = QuanshengFrames.encode(0x7b01, response)
            if (wrongCrc) frame[10] = (frame[10].toInt() xor 1).toByte()
            byteArrayOf(0, 0xab.toByte(), 0).forEach(buffer::add)
            frame.forEach(buffer::add)
        }
        override fun read(length: Int, timeoutMs: Int): ByteArray {
            if (buffer.size < length) throw IOException("Mock timeout")
            return ByteArray(length) { buffer.removeFirst() }
        }
        override fun close() = Unit
    }
    @Test fun framingRoundTripAndCrcVector() {
        assertEquals(0x31c3, QuanshengFrames.crc("123456789".toByteArray()))
        for (length in 0..508) {
            val data = ByteArray(length) { it.toByte() }
            val decoded = QuanshengFrames.decode(QuanshengFrames.encode(0x7b00, data))
            assertEquals(0x7b00, decoded.first)
            assertArrayEquals(data, decoded.second)
        }
        assertThrows(IllegalArgumentException::class.java) { QuanshengFrames.decode(ByteArray(12)) }
        assertThrows(IllegalArgumentException::class.java) { QuanshengFrames.encode(0, ByteArray(509)) }
    }
    @Test fun tuneAndStopMustBeAppliedNotJustQueued() {
        val radio = Radio()
        val cat = CatProtocol(radio, sleep = {})
        assertTrue(cat.query().active)
        val tuned = cat.tune(43650000)
        assertTrue(tuned.remote)
        assertFalse(tuned.pending)
        assertEquals(43650000L, tuned.frequency10Hz)
        val stopped = cat.stop()
        assertFalse(stopped.remote)
        assertFalse(stopped.pending)
        assertEquals(14580000L, stopped.frequency10Hz)
        assertEquals(listOf(0, 0, 1, 0, 0, 2, 0), radio.operations)
    }
    @Test fun malformedAndUnconfirmedRepliesFailExplicitly() {
        val sequence = Radio().apply { wrongSequence = true }
        assertThrows(IllegalArgumentException::class.java) { CatProtocol(sequence).query() }
        val crc = Radio().apply { wrongCrc = true }
        assertThrows(IllegalArgumentException::class.java) { CatProtocol(crc).query() }
        val inactive = Radio().apply { active = false }
        assertThrows(IllegalArgumentException::class.java) { CatProtocol(inactive).tune(14580000) }
        val pending = Radio().apply { neverApply = true }
        assertThrows(IOException::class.java) { CatProtocol(pending, sleep = {}).tune(14580000) }
        assertThrows(IllegalArgumentException::class.java) { CatProtocol(Radio()).tune(20000000) }
    }
    @Test fun deadlineIsBoundedEvenWithNoise() {
        var time = 0L
        val noise = object : RadioBytes {
            override fun write(bytes: ByteArray, timeoutMs: Int) = Unit
            override fun read(length: Int, timeoutMs: Int) = ByteArray(length)
            override fun close() = Unit
        }
        assertThrows(IOException::class.java) { CatProtocol(noise, clock = { time += 10; time }).query() }
    }
    @Test fun identificationRejectsOtherFirmwareAndOldVersions() {
        val radio = Radio()
        assertEquals(radio.firmware, CatProtocol(radio).identify())
        for (name in listOf("F4HWN v5.0", "EGZUMER v0.22", "", "F4HWN vX")) {
            radio.firmware = name
            assertThrows(IllegalArgumentException::class.java) { CatProtocol(radio).identify() }
        }
    }
    @Test fun leavingScreenPreventsLateSetButStillAllowsStop() {
        val radio = Radio()
        val cat = CatProtocol(radio, sleep = {}, allowTune = { false })
        assertThrows(IllegalStateException::class.java) { cat.tune(14580000) }
        assertEquals(listOf(0), radio.operations)
        cat.stop()
        assertEquals(listOf(0, 0, 2, 0), radio.operations)
    }
    @Test fun upstreamFfffChecksumAndSequenceWrapAreSupported() {
        val data = byteArrayOf(1, 2, 3)
        val frame = QuanshengFrames.encode(0x0515, data)
        val size = frame.size - 8
        // CRC bytes share the same XOR stream as the response body.
        val key = intArrayOf(0x16, 0x6c, 0x14, 0xe6, 0x2e, 0x91, 0x0d, 0x40, 0x21, 0x35, 0xd5, 0x40, 0x13, 0x03, 0xe9, 0x80)
        frame[4 + size] = (255 xor key[size % 16]).toByte()
        frame[5 + size] = (255 xor key[(size + 1) % 16]).toByte()
        assertArrayEquals(data, QuanshengFrames.decode(frame).second)
        val radio = Radio()
        val cat = CatProtocol(radio)
        repeat(65537) { cat.query() }
        assertEquals(65537, radio.operations.size)
    }
    @Test fun sgp4DopplerReachesConfirmedCatStateAndStopRestoresNominal() {
        SatellitesTest.orbit().use { orbit ->
            val pass = orbit.predict(SatellitesTest.start).first()
            val plan = SatellitePlan(SatellitesTest.tle, SatellitesTest.observer, 145800000, pass)
            var now = pass.maximum.time
            val radio = Radio()
            val cat = CatProtocol(radio, sleep = {})
            val tracking = SatelliteTracking({ orbit.target(plan, it) }, { frequency, permit -> cat.tune(frequency, permit) },
                { now }, { now })
            assertEquals(14579996L, tracking.step()?.frequency10Hz)
            now += 1000
            tracking.step()
            tracking.cancel()
            cat.stop()
            assertEquals(2, radio.operations.count { it == 1 })
            assertEquals(1, radio.operations.count { it == 2 })
            assertFalse(cat.query().remote)
            assertEquals(14580000L, radio.applied)
        }
    }
}
