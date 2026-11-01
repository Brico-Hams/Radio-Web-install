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
    private const val LONG_WINDOW = 260
    private const val LONG_STEP = 60
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
    /** Window starts for the long (PD90/PD120/PD180, up to 190 s) images: 260 s windows every 60 s. */
    fun longWindows(samples: Int, rate: Int = PassRecorder.RATE): List<Int> {
        if (samples <= WINDOW * rate + 10 * rate) return emptyList()
        val tail = maxOf(samples - LONG_WINDOW * rate, 0)
        val starts = (0..tail step LONG_STEP * rate).toMutableList()
        if (starts.last() != tail) starts.add(tail)
        return starts
    }
    fun decodeSstv(file: File, cancelled: () -> Boolean = { false }): List<SstvImage> {
        val total = samples(file)
        val images = ArrayList<SstvImage>()
        RandomAccessFile(file, "r").use { input ->
            val jobs = windows(total).map { it to WINDOW } + longWindows(total).map { it to LONG_WINDOW }
            for ((start, seconds) in jobs) {
                if (cancelled()) throw CancellationException("Decodificacion cancelada.")
                val length = minOf(seconds * PassRecorder.RATE, total - start)
                val bytes = ByteArray(length * 2)
                input.seek(44L + start * 2L)
                input.readFully(bytes)
                val pcm = ShortArray(length)
                ByteBuffer.wrap(bytes).order(ByteOrder.LITTLE_ENDIAN).asShortBuffer().get(pcm)
                val image = try { Sstv.decode(PcmAudio(PassRecorder.RATE, pcm)) } catch (error: IllegalArgumentException) { continue }
                val absolute = image.copy(startSeconds = start.toDouble() / PassRecorder.RATE + image.startSeconds)
                val twin = images.indexOfFirst { kotlin.math.abs(it.startSeconds - absolute.startSeconds) < 10 }
                // A window cutting the image gives a partial copy: keep the one with more rows.
                if (twin < 0) images.add(absolute) else if (absolute.decodedRows > images[twin].decodedRows) images[twin] = absolute
            }
        }
        return images
    }
}
