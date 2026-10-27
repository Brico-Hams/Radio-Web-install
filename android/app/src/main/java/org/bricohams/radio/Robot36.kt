package org.bricohams.radio

import kotlin.math.PI
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.roundToInt
import kotlin.math.sin

data class SstvImage(val pixels: IntArray, val startSeconds: Double, val warning: UiText)

object Robot36 {
    const val WIDTH = 320
    const val HEIGHT = 240
    private const val RATE = 8000
    private const val LINE = 1200
    fun decode(audio: PcmAudio): SstvImage {
        requireUi(audio.sampleRate in 8000..48000 && audio.sampleRate % RATE == 0 &&
            audio.samples.size in audio.sampleRate * 37..audio.sampleRate * 60) {
            UiText(R.string.err_robot36_wav)
        }
        val factor = audio.sampleRate / RATE
        val samples = DoubleArray(audio.samples.size / factor) { index ->
            var sum = 0.0
            repeat(factor) { sum += audio.samples[index * factor + it].toDouble() / 32768 }
            sum / factor
        }
        val frequency = demodulate(samples)
        val start = alignPorch(frequency, findHeader(frequency))
        requireUi(start + HEIGHT * LINE + 32 < frequency.size) { UiText(R.string.err_robot36_truncated) }
        val pixels = IntArray(WIDTH * HEIGHT)
        val luminance = Array(2) { DoubleArray(WIDTH) }
        val chroma = Array(2) { DoubleArray(WIDTH / 2) }
        for (row in 0 until HEIGHT) {
            if (Thread.currentThread().isInterrupted) throw LocalizedInterruptedIOException(UiText(R.string.err_sstv_cancelled))
            val base = start + row * LINE
            requireUi(near(frequency, base + 24, base + 48, 1200.0, 100.0) > 0.8) {
                UiText(R.string.err_robot36_sync_lost, row + 1)
            }
            val separator = if (row % 2 == 0) 1500.0 else 2300.0
            requireUi(near(frequency, base + 808, base + 828, separator, 140.0) > 0.7) {
                UiText(R.string.err_robot36_separator, row + 1)
            }
            for (x in 0 until WIDTH) luminance[row % 2][x] = level(frequency, base + 96 + (x + 0.5) * 704 / WIDTH)
            for (x in 0 until WIDTH / 2) chroma[row % 2][x] = level(frequency, base + 848 + (x + 0.5) * 352 / (WIDTH / 2))
            if (row % 2 == 1) {
                for (line in 0..1) for (x in 0 until WIDTH) {
                    val y = luminance[line][x]
                    val cr = chroma[0][x / 2] - 128
                    val cb = chroma[1][x / 2] - 128
                    fun byte(value: Double) = value.roundToInt().coerceIn(0, 255)
                    val r = byte(y + 1.402 * cr)
                    val g = byte(y - 0.344136 * cb - 0.714136 * cr)
                    val b = byte(y + 1.772 * cb)
                    pixels[(row - 1 + line) * WIDTH + x] = (255 shl 24) or (r shl 16) or (g shl 8) or b
                }
            }
        }
        return SstvImage(pixels, start.toDouble() / RATE, UiText(R.string.robot36_warning))
    }
    /** Robot36 (VIS 8) audio for a 320x240 ARGB image, in the exact timing [decode] expects. */
    fun encode(pixels: IntArray, sampleRate: Int = 48000): ShortArray {
        requireUi(pixels.size == WIDTH * HEIGHT) { UiText(R.string.err_robot36_size) }
        requireUi(sampleRate in 8000..48000 && sampleRate % RATE == 0) { UiText(R.string.err_robot36_rate) }
        val out = ShortArray(((LEAD_MS + 910.0 + HEIGHT * 150.0 + TAIL_MS) * sampleRate / 1000).roundToInt() + 2)
        var written = 0
        var clock = 0.0
        var phase = 0.0
        fun tone(hz: Double, ms: Double) {
            clock += ms * sampleRate / 1000
            val end = clock.roundToInt()
            while (written < end) {
                phase = (phase + 2 * PI * hz / sampleRate) % (2 * PI)
                out[written++] = if (hz > 0) (sin(phase) * 23000).roundToInt().toShort() else 0
            }
        }
        fun pixel(value: Double) = 1500 + value.coerceIn(0.0, 255.0) * 800 / 255
        tone(0.0, LEAD_MS)
        tone(1900.0, 300.0); tone(1200.0, 10.0); tone(1900.0, 300.0); tone(1200.0, 30.0)
        // VIS 8, LSB first (1100 Hz = 1), then even parity and the stop bit.
        for (bit in 0..6) tone(if ((8 shr bit) and 1 == 1) 1100.0 else 1300.0, 30.0)
        tone(1100.0, 30.0); tone(1200.0, 30.0)
        fun rgb(x: Int, y: Int) = pixels[y * WIDTH + x].let { Triple(it shr 16 and 255, it shr 8 and 255, it and 255) }
        fun luma(x: Int, y: Int) = rgb(x, y).let { (r, g, b) -> 0.299 * r + 0.587 * g + 0.114 * b }
        for (row in 0 until HEIGHT) {
            tone(1200.0, 9.0); tone(1500.0, 3.0)
            for (x in 0 until WIDTH) tone(pixel(luma(x, row)), 88.0 / WIDTH)
            tone(if (row % 2 == 0) 1500.0 else 2300.0, 4.5); tone(1900.0, 1.5)
            // Even lines carry R-Y, odd lines B-Y, each averaged over the 2x2 block the decoder shares.
            val pair = row - row % 2
            for (x in 0 until WIDTH / 2) {
                var sum = 0.0
                for (dy in 0..1) for (dx in 0..1) {
                    val (r, _, b) = rgb(2 * x + dx, pair + dy)
                    val y = luma(2 * x + dx, pair + dy)
                    sum += if (row % 2 == 0) (r - y) / 1.402 else (b - y) / 1.772
                }
                tone(pixel(128 + sum / 4), 44.0 / (WIDTH / 2))
            }
        }
        tone(0.0, TAIL_MS)
        return out.copyOf(written)
    }
    private const val LEAD_MS = 100.0
    private const val TAIL_MS = 300.0
    private fun level(frequency: DoubleArray, position: Double): Double {
        val index = position.toInt()
        val fraction = position - index
        val value = frequency[index] * (1 - fraction) + frequency[index + 1] * fraction
        requireUi(value.isFinite() && value in 1300.0..2500.0) {
            UiText(R.string.err_robot36_out_of_band, value, index)
        }
        return ((value - 1500) * 255 / 800).coerceIn(0.0, 255.0)
    }
    private fun near(frequency: DoubleArray, from: Int, until: Int, target: Double, tolerance: Double): Double {
        if (from < 0 || until > frequency.size || until <= from) return 0.0
        return (from until until).count { kotlin.math.abs(frequency[it] - target) <= tolerance }.toDouble() / (until - from)
    }
    private fun findHeader(frequency: DoubleArray): Int {
        var index = 32
        while (index < frequency.size - 2400) {
            if (kotlin.math.abs(frequency[index] - 1200) > 70 || !frequency[index].isFinite()) { index++; continue }
            val start = index
            while (index < frequency.size && kotlin.math.abs(frequency[index] - 1200) <= 70) index++
            if (index - start !in 210..270 || near(frequency, start - 2000, start - 80, 1900.0, 70.0) < 0.95 ||
                near(frequency, start - 2470, start - 2420, 1200.0, 100.0) < 0.8 ||
                near(frequency, start - 4300, start - 2600, 1900.0, 70.0) < 0.95) continue
            var code = 0
            var parity = 0
            var valid = true
            for (bit in 0..7) {
                val center = start + (bit + 1) * 240 + 120
                val low = near(frequency, center - 40, center + 40, 1300.0, 70.0) > 0.9
                val high = near(frequency, center - 40, center + 40, 1100.0, 70.0) > 0.9
                if (!low && !high) { valid = false; break }
                if (high) { if (bit < 7) code = code or (1 shl bit); parity = parity xor 1 }
            }
            if (valid && code == 8 && parity == 0 &&
                near(frequency, start + 2200, start + 2300, 1200.0, 70.0) > 0.9) return start + 2400
        }
        throw LocalizedArgumentException(UiText(R.string.err_robot36_no_header))
    }
    private fun alignPorch(frequency: DoubleArray, nominal: Int): Int {
        for (index in nominal + 56..nominal + 88) {
            val before = frequency[index - 1]
            val after = frequency[index]
            if (before < 1350 && after >= 1350 &&
                near(frequency, index + 4, index + 12, 1500.0, 80.0) > 0.8) {
                // Phase difference estimates the interval midpoint, half a sample before its index.
                val crossing = index - 1 + (1350 - before) / (after - before) - 0.5
                return (crossing - 72).roundToInt()
            }
        }
        throw LocalizedArgumentException(UiText(R.string.err_robot36_align))
    }
    private fun demodulate(samples: DoubleArray): DoubleArray {
        val half = 31
        val taps = (-half..half).filter { it % 2 != 0 }.map { offset ->
            offset to (2 / (PI * offset) * (0.54 + 0.46 * cos(PI * offset / half)))
        }
        val result = DoubleArray(samples.size) { Double.NaN }
        var previousReal = 0.0
        var previousImaginary = 0.0
        for (index in half until samples.size - half) {
            if (index % 8000 == 0 && Thread.currentThread().isInterrupted)
                throw LocalizedInterruptedIOException(UiText(R.string.err_sstv_cancelled))
            val real = samples[index]
            var imaginary = 0.0
            for ((offset, coefficient) in taps) imaginary += coefficient * samples[index - offset]
            if (real * real + imaginary * imaginary > 0.0001 &&
                previousReal * previousReal + previousImaginary * previousImaginary > 0.0001) {
                result[index] = atan2(imaginary * previousReal - real * previousImaginary,
                    real * previousReal + imaginary * previousImaginary) * RATE / (2 * PI)
            }
            previousReal = real
            previousImaginary = imaginary
        }
        return result
    }
}
