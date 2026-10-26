package org.bricohams.radio

import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioTrack
import java.io.Closeable
import java.io.IOException

object Callsign {
    private val pattern = Regex("^([A-Z0-9]{1,4}/)?[A-Z0-9]{1,3}[0-9][A-Z0-9]{0,4}(/[A-Z0-9]{1,4})?$")
    /** Station identification is mandatory before any CAT transmission. */
    fun normalize(text: String): String {
        val call = text.trim().uppercase()
        require(pattern.matches(call) && call.any { it.isLetter() }) { "Indicativo obligatorio y valido (p. ej. EA1ABC o EA1ABC/P)." }
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
        check(minimum > 0) { "El dispositivo no reproduce PCM mono a $sampleRate Hz." }
        track = AudioTrack.Builder()
            .setAudioAttributes(AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_MEDIA)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build())
            .setAudioFormat(AudioFormat.Builder().setSampleRate(sampleRate).setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
                .setEncoding(AudioFormat.ENCODING_PCM_16BIT).build())
            .setTransferMode(AudioTrack.MODE_STREAM).setBufferSizeInBytes(maxOf(minimum, sampleRate / 5 * 2)).build()
        if (track.state != AudioTrack.STATE_INITIALIZED) {
            track.release()
            throw IOException("No se pudo abrir la salida de audio.")
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
        require(audio.isNotEmpty() && audio.size * 1000L / sampleRate <= MAX_AUDIO_MS) {
            "Audio de 0-${MAX_AUDIO_MS / 1000} s: la radio corta a ${RADIO_LIMIT_MS / 1000} s."
        }
        val before = cat.pttQuery()
        require(before.armed && before.deniedState == 0 && !before.limit) {
            "PTT no armada o bloqueada: en la radio entra en SAT RX y pulsa la tecla 9."
        }
        check(!before.keyed) { "La radio ya esta transmitiendo." }
        check(keepGoing()) { "Transmision cancelada antes de PTT." }
        var failure: Throwable? = null
        try {
            var state = cat.pttKey()
            val deadline = clock() + 1500
            while (!state.keyed) {
                if (clock() >= deadline) throw IOException("La radio no confirma la PTT.")
                sleep(50)
                state = cat.pttKey()
            }
            var renewed = clock()
            sink.start()
            var offset = 0
            val chunk = maxOf(1, sampleRate / 10)
            while (offset < audio.size || sink.playedFrames() < audio.size) {
                check(keepGoing()) { "Transmision cancelada." }
                if (clock() - renewed >= RENEW_MS) {
                    check(cat.pttKey().keyed) { "La radio corto la PTT (tecla, limite o bloqueo)." }
                    renewed = clock()
                }
                if (offset < audio.size) {
                    val written = sink.write(audio, offset, minOf(chunk, audio.size - offset))
                    if (written <= 0) throw IOException("La salida de audio fallo: $written.")
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
                check(!cat.pttQuery().keyed) { "La radio no confirma fin de PTT; se apagara al vencer el lease." }
            }.exceptionOrNull()
            try { sink.stop() } catch (_: IllegalStateException) { } finally { sink.close() }
            if (cleanup != null) {
                if (failure == null) throw cleanup
                failure.addSuppressed(cleanup)
            }
        }
    }
}
