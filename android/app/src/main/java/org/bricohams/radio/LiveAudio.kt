package org.bricohams.radio

import android.annotation.SuppressLint
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import java.io.Closeable
import java.io.IOException
import java.util.concurrent.CancellationException

internal interface PcmSource : Closeable {
    fun start()
    fun read(buffer: ShortArray, count: Int): Int
    fun stop()
}

internal class MicrophoneSource : PcmSource {
    private val recorder: AudioRecord
    @SuppressLint("MissingPermission")
    constructor() {
        val minimum = AudioRecord.getMinBufferSize(LiveAudio.SAMPLE_RATE, AudioFormat.CHANNEL_IN_MONO,
            AudioFormat.ENCODING_PCM_16BIT)
        check(minimum > 0) { "El dispositivo no admite PCM mono a 48 kHz." }
        recorder = AudioRecord(MediaRecorder.AudioSource.MIC, LiveAudio.SAMPLE_RATE,
            AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT, maxOf(minimum, 19200))
        if (recorder.state != AudioRecord.STATE_INITIALIZED) {
            recorder.release()
            throw IOException("No se pudo inicializar el microfono.")
        }
    }
    override fun start() {
        recorder.startRecording()
        check(recorder.recordingState == AudioRecord.RECORDSTATE_RECORDING) { "El microfono no esta grabando." }
    }
    override fun read(buffer: ShortArray, count: Int) =
        recorder.read(buffer, 0, count, AudioRecord.READ_BLOCKING)
    override fun stop() = recorder.stop()
    override fun close() = recorder.release()
}

internal class LiveAudio(private val sourceFactory: () -> PcmSource = { MicrophoneSource() }) {
    companion object {
        const val SAMPLE_RATE = 48000
        const val MAX_SECONDS = 60
    }
    private val lock = Any()
    private var source: PcmSource? = null
    private var recording = false
    @Volatile private var finish = false
    @Volatile private var cancelled = false
    private var used = false

    fun stop() {
        synchronized(lock) {
            if (finish) return
            finish = true
            if (recording) source?.stop()
        }
    }
    fun cancel() {
        cancelled = true
        stop()
    }
    fun record(): PcmAudio {
        synchronized(lock) { check(!used) { "La captura ya se ha utilizado." }; used = true }
        val samples = ShortArray(SAMPLE_RATE * MAX_SECONDS)
        val buffer = ShortArray(4800)
        var size = 0
        try {
            synchronized(lock) {
                if (cancelled || finish) throw CancellationException("Captura cancelada antes de empezar.")
                val opened = sourceFactory()
                source = opened
                opened.start()
                recording = true
            }
            while (!finish && size < samples.size) {
                if (Thread.currentThread().isInterrupted) throw CancellationException("Captura interrumpida.")
                val current = checkNotNull(source)
                val count = current.read(buffer, minOf(buffer.size, samples.size - size))
                if (count <= 0) {
                    if (finish) break
                    throw IOException("El microfono no entrego audio PCM: $count.")
                }
                check(count <= buffer.size && count <= samples.size - size) { "Lectura PCM fuera de limites." }
                buffer.copyInto(samples, size, 0, count)
                size += count
            }
        } finally {
            synchronized(lock) {
                val current = source
                source = null
                if (current != null) {
                    try { if (recording && !finish) current.stop() } finally { recording = false; current.close() }
                }
            }
        }
        if (cancelled) throw CancellationException("Captura cancelada; audio descartado.")
        require(size >= SAMPLE_RATE / 10) { "Graba al menos 0.1 segundos antes de decodificar." }
        return PcmAudio(SAMPLE_RATE, samples.copyOf(size))
    }
}
