package org.bricohams.radio

import org.junit.Assert.*
import org.junit.Test
import kotlin.math.PI
import kotlin.math.sin
import kotlin.math.roundToInt

class Robot36Test {
    internal fun signal(rate: Int = 8000, vis: Int = 8, truncate: Boolean = false, colors: List<Int>? = null): PcmAudio {
        val samples = ShortArray(rate * 39)
        var index = 0
        var phase = 0.0
        fun tone(hz: Double, seconds: Double) {
            repeat((seconds * rate).roundToInt()) {
                samples[index++] = (sin(phase) * 20000).roundToInt().toShort()
                phase = (phase + 2 * PI * hz / rate) % (2 * PI)
            }
        }
        index += rate / 2
        tone(1900.0, 0.3); tone(1200.0, 0.01); tone(1900.0, 0.3); tone(1200.0, 0.03)
        for (bit in 0..6) tone(if (vis and (1 shl bit) == 0) 1300.0 else 1100.0, 0.03)
        tone(if (Integer.bitCount(vis) % 2 == 0) 1300.0 else 1100.0, 0.03)
        tone(1200.0, 0.03)
        for (row in 0 until 240) {
            tone(1200.0, 0.009); tone(1500.0, 0.003)
            fun component(color: Int, chroma: Boolean): Double {
                val r = (color ushr 16) and 255
                val g = (color ushr 8) and 255
                val b = color and 255
                return if (!chroma) 0.299 * r + 0.587 * g + 0.114 * b else if (row % 2 == 0)
                    128 + 0.5 * r - 0.418688 * g - 0.081312 * b else
                    128 - 0.168736 * r - 0.331264 * g + 0.5 * b
            }
            val levels = colors?.map { component(it, false) } ?: listOf(0.0, 128.0, 255.0, 128.0)
            for (value in levels) tone(1500 + value * 800 / 255, 0.088 / levels.size)
            tone(if (row % 2 == 0) 1500.0 else 2300.0, 0.0045)
            tone(1900.0, 0.0015)
            val chroma = colors?.map { component(it, true) } ?: listOf(128.0)
            for (value in chroma) tone(1500 + value * 800 / 255, 0.044 / chroma.size)
        }
        if (truncate) for (i in rate * 30 until samples.size) samples[i] = 0
        return PcmAudio(rate, samples)
    }
    @Test fun completeRobot36ReconstructsExpectedGeometryAndLevelsAtMultipleRates() {
        for (rate in listOf(8000, 16000, 48000)) {
            val image = Robot36.decode(signal(rate))
            assertEquals(320 * 240, image.pixels.size)
            assertEquals(1.41, image.startSeconds, 0.003)
            for (row in listOf(0, 1, 118, 239)) {
                for ((x, expected) in listOf(40 to 0, 120 to 128, 200 to 255, 280 to 128)) {
                    val pixel = image.pixels[row * 320 + x]
                    for (shift in listOf(0, 8, 16)) assertEquals("rate=$rate row=$row x=$x", expected.toDouble(),
                        ((pixel ushr shift) and 255).toDouble(), 12.0)
                }
            }
        }
    }
    @Test fun otherVisCodesMissingAudioAndLostSyncAreRejected() {
        assertThrows(IllegalArgumentException::class.java) { Robot36.decode(signal(vis = 44)) }
        assertThrows(IllegalArgumentException::class.java) { Robot36.decode(signal(truncate = true)) }
        assertThrows(IllegalArgumentException::class.java) { Robot36.decode(PcmAudio(8000, ShortArray(8000 * 39))) }
        assertThrows(IllegalArgumentException::class.java) { Robot36.decode(PcmAudio(44100, ShortArray(44100 * 39))) }
        assertThrows(IllegalArgumentException::class.java) { Robot36.decode(PcmAudio(8000, ShortArray(8000))) }
    }
    @Test fun colorChannelsAreNotSwappedAndParityIsChecked() {
        val colors = listOf(0xffffff, 0xffff00, 0x00ffff, 0x00ff00, 0xff00ff, 0xff0000, 0x0000ff, 0x000000)
        val image = Robot36.decode(signal(colors = colors))
        for (row in listOf(0, 1, 100, 239)) for ((bar, color) in colors.withIndex()) {
            val actual = image.pixels[row * 320 + bar * 40 + 20]
            for (shift in listOf(0, 8, 16)) assertEquals("row=$row bar=$bar channel=$shift",
                ((color ushr shift) and 255).toDouble(), ((actual ushr shift) and 255).toDouble(), 15.0)
        }
        val badParity = signal()
        // VIS parity interval is 1.35-1.38 s, between seven data bits and stop.
        for (index in 10800 until 11040) badParity.samples[index] =
            (sin(2 * PI * 1300 * index / 8000) * 20000).roundToInt().toShort()
        assertThrows(IllegalArgumentException::class.java) { Robot36.decode(badParity) }
    }
    @Test fun encoderRoundTripsThroughTheDecoderAtTheTransmitRate() {
        val colors = listOf(0xffffff, 0xffff00, 0x00ffff, 0x00ff00, 0xff00ff, 0xff0000, 0x0000ff, 0x000000)
        val pixels = IntArray(320 * 240) { index ->
            val x = index % 320
            val y = index / 320
            if (y < 120) colors[x / 40] else { val level = x * 255 / 319; (level shl 16) or (level shl 8) or (255 - level) }
        } .map { it or (255 shl 24) }.toIntArray()
        for (rate in listOf(8000, 48000)) {
            val audio = Robot36.encode(pixels, rate)
            assertEquals(37.31, audio.size.toDouble() / rate, 0.01)
            val image = Robot36.decode(PcmAudio(rate, audio))
            assertEquals(1.01, image.startSeconds, 0.003)
            for (row in listOf(0, 1, 60, 118, 121, 200, 239)) for (x in listOf(20, 100, 180, 260, 300)) {
                val expected = pixels[row * 320 + x]
                val actual = image.pixels[row * 320 + x]
                for (shift in listOf(0, 8, 16)) assertEquals("rate=$rate row=$row x=$x channel=$shift",
                    ((expected ushr shift) and 255).toDouble(), ((actual ushr shift) and 255).toDouble(), 15.0)
            }
        }
        assertThrows(IllegalArgumentException::class.java) { Robot36.encode(IntArray(10)) }
        assertThrows(IllegalArgumentException::class.java) { Robot36.encode(pixels, 44100) }
    }
}
