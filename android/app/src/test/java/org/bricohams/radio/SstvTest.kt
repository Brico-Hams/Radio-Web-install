package org.bricohams.radio

import org.junit.Assert.*
import org.junit.Test
import java.util.Random
import kotlin.math.abs
import kotlin.math.pow
import kotlin.math.roundToInt
import kotlin.math.sqrt

class SstvTest {
    private val rates = listOf(8000, 44100, 48000)

    private fun gradient(mode: SstvMode): IntArray = IntArray(mode.width * mode.height) { index ->
        val x = index % mode.width
        val y = index / mode.width
        val r = x * 255 / (mode.width - 1)
        val g = y * 255 / (mode.height - 1)
        (255 shl 24) or (r shl 16) or (g shl 8) or (255 - r)
    }

    private fun meanError(expected: IntArray, actual: IntArray): Double {
        assertEquals(expected.size, actual.size)
        var sum = 0L
        for (i in expected.indices) for (shift in listOf(0, 8, 16))
            sum += abs(((expected[i] ushr shift) and 255) - ((actual[i] ushr shift) and 255))
        return sum.toDouble() / (expected.size * 3)
    }

    private fun addNoise(samples: ShortArray, snrDb: Double, seed: Long): ShortArray {
        val random = Random(seed)
        val sigma = 23000.0 / sqrt(2.0) / 10.0.pow(snrDb / 20)
        return ShortArray(samples.size) { (samples[it] + random.nextGaussian() * sigma).roundToInt().coerceIn(-32768, 32767).toShort() }
    }

    private fun check(mode: SstvMode, rate: Int, label: String, limit: Double, transform: (ShortArray) -> ShortArray = { it },
        encodeRate: Int = rate, offset: Double = 0.0) {
        val pixels = gradient(mode)
        val audio = transform(Sstv.encode(pixels, encodeRate, mode, offset))
        val image = Sstv.decode(PcmAudio(rate, audio))
        assertEquals("$label ${mode.name}@$rate mode", mode, image.mode)
        assertEquals(mode.width, image.width)
        assertEquals(mode.height, image.height)
        assertEquals(mode.width * mode.height, image.pixels.size)
        val error = meanError(pixels, image.pixels)
        assertTrue("$label ${mode.name}@$rate mean error $error lost=${image.lostCount}", error <= limit)
    }

    @Test fun everyModeRoundTripsCleanAtThreeRates() {
        for (mode in SstvModes.ALL) for (rate in rates) check(mode, rate, "clean", 12.0)
    }

    @Test fun everyModeSurvivesWhiteNoiseAt15Db() {
        for (mode in SstvModes.ALL) for (rate in rates)
            check(mode, rate, "noise", 40.0, transform = { addNoise(it, 15.0, 7L + rate) })
    }

    @Test fun everyModeSurvivesClockDriftOfHalfPerMille() {
        for (mode in SstvModes.ALL) for (rate in rates)
            check(mode, rate, "drift", 15.0, encodeRate = (rate * 1.0005).roundToInt())
    }

    @Test fun everyModeSurvivesPlus60HzToneOffset() {
        for (mode in SstvModes.ALL) for (rate in rates) check(mode, rate, "offset", 15.0, offset = 60.0)
    }

    @Test fun visIsDetectedForEveryCode() {
        val helper = Robot36Test()
        for (mode in SstvModes.ALL) {
            val vis = Sstv.detectVis(helper.signal(vis = mode.vis))
            assertNotNull(mode.name, vis)
            assertEquals(mode.vis, vis!!.code)
            assertEquals(mode, vis.mode)
            assertEquals(0.0, vis.offsetHz, 10.0)
        }
        assertEquals(listOf(8, 12, 44, 40, 60, 56, 99, 95, 96), SstvModes.ALL.map { it.vis })
    }

    @Test fun visToneOffsetIsEstimatedAndCorrected() {
        val mode = SstvModes.ROBOT36
        val audio = PcmAudio(8000, Sstv.encode(gradient(mode), 8000, mode, 60.0))
        val vis = Sstv.detectVis(audio)
        assertNotNull(vis)
        assertEquals(mode, vis!!.mode)
        assertEquals(60.0, abs(vis.offsetHz), 15.0)
    }

    @Test fun unknownVisAndBadParityAreNotAccepted() {
        val helper = Robot36Test()
        assertNull(Sstv.detectVis(helper.signal(vis = 5))?.mode)
        assertThrows(IllegalArgumentException::class.java) { Sstv.decode(helper.signal(vis = 5)) }
        assertNull(Sstv.detectVis(PcmAudio(8000, ShortArray(8000 * 5))))
    }

    @Test fun partialReceptionReturnsDecodedLinesAndMarksTheLostOnes() {
        for (mode in listOf(SstvModes.ROBOT36, SstvModes.MARTIN_M2, SstvModes.SCOTTIE_S2, SstvModes.PD90)) {
            val pixels = gradient(mode)
            val full = Sstv.encode(pixels, 8000, mode)
            val cut = full.copyOf(full.size * 45 / 100)
            val image = Sstv.decode(PcmAudio(8000, cut))
            assertEquals(mode, image.mode)
            assertEquals(mode.height, image.lostRows.size)
            assertEquals(mode.width * mode.height, image.pixels.size)
            assertFalse(mode.name, image.complete)
            assertTrue("${mode.name} decoded=${image.decodedRows}", image.decodedRows in 1 until mode.height)
            assertTrue(image.lostRows[mode.height - 1])
            assertFalse(image.lostRows[0])
        }
    }

    @Test fun headerOnlyAudioStillFailsInsteadOfReturningAnEmptyImage() {
        val mode = SstvModes.ROBOT36
        val audio = Sstv.encode(gradient(mode), 8000, mode)
        val headerOnly = audio.copyOf((1.1 * 8000).roundToInt())
        assertThrows(IllegalArgumentException::class.java) { Sstv.decode(PcmAudio(8000, headerOnly)) }
    }

    @Test fun modeTableHasTheStandardTimings() {
        assertEquals(150.0, SstvModes.ROBOT36.lineMs, 0.01)
        assertEquals(300.0, SstvModes.ROBOT72.lineMs, 0.01)
        assertEquals(9, SstvModes.ALL.size)
        assertEquals(640, SstvModes.PD120.width)
        assertEquals(496, SstvModes.PD180.height)
        assertEquals(256, SstvModes.PD90.height)
    }
}
