package org.bricohams.radio

import java.nio.ByteBuffer
import java.nio.ByteOrder
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.sqrt

data class PcmAudio(val sampleRate: Int, val samples: ShortArray)
data class MorseAudioResult(val morse: String, val text: String, val warning: UiText)

object MorseAudio {
    const val MAX_WAV_BYTES = 8 * 1024 * 1024
    fun readWav(bytes: ByteArray): PcmAudio {
        requireUi(bytes.size in 44..MAX_WAV_BYTES) { UiText(R.string.err_wav_size) }
        val view = ByteBuffer.wrap(bytes).order(ByteOrder.LITTLE_ENDIAN)
        fun tag(offset: Int) = String(bytes, offset, 4, Charsets.US_ASCII)
        fun u32(offset: Int) = view.getInt(offset).toLong() and 0xffffffffL
        requireUi(tag(0) == "RIFF" && tag(8) == "WAVE" && u32(4) + 8 == bytes.size.toLong()) { UiText(R.string.err_wav_container) }
        var sampleRate: Int? = null
        var data: ShortArray? = null
        var offset = 12
        while (offset < bytes.size) {
            requireUi(offset + 8 <= bytes.size) { UiText(R.string.err_wav_header_truncated) }
            val length = u32(offset + 4)
            val start = offset + 8
            requireUi(length <= bytes.size - start) { UiText(R.string.err_wav_chunk_truncated) }
            when (tag(offset)) {
                "fmt " -> {
                    requireUi(sampleRate == null && length >= 16) { UiText(R.string.err_wav_format_duplicate) }
                    requireUi(view.getShort(start).toInt() == 1 && view.getShort(start + 2).toInt() == 1 &&
                        view.getShort(start + 14).toInt() == 16 && view.getShort(start + 12).toInt() == 2) {
                        UiText(R.string.err_wav_pcm16_only)
                    }
                    val rate = view.getInt(start + 4)
                    requireUi(rate in 8000..48000 && view.getInt(start + 8) == rate * 2) { UiText(R.string.err_wav_rate) }
                    sampleRate = rate
                }
                "data" -> {
                    requireUi(data == null && length % 2 == 0L) { UiText(R.string.err_wav_data_duplicate) }
                    data = ShortArray(length.toInt() / 2) { view.getShort(start + it * 2) }
                }
            }
            val next = start.toLong() + length + length % 2
            requireUi(next <= bytes.size) { UiText(R.string.err_wav_padding) }
            offset = next.toInt()
        }
        val rate = requireNotNullUi(sampleRate) { UiText(R.string.err_wav_no_fmt) }
        val samples = requireNotNullUi(data) { UiText(R.string.err_wav_no_data) }
        requireUi(samples.size in rate / 10..rate * 60) { UiText(R.string.err_wav_duration) }
        return PcmAudio(rate, samples)
    }

    fun decode(audio: PcmAudio, toneHz: Int, wordsPerMinute: Int): MorseAudioResult {
        requireUi(audio.sampleRate in 8000..48000 && audio.samples.size in audio.sampleRate / 10..audio.sampleRate * 60) {
            UiText(R.string.err_audio_bounds)
        }
        requireUi(toneHz in 300..1200 && wordsPerMinute in 5..45) { UiText(R.string.err_morse_tone_speed) }
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
        val warning = UiText(R.string.morse_warning)
        if (peak < 0.01) return MorseAudioResult("", "", UiText(R.string.morse_no_tone, warning))
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
