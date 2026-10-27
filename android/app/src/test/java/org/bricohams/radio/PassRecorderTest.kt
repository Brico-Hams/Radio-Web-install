package org.bricohams.radio

import org.junit.Assert.*
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder

class PassRecorderTest {
    @get:Rule val folder = TemporaryFolder()
    private class FakeSource(private val audio: ShortArray) : PcmSource {
        var position = 0
        var stopped = false
        override fun start() = Unit
        override fun read(buffer: ShortArray, count: Int): Int {
            val size = minOf(count, audio.size - position)
            if (size <= 0) return 0
            audio.copyInto(buffer, 0, position, position + size); position += size
            return size
        }
        override fun stop() { stopped = true }
        override fun close() = Unit
    }
    @Test fun recordsDecimatedWavUntilLosAndFindsRobot36InsideTheWholePass() {
        val pixels = IntArray(Robot36.WIDTH * Robot36.HEIGHT) { if (it % Robot36.WIDTH < 160) 0xff2040e0.toInt() else 0xfff0c020.toInt() }
        val image = Robot36.encode(pixels, 48000)
        val audio = ShortArray(48000 * 130)
        image.copyInto(audio, 48000 * 50)
        val source = FakeSource(audio)
        val file = folder.root.resolve("pass/iss.wav")
        var now = 0L
        // Each 4800-sample read is 100 ms; LOS after 125 s of audio.
        val recorder = PassRecorder(file, 125000, { now.also { now += 100 } }) { source }
        val written = recorder.record()
        assertTrue(source.stopped)
        assertEquals(16000 * 125, written)
        assertEquals(written, PassAudio.samples(file))
        val images = PassAudio.decodeSstv(file)
        assertEquals(1, images.size)
        // startSeconds marks the image after the VIS header, about 1 s after the audio offset.
        assertEquals(51.0, images.single().startSeconds, 0.5)
        val left = images.single().pixels[120 * Robot36.WIDTH + 40]
        assertTrue((left and 255) > 150 && (left shr 16 and 255) < 90)
    }
    @Test fun windowsCoverEveryWholeImageAndShortAudioHasNone() {
        assertEquals(emptyList<Int>(), PassAudio.windows(36 * 16000))
        assertEquals(listOf(0), PassAudio.windows(40 * 16000))
        val windows = PassAudio.windows(200 * 16000)
        assertEquals(0, windows.first()); assertEquals(140 * 16000, windows.last())
        assertTrue(windows.zipWithNext().all { (a, b) -> b - a <= 23 * 16000 })
        val file = folder.newFile("bad.wav").apply { writeBytes(ByteArray(100)) }
        assertThrows(IllegalArgumentException::class.java) { PassAudio.samples(file) }
    }
}
