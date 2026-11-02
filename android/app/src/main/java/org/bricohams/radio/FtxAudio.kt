package org.bricohams.radio

import android.annotation.SuppressLint
import android.content.Context
import android.media.AudioDeviceInfo
import android.media.AudioFormat
import android.media.AudioManager
import android.media.AudioRecord
import android.media.MediaRecorder
import android.os.Build
import java.util.concurrent.Executors
import java.util.concurrent.RejectedExecutionException
import java.util.concurrent.atomic.AtomicInteger
import org.bricohams.digital.CodecException
import org.bricohams.digital.DecodedMessage

internal interface FtxInput : PcmSource {
    val sampleRate: Int
}

/** Records mono 16-bit PCM from the chosen Android input (or a USB audio device when one is attached), 48000 Hz preferred. */
@SuppressLint("MissingPermission")
internal class FtxMicrophone(context: Context, device: AudioDeviceInfo?) : FtxInput {
    companion object {
        val RATES = intArrayOf(48000, 44100, 16000, 12000)
        fun inputs(manager: AudioManager?): List<AudioDeviceInfo> =
            manager?.getDevices(AudioManager.GET_DEVICES_INPUTS)?.filter { it.isSource }.orEmpty()
    }

    private val recorder: AudioRecord
    override val sampleRate: Int

    init {
        val manager = context.getSystemService(Context.AUDIO_SERVICE) as? AudioManager
        // UNPROCESSED avoids AGC and noise suppression; fall back to VOICE_RECOGNITION, then MIC.
        val sources = buildList {
            if (Build.VERSION.SDK_INT >= 24 && manager?.getProperty(AudioManager.PROPERTY_SUPPORT_AUDIO_SOURCE_UNPROCESSED) == "true") {
                add(MediaRecorder.AudioSource.UNPROCESSED)
            }
            add(MediaRecorder.AudioSource.VOICE_RECOGNITION)
            add(MediaRecorder.AudioSource.MIC)
        }
        var found: AudioRecord? = null
        var foundRate = 0
        search@ for (rate in RATES) {
            val minimum = AudioRecord.getMinBufferSize(rate, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT)
            if (minimum <= 0) continue
            for (source in sources) {
                val candidate = try {
                    AudioRecord(source, rate, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT, maxOf(minimum, rate * 2))
                } catch (error: IllegalArgumentException) {
                    continue
                }
                if (candidate.state == AudioRecord.STATE_INITIALIZED) {
                    found = candidate
                    foundRate = rate
                    break@search
                }
                candidate.release()
            }
        }
        recorder = found ?: throw LocalizedIOException(UiText(R.string.err_ftx_no_rate))
        sampleRate = foundRate
        (device ?: AudioRouting.usbInput(manager))?.let { recorder.setPreferredDevice(it) }
    }

    override fun start() {
        recorder.startRecording()
        checkUi(recorder.recordingState == AudioRecord.RECORDSTATE_RECORDING) { UiText(R.string.err_mic_not_recording) }
    }
    override fun read(buffer: ShortArray, count: Int) = recorder.read(buffer, 0, count, AudioRecord.READ_BLOCKING)
    override fun stop() = recorder.stop()
    override fun close() = recorder.release()
}

/**
 * Capture thread -> resampling thread -> UTC slot cutter -> one decode at a time (a slot that finds the decoder busy
 * is reported as skipped). Every callback arrives on a worker thread.
 */
internal class FtxReceiver(
    private val mode: FtxMode,
    private val codecs: FtxCodecs,
    private val openInput: () -> FtxInput,
    private val listener: Listener,
    private val clock: () -> Long = System::currentTimeMillis
) {
    interface Listener {
        fun listening(inputRate: Int)
        fun decoded(slotStartUtcMs: Long, messages: List<DecodedMessage>)
        fun skipped(slotStartUtcMs: Long)
        fun failed(text: UiText)
        fun finished()
    }

    @Volatile private var running = false
    private val lock = Any()
    private var input: FtxInput? = null
    private val processor = Executors.newSingleThreadExecutor()
    private val decoder = Executors.newSingleThreadExecutor()
    private val pending = AtomicInteger()
    private var cutter: SlotCutter? = null
    private var resampler: StreamResampler? = null

    fun start() {
        check(!running)
        running = true
        Thread(::capture, "ftx-capture").start()
    }

    /** Safe from any thread; unblocks the capture read. */
    fun stop() {
        running = false
        synchronized(lock) {
            try { input?.stop() } catch (_: RuntimeException) { }
        }
    }

    private fun capture() {
        var opened: FtxInput? = null
        try {
            synchronized(lock) {
                if (!running) return
                val source = openInput()
                opened = source
                input = source
                source.start()
            }
            val source = checkNotNull(opened)
            val rate = source.sampleRate
            listener.listening(rate)
            val buffer = ShortArray(rate / 10)
            while (running) {
                val count = source.read(buffer, buffer.size)
                if (count <= 0) {
                    if (!running) break
                    throw LocalizedIOException(UiText(R.string.err_mic_no_pcm, count))
                }
                val chunk = buffer.copyOf(count)
                val arrived = clock()
                processor.execute { process(chunk, rate, arrived) }
            }
        } catch (error: RejectedExecutionException) {
            // stop() raced with the shutdown below
        } catch (error: Exception) {
            if (running) listener.failed(FtxCodecs.errorText(error))
        } finally {
            running = false
            synchronized(lock) {
                opened?.let {
                    try { it.stop() } catch (_: RuntimeException) { }
                    try { it.close() } catch (_: RuntimeException) { }
                }
                input = null
            }
            processor.shutdownNow()
            decoder.shutdownNow()
            listener.finished()
        }
    }

    private fun process(chunk: ShortArray, rate: Int, arrivedMs: Long) {
        if (!running) return
        try {
            val samples = FloatArray(chunk.size) { chunk[it] / 32768f }
            val slots = cutter ?: SlotCutter(mode, arrivedMs - chunk.size * 1000L / rate).also { cutter = it }
            val stream = resampler ?: StreamResampler(rate) {
                if (!running) throw CodecException(CodecException.Reason.CANCELLED, "stopped")
            }.also { resampler = it }
            for (slot in slots.push(stream.push(samples))) submit(slot)
        } catch (error: Exception) {
            if (running) listener.failed(FtxCodecs.errorText(error))
            stop()
        }
    }

    private fun submit(slot: SlotCutter.Slot) {
        if (!pending.compareAndSet(0, 1)) {
            listener.skipped(slot.startUtcMs)
            return
        }
        try {
            decoder.execute {
                try {
                    val deadline = System.nanoTime() + mode.slotMs * 900_000L
                    val budget = DeadlineBudget(deadline, { !running })
                    val messages = codecs.decodeSlot(mode, slot.samples, slot.startUtcMs, budget)
                    if (running) listener.decoded(slot.startUtcMs, messages)
                } catch (error: CodecException) {
                    if (running) when (error.reason) {
                        CodecException.Reason.CANCELLED -> Unit
                        CodecException.Reason.BUDGET_EXCEEDED -> listener.skipped(slot.startUtcMs)
                        else -> listener.failed(FtxCodecs.reason(error))
                    }
                } catch (error: RuntimeException) {
                    if (running) listener.failed(FtxCodecs.errorText(error))
                } finally {
                    pending.set(0)
                }
            }
        } catch (error: RejectedExecutionException) {
            pending.set(0)
        }
    }
}

/** Plays one frame once, starting 0.5 s after the next UTC slot boundary. The radio's PTT or VOX is the operator's. */
internal class FtxTransmitter(
    private val clock: () -> Long = System::currentTimeMillis,
    private val sleep: (Long) -> Unit = Thread::sleep
) {
    private companion object {
        const val STALL_MS = 2_000L
        const val SLACK_MS = 5_000L
    }

    @Volatile private var cancelled = false
    @Volatile private var activeSink: AudioSink? = null

    /** Stops the audio at once; safe from any thread. */
    fun cancel() {
        cancelled = true
        try { activeSink?.stop() } catch (_: RuntimeException) { }
    }

    /** Blocks until the audio has played. [waiting] gets the milliseconds left before the audio starts. */
    fun send(samples: ShortArray, sampleRate: Int, slotMs: Long, sink: AudioSink,
             waiting: (Long) -> Unit = {}, sending: () -> Unit = {}) {
        try {
            requireUi(samples.isNotEmpty() && samples.size * 1000L / sampleRate + FtxCodecs.LEAD_MS <= slotMs) {
                UiText(R.string.err_ftx_tx_length)
            }
            val now = clock()
            val target = now + DigitalClock.msToNextSlot(now, slotMs) + FtxCodecs.LEAD_MS
            while (true) {
                checkUi(!cancelled) { UiText(R.string.err_ftx_tx_cancelled) }
                val left = target - clock()
                if (left <= 0) break
                waiting(left)
                sleep(minOf(left, 100L))
            }
            checkUi(sink.requestFocus()) { UiText(R.string.err_audio_focus) }
            checkUi(!cancelled) { UiText(R.string.err_ftx_tx_cancelled) }
        } catch (error: Throwable) {
            try { sink.abandonFocus() } finally { sink.close() }
            throw error
        }
        activeSink = sink
        try {
            sink.start()
            sending()
            val begin = clock()
            val limit = begin + samples.size * 1000L / sampleRate + SLACK_MS
            var progressAt = begin
            var lastPlayed = -1L
            var offset = 0
            val chunk = maxOf(1, sampleRate / 10)
            while (offset < samples.size || sink.playedFrames() < samples.size) {
                checkUi(!cancelled) { UiText(R.string.err_ftx_tx_cancelled) }
                checkUi(!sink.focusLost()) { UiText(R.string.err_audio_focus_lost) }
                var moved = false
                if (offset < samples.size) {
                    val written = sink.write(samples, offset, minOf(chunk, samples.size - offset))
                    checkUi(!cancelled) { UiText(R.string.err_ftx_tx_cancelled) }
                    if (written < 0) throw LocalizedIOException(UiText(R.string.err_audio_out_failed, written))
                    offset += written
                    moved = written > 0
                }
                val played = sink.playedFrames()
                if (played != lastPlayed) {
                    lastPlayed = played
                    moved = true
                }
                val now = clock()
                if (moved) progressAt = now
                else if (now - progressAt >= STALL_MS) throw LocalizedIOException(UiText(R.string.err_audio_stall))
                if (now > limit) throw LocalizedIOException(UiText(R.string.err_audio_stall))
                sleep(if (offset < samples.size) 20L else 50L)
            }
        } finally {
            activeSink = null
            try { sink.stop() } catch (_: RuntimeException) { }
            try { sink.abandonFocus() } finally { sink.close() }
        }
    }
}
