package org.bricohams.radio

import org.junit.Assert.*
import org.junit.Test
import java.io.IOException
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.util.ArrayDeque

class SstvTransmitTest {
    private var now = 0L

    /** Mirrors firmware/bricohams/cat_tx.c: keypad arming, 1.5 s lease, 120 s cap, radio TX gates. */
    private inner class Radio : RadioBytes {
        val buffer = ArrayDeque<Byte>()
        var armed = true
        var keyed = false
        var requested = false
        var limit = false
        var denied = 0
        var gate = 0
        var renewedAt = 0L
        var keyedAt = 0L
        var onAirMs = 0L
        val operations = ArrayList<Int>()
        fun poll() {
            if (keyed && (now - keyedAt >= 120_000 || !armed || !requested || now - renewedAt >= 1500)) {
                if (now - keyedAt >= 120_000) { armed = false; limit = true }
                onAirMs += now - keyedAt; keyed = false; requested = false
            } else if (!keyed && armed && requested && denied == 0) {
                if (gate != 0) { denied = gate; requested = false } else { keyed = true; keyedAt = now }
            }
        }
        override fun write(bytes: ByteArray, timeoutMs: Int) {
            poll()
            val (type, request) = QuanshengFrames.decode(bytes)
            assertEquals(0x7b02, type)
            val operation = request[1].toInt()
            operations.add(operation)
            val status = when (operation) {
                2 -> { requested = false; if (keyed) 1 else 0 }
                1 -> when {
                    !armed -> if (limit) 8 else 5
                    denied != 0 -> 7
                    else -> { requested = true; renewedAt = now; if (keyed) 0 else 1 }
                }
                else -> if (denied != 0) 7 else 0
            }
            val flags = (if (armed) 1 else 0) or (if (keyed) 2 else 0) or (if (requested && !keyed) 4 else 0) or
                (if (limit) 8 else 0) or (denied shl 8)
            val response = ByteBuffer.allocate(16).order(ByteOrder.LITTLE_ENDIAN).put(1).put(status.toByte())
                .put(request, 2, 2).putInt(8).putInt(flags).putInt(if (keyed) (now - keyedAt).toInt() else 0).array()
            QuanshengFrames.encode(0x7b03, response).forEach(buffer::add)
        }
        override fun read(length: Int, timeoutMs: Int): ByteArray {
            if (buffer.size < length) throw IOException("Mock timeout")
            return ByteArray(length) { buffer.removeFirst() }
        }
        override fun close() = Unit
    }

    /** Real-time sink: every write plays at the sample rate; it records what reached the radio while keyed. */
    private inner class Sink(val radio: Radio, val rate: Int) : AudioSink {
        var played = 0L
        var keyedFrames = 0L
        var started = false
        var stopped = false
        var closed = false
        var cutAfterFrames = Long.MAX_VALUE
        override fun start() { started = true }
        override fun write(samples: ShortArray, offset: Int, count: Int): Int {
            now += count * 1000L / rate
            radio.poll()
            if (radio.keyed) keyedFrames += count
            played += count
            if (played >= cutAfterFrames) radio.armed = false
            return count
        }
        override fun playedFrames() = played
        override fun stop() { stopped = true }
        override fun close() { closed = true }
    }

    private fun transmitter(radio: Radio) =
        CatTransmitter(CatProtocol(radio, clock = { now }, sleep = { now += it }), clock = { now }, sleep = { now += it; radio.poll() })

    @Test fun robot36IsSentWhollyUnderOneRenewedLeaseAndReleased() {
        val radio = Radio()
        val rate = 8000
        val audio = Robot36.encode(IntArray(320 * 240) { 0xff808080.toInt() }, rate)
        val sink = Sink(radio, rate)
        transmitter(radio).send(audio, rate, sink) { true }
        assertEquals(audio.size.toLong(), sink.played)
        assertEquals(audio.size.toLong(), sink.keyedFrames)
        assertTrue(sink.started && sink.stopped && sink.closed)
        assertFalse(radio.keyed)
        assertEquals(listOf(0, 1), radio.operations.take(2))
        assertEquals(listOf(2, 0), radio.operations.takeLast(2))
        assertTrue(radio.operations.count { it == 1 } > 37_000 / 400)
        assertTrue(radio.onAirMs in 37_000..38_000)
    }

    @Test fun nothingIsPlayedUnlessArmedOnTheRadioAndClear() {
        for (setup in listOf<(Radio) -> Unit>({ it.armed = false }, { it.limit = true; it.armed = false }, { it.denied = 3 })) {
            val radio = Radio().also(setup)
            val sink = Sink(radio, 8000)
            assertThrows(IllegalArgumentException::class.java) { transmitter(radio).send(ShortArray(8000), 8000, sink) { true } }
            assertFalse(sink.started)
            assertFalse(radio.operations.contains(1))
        }
        // TX lock / out of band on the radio side: refused at key-up, audio never starts.
        val gated = Radio().apply { gate = 3 }
        val sink = Sink(gated, 8000)
        assertThrows(IllegalArgumentException::class.java) { transmitter(gated).send(ShortArray(8000), 8000, sink) { true } }
        assertFalse(sink.started)
        assertEquals(0L, gated.onAirMs)
        assertThrows(IllegalArgumentException::class.java) {
            transmitter(Radio()).send(ShortArray(8000 * 111), 8000, Sink(Radio(), 8000)) { true }
        }
    }

    @Test fun radioAbortCancelAndCapStopTheAudioAndDropPtt() {
        // A key pressed on the radio disarms it: the next renewal fails and playback stops.
        val radio = Radio()
        val sink = Sink(radio, 8000).apply { cutAfterFrames = 8000L * 5 }
        assertThrows(IllegalArgumentException::class.java) { transmitter(radio).send(ShortArray(8000 * 30), 8000, sink) { true } }
        assertTrue(sink.played < 8000L * 6 && sink.stopped && sink.closed && !radio.keyed)
        // App-side cancel (screen left) releases PTT and confirms it.
        val cancelled = Radio()
        var calls = 0
        val cancelSink = Sink(cancelled, 8000)
        assertThrows(IllegalStateException::class.java) {
            transmitter(cancelled).send(ShortArray(8000 * 30), 8000, cancelSink) { ++calls < 20 }
        }
        assertFalse(cancelled.keyed)
        assertEquals(listOf(2, 0), cancelled.operations.takeLast(2))
        assertTrue(cancelSink.played < 8000L * 3)
    }

    @Test fun callsignIsMandatory() {
        assertEquals("EA1ABC", Callsign.normalize(" ea1abc "))
        assertEquals("EA1ABC/P", Callsign.normalize("EA1ABC/P"))
        assertEquals("F/EA1ABC", Callsign.normalize("f/ea1abc"))
        for (bad in listOf("", "  ", "EA1 ABC", "1234", "EA-1ABC", "ABCDEFGHIJ1")) {
            assertThrows(bad, IllegalArgumentException::class.java) { Callsign.normalize(bad) }
        }
    }
}
