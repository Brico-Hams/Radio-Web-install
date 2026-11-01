package org.bricohams.radio

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioFormat
import android.media.AudioManager
import android.media.AudioTrack
import android.os.Handler
import android.os.Looper
import java.io.Closeable

object Callsign {
    private val pattern = Regex("^([A-Z0-9]{1,4}/)?[A-Z0-9]{1,3}[0-9][A-Z0-9]{0,4}(/[A-Z0-9]{1,4})?$")
    /** Station identification is mandatory before any CAT transmission. */
    fun normalize(text: String): String {
        val call = text.trim().uppercase()
        requireUi(pattern.matches(call) && call.any { it.isLetter() }) { UiText(R.string.err_sstv_call) }
        return call
    }
}

internal interface AudioSink : Closeable {
    fun start()
    /** Non-blocking write; returns the frames accepted (0 when the buffer is full). */
    fun write(samples: ShortArray, offset: Int, count: Int): Int
    fun playedFrames(): Long
    fun stop()
    /** Takes audio focus so other apps do not mix into the transmission; false when it was refused. */
    fun requestFocus(): Boolean = true
    fun abandonFocus() {}
    /** True once another app has taken the focus for good or temporarily (the audio would be interrupted). */
    fun focusLost(): Boolean = false
}

internal class AudioTrackSink(private val sampleRate: Int, context: Context? = null) : AudioSink {
    private val track: AudioTrack
    private val manager = context?.getSystemService(Context.AUDIO_SERVICE) as? AudioManager
    private val attributes = AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_MEDIA)
        .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC).build()
    @Volatile private var lost = false
    private var focus: AudioFocusRequest? = null
    /** True when the audio goes to a USB or wired output instead of the phone speaker. */
    val externalOutput: Boolean
    init {
        val minimum = AudioTrack.getMinBufferSize(sampleRate, AudioFormat.CHANNEL_OUT_MONO, AudioFormat.ENCODING_PCM_16BIT)
        checkUi(minimum > 0) { UiText(R.string.err_audio_out_rate, sampleRate) }
        track = AudioTrack.Builder()
            .setAudioAttributes(attributes)
            .setAudioFormat(AudioFormat.Builder().setSampleRate(sampleRate).setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
                .setEncoding(AudioFormat.ENCODING_PCM_16BIT).build())
            .setTransferMode(AudioTrack.MODE_STREAM).setBufferSizeInBytes(maxOf(minimum, sampleRate / 5 * 2)).build()
        if (track.state != AudioTrack.STATE_INITIALIZED) {
            track.release()
            throw LocalizedIOException(UiText(R.string.err_audio_out_open))
        }
        val device = AudioRouting.externalOutput(manager)
        externalOutput = device != null && track.setPreferredDevice(device)
    }
    override fun requestFocus(): Boolean {
        val current = manager ?: return true
        val request = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_EXCLUSIVE)
            .setAudioAttributes(attributes)
            .setOnAudioFocusChangeListener({ change ->
                if (change == AudioManager.AUDIOFOCUS_LOSS || change == AudioManager.AUDIOFOCUS_LOSS_TRANSIENT) lost = true
            }, Handler(Looper.getMainLooper()))
            .build()
        focus = request
        return current.requestAudioFocus(request) == AudioManager.AUDIOFOCUS_REQUEST_GRANTED
    }
    override fun abandonFocus() {
        focus?.let { manager?.abandonAudioFocusRequest(it) }
        focus = null
    }
    override fun focusLost() = lost
    override fun start() = track.play()
    override fun write(samples: ShortArray, offset: Int, count: Int) =
        track.write(samples, offset, count, AudioTrack.WRITE_NON_BLOCKING)
    override fun playedFrames() = track.playbackHeadPosition.toLong() and 0xffffffffL
    override fun stop() = track.stop()
    override fun close() = track.release()
}

/** Plays audio into the radio's mic input while holding the leased CAT PTT; any doubt drops PTT. */
internal class CatTransmitter(
    private val cat: CatProtocol,
    private val clock: () -> Long = { System.nanoTime() / 1_000_000 },
    private val sleep: (Long) -> Unit = Thread::sleep
) {
    companion object {
        const val RADIO_LIMIT_MS = 120_000L
        const val MAX_AUDIO_MS = 110_000L
        /** Without progress in the written or played frames for this long the transmission is aborted. */
        const val STALL_MS = 2_000L
        private const val SLACK_MS = 5_000L
        private const val RENEW_MS = 400L
        private const val RELEASE_ATTEMPTS = 3
    }
    @Volatile private var cancelled = false
    @Volatile private var activeSink: AudioSink? = null
    /** Stops the audio at once and makes [send] release PTT on its next iteration; safe from any thread. */
    fun cancel() {
        cancelled = true
        try { activeSink?.stop() } catch (_: RuntimeException) { }
    }
    fun send(audio: ShortArray, sampleRate: Int, sink: AudioSink, keepGoing: () -> Boolean) {
        val proceed = { !cancelled && keepGoing() }
        try {
            requireUi(audio.isNotEmpty() && audio.size * 1000L / sampleRate <= MAX_AUDIO_MS) {
                UiText(R.string.err_audio_length, MAX_AUDIO_MS / 1000, RADIO_LIMIT_MS / 1000)
            }
            val before = cat.pttQuery()
            requireUi(before.armed && before.deniedState == 0 && !before.limit) {
                UiText(R.string.err_ptt_not_ready)
            }
            checkUi(!before.keyed) { UiText(R.string.err_already_transmitting) }
            checkUi(proceed()) { UiText(R.string.err_tx_cancelled_before_ptt) }
            val focused = sink.requestFocus()
            checkUi(focused) { UiText(R.string.err_audio_focus) }
        } catch (error: Throwable) {
            try { sink.abandonFocus() } finally { sink.close() }
            throw error
        }
        var failure: Throwable? = null
        activeSink = sink
        try {
            var state = cat.pttKey()
            val deadline = clock() + 1500
            while (!state.keyed) {
                checkUi(proceed()) { UiText(R.string.err_tx_cancelled) }
                if (clock() >= deadline) throw LocalizedIOException(UiText(R.string.err_ptt_unconfirmed))
                sleep(50)
                state = cat.pttKey()
            }
            var renewed = clock()
            sink.start()
            val begin = clock()
            val limit = begin + audio.size * 1000L / sampleRate + SLACK_MS
            var progressAt = begin
            var lastPlayed = -1L
            var offset = 0
            val chunk = maxOf(1, sampleRate / 10)
            while (offset < audio.size || sink.playedFrames() < audio.size) {
                checkUi(proceed()) { UiText(R.string.err_tx_cancelled) }
                checkUi(!sink.focusLost()) { UiText(R.string.err_audio_focus_lost) }
                if (clock() - renewed >= RENEW_MS) {
                    checkUi(cat.pttKey().keyed) { UiText(R.string.err_ptt_cut) }
                    renewed = clock()
                }
                var moved = false
                if (offset < audio.size) {
                    val written = sink.write(audio, offset, minOf(chunk, audio.size - offset))
                    checkUi(!cancelled) { UiText(R.string.err_tx_cancelled) }
                    if (written < 0) throw LocalizedIOException(UiText(R.string.err_audio_out_failed, written))
                    offset += written
                    moved = written > 0
                }
                val played = sink.playedFrames()
                if (played != lastPlayed) { lastPlayed = played; moved = true }
                val now = clock()
                if (moved) progressAt = now
                else if (now - progressAt >= STALL_MS) throw LocalizedIOException(UiText(R.string.err_audio_stall))
                if (now > limit) throw LocalizedIOException(UiText(R.string.err_audio_stall))
                if (!moved || offset >= audio.size) sleep(if (offset < audio.size) 20 else 50)
            }
        } catch (error: Throwable) {
            failure = error
            throw error
        } finally {
            // Stop the audio and release PTT first (retried and confirmed by a reread); if that fails the radio's 1.5 s
            // lease drops PTT by itself.
            activeSink = null
            try { sink.stop() } catch (_: RuntimeException) { }
            val cleanup = releasePtt()
            try {
                try { sink.abandonFocus() } finally { sink.close() }
            } catch (error: RuntimeException) {
                if (failure == null && cleanup == null) throw error
            }
            if (cleanup != null) {
                if (failure == null) throw cleanup
                failure.addSuppressed(cleanup)
            }
        }
    }
    private fun releasePtt(): Throwable? {
        var last: Throwable? = null
        repeat(RELEASE_ATTEMPTS) { attempt ->
            try {
                cat.pttRelease()
                checkUi(!cat.pttQuery().keyed) { UiText(R.string.err_ptt_end_unconfirmed) }
                return null
            } catch (error: Exception) {
                last?.let(error::addSuppressed)
                last = error
                if (attempt < RELEASE_ATTEMPTS - 1) sleep(50)
            }
        }
        return last
    }
}
