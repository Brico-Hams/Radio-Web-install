package org.bricohams.radio

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Typeface
import android.media.AudioDeviceInfo
import android.media.AudioManager
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.text.Editable
import android.text.InputType
import android.text.TextWatcher
import android.view.View
import android.view.ViewGroup
import android.widget.ArrayAdapter
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.Spinner
import android.widget.TextView
import java.io.ByteArrayInputStream
import java.io.IOException
import java.time.Instant
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter
import java.util.Locale
import java.util.concurrent.Executors
import org.bricohams.digital.DecodedMessage
import org.bricohams.digital.WavIo
import org.bricohams.digital.fec.Ldpc174
import org.bricohams.digital.ftx.ApContext

/** FT8 / FT4 / FT2 with the project's own codecs: receive from the audio input or a WAV, build WAVs, play one frame on a slot. */
class FtxActivity : LocalizedActivity() {
    private companion object {
        const val REQUEST_PERMISSION = 70
        const val REQUEST_OPEN = 71
        const val REQUEST_SAVE = 72
        const val LDPC_ASSET = "ftx-ldpc174.json"
        const val MAX_ROWS = 200
        const val MAX_WAV_BYTES = 32 * 1024 * 1024
        const val DX_CALL_PREFERENCE = "ftx_dx_call"
    }

    private class SaveRequest(val mode: FtxMode, val message: String, val toneHz: Double)

    private val worker = Executors.newSingleThreadExecutor()
    private val txWorker = Executors.newSingleThreadExecutor()
    private val handler = Handler(Looper.getMainLooper())
    private val colors by lazy { Brand.Palette(this) }
    private val clockFormat = DateTimeFormatter.ofPattern("HH:mm:ss", Locale.ROOT).withZone(ZoneOffset.UTC)
    internal var inputFactory: (AudioDeviceInfo?) -> FtxInput = { FtxMicrophone(applicationContext, it) }
    internal var sinkFactory: () -> AudioSink = { AudioTrackSink(FtxCodecs.RATE, applicationContext) }
    internal var clock: () -> Long = System::currentTimeMillis
    private val codecs = FtxCodecs { assets.open(LDPC_ASSET).use { Ldpc174.load(it) } }

    private var mode = FtxMode.FT8
    private var foreground = false
    private var generation = 0
    private var receiver: FtxReceiver? = null
    private var transmitter: FtxTransmitter? = null
    private var txActive = false
    private var busy = false
    private var pendingSave: SaveRequest? = null
    private var inputs: List<AudioDeviceInfo> = emptyList()
    private val results = ArrayList<DecodedMessage>()
    // Own and worked-station calls for the a-priori decoding passes; replaced on every field change.
    @Volatile private var ap: ApContext? = null

    private lateinit var modeRow: LinearLayout
    private lateinit var modeInfo: TextView
    private lateinit var clockText: TextView
    private lateinit var inputSpinner: Spinner
    private lateinit var listen: Button
    private lateinit var stopRx: Button
    private lateinit var decodeWav: Button
    private lateinit var unavailable: TextView
    private lateinit var rxStatus: TextView
    private lateinit var resultRows: LinearLayout
    private lateinit var callField: TextView
    private lateinit var dxField: EditText
    private lateinit var messageField: EditText
    private lateinit var toneField: EditText
    private lateinit var txInfo: TextView
    private lateinit var saveWav: Button
    private lateinit var transmit: Button
    private lateinit var stopTx: Button
    private lateinit var txStatus: TextView

    private val tick = object : Runnable {
        override fun run() {
            updateClock()
            handler.postDelayed(this, 250)
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val body = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        body.addView(TextView(this).apply { setText(R.string.ftx_intro); textSize = 16f })

        card(body, R.string.ftx_mode_title) { card ->
            modeRow = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL }
            card.addView(modeRow)
            modeInfo = Brand.text(this, 14f, colors.muted)
            card.addView(modeInfo)
            // Not a live region: it changes every 250 ms and would flood TalkBack.
            clockText = Brand.text(this, 14f, colors.accent)
            card.addView(clockText)
        }

        card(body, R.string.ftx_rx_title) { card ->
            label(card, R.string.ftx_input_label)
            inputSpinner = Spinner(this).apply {
                contentDescription = getString(R.string.ftx_input_label)
                layoutParams = LinearLayout.LayoutParams(-1, -2)
            }
            card.addView(inputSpinner)
            listen = action(card, R.string.ftx_listen, true) { startListening() }
            stopRx = action(card, R.string.ftx_stop_rx) { stopListening(true) }
            decodeWav = action(card, R.string.ftx_decode_wav) { chooseWav() }
            unavailable = Brand.text(this, 14f, colors.accent)
            card.addView(unavailable)
            rxStatus = Brand.text(this, 14f, colors.text).apply {
                accessibilityLiveRegion = View.ACCESSIBILITY_LIVE_REGION_POLITE
                setText(R.string.ftx_rx_idle)
            }
            card.addView(rxStatus)
            card.addView(Brand.text(this, 13f, colors.muted, true).apply { setText(R.string.ftx_col_header) })
            resultRows = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
            card.addView(resultRows)
        }

        card(body, R.string.ftx_tx_title) { card ->
            callField = Brand.text(this, 15f).apply {
                id = R.id.ftx_call
                text = ProfileStore.describeCallsign(this@FtxActivity)
                contentDescription = text
            }
            card.addView(callField)
            dxField = field(R.id.ftx_dx_call, R.string.ftx_dx_call_hint,
                getSharedPreferences(RigActivity.PREFERENCES, MODE_PRIVATE).getString(DX_CALL_PREFERENCE, "") ?: "",
                InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_FLAG_CAP_CHARACTERS or InputType.TYPE_TEXT_FLAG_NO_SUGGESTIONS)
            card.addView(dxField)
            messageField = field(R.id.ftx_message, R.string.ftx_message_hint, "",
                InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_FLAG_CAP_CHARACTERS or InputType.TYPE_TEXT_FLAG_NO_SUGGESTIONS)
            card.addView(messageField)
            toneField = field(R.id.ftx_tone, R.string.ftx_tone_hint, "1500",
                InputType.TYPE_CLASS_NUMBER or InputType.TYPE_NUMBER_FLAG_DECIMAL)
            card.addView(toneField)
            txInfo = Brand.text(this, 14f, colors.accent).apply { accessibilityLiveRegion = View.ACCESSIBILITY_LIVE_REGION_POLITE }
            card.addView(txInfo)
            saveWav = action(card, R.string.ftx_save_wav) { chooseSaveWav() }
            transmit = action(card, R.string.ftx_tx_next, true) { startTransmit() }
            stopTx = action(card, R.string.ftx_tx_stop) { transmitter?.cancel() }
            txStatus = Brand.text(this, 14f, colors.text).apply { accessibilityLiveRegion = View.ACCESSIBILITY_LIVE_REGION_POLITE }
            card.addView(txStatus)
            card.addView(Brand.text(this, 13f, colors.muted).apply { setText(R.string.ftx_tx_legal) })
        }
        for (view in listOf(callField, dxField, messageField, toneField)) view.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {}
            override fun afterTextChanged(s: Editable?) = refresh()
        })

        body.addView(TextView(this).apply { setText(R.string.ftx_about) })
        setContentView(ScrollView(this).apply { addView(body) })
        renderModes()
        refresh()
    }

    private fun card(body: LinearLayout, title: Int, build: (LinearLayout) -> Unit) {
        val card = Brand.card(this)
        card.addView(Brand.text(this, 18f, colors.accent, true).apply {
            setText(title)
            if (android.os.Build.VERSION.SDK_INT >= 28) isAccessibilityHeading = true
        })
        build(card)
        body.addView(card)
    }

    private fun label(parent: LinearLayout, text: Int) =
        parent.addView(Brand.text(this, 13f, colors.muted).apply { setText(text) })

    private fun action(parent: LinearLayout, label: Int, primary: Boolean = false, run: () -> Unit): Button =
        Brand.button(this, getString(label), primary, run).also { parent.addView(it) }

    private fun field(identifier: Int, hint: Int, value: String, type: Int) = EditText(this).apply {
        id = identifier
        setHint(hint)
        contentDescription = getString(hint)
        setTextColor(colors.text); setHintTextColor(colors.muted)
        inputType = type
        setText(value)
        layoutParams = LinearLayout.LayoutParams(-1, -2)
    }

    private fun adapterOf(items: List<String>) =
        object : ArrayAdapter<String>(this, android.R.layout.simple_spinner_dropdown_item, items) {
            override fun getView(position: Int, convertView: View?, parent: ViewGroup): View =
                super.getView(position, convertView, parent).also { (it as? TextView)?.setTextColor(colors.text) }
            override fun getDropDownView(position: Int, convertView: View?, parent: ViewGroup): View =
                super.getDropDownView(position, convertView, parent).also {
                    (it as? TextView)?.setTextColor(colors.text)
                    it.setBackgroundColor(colors.surfaceHigh)
                }
        }

    private fun renderModes() {
        modeRow.removeAllViews()
        for (candidate in FtxMode.values()) {
            val name = if (candidate.candidate) getString(R.string.ftx_mode_candidate, candidate.label) else candidate.label
            modeRow.addView(Brand.chip(this, name, candidate == mode) { selectMode(candidate) })
        }
        modeInfo.text = buildString {
            append(getString(R.string.ftx_slot_info, mode.label, mode.slotSecondsText))
            if (mode.candidate) append(' ').append(getString(R.string.ftx_candidate_note))
        }
    }

    private fun selectMode(selected: FtxMode) {
        if (selected == mode || busy || txActive) return
        stopListening(false)
        mode = selected
        renderModes()
        refresh()
        updateClock()
    }

    private fun updateClock() {
        val now = clock()
        clockText.text = getString(R.string.rig_dig_clock, clockFormat.format(Instant.ofEpochMilli(now)), mode.label,
            DigitalClock.msToNextSlot(now, mode.slotMs) / 1000.0,
            getString(if (DigitalClock.isEvenSlot(now, mode.slotMs)) R.string.rig_dig_even else R.string.rig_dig_odd))
    }

    private fun callOrNull(): String? = try { ProfileStore.requireCallsign(this) } catch (error: IllegalArgumentException) { null }

    /** Why the frame cannot be built, or null: message and tone only (enough to save a WAV). */
    private fun frameProblem(): UiText? {
        FtxMessages.problem(FtxMessages.normalize(messageField.text.toString()))?.let { return it }
        return try { FtxCodecs.parseTone(mode, toneField.text.toString()); null } catch (error: IllegalArgumentException) { FtxCodecs.errorText(error) }
    }

    /** Why this cannot be transmitted, or null: also needs a station callsign that appears in the message. */
    private fun txProblem(): UiText? {
        frameProblem()?.let { return it }
        val call = callOrNull() ?: return UiText(R.string.ftx_need_call)
        if (!FtxMessages.mentions(FtxMessages.normalize(messageField.text.toString()), call)) {
            return UiText(R.string.ftx_msg_needs_call, call)
        }
        if (receiver != null) return UiText(R.string.ftx_tx_stop_rx_first)
        return null
    }

    private fun refresh() {
        ap = ApContext(callOrNull(), dxField.text.toString())
        val decodable = codecs.decoder(mode) != null
        val listening = receiver != null
        listen.isEnabled = decodable && !listening && !txActive && !busy
        stopRx.isEnabled = listening
        decodeWav.isEnabled = decodable && !listening && !busy
        inputSpinner.isEnabled = !listening
        unavailable.visibility = if (decodable) View.GONE else View.VISIBLE
        unavailable.text = if (decodable) "" else getString(R.string.ftx_rx_unavailable, mode.label)
        val problem = txProblem()
        txInfo.text = (problem ?: UiText(R.string.ftx_msg_ok)).resolve(this)
        val frameOk = frameProblem() == null
        saveWav.isEnabled = frameOk && !busy
        transmit.isEnabled = problem == null && !txActive && !busy
        stopTx.isEnabled = txActive
        messageField.isEnabled = !txActive
        callField.isEnabled = !txActive
        toneField.isEnabled = !txActive
        renderResults()
    }

    private fun renderResults() {
        resultRows.removeAllViews()
        if (results.isEmpty()) {
            resultRows.addView(Brand.text(this, 13f, colors.muted).apply { setText(R.string.ftx_no_results) })
            return
        }
        for (message in results) {
            val utc = if (message.frameStartUtcMillis > 0) clockFormat.format(Instant.ofEpochMilli(message.frameStartUtcMillis)) else "--:--:--"
            resultRows.addView(Brand.text(this, 13f, colors.text).apply {
                typeface = Typeface.MONOSPACE
                text = String.format(Locale.ROOT, "%s %+4d %+5.1f %4d  %s%s", utc, Math.round(message.snrDb),
                    message.timeOffsetSeconds, Math.round(message.audioHz), message.text,
                    message.apTag?.let { " $it" } ?: "")
            })
        }
    }

    private fun addResults(batch: List<DecodedMessage>) {
        results.addAll(0, batch)
        while (results.size > MAX_ROWS) results.removeAt(results.lastIndex)
        renderResults()
    }

    private fun ui(action: () -> Unit) = runOnUiThread { if (!isDestroyed) action() }

    // --- Receive from the audio input ---

    private fun refreshInputs() {
        val manager = getSystemService(AUDIO_SERVICE) as? AudioManager
        inputs = FtxMicrophone.inputs(manager)
        val names = listOf(getString(R.string.ftx_input_auto)) + inputs.map { device ->
            val usb = if (device.type == AudioDeviceInfo.TYPE_USB_DEVICE || device.type == AudioDeviceInfo.TYPE_USB_HEADSET) " (USB)" else ""
            (device.productName?.toString()?.takeIf { it.isNotBlank() } ?: "#${device.id}") + usb
        }
        inputSpinner.adapter = adapterOf(names)
    }

    private fun startListening() {
        if (!foreground || receiver != null || txActive) return
        if (codecs.decoder(mode) == null) return
        if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(arrayOf(Manifest.permission.RECORD_AUDIO), REQUEST_PERMISSION)
            return
        }
        val device = inputs.getOrNull(inputSpinner.selectedItemPosition - 1)
        val token = ++generation
        val rx = FtxReceiver(mode, codecs, { inputFactory(device) }, object : FtxReceiver.Listener {
            override fun listening(inputRate: Int) = ui {
                if (token == generation) rxStatus.text = getString(R.string.ftx_rx_listening, mode.label, inputRate)
            }
            override fun decoded(slotStartUtcMs: Long, messages: List<DecodedMessage>) = ui {
                if (token != generation) return@ui
                addResults(messages)
                rxStatus.text = getString(R.string.ftx_rx_slot_done, slotText(slotStartUtcMs), messages.size)
            }
            override fun skipped(slotStartUtcMs: Long) = ui {
                if (token == generation) rxStatus.text = getString(R.string.ftx_rx_skipped, slotText(slotStartUtcMs))
            }
            override fun failed(text: UiText) = ui {
                if (token == generation) rxStatus.text = getString(R.string.ftx_rx_failed, text.resolve(this@FtxActivity))
            }
            override fun finished() = ui {
                if (token == generation) { receiver = null; refresh() }
            }
        }, clock) { ap }
        receiver = rx
        rxStatus.setText(R.string.ftx_rx_starting)
        refresh()
        rx.start()
    }

    private fun slotText(utcMs: Long) = clockFormat.format(Instant.ofEpochMilli(utcMs))

    private fun stopListening(announce: Boolean) {
        val rx = receiver ?: return
        receiver = null
        generation++
        rx.stop()
        if (announce) rxStatus.setText(R.string.ftx_rx_stopped)
        refresh()
    }

    @Deprecated("Platform callback")
    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == REQUEST_PERMISSION && foreground) rxStatus.setText(
            if (grantResults.firstOrNull() == PackageManager.PERMISSION_GRANTED) R.string.ftx_perm_ready else R.string.ftx_perm_denied)
    }

    // --- Files ---

    private fun chooseWav() {
        if (busy) return
        startActivityForResult(Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
            addCategory(Intent.CATEGORY_OPENABLE); type = "audio/*"
        }, REQUEST_OPEN)
    }

    private fun chooseSaveWav() {
        if (busy) return
        val message = FtxMessages.normalize(messageField.text.toString())
        val toneHz = try { FtxCodecs.parseTone(mode, toneField.text.toString()) } catch (error: IllegalArgumentException) { return }
        if (FtxMessages.problem(message) != null) return
        pendingSave = SaveRequest(mode, message, toneHz)
        startActivityForResult(Intent(Intent.ACTION_CREATE_DOCUMENT).apply {
            addCategory(Intent.CATEGORY_OPENABLE); type = "audio/wav"
            putExtra(Intent.EXTRA_TITLE, "bricohams-${mode.label.lowercase(Locale.ROOT)}.wav")
        }, REQUEST_SAVE)
    }

    @Deprecated("Platform callback")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode != REQUEST_OPEN && requestCode != REQUEST_SAVE) return
        val uri = data?.data
        if (resultCode != RESULT_OK || uri == null) {
            rxStatus.setText(R.string.ftx_cancelled)
            return
        }
        busy = true
        refresh()
        if (requestCode == REQUEST_OPEN) {
            val selected = mode
            val context = ap
            rxStatus.setText(R.string.ftx_wav_working)
            worker.execute {
                try {
                    val bytes = contentResolver.readDocument(uri, MAX_WAV_BYTES)
                    val audio = WavIo.read(ByteArrayInputStream(bytes))
                    val found = codecs.decodeAudio(selected, audio, context) { DeadlineBudget(System.nanoTime() + 60_000_000_000L) }
                    ui {
                        addResults(found)
                        rxStatus.text = if (found.isEmpty()) getString(R.string.ftx_wav_none) else getString(R.string.ftx_wav_done, found.size)
                    }
                } catch (error: Throwable) {
                    if (error is Error && error !is OutOfMemoryError) throw error
                    val text = FtxCodecs.errorText(error).resolve(this)
                    ui { rxStatus.text = getString(R.string.ftx_wav_error, text) }
                } finally {
                    ui { busy = false; refresh() }
                }
            }
        } else {
            val request = pendingSave
            pendingSave = null
            worker.execute {
                try {
                    val snapshot = checkNotNull(request)
                    val audio = codecs.slotAudio(snapshot.mode, snapshot.message, snapshot.toneHz)
                    val stream = contentResolver.openOutputStream(uri, "wt") ?: throw LocalizedIOException(UiText(R.string.err_ftx_no_write_stream))
                    stream.use { WavIo.write(audio, it) }
                    ui { txStatus.text = getString(R.string.ftx_wav_saved, snapshot.mode.slotSecondsText) }
                } catch (error: Throwable) {
                    if (error is Error && error !is OutOfMemoryError) throw error
                    val text = FtxCodecs.errorText(error).resolve(this)
                    ui { txStatus.text = getString(R.string.ftx_wav_save_error, text) }
                } finally {
                    ui { busy = false; refresh() }
                }
            }
        }
    }

    // --- Transmit ---

    private fun startTransmit() {
        if (!foreground || txActive || receiver != null || busy) return
        val problem = txProblem()
        if (problem != null) {
            txStatus.text = problem.resolve(this)
            return
        }
        val call = checkNotNull(callOrNull())
        getSharedPreferences(RigActivity.PREFERENCES, MODE_PRIVATE).edit()
            .putString(DX_CALL_PREFERENCE, dxField.text.toString().trim().uppercase(Locale.ROOT)).apply()
        val selected = mode
        val message = FtxMessages.normalize(messageField.text.toString())
        val toneHz = FtxCodecs.parseTone(selected, toneField.text.toString())
        val player = FtxTransmitter(clock)
        transmitter = player
        txActive = true
        refresh()
        txWorker.execute {
            try {
                val samples = FtxCodecs.pcm16(codecs.frame(selected, message, toneHz))
                var shown = -1L
                player.send(samples, FtxCodecs.RATE, selected.slotMs, sinkFactory(), leadMs = selected.leadMs, waiting = { left ->
                    if (left / 250 != shown) {
                        shown = left / 250
                        ui { txStatus.text = getString(R.string.ftx_tx_waiting, left / 1000.0) }
                    }
                }, sending = {
                    ui { txStatus.text = getString(R.string.ftx_tx_sending, selected.label, samples.size * 1.0 / FtxCodecs.RATE) }
                })
                ui { txStatus.setText(R.string.ftx_tx_done) }
            } catch (error: Throwable) {
                if (error is Error && error !is OutOfMemoryError) throw error
                val text = FtxCodecs.errorText(error)
                ui {
                    txStatus.text = if (text.id == R.string.err_ftx_tx_cancelled) text.resolve(this)
                    else getString(R.string.ftx_tx_error, text.resolve(this))
                }
            } finally {
                ui { txActive = false; transmitter = null; refresh() }
            }
        }
    }

    // --- Lifecycle: foreground only ---

    override fun onResume() {
        super.onResume()
        foreground = true
        refreshInputs()
        handler.removeCallbacks(tick)
        handler.post(tick)
    }

    override fun onPause() {
        foreground = false
        handler.removeCallbacks(tick)
        stopListening(true)
        transmitter?.cancel()
        super.onPause()
    }

    override fun onDestroy() {
        handler.removeCallbacks(tick)
        receiver?.stop()
        transmitter?.cancel()
        worker.shutdownNow()
        txWorker.shutdownNow()
        super.onDestroy()
    }
}
