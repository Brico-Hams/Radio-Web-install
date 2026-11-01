package org.bricohams.radio

import android.annotation.SuppressLint
import android.content.Context
import android.media.AudioDeviceInfo
import android.media.AudioFormat
import android.media.AudioManager
import android.media.AudioRecord
import android.media.MediaRecorder
import android.os.Build
import java.io.Closeable

internal interface PcmSource : Closeable {
    fun start()
    fun read(buffer: ShortArray, count: Int): Int
    fun stop()
}

internal class MicrophoneSource : PcmSource {
    private val recorder: AudioRecord
    @SuppressLint("MissingPermission")
    constructor(context: Context? = null) {
        val minimum = AudioRecord.getMinBufferSize(LiveAudio.SAMPLE_RATE, AudioFormat.CHANNEL_IN_MONO,
            AudioFormat.ENCODING_PCM_16BIT)
        checkUi(minimum > 0) { UiText(R.string.err_audio_no_pcm48) }
        val manager = context?.getSystemService(Context.AUDIO_SERVICE) as? AudioManager
        // UNPROCESSED avoids AGC and noise suppression; fall back to VOICE_RECOGNITION, then MIC.
        val sources = buildList {
            if (Build.VERSION.SDK_INT >= 24 && manager?.getProperty(AudioManager.PROPERTY_SUPPORT_AUDIO_SOURCE_UNPROCESSED) == "true") {
                add(MediaRecorder.AudioSource.UNPROCESSED)
            }
            add(MediaRecorder.AudioSource.VOICE_RECOGNITION)
            add(MediaRecorder.AudioSource.MIC)
        }
        var opened: AudioRecord? = null
        for (source in sources) {
            val candidate = try {
                AudioRecord(source, LiveAudio.SAMPLE_RATE, AudioFormat.CHANNEL_IN_MONO,
                    AudioFormat.ENCODING_PCM_16BIT, maxOf(minimum, 19200))
            } catch (error: IllegalArgumentException) {
                continue
            }
            if (candidate.state == AudioRecord.STATE_INITIALIZED) { opened = candidate; break }
            candidate.release()
        }
        recorder = opened ?: throw LocalizedIOException(UiText(R.string.err_mic_init))
        AudioRouting.usbInput(manager)?.let { recorder.setPreferredDevice(it) }
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

/** Finds USB audio devices so SSTV avoids the phone's own (processed) microphone and speaker when a radio interface is attached. */
internal object AudioRouting {
    private val usbTypes = setOf(AudioDeviceInfo.TYPE_USB_DEVICE, AudioDeviceInfo.TYPE_USB_HEADSET)
    private val wiredTypes = setOf(AudioDeviceInfo.TYPE_WIRED_HEADSET, AudioDeviceInfo.TYPE_WIRED_HEADPHONES,
        AudioDeviceInfo.TYPE_LINE_ANALOG)
    fun usbInput(manager: AudioManager?): AudioDeviceInfo? =
        manager?.getDevices(AudioManager.GET_DEVICES_INPUTS)?.firstOrNull { it.type in usbTypes }
    fun usbOutput(manager: AudioManager?): AudioDeviceInfo? =
        manager?.getDevices(AudioManager.GET_DEVICES_OUTPUTS)?.firstOrNull { it.type in usbTypes }
    /** USB output first, else a wired output; null leaves the system routing (usually the speaker). */
    fun externalOutput(manager: AudioManager?): AudioDeviceInfo? =
        usbOutput(manager) ?: manager?.getDevices(AudioManager.GET_DEVICES_OUTPUTS)?.firstOrNull { it.type in wiredTypes }
}

internal class LiveAudio(
    private val maxSeconds: Int = MAX_SECONDS,
    private val sourceFactory: () -> PcmSource = { MicrophoneSource() }
) {
    companion object {
        const val SAMPLE_RATE = 48000
        const val MAX_SECONDS = 60
        const val SSTV_SECONDS = 200
    }
    private val lock = Any()
    private var source: PcmSource? = null
    private var recording = false
    @Volatile private var finish = false
    @Volatile private var cancelled = false
    @Volatile private var captured = 0
    @Volatile private var pcm: ShortArray? = null
    private var used = false

    /** Copy of what has been captured so far (for live progress); null before enough audio exists. */
    fun snapshot(): PcmAudio? {
        val samples = pcm ?: return null
        val size = captured
        return if (size >= SAMPLE_RATE) PcmAudio(SAMPLE_RATE, samples.copyOf(size)) else null
    }
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
        val samples = ShortArray(SAMPLE_RATE * maxSeconds)
        pcm = samples
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
                captured = size
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
