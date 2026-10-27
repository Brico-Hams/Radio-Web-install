package org.bricohams.radio

import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioTrack
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
    /** Blocking write; returns the frames accepted. */
    fun write(samples: ShortArray, offset: Int, count: Int): Int
    fun playedFrames(): Long
    fun stop()
}

internal class AudioTrackSink(private val sampleRate: Int) : AudioSink {
    private val track: AudioTrack
    init {
        val minimum = AudioTrack.getMinBufferSize(sampleRate, AudioFormat.CHANNEL_OUT_MONO, AudioFormat.ENCODING_PCM_16BIT)
        checkUi(minimum > 0) { UiText(R.string.err_audio_out_rate, sampleRate) }
        track = AudioTrack.Builder()
            .setAudioAttributes(AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_MEDIA)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build())
            .setAudioFormat(AudioFormat.Builder().setSampleRate(sampleRate).setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
                .setEncoding(AudioFormat.ENCODING_PCM_16BIT).build())
            .setTransferMode(AudioTrack.MODE_STREAM).setBufferSizeInBytes(maxOf(minimum, sampleRate / 5 * 2)).build()
        if (track.state != AudioTrack.STATE_INITIALIZED) {
            track.release()
            throw LocalizedIOException(UiText(R.string.err_audio_out_open))
        }
    }
    override fun start() = track.play()
    override fun write(samples: ShortArray, offset: Int, count: Int) =
        track.write(samples, offset, count, AudioTrack.WRITE_BLOCKING)
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
        private const val RENEW_MS = 400L
    }
    fun send(audio: ShortArray, sampleRate: Int, sink: AudioSink, keepGoing: () -> Boolean) {
        requireUi(audio.isNotEmpty() && audio.size * 1000L / sampleRate <= MAX_AUDIO_MS) {
            UiText(R.string.err_audio_length, MAX_AUDIO_MS / 1000, RADIO_LIMIT_MS / 1000)
        }
        val before = cat.pttQuery()
        requireUi(before.armed && before.deniedState == 0 && !before.limit) {
            UiText(R.string.err_ptt_not_ready)
        }
        checkUi(!before.keyed) { UiText(R.string.err_already_transmitting) }
        checkUi(keepGoing()) { UiText(R.string.err_tx_cancelled_before_ptt) }
        var failure: Throwable? = null
        try {
            var state = cat.pttKey()
            val deadline = clock() + 1500
            while (!state.keyed) {
                if (clock() >= deadline) throw LocalizedIOException(UiText(R.string.err_ptt_unconfirmed))
                sleep(50)
                state = cat.pttKey()
            }
            var renewed = clock()
            sink.start()
            var offset = 0
            val chunk = maxOf(1, sampleRate / 10)
            while (offset < audio.size || sink.playedFrames() < audio.size) {
                checkUi(keepGoing()) { UiText(R.string.err_tx_cancelled) }
                if (clock() - renewed >= RENEW_MS) {
                    checkUi(cat.pttKey().keyed) { UiText(R.string.err_ptt_cut) }
                    renewed = clock()
                }
                if (offset < audio.size) {
                    val written = sink.write(audio, offset, minOf(chunk, audio.size - offset))
                    if (written <= 0) throw LocalizedIOException(UiText(R.string.err_audio_out_failed, written))
                    offset += written
                } else sleep(50)
            }
        } catch (error: Throwable) {
            failure = error
            throw error
        } finally {
            // PTT release first and confirmed by a reread; if it fails the radio's 1.5 s lease drops PTT by itself.
            val cleanup = runCatching {
                cat.pttRelease()
                checkUi(!cat.pttQuery().keyed) { UiText(R.string.err_ptt_end_unconfirmed) }
            }.exceptionOrNull()
            try { sink.stop() } catch (_: IllegalStateException) { } finally { sink.close() }
            if (cleanup != null) {
                if (failure == null) throw cleanup
                failure.addSuppressed(cleanup)
            }
        }
    }
}
