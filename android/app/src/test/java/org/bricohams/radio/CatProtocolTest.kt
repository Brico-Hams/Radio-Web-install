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
        var preface: (() -> ByteArray)? = null
        override fun write(bytes: ByteArray, timeoutMs: Int) {
            val (type, request) = QuanshengFrames.decode(bytes)
            if (type == 0x0514) {
                QuanshengFrames.encode(0x0515, firmware.toByteArray(Charsets.US_ASCII).copyOf(maxOf(16, firmware.length + 1))).forEach(buffer::add)
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
            preface?.invoke()?.forEach(buffer::add)
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
        assertEquals(listOf(0, 1, 0, 2, 0), radio.operations)
    }
    @Test fun trackingStepIsOneSetPlusAtMostOneReadBack() {
        val radio = Radio()
        val cat = CatProtocol(radio, sleep = {})
        cat.tune(43650000)
        assertEquals(listOf(1, 0), radio.operations)
        radio.operations.clear()
        cat.tune(43650000, confirm = false)
        assertEquals(listOf(1), radio.operations)
    }
    @Test fun malformedAndUnconfirmedRepliesFailExplicitly() {
        val sequence = Radio().apply { wrongSequence = true }
        assertThrows(IOException::class.java) { CatProtocol(sequence).query() }
        val crc = Radio().apply { wrongCrc = true }
        assertThrows(IOException::class.java) { CatProtocol(crc).query() }
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
        assertTrue(radio.operations.isEmpty())
        cat.stop()
        assertEquals(listOf(2, 0), radio.operations)
    }
    @Test fun identificationAcceptsBricoHamsBuildsAndReadsLongReplies() {
        val radio = Radio()
        for (name in listOf("BricoHams v1", "bricohams-sat 0.3", "F4HWN v7.2", "BricoHams custom build with a long name")) {
            radio.firmware = name
            assertEquals(name, CatProtocol(radio).identify())
        }
        assertTrue(CatProtocol.supportedFirmware("BricoHams"))
        assertFalse(CatProtocol.supportedFirmware("F4HWN v5.9"))
    }
    @Test fun staleAndDesynchronisedRepliesAreSkipped() {
        val radio = Radio()
        val cat = CatProtocol(radio)
        // Stale frame of an old request (wrong sequence) plus garbage already waiting: drained before the request.
        val stale = QuanshengFrames.encode(0x7b01, ByteArray(16))
        byteArrayOf(1, 2, 3).forEach(radio.buffer::add)
        stale.forEach(radio.buffer::add)
        assertTrue(cat.query().active)
        // Reply preceded by a frame of another type and one with a corrupted CRC.
        radio.preface = {
            QuanshengFrames.encode(0x0515, ByteArray(16)) + QuanshengFrames.encode(0x7b01, ByteArray(16)).also { it[8] = (it[8].toInt() xor 1).toByte() }
        }
        assertTrue(cat.query().active)
        assertEquals(listOf(0, 0), radio.operations)
    }
    @Test fun silentRadioIsRetriedOnceThenFails() {
        var writes = 0
        var time = 0L
        val silent = object : RadioBytes {
            override fun write(bytes: ByteArray, timeoutMs: Int) { writes++ }
            override fun read(length: Int, timeoutMs: Int): ByteArray { time += 600; throw IOException("timeout") }
            override fun close() = Unit
        }
        assertThrows(IOException::class.java) { CatProtocol(silent, clock = { time }).query() }
        assertEquals(2, writes)
    }
    @Test fun leaseIsRenewedBelowTheFirmwareTimeoutAndReportsRevert() {
        var now = 0L
        val radio = Radio()
        val cat = CatProtocol(radio, clock = { now }, sleep = {})
        cat.tune(43650000)
        radio.operations.clear()
        val lease = CatLease(cat, 43650000, clock = { now })
        assertEquals(CatLease.Result.WAITING, lease.renewIfDue())
        now += CatLease.RENEW_MS - 1
        assertEquals(CatLease.Result.WAITING, lease.renewIfDue())
        assertTrue(radio.operations.isEmpty())
        now += 1
        assertEquals(CatLease.Result.RENEWED, lease.renewIfDue())
        assertEquals(listOf(0, 1), radio.operations)
        assertTrue(CatLease.RENEW_MS < CatLease.LEASE_MS)
        now += CatLease.RENEW_MS
        radio.remote = false
        assertEquals(CatLease.Result.REVERTED, lease.renewIfDue())
        now += CatLease.RENEW_MS
        radio.active = false
        assertEquals(CatLease.Result.LEFT_SAT_RX, lease.renewIfDue())
    }
    private class PttRadio(var denied: Int = 0, var status: Int = 0) : RadioBytes {
        val buffer = ArrayDeque<Byte>()
        override fun write(bytes: ByteArray, timeoutMs: Int) {
            val (_, request) = QuanshengFrames.decode(bytes)
            val seq = ByteBuffer.wrap(request).order(ByteOrder.LITTLE_ENDIAN).getShort(2)
            val flags = 1 or (denied shl 8)
            val response = ByteBuffer.allocate(16).order(ByteOrder.LITTLE_ENDIAN)
                .put(1).put(status.toByte()).putShort(seq).putInt(8).putInt(flags).putInt(0).array()
            QuanshengFrames.encode(0x7b03, response).forEach(buffer::add)
        }
        override fun read(length: Int, timeoutMs: Int): ByteArray {
            if (buffer.size < length) throw IOException("Mock timeout")
            return ByteArray(length) { buffer.removeFirst() }
        }
        override fun close() = Unit
    }
    @Test fun deniedStateAcceptsTheWholeVfoStateRange() {
        for (state in listOf(0, 1, 2, 3, 4, 5, 6, 255)) {
            assertEquals(state, CatProtocol(PttRadio(denied = state)).pttQuery().deniedState)
        }
        assertEquals(6, CatProtocol(PttRadio(denied = 6, status = 7)).pttQuery().deniedState)
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
