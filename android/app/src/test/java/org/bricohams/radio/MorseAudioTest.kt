package org.bricohams.radio

import org.junit.Assert.*
import org.junit.Test
import java.nio.ByteBuffer
import java.nio.ByteOrder
import kotlin.math.PI
import kotlin.math.sin

class MorseAudioTest {
    internal fun audio(rate: Int, morse: String, wpm: Int): PcmAudio {
        val samples = ArrayList<Short>()
        val dot = (rate * 1.2 / wpm).toInt()
        fun segment(units: Int, on: Boolean) {
            repeat(dot * units) { index ->
                samples.add(if (on) (16000 * sin(2 * PI * 700 * index / rate)).toInt().toShort() else 0)
            }
        }
        segment(7, false)
        val words = morse.split(" / ")
        for ((wordIndex, word) in words.withIndex()) {
            for ((letterIndex, letter) in word.split(" ").withIndex()) {
                for ((symbolIndex, symbol) in letter.withIndex()) {
                    segment(if (symbol == '.') 1 else 3, true)
                    if (symbolIndex < letter.lastIndex) segment(1, false)
                }
                if (letterIndex < word.split(" ").lastIndex) segment(3, false)
            }
            if (wordIndex < words.lastIndex) segment(7, false)
        }
        segment(7, false)
        return PcmAudio(rate, samples.toShortArray())
    }
    private fun wav(audio: PcmAudio): ByteArray {
        val out = ByteBuffer.allocate(44 + audio.samples.size * 2).order(ByteOrder.LITTLE_ENDIAN)
        out.put("RIFF".toByteArray()); out.putInt(out.capacity() - 8); out.put("WAVEfmt ".toByteArray())
        out.putInt(16); out.putShort(1); out.putShort(1); out.putInt(audio.sampleRate); out.putInt(audio.sampleRate * 2)
        out.putShort(2); out.putShort(16); out.put("data".toByteArray()); out.putInt(audio.samples.size * 2)
        audio.samples.forEach(out::putShort)
        return out.array()
    }
    @Test fun decodesKnownSignalsAcrossRatesAndSpeeds() {
        for (rate in listOf(8000, 16000, 44100, 48000)) {
            for (speed in listOf(5, 15, 30, 45)) {
                val input = audio(rate, "... --- ... / . .- .----", speed)
                val decoded = MorseAudio.decode(MorseAudio.readWav(wav(input)), 700, speed)
                assertEquals("$rate Hz $speed ppm", "SOS EA1", decoded.text)
                assertEquals("... --- ... / . .- .----", decoded.morse)
            }
        }
    }
    @Test fun silenceAndWrongToneNeverInventWords() {
        assertEquals("", MorseAudio.decode(PcmAudio(8000, ShortArray(8000)), 700, 15).text)
        assertEquals("", MorseAudio.decode(audio(16000, "... --- ...", 15), 1200, 15).text)
    }
    @Test fun rejectsTruncatedAndUnsupportedAudio() {
        val bytes = wav(audio(8000, "...", 15))
        assertThrows(IllegalArgumentException::class.java) { MorseAudio.readWav(bytes.copyOf(bytes.size - 1)) }
        val stereo = bytes.copyOf()
        stereo[22] = 2
        assertThrows(IllegalArgumentException::class.java) { MorseAudio.readWav(stereo) }
        assertThrows(IllegalArgumentException::class.java) { MorseAudio.decode(audio(8000, "...", 15), 700, 0) }
    }
}
