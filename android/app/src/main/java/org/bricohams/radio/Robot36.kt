package org.bricohams.radio

import kotlin.math.PI
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.roundToInt

data class SstvImage(val pixels: IntArray, val startSeconds: Double, val warning: String)

object Robot36 {
    const val WIDTH = 320
    const val HEIGHT = 240
    private const val RATE = 8000
    private const val LINE = 1200
    fun decode(audio: PcmAudio): SstvImage {
        require(audio.sampleRate in 8000..48000 && audio.sampleRate % RATE == 0 &&
            audio.samples.size in audio.sampleRate * 37..audio.sampleRate * 60) {
            "Robot36 requiere WAV de 37-60 s a 8/16/24/32/40/48 kHz."
        }
        val factor = audio.sampleRate / RATE
        val samples = DoubleArray(audio.samples.size / factor) { index ->
            var sum = 0.0
            repeat(factor) { sum += audio.samples[index * factor + it].toDouble() / 32768 }
            sum / factor
        }
        val frequency = demodulate(samples)
        val start = alignPorch(frequency, findHeader(frequency))
        require(start + HEIGHT * LINE + 32 < frequency.size) { "Imagen Robot36 truncada: faltan lineas o margen final de audio." }
        val pixels = IntArray(WIDTH * HEIGHT)
        val luminance = Array(2) { DoubleArray(WIDTH) }
        val chroma = Array(2) { DoubleArray(WIDTH / 2) }
        for (row in 0 until HEIGHT) {
            if (Thread.currentThread().isInterrupted) throw java.io.InterruptedIOException("Decodificacion SSTV cancelada.")
            val base = start + row * LINE
            require(near(frequency, base + 24, base + 48, 1200.0, 100.0) > 0.8) {
                "Robot36: sincronismo perdido en linea ${row + 1}. No se entrega una imagen completa."
            }
            val separator = if (row % 2 == 0) 1500.0 else 2300.0
            require(near(frequency, base + 808, base + 828, separator, 140.0) > 0.7) {
                "Robot36: separador de color incorrecto en linea ${row + 1}."
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
        return SstvImage(pixels, start.toDouble() / RATE,
            "Robot36 experimental desde WAV. Imagen 320x240; crominancia compartida por pares de lineas. " +
                "Sin compensacion de deriva/reloj ni recuperacion de lineas. Ruido, audio o sincronismo pueden alterar colores y detalle; no es una validacion RF.")
    }
    private fun level(frequency: DoubleArray, position: Double): Double {
        val index = position.toInt()
        val fraction = position - index
        val value = frequency[index] * (1 - fraction) + frequency[index + 1] * fraction
        require(value.isFinite() && value in 1300.0..2500.0) {
            "Robot36: audio de imagen fuera de banda o sin senal ($value Hz, muestra $index)."
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
        throw IllegalArgumentException("No se detecta cabecera Robot36 completa (VIS 8 con paridad par). No se adivina el modo.")
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
        throw IllegalArgumentException("Robot36: no se puede alinear el primer porch de linea.")
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
                throw java.io.InterruptedIOException("Decodificacion SSTV cancelada.")
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
