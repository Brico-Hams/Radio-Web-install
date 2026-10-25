package org.bricohams.radio

import java.nio.ByteBuffer
import java.nio.ByteOrder
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.sqrt

data class PcmAudio(val sampleRate: Int, val samples: ShortArray)
data class MorseAudioResult(val morse: String, val text: String, val warning: String)

object MorseAudio {
    const val MAX_WAV_BYTES = 8 * 1024 * 1024
    fun readWav(bytes: ByteArray): PcmAudio {
        require(bytes.size in 44..MAX_WAV_BYTES) { "WAV demasiado corto o mayor de 8 MiB." }
        val view = ByteBuffer.wrap(bytes).order(ByteOrder.LITTLE_ENDIAN)
        fun tag(offset: Int) = String(bytes, offset, 4, Charsets.US_ASCII)
        fun u32(offset: Int) = view.getInt(offset).toLong() and 0xffffffffL
        require(tag(0) == "RIFF" && tag(8) == "WAVE" && u32(4) + 8 == bytes.size.toLong()) { "Contenedor RIFF/WAVE invalido." }
        var sampleRate: Int? = null
        var data: ShortArray? = null
        var offset = 12
        while (offset < bytes.size) {
            require(offset + 8 <= bytes.size) { "Cabecera WAV truncada." }
            val length = u32(offset + 4)
            val start = offset + 8
            require(length <= bytes.size - start) { "Bloque WAV truncado." }
            when (tag(offset)) {
                "fmt " -> {
                    require(sampleRate == null && length >= 16) { "Formato WAV duplicado o incompleto." }
                    require(view.getShort(start).toInt() == 1 && view.getShort(start + 2).toInt() == 1 &&
                        view.getShort(start + 14).toInt() == 16 && view.getShort(start + 12).toInt() == 2) {
                        "Solo WAV PCM lineal de 16 bits, mono; no MP3, float ni estereo."
                    }
                    val rate = view.getInt(start + 4)
                    require(rate in 8000..48000 && view.getInt(start + 8) == rate * 2) { "Frecuencia de muestreo WAV invalida." }
                    sampleRate = rate
                }
                "data" -> {
                    require(data == null && length % 2 == 0L) { "Datos PCM duplicados o desalineados." }
                    data = ShortArray(length.toInt() / 2) { view.getShort(start + it * 2) }
                }
            }
            val next = start.toLong() + length + length % 2
            require(next <= bytes.size) { "Falta padding WAV." }
            offset = next.toInt()
        }
        val rate = requireNotNull(sampleRate) { "Falta bloque fmt WAV." }
        val samples = requireNotNull(data) { "Falta bloque data WAV." }
        require(samples.size in rate / 10..rate * 60) { "Usa una grabacion de 0.1 a 60 segundos." }
        return PcmAudio(rate, samples)
    }

    fun decode(audio: PcmAudio, toneHz: Int, wordsPerMinute: Int): MorseAudioResult {
        require(audio.sampleRate in 8000..48000 && audio.samples.size in audio.sampleRate / 10..audio.sampleRate * 60) {
            "Audio fuera de limites."
        }
        require(toneHz in 300..1200 && wordsPerMinute in 5..45) { "Tono 300-1200 Hz; velocidad 5-45 ppm." }
        val frame = audio.sampleRate / 200
        val coefficient = 2 * cos(2 * PI * toneHz / audio.sampleRate)
        val levels = ArrayList<Pair<Double, Double>>()
        for (start in 0..audio.samples.size - frame step frame) {
            var previous = 0.0
            var beforePrevious = 0.0
            var energy = 0.0
            for (index in start until start + frame) {
                val sample = audio.samples[index].toDouble() / 32768
                val value = sample + coefficient * previous - beforePrevious
                beforePrevious = previous
                previous = value
                energy += sample * sample
            }
            val power = (previous * previous + beforePrevious * beforePrevious -
                coefficient * previous * beforePrevious).coerceAtLeast(0.0)
            val amplitude = 2 * sqrt(power) / frame
            val fraction = if (energy > 0) amplitude * amplitude * frame / (2 * energy) else 0.0
            levels.add(amplitude to fraction)
        }
        val peak = levels.maxOf { it.first }
        val warning = "Decodificacion experimental con tono y velocidad fijos. Ruido, desvanecimiento y temporizacion pueden producir errores; ? indica codigo desconocido. No usar como unica fuente de informacion."
        if (peak < 0.01) return MorseAudioResult("", "", "No se detecta tono suficiente. $warning")
        val active = levels.map { it.first >= peak * 0.3 && it.second > 0.6 }
        val dotFrames = 1.2 / wordsPerMinute * audio.sampleRate / frame
        val result = StringBuilder()
        var start = 0
        while (start < active.size) {
            val on = active[start]
            var end = start + 1
            while (end < active.size && active[end] == on) end++
            val duration = end - start
            if (on) {
                if (duration >= dotFrames * 0.4) result.append(if (duration < dotFrames * 2) '.' else '-')
            } else if (result.isNotEmpty() && end < active.size) {
                if (duration >= dotFrames * 5) result.append(" / ")
                else if (duration >= dotFrames * 2) result.append(' ')
            }
            start = end
        }
        val morse = result.toString().trim()
        return MorseAudioResult(morse, Morse.decode(morse), warning)
    }
}
