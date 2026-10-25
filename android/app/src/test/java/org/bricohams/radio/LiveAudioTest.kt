package org.bricohams.radio

import org.junit.Assert.*
import org.junit.Test
import java.io.IOException
import java.util.concurrent.CancellationException
import java.util.concurrent.CountDownLatch
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit

class LiveAudioTest {
    internal open class Source : PcmSource {
        var started = false
        var stopped = false
        var closed = false
        override fun start() { started = true }
        override fun read(buffer: ShortArray, count: Int): Int {
            buffer.fill(123, 0, count)
            return count
        }
        override fun stop() { stopped = true }
        override fun close() { closed = true }
    }
    @Test fun automaticLimitIsExactlySixtySecondsAndReleasesMicrophone() {
        val source = Source()
        val capture = LiveAudio { source }
        val audio = capture.record()
        assertEquals(48000, audio.sampleRate)
        assertEquals(48000 * 60, audio.samples.size)
        assertEquals(123.toShort(), audio.samples.last())
        assertTrue(source.started && source.stopped && source.closed)
        assertThrows(IllegalStateException::class.java) { capture.record() }
    }
    @Test fun manualStopKeepsOnlyCapturedSamplesAndNeverPadsSilence() {
        lateinit var capture: LiveAudio
        val source = object : Source() {
            override fun read(buffer: ShortArray, count: Int): Int {
                val result = super.read(buffer, count)
                capture.stop()
                return result
            }
        }
        capture = LiveAudio { source }
        assertEquals(4800, capture.record().samples.size)
        assertTrue(source.stopped && source.closed)
    }
    @Test fun cancellationBeforeOpeningDoesNotRequestAnyHardware() {
        var opened = false
        val capture = LiveAudio { opened = true; Source() }
        capture.cancel()
        assertThrows(CancellationException::class.java) { capture.record() }
        assertFalse(opened)
    }
    @Test fun cancelUnblocksReadAndDiscardsAudioBeforeReleasing() {
        val entered = CountDownLatch(1)
        val stopped = CountDownLatch(1)
        val source = object : Source() {
            override fun read(buffer: ShortArray, count: Int): Int {
                entered.countDown()
                check(stopped.await(5, TimeUnit.SECONDS))
                return -3
            }
            override fun stop() { super.stop(); stopped.countDown() }
        }
        val capture = LiveAudio { source }
        val worker = Executors.newSingleThreadExecutor()
        try {
            val result = worker.submit<Boolean> {
                try { capture.record(); false } catch (_: CancellationException) { true }
            }
            assertTrue(entered.await(5, TimeUnit.SECONDS))
            capture.cancel()
            assertTrue(result.get(5, TimeUnit.SECONDS))
            assertTrue(source.closed)
        } finally { worker.shutdownNow() }
    }
    @Test fun deviceErrorsAndStartFailureAreExplicitAndAlwaysClose() {
        for (result in listOf(0, -1, -3, -6)) {
            val source = object : Source() {
                override fun read(buffer: ShortArray, count: Int) = result
            }
            assertThrows(IOException::class.java) { LiveAudio { source }.record() }
            assertTrue(source.stopped && source.closed)
        }
        val source = object : Source() {
            override fun start() { throw SecurityException("Permission revoked") }
        }
        assertThrows(SecurityException::class.java) { LiveAudio { source }.record() }
        assertTrue(source.closed)
    }
}
