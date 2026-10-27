package org.bricohams.radio

import android.annotation.SuppressLint
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import java.io.Closeable

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
        checkUi(minimum > 0) { UiText(R.string.err_audio_no_pcm48) }
        recorder = AudioRecord(MediaRecorder.AudioSource.MIC, LiveAudio.SAMPLE_RATE,
            AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT, maxOf(minimum, 19200))
        if (recorder.state != AudioRecord.STATE_INITIALIZED) {
            recorder.release()
            throw LocalizedIOException(UiText(R.string.err_mic_init))
        }
    }
    override fun start() {
        recorder.startRecording()
        checkUi(recorder.recordingState == AudioRecord.RECORDSTATE_RECORDING) { UiText(R.string.err_mic_not_recording) }
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
        synchronized(lock) { checkUi(!used) { UiText(R.string.err_capture_used) }; used = true }
        val samples = ShortArray(SAMPLE_RATE * MAX_SECONDS)
        val buffer = ShortArray(4800)
        var size = 0
        try {
            synchronized(lock) {
                if (cancelled || finish) throw LocalizedCancellationException(UiText(R.string.err_capture_cancelled_before_start))
                val opened = sourceFactory()
                source = opened
                opened.start()
                recording = true
            }
            while (!finish && size < samples.size) {
                if (Thread.currentThread().isInterrupted) throw LocalizedCancellationException(UiText(R.string.err_capture_interrupted))
                val current = checkNotNull(source)
                val count = current.read(buffer, minOf(buffer.size, samples.size - size))
                if (count <= 0) {
                    if (finish) break
                    throw LocalizedIOException(UiText(R.string.err_mic_no_pcm, count))
                }
                checkUi(count <= buffer.size && count <= samples.size - size) { UiText(R.string.err_pcm_read_bounds) }
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
        if (cancelled) throw LocalizedCancellationException(UiText(R.string.err_capture_cancelled_discarded))
        requireUi(size >= SAMPLE_RATE / 10) { UiText(R.string.err_capture_too_short) }
        return PcmAudio(SAMPLE_RATE, samples.copyOf(size))
    }
}
