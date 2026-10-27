package org.bricohams.radio

import java.io.File
import java.io.IOException
import java.io.RandomAccessFile
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.util.concurrent.CancellationException
import kotlin.math.roundToInt

/** Streams the microphone (48 kHz) to a private 16 kHz mono WAV until stop(), LOS or two hours. */
internal class PassRecorder(
    private val file: File,
    private val deadline: Long,
    private val clock: () -> Long = System::currentTimeMillis,
    private val sourceFactory: () -> PcmSource = { MicrophoneSource() }
) {
    companion object {
        const val RATE = 16000
        const val MAX_SECONDS = 2 * 3600
    }
    @Volatile private var finish = false
    fun stop() { finish = true }

    /** Returns the number of samples kept; the WAV header is valid even after an error. */
    fun record(): Int {
        require(LiveAudio.SAMPLE_RATE == RATE * 3) { "Diezmado 3:1 requiere captura a 48 kHz." }
        file.parentFile?.mkdirs()
        var written = 0
        RandomAccessFile(file, "rw").use { output ->
            output.setLength(0)
            output.write(PassAudio.header(0))
            val input = ShortArray(4800)
            val bytes = ByteBuffer.allocate(input.size / 3 * 2).order(ByteOrder.LITTLE_ENDIAN)
            try {
                sourceFactory().use { source ->
                    source.start()
                    try {
                        while (!finish && clock() < deadline && written < RATE * MAX_SECONDS) {
                            if (Thread.currentThread().isInterrupted) throw CancellationException("Grabacion interrumpida.")
                            val count = source.read(input, input.size)
                            if (count <= 0) throw IOException("El microfono no entrego audio PCM: $count.")
                            bytes.clear()
                            for (index in 0 until count / 3) {
                                val sum = input[index * 3] + input[index * 3 + 1] + input[index * 3 + 2]
                                bytes.putShort((sum / 3.0).roundToInt().toShort())
                            }
                            output.write(bytes.array(), 0, bytes.position())
                            written += bytes.position() / 2
                        }
                    } finally { source.stop() }
                }
            } finally {
                output.seek(0)
                output.write(PassAudio.header(written))
            }
        }
        return written
    }
}

object PassAudio {
    private const val WINDOW = 60
    private const val STEP = 23
    fun header(samples: Int): ByteArray = ByteBuffer.allocate(44).order(ByteOrder.LITTLE_ENDIAN).apply {
        put("RIFF".toByteArray(Charsets.US_ASCII)); putInt(36 + samples * 2); put("WAVEfmt ".toByteArray(Charsets.US_ASCII))
        putInt(16); putShort(1); putShort(1); putInt(PassRecorder.RATE); putInt(PassRecorder.RATE * 2); putShort(2); putShort(16)
        put("data".toByteArray(Charsets.US_ASCII)); putInt(samples * 2)
    }.array()
    fun samples(file: File): Int = RandomAccessFile(file, "r").use { input ->
        val head = ByteArray(44)
        input.readFully(head)
        require(head.copyOfRange(0, 44).contentEquals(header(((input.length() - 44) / 2).toInt()))) {
            "Grabacion no reconocida: WAV 16 kHz mono de Bricohams requerido."
        }
        ((input.length() - 44) / 2).toInt()
    }
    /** Window starts in samples: 60 s windows every 23 s always contain any whole 37 s Robot36 image. */
    fun windows(samples: Int, rate: Int = PassRecorder.RATE): List<Int> {
        if (samples < 37 * rate) return emptyList()
        val tail = maxOf(samples - WINDOW * rate, 0)
        val starts = (0..tail step STEP * rate).toMutableList()
        if (starts.last() != tail) starts.add(tail)
        return starts
    }
    fun decodeSstv(file: File, cancelled: () -> Boolean = { false }): List<SstvImage> {
        val total = samples(file)
        val images = ArrayList<SstvImage>()
        RandomAccessFile(file, "r").use { input ->
            for (start in windows(total)) {
                if (cancelled()) throw CancellationException("Decodificacion cancelada.")
                val length = minOf(WINDOW * PassRecorder.RATE, total - start)
                val bytes = ByteArray(length * 2)
                input.seek(44L + start * 2L)
                input.readFully(bytes)
                val pcm = ShortArray(length)
                ByteBuffer.wrap(bytes).order(ByteOrder.LITTLE_ENDIAN).asShortBuffer().get(pcm)
                val image = try { Robot36.decode(PcmAudio(PassRecorder.RATE, pcm)) } catch (error: IllegalArgumentException) { continue }
                val absolute = image.copy(startSeconds = start.toDouble() / PassRecorder.RATE + image.startSeconds)
                if (images.none { kotlin.math.abs(it.startSeconds - absolute.startSeconds) < 10 }) images.add(absolute)
            }
        }
        return images
    }
}
