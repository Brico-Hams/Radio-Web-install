package org.bricohams.radio

import android.Manifest
import android.app.AlertDialog
import android.app.PendingIntent
import android.content.ActivityNotFoundException
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.SharedPreferences
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Typeface
import android.hardware.usb.UsbDevice
import android.hardware.usb.UsbManager
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.speech.tts.TextToSpeech
import android.text.InputFilter
import android.text.InputType
import android.view.View
import android.view.ViewGroup
import android.view.WindowInsets
import android.widget.AdapterView
import android.widget.ArrayAdapter
import android.widget.Button
import android.widget.CheckBox
import android.widget.EditText
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.RadioButton
import android.widget.RadioGroup
import android.widget.ScrollView
import android.widget.SeekBar
import android.widget.Spinner
import android.widget.TextView
import org.bricohams.digital.AcarsCodec
import org.bricohams.digital.CodecException
import org.bricohams.digital.WavIo
import org.bricohams.digital.WorkBudget
import org.json.JSONArray
import org.json.JSONException
import java.io.IOException
import java.math.BigDecimal
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale
import java.util.concurrent.CancellationException
import java.util.concurrent.Executors
import java.util.concurrent.Future
import java.util.concurrent.TimeUnit

/**
 * CAT screen for several radios (Yaesu FT-817/857/897, Icom IC-705, Yaesu FTX-1, (tr)uSDX), over USB. All radio I/O runs on
 * [worker] (commands, satellite tracking) or [txWorker] (SSTV transmission, so Stop TX never waits behind a command);
 * [audioWorker] receives. The UI thread only renders and the radio is never polled in the background except while a
 * satellite is tracked (the optional S-meter / TX status are read then, on Read and after connecting). The manifest declares
 * configChanges so rotation does not drop the USB connection.
 */
class RigActivity : LocalizedActivity() {
    companion object {
        const val EXTRA_PLAN = "rig-plan"
        const val EXTRA_TRANSMITTERS = "rig-transmitters"
        private const val USB_PERMISSION = "org.bricohams.radio.RIG_USB_PERMISSION"
        internal const val PREFERENCES = "rig-cat"
        private const val PREF_SPEAK = "speak"
        private const val PICK_IMAGE = 72
        private const val AUDIO_PERMISSION = 73
        private const val SAVE_ACARS_WAV = 74
        private const val MAX_TX_MS = 110_000L
        private const val STALL_MS = 2_000L
        private const val MAX_CHANNELS = 100
        private const val DEFAULT_ADDRESS = 0xA4
        private val FTX_METERS = listOf("S-MAIN", "S-SUB", "COMP", "ALC", "PO", "SWR", "IDD", "VDD")
    }

    private val colors by lazy { Brand.Palette(this) }
    private val worker = Executors.newSingleThreadScheduledExecutor()
    private val txWorker = Executors.newSingleThreadExecutor()
    private val audioWorker = Executors.newSingleThreadExecutor()
    private val mainHandler = Handler(Looper.getMainLooper())
    private val manager by lazy { getSystemService(USB_SERVICE) as UsbManager }
    private val models = RigModel.values()
    private val rigModes = RigMode.values()
    /** Modes that fit the 110 s transmit cap. */
    private val transmitModes = SstvModes.ALL.filter { Sstv.durationSeconds(it) * 1000 <= MAX_TX_MS }
    private val controls = ArrayList<Button>()
    private lateinit var preferences: SharedPreferences
    private lateinit var status: TextView
    private lateinit var notice: TextView
    private lateinit var modelSpinner: Spinner
    private lateinit var baud: EditText
    private lateinit var address: EditText
    private lateinit var frequency: EditText
    private lateinit var modeSpinner: Spinner
    private lateinit var chooseButton: Button
    private lateinit var digMode: Spinner
    private lateinit var digBand: Spinner
    private lateinit var digPeriod: Spinner
    private lateinit var digClock: TextView
    private lateinit var digWarning: TextView
    private lateinit var setVfoB: Button
    private lateinit var meterCard: LinearLayout
    private lateinit var meterBar: ProgressBar
    private lateinit var meterText: TextView
    private lateinit var txText: TextView
    private lateinit var powerText: TextView
    private lateinit var powerSeek: SeekBar
    private lateinit var dataToggle: CheckBox
    private lateinit var ftxCard: LinearLayout
    private lateinit var ftxSide: Spinner
    private lateinit var ftxBand: Spinner
    private lateinit var ftxStatus: TextView
    private var meterSync = false
    private var powerTouch = false
    private lateinit var memFrom: EditText
    private lateinit var speakToggle: CheckBox
    private var speech: TextToSpeech? = null
    private var speechReady = false
    private var speakRunnable = Runnable { }
    private var announcedKey = ""
    private var lastSpoken = Long.MIN_VALUE / 2
    private lateinit var memTo: EditText
    private lateinit var memoriesButton: Button
    private lateinit var newMemoryButton: Button
    private var lastMemories: List<RigMemory> = emptyList()
    private var satMode = RigMode.USB
    private lateinit var stopMemories: Button
    private lateinit var memStatus: TextView
    private lateinit var memList: LinearLayout
    private lateinit var satStatus: TextView
    private lateinit var callsign: TextView
    private lateinit var sstvModeSpinner: Spinner
    private lateinit var sstvStatus: TextView
    private lateinit var picture: ImageView
    private lateinit var stopTx: Button
    private lateinit var stopReceive: Button
    private lateinit var acarsSpinner: Spinner
    private lateinit var acarsStatus: TextView
    private lateinit var acarsMessages: TextView
    private lateinit var acarsToggle: Button
    private val acarsLog = AcarsLog()
    @Volatile private var acarsActive = false
    @Volatile private var acarsStop = false
    private var downEdit: EditText? = null
    private var upEdit: EditText? = null
    private var stepEdit: EditText? = null
    private var lastModel = RigModel.FT817
    private var chosen: UsbDevice? = null
    private var reconnectTo: Pair<Int, Int>? = null
    private var chosenPort = 0
    private var chosenLabel = ""
    private var profileDeviceTried = false
    private var digShown = false
    private var digShownMode: DigitalMode? = null
    private var digShownModel: RigModel? = null
    private var digBands: List<Long> = emptyList()
    private var requested: UsbDevice? = null
    private var awaitingPermission = false
    private var pickingImage = false
    private var pendingAudio: (() -> Unit)? = null
    private var selectedPlan: SatellitePlan? = null
    private var capture: LiveAudio? = null
    private var identity = ""
    /** Serial rate of the open link; the (tr)uSDX audio stream needs 115200 bps. */
    @Volatile private var linkBaud = 0
    // Measured on a real (tr)uSDX: at 38400 bps the link carries ~3840 samples/s, far below the 11520 Hz TX / 7825 Hz RX stream.
    private fun audioStream(r: Rig?): TruSdxRig? = (r as? TruSdxRig)?.takeIf { linkBaud >= 115200 }
    // Worker-thread state.
    private var tracker: RigTracker? = null
    @Volatile private var trackingUplink = false
    private var trackingStarted = false
    private var orbit: SatelliteOrbit? = null
    @Volatile private var rig: Rig? = null
    @Volatile private var transport: RadioBytes? = null
    @Volatile private var session: Any? = null
    @Volatile private var busy = false
    @Volatile private var txActive = false
    @Volatile private var rxActive = false
    @Volatile private var foreground = false
    @Volatile private var generation = 0
    @Volatile private var txCancel = false
    @Volatile private var rxStop = false
    @Volatile private var memoryCancel = false
    @Volatile private var pttHeld = false
    @Volatile private var txFuture: Future<*>? = null
    @Volatile private var rxFuture: Future<*>? = null
    private val idle get() = !busy && !txActive && !rxActive && session == null

    private val detachReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            @Suppress("DEPRECATION")
            val device = intent.getParcelableExtra<UsbDevice>(UsbManager.EXTRA_DEVICE)
            if (intent.action == UsbManager.ACTION_USB_DEVICE_DETACHED && device?.deviceName == chosen?.deviceName) {
                reconnectTo = device?.let { it.vendorId to it.productId }
                chosen = null
                suspendConnection(getString(R.string.cat_usb_detached))
            }
        }
    }
    /** Auto-reconnect: the same adapter plugged back in (cable wobble, radio power cycle) reopens the link by itself. */
    private val attachReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            @Suppress("DEPRECATION")
            val device = intent.getParcelableExtra<UsbDevice>(UsbManager.EXTRA_DEVICE) ?: return
            val wanted = reconnectTo
            if (intent.action != UsbManager.ACTION_USB_DEVICE_ATTACHED || wanted == null || !foreground || !idle) return
            if (device.vendorId != wanted.first || device.productId != wanted.second ||
                SerialRadio.description(device) == null) return
            reconnectTo = null
            chosen = device
            notice.setText(R.string.rig_usb_reattached)
            requestUsbPermission(device)
        }
    }
    private val digitalTick = object : Runnable {
        override fun run() {
            updateDigital()
            mainHandler.postDelayed(this, 250)
        }
    }
    private val permissionReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            if (intent.action != USB_PERMISSION) return
            @Suppress("DEPRECATION")
            val device = intent.getParcelableExtra<UsbDevice>(UsbManager.EXTRA_DEVICE)
            if (device == null || device.deviceName != requested?.deviceName) {
                notice.setText(R.string.cat_stale_permission)
                return
            }
            awaitingPermission = false
            if (manager.hasPermission(device)) connect(device) else notice.setText(R.string.cat_permission_denied)
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        preferences = getSharedPreferences(PREFERENCES, MODE_PRIVATE)
        val body = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            val padding = Brand.dp(this@RigActivity, 16)
            setPadding(padding, padding, padding, padding)
        }
        val scroll = ScrollView(this).apply {
            setBackgroundColor(colors.background)
            addView(body)
            setOnApplyWindowInsetsListener { view, insets ->
                if (Build.VERSION.SDK_INT >= 30) {
                    val bars = insets.getInsets(WindowInsets.Type.systemBars())
                    view.setPadding(bars.left, bars.top, bars.right, bars.bottom)
                } else {
                    @Suppress("DEPRECATION")
                    view.setPadding(insets.systemWindowInsetLeft, insets.systemWindowInsetTop,
                        insets.systemWindowInsetRight, insets.systemWindowInsetBottom)
                }
                insets
            }
        }
        body.addView(BrandUi.sectionHeader(this, getString(R.string.rig_title), getString(R.string.screen_help_rig), large = true))
        BrandUi.firstRunTip(this, "screen_rig", getString(R.string.screen_help_rig))?.let { body.addView(it) }
        status = live(Brand.text(this, 15f)).apply { setText(R.string.rig_disconnected) }
        body.addView(Brand.card(this).apply { addView(status) })
        notice = live(Brand.text(this, 14f, colors.accent))
        body.addView(notice)
        body.addView(Brand.text(this, 13f, colors.muted).apply { setText(R.string.rig_intro) })
        memStatus = live(Brand.text(this, 14f, colors.accent))
        satStatus = live(Brand.text(this, 14f, colors.accent))
        sstvStatus = live(Brand.text(this, 14f, colors.accent))
        buildRadio(body)
        buildFrequency(body)
        buildMeters(body)
        buildFtx1(body)
        buildDigital(body)
        buildMemories(body)
        buildSatellite(body)
        buildSstv(body)
        buildAcars(body)
        setContentView(scroll)
        updateControls()
    }

    private fun live(view: TextView) = view.apply { accessibilityLiveRegion = View.ACCESSIBILITY_LIVE_REGION_POLITE }

    private fun section(body: LinearLayout, title: Int, build: (LinearLayout) -> Unit) {
        val card = Brand.card(this)
        val help = when (title) {
            R.string.rig_section_radio -> R.string.rig_help_radio
            R.string.rig_section_frequency -> R.string.rig_help_frequency
            R.string.rig_section_meter -> R.string.rig_help_meters
            R.string.rig_section_ftx1 -> R.string.rig_help_ftx1
            R.string.rig_dig_title -> R.string.rig_help_digital
            R.string.rig_section_memories -> R.string.rig_help_memories
            R.string.rig_section_satellite -> R.string.rig_help_satellite
            else -> R.string.rig_help_sstv
        }
        card.addView(BrandUi.sectionHeader(this, getString(title), getString(help)))
        build(card)
        body.addView(card)
    }

    private fun label(parent: LinearLayout, text: Int) =
        parent.addView(Brand.text(this, 13f, colors.muted).apply { setText(text) })

    private fun button(parent: LinearLayout, label: Int, primary: Boolean = false, tracked: Boolean = true, action: () -> Unit): Button =
        Brand.button(this, getString(label), primary, action).also {
            parent.addView(it)
            if (tracked) controls.add(it)
        }

    private fun field(hintRes: Int, initial: String, type: Int) = EditText(this).apply {
        setHint(hintRes)
        setTextColor(colors.text); setHintTextColor(colors.muted)
        inputType = type
        setText(initial)
        layoutParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT)
    }

    private fun adapterOf(items: List<String>) =
        object : ArrayAdapter<String>(this@RigActivity, android.R.layout.simple_spinner_dropdown_item, items) {
            override fun getView(position: Int, convertView: View?, parent: ViewGroup): View =
                super.getView(position, convertView, parent).also { (it as? TextView)?.setTextColor(colors.text) }
            override fun getDropDownView(position: Int, convertView: View?, parent: ViewGroup): View =
                super.getDropDownView(position, convertView, parent).also {
                    (it as? TextView)?.setTextColor(colors.text)
                    it.setBackgroundColor(colors.surfaceHigh)
                }
        }

    private fun spinner(items: List<String>) = Spinner(this).apply {
        adapter = adapterOf(items)
        layoutParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT)
    }

    private val decimal = InputType.TYPE_CLASS_NUMBER or InputType.TYPE_NUMBER_FLAG_DECIMAL

    private fun buildRadio(body: LinearLayout) = section(body, R.string.rig_section_radio) { card ->
        val saved = models.firstOrNull { it.name == preferences.getString("model", null) } ?: RigModel.FT817
        lastModel = saved
        baud = field(R.string.rig_baud_hint, preferences.getInt("baud", saved.defaultBaud).toString(), InputType.TYPE_CLASS_NUMBER)
        address = field(R.string.rig_address_hint, preferences.getString("address", null) ?: "A4",
            InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_FLAG_CAP_CHARACTERS)
        address.visibility = if (saved == RigModel.IC705) View.VISIBLE else View.GONE
        // (tr)uSDX support is credited to its designers, Guido PE1NNZ and Manuel DL2MAN (see ACKNOWLEDGEMENTS.md).
        val credit = Brand.text(this, 13f, colors.muted).apply {
            setText(R.string.rig_trusdx_credit)
            visibility = if (saved == RigModel.TRUSDX) View.VISIBLE else View.GONE
        }
        label(card, R.string.rig_model_label)
        modelSpinner = spinner(models.map { it.label }).apply {
            setSelection(saved.ordinal)
            contentDescription = getString(R.string.rig_model_label)
            onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
                override fun onItemSelected(parent: AdapterView<*>?, view: View?, position: Int, id: Long) {
                    val model = models[position.coerceIn(0, models.lastIndex)]
                    if (model != lastModel) {
                        lastModel = model
                        baud.setText(model.defaultBaud.toString())
                    }
                    address.visibility = if (model == RigModel.IC705) View.VISIBLE else View.GONE
                    credit.visibility = if (model == RigModel.TRUSDX) View.VISIBLE else View.GONE
                }
                override fun onNothingSelected(parent: AdapterView<*>?) {}
            }
        }
        card.addView(modelSpinner)
        card.addView(credit)
        card.addView(baud)
        card.addView(address)
        chooseButton = button(card, R.string.rig_choose_device) { chooseDevice() }
        button(card, R.string.rig_connect, true) { connectPressed() }
        button(card, R.string.rig_disconnect) { operation(notice) { closeRadio(); getString(R.string.usb_disconnected) } }
    }

    private fun buildFrequency(body: LinearLayout) = section(body, R.string.rig_section_frequency) { card ->
        frequency = field(R.string.rig_frequency_hint, "", decimal)
        card.addView(frequency)
        button(card, R.string.rig_set_vfo_a) { setFrequency(Vfo.A) }
        setVfoB = button(card, R.string.rig_set_vfo_b) { setFrequency(Vfo.B) }
        label(card, R.string.rig_mode_label)
        modeSpinner = spinner(rigModes.map { it.name })
        card.addView(modeSpinner)
        button(card, R.string.rig_set_mode) {
            val mode = rigModes[modeSpinner.selectedItemPosition.coerceIn(0, rigModes.lastIndex)]
            val r = rig ?: run { notice.setText(R.string.rig_connect_first); return@button }
            operation(notice) { r.setMode(mode); refresh(r); null }
        }
        button(card, R.string.rig_read) {
            val r = rig ?: run { notice.setText(R.string.rig_connect_first); return@button }
            operation(notice) { refresh(r); null }
        }
        button(card, R.string.rig_ptt_test) { pttTest() }
        speakToggle = CheckBox(this).apply {
            setText(R.string.rig_speak)
            setTextColor(colors.text)
            isChecked = preferences.getBoolean(PREF_SPEAK, false)
            setOnCheckedChangeListener { _, on ->
                preferences.edit().putBoolean(PREF_SPEAK, on).apply()
                if (on) ensureSpeech() else { speech?.stop(); frequency.contentDescription = null }
            }
        }
        card.addView(speakToggle)
        if (speakToggle.isChecked) ensureSpeech()
    }

    private fun buildMeters(body: LinearLayout) = section(body, R.string.rig_section_meter) { card ->
        meterCard = card
        meterText = live(Brand.text(this, 14f, colors.text))
        meterBar = ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal).apply {
            max = 255
            contentDescription = getString(R.string.rig_signal_label)
        }
        txText = live(Brand.text(this, 14f, colors.text))
        powerText = Brand.text(this, 14f, colors.text)
        powerSeek = SeekBar(this).apply {
            max = 255
            contentDescription = getString(R.string.rig_power_label)
            setOnSeekBarChangeListener(object : SeekBar.OnSeekBarChangeListener {
                override fun onProgressChanged(bar: SeekBar, progress: Int, fromUser: Boolean) {
                    powerText.text = getString(R.string.rig_power_value, progress * 100 / 255)
                    if (fromUser && !powerTouch) applyPower(progress) // accessibility actions change the value without a touch
                }
                override fun onStartTrackingTouch(bar: SeekBar) { powerTouch = true }
                override fun onStopTrackingTouch(bar: SeekBar) { powerTouch = false; applyPower(bar.progress) }
            })
        }
        dataToggle = CheckBox(this).apply {
            setText(R.string.rig_data_mode)
            setTextColor(colors.text)
            setOnCheckedChangeListener { _, on -> if (!meterSync) applyDataMode(on) }
        }
        card.addView(meterText)
        card.addView(meterBar)
        card.addView(txText)
        card.addView(powerText)
        card.addView(powerSeek)
        card.addView(dataToggle)
        card.visibility = View.GONE
    }

    private fun applyPower(level: Int) {
        val r = rig ?: run { notice.setText(R.string.rig_connect_first); return }
        operation(notice) { r.setRfPower(level); null }
    }

    /** FTX-1 only: receive controls, meters and filters. Every write is range-checked, sent, and read back by [Ftx1Rig]. */
    private fun buildFtx1(body: LinearLayout) = section(body, R.string.rig_section_ftx1) { card ->
        ftxCard = card
        label(card, R.string.rig_ftx_side)
        ftxSide = spinner(listOf("MAIN", "SUB"))
        card.addView(ftxSide)
        ftxStatus = live(Brand.text(this, 14f, colors.accent))
        card.addView(ftxStatus)
        val signed = InputType.TYPE_CLASS_NUMBER or InputType.TYPE_NUMBER_FLAG_SIGNED
        numberRow(card, R.string.rig_ftx_af, InputType.TYPE_CLASS_NUMBER) { r, side, v -> r.setAfGain(side, v) }
        numberRow(card, R.string.rig_ftx_rf, InputType.TYPE_CLASS_NUMBER) { r, side, v -> r.setRfGain(side, v) }
        numberRow(card, R.string.rig_ftx_sql, InputType.TYPE_CLASS_NUMBER) { r, side, v -> r.setSquelch(side, v) }
        numberRow(card, R.string.rig_ftx_width, InputType.TYPE_CLASS_NUMBER) { r, side, v -> r.setWidth(side, v) }
        numberRow(card, R.string.rig_ftx_ifshift, signed) { r, side, v -> r.setIfShift(side, v) }
        numberRow(card, R.string.rig_ftx_agc, InputType.TYPE_CLASS_NUMBER) { r, side, v -> r.setAgc(side, v) }
        label(card, R.string.rig_ftx_band)
        ftxBand = spinner(listOf("HF/50", "VHF", "UHF"))
        card.addView(ftxBand)
        numberRow(card, R.string.rig_ftx_preamp, InputType.TYPE_CLASS_NUMBER, { ftxBand.selectedItemPosition.coerceIn(0, 2) }) { r, band, v -> r.setPreamp(band, v) }
        numberRow(card, R.string.rig_ftx_nl, InputType.TYPE_CLASS_NUMBER) { r, side, v -> r.setNoiseBlanker(side, v) }
        numberRow(card, R.string.rig_ftx_rl, InputType.TYPE_CLASS_NUMBER) { r, side, v -> r.setNoiseReduction(side, v) }
        numberRow(card, R.string.rig_ftx_notch_freq, InputType.TYPE_CLASS_NUMBER) { r, side, v -> r.setManualNotchFrequency(side, v) }
        numberRow(card, R.string.rig_ftx_clar_offset, signed) { r, side, v -> r.setClarifierOffset(side, v) }
        numberRow(card, R.string.rig_ftx_keyspeed, InputType.TYPE_CLASS_NUMBER) { r, _, v -> r.setKeySpeed(v) }
        onOffRow(card, R.string.rig_ftx_att) { r, _, on -> r.setAttenuator(on) }
        onOffRow(card, R.string.rig_ftx_bc) { r, side, on -> r.setAutoNotch(side, on) }
        onOffRow(card, R.string.rig_ftx_notch) { r, side, on -> r.setManualNotch(side, on) }
        onOffRow(card, R.string.rig_ftx_na) { r, side, on -> r.setNarrow(side, on) }
        onOffRow(card, R.string.rig_ftx_clar) { r, side, on -> r.setClarifier(side, on, on) }
        onOffRow(card, R.string.rig_ftx_lock) { r, _, on -> r.setLock(on) }
        button(card, R.string.rig_ftx_meters) {
            val r = rig as? Ftx1Rig ?: run { notice.setText(R.string.rig_connect_first); return@button }
            operation(ftxStatus) { (1..8).joinToString("\n") { "RM$it ${FTX_METERS[it - 1]}: ${r.meter(it)}" } }
        }
        card.visibility = View.GONE
    }

    private fun ftxSideIndex() = ftxSide.selectedItemPosition.coerceIn(0, 1)

    private fun numberRow(card: LinearLayout, title: Int, type: Int, sideOf: () -> Int = ::ftxSideIndex, apply: (Ftx1Rig, Int, Int) -> Unit) {
        label(card, title)
        val input = field(title, "", type)
        card.addView(input)
        button(card, R.string.rig_ftx_set) {
            val r = rig as? Ftx1Rig ?: run { notice.setText(R.string.rig_connect_first); return@button }
            val value = input.text.toString().trim().toIntOrNull() ?: run { notice.setText(R.string.rig_ftx_invalid); return@button }
            val side = sideOf()
            operation(notice) { apply(r, side, value); getString(R.string.rig_ftx_done) }
        }
    }

    private fun onOffRow(card: LinearLayout, title: Int, apply: (Ftx1Rig, Int, Boolean) -> Unit) {
        label(card, title)
        for ((text, on) in listOf(R.string.rig_ftx_off to false, R.string.rig_ftx_on to true)) {
            button(card, text) {
                val r = rig as? Ftx1Rig ?: run { notice.setText(R.string.rig_connect_first); return@button }
                val side = ftxSideIndex()
                operation(notice) { apply(r, side, on); getString(R.string.rig_ftx_done) }
            }
        }
    }

    private fun applyDataMode(on: Boolean) {
        val r = rig ?: run { notice.setText(R.string.rig_connect_first); return }
        operation(notice) { r.setDataMode(on); null }
    }

    /** Shows only what the connected radio supports. */
    private fun updateMeterCard(r: Rig?) {
        val any = r != null && (r.supportsMeter || r.supportsTxStatus || r.supportsRfPower || r.supportsDataMode)
        meterCard.visibility = if (any) View.VISIBLE else View.GONE
        val show = { on: Boolean? -> if (on == true) View.VISIBLE else View.GONE }
        meterText.visibility = show(r?.supportsMeter)
        meterBar.visibility = show(r?.supportsMeter)
        txText.visibility = show(r?.supportsTxStatus)
        powerText.visibility = show(r?.supportsRfPower)
        powerSeek.visibility = show(r?.supportsRfPower)
        dataToggle.visibility = show(r?.supportsDataMode)
        powerSeek.isEnabled = idle
        dataToggle.isEnabled = idle
    }

    /** Worker thread: reads the optional extras; a failed read leaves that value as it was. */
    private fun readMeters(r: Rig, settings: Boolean) {
        var signal: Int? = null
        var tx: Boolean? = null
        var power: Int? = null
        var data: Boolean? = null
        if (r.supportsMeter) attempt<Unit>({ }) { signal = r.signalLevel() }
        if (r.supportsTxStatus) attempt<Unit>({ }) { tx = r.isTransmitting() }
        if (settings && r.supportsRfPower) attempt<Unit>({ }) { power = r.rfPower() }
        if (settings && r.supportsDataMode) attempt<Unit>({ }) { data = r.dataModeOn() }
        val s = signal
        val t = tx
        val p = power
        val d = data
        runOnUiThread { if (!isDestroyed && rig === r) showMeters(s, t, p, d) }
    }

    private fun showMeters(signal: Int?, tx: Boolean?, power: Int?, data: Boolean?) {
        signal?.let {
            meterBar.progress = it
            meterText.text = getString(R.string.rig_signal_value, it)
            meterBar.contentDescription = meterText.text
        }
        tx?.let { txText.setText(if (it) R.string.rig_tx_tx else R.string.rig_tx_rx) }
        meterSync = true
        power?.let {
            powerSeek.progress = it
            powerText.text = getString(R.string.rig_power_value, it * 100 / 255)
        }
        data?.let { dataToggle.isChecked = it }
        meterSync = false
    }

    private fun ensureSpeech() {
        if (speech != null) return
        speech = TextToSpeech(this) { code ->
            speechReady = code == TextToSpeech.SUCCESS
            if (speechReady) speech?.language = resources.configuration.locales.get(0)
        }
    }

    /** UI thread: speaks and exposes to TalkBack the new frequency / mode (and S-meter), at most once every [RigSpeech.MIN_GAP_MS]. */
    private fun announce(hz: Long, mode: String?, signal: Int?) {
        if (!speakToggle.isChecked) return
        val key = "$hz/$mode"
        if (key == announcedKey) return
        val text = RigSpeech.text(hz, mode, signal, resources.configuration.locales.get(0),
            getString(R.string.rig_speak_mhz), getString(R.string.rig_speak_signal))
        frequency.contentDescription = text
        mainHandler.removeCallbacks(speakRunnable)
        val wait = lastSpoken + RigSpeech.MIN_GAP_MS - SystemClock.elapsedRealtime()
        speakRunnable = Runnable {
            if (isDestroyed || !speakToggle.isChecked) return@Runnable
            announcedKey = key
            lastSpoken = SystemClock.elapsedRealtime()
            frequency.announceForAccessibility(text)
            if (speechReady) speech?.speak(text, TextToSpeech.QUEUE_FLUSH, null, "rig-announce")
        }
        if (wait <= 0) speakRunnable.run() else mainHandler.postDelayed(speakRunnable, wait)
    }

    private val digitalModes = DigitalMode.values()
    private val utcClock = DateTimeFormatter.ofPattern("HH:mm:ss", Locale.ROOT).withZone(java.time.ZoneOffset.UTC)

    private fun periodText(ms: Long) = if (ms % 1000 == 0L) "${ms / 1000} s" else String.format(Locale.ROOT, "%.1f s", ms / 1000.0)

    private fun selectedDigital() = digitalModes[digMode.selectedItemPosition.coerceIn(0, digitalModes.lastIndex)]

    private fun buildDigital(body: LinearLayout) = section(body, R.string.rig_dig_title) { card ->
        label(card, R.string.rig_dig_mode_label)
        digMode = spinner(digitalModes.map { it.label + " · " + getString(it.purpose) })
        card.addView(digMode)
        label(card, R.string.rig_dig_band_label)
        digBand = spinner(emptyList())
        card.addView(digBand)
        label(card, R.string.rig_dig_period_label)
        digPeriod = spinner(emptyList())
        card.addView(digPeriod)
        button(card, R.string.rig_dig_tune, true) {
            val r = rig ?: run { notice.setText(R.string.rig_connect_first); return@button }
            val hz = digBands.getOrNull(digBand.selectedItemPosition) ?: return@button
            operation(notice) { r.checkTunable(Vfo.A, hz); r.setFrequency(Vfo.A, hz); r.setMode(Vfo.A, dataMode(r.model)); refresh(r); null }
        }
        // Not a live region: it changes every 250 ms and would flood TalkBack.
        digClock = Brand.text(this, 14f, colors.accent)
        digWarning = Brand.text(this, 13f, colors.accent).apply { setText(R.string.rig_dig_time_warning) }
        card.addView(digClock)
        card.addView(digWarning)
        button(card, R.string.rig_dig_release) {
            operation(notice) { closeRadio(); getString(R.string.rig_dig_released) }
        }
        button(card, R.string.rig_open_ftx, tracked = false) { startActivity(Intent(this, FtxActivity::class.java)) }
        updateDigital()
    }

    /** UI thread, every 250 ms: refreshes the band and period lists when the mode or radio changed, then the UTC clock line. */
    private fun updateDigital() {
        val mode = selectedDigital()
        val model = rig?.model
        if (!digShown || mode != digShownMode || model != digShownModel) {
            val modeChanged = !digShown || mode != digShownMode
            digShown = true; digShownMode = mode; digShownModel = model
            val kept = digBands.getOrNull(digBand.selectedItemPosition)
            digBands = if (model != null) DigitalFrequencies.forRig(mode, model) else DigitalFrequencies.table.getValue(mode)
            digBand.adapter = adapterOf(digBands.map { DigitalFrequencies.bandLabel(it) + " · " + mhzText(it) + " MHz" })
            digBands.indexOf(kept).takeIf { it >= 0 }?.let { digBand.setSelection(it) }
            if (modeChanged) {
                digPeriod.adapter = adapterOf(mode.periodsMs.map(::periodText))
                digPeriod.setSelection(mode.periodsMs.indexOf(mode.defaultPeriodMs).coerceAtLeast(0))
            }
        }
        val period = mode.periodsMs.getOrElse(digPeriod.selectedItemPosition) { mode.defaultPeriodMs }
        val now = System.currentTimeMillis()
        digClock.text = getString(R.string.rig_dig_clock, utcClock.format(Instant.ofEpochMilli(now)), mode.label,
            DigitalClock.msToNextSlot(now, period) / 1000.0,
            getString(if (DigitalClock.isEvenSlot(now, period)) R.string.rig_dig_even else R.string.rig_dig_odd))
        val autoTime = android.provider.Settings.Global.getInt(contentResolver, android.provider.Settings.Global.AUTO_TIME, 1)
        digWarning.visibility = if (autoTime == 0) View.VISIBLE else View.GONE
    }

    private fun buildMemories(body: LinearLayout) = section(body, R.string.rig_section_memories) { card ->
        memFrom = field(R.string.rig_mem_from_hint, "1", InputType.TYPE_CLASS_NUMBER)
        memTo = field(R.string.rig_mem_to_hint, "20", InputType.TYPE_CLASS_NUMBER)
        card.addView(memFrom)
        card.addView(memTo)
        memoriesButton = button(card, R.string.rig_read_memories, tracked = false) { readMemories() }
        newMemoryButton = button(card, R.string.rig_mem_new, tracked = false) {
            val limits = channelLimits(rig?.model ?: RigModel.FTX1)
            showMemoryEditor(firstFreeChannel(limits), "", RigMode.FM, "", "", memStatus)
        }
        stopMemories = button(card, R.string.rig_stop, tracked = false) { memoryCancel = true }
        card.addView(memStatus)
        memList = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        card.addView(memList)
    }

    private fun buildSatellite(body: LinearLayout) {
        val planText = intent.getStringExtra(EXTRA_PLAN) ?: return
        section(body, R.string.rig_section_satellite) { card ->
            try {
                val plan = SatellitePlanJson.decode(planText)
                selectedPlan = plan
                val clock = DateTimeFormatter.ofPattern("HH:mm:ss", Locale.ROOT).withZone(ZoneId.systemDefault())
                card.addView(Brand.text(this, 14f).apply {
                    text = getString(R.string.rig_pass_info, plan.tle.name, clock.format(Instant.ofEpochMilli(plan.pass.aos.time)),
                        clock.format(Instant.ofEpochMilli(plan.pass.los.time)), plan.pass.maximum.elevation)
                })
                val list = parseTransmitters(plan.tle.norad)
                val down = field(R.string.rig_downlink_hint, "", decimal)
                val up = field(R.string.rig_uplink_hint, "", decimal)
                val step = field(R.string.rig_step_hint, "100", InputType.TYPE_CLASS_NUMBER)
                downEdit = down; upEdit = up; stepEdit = step
                val group = RadioGroup(this)
                list.forEachIndexed { index, transmitter ->
                    group.addView(RadioButton(this).apply {
                        id = View.generateViewId()
                        tag = index
                        setTextColor(colors.text)
                        buttonTintList = android.content.res.ColorStateList.valueOf(colors.accent)
                        text = transponderText(transmitter)
                        minHeight = Brand.dp(this@RigActivity, 48)
                    })
                }
                group.setOnCheckedChangeListener { _, id ->
                    (group.findViewById<RadioButton>(id)?.tag as? Int)?.let { fillTransponder(list[it]) }
                }
                if (list.isEmpty()) {
                    card.addView(Brand.text(this, 13f, colors.muted).apply { setText(R.string.rig_no_transponders) })
                    down.setText(String.format(Locale.ROOT, "%.6f", plan.downlinkHz / 1e6))
                } else {
                    card.addView(group)
                    val first = list.indexOfFirst { it.downlinkHz == plan.downlinkHz }.takeIf { it >= 0 } ?: 0
                    (group.getChildAt(first) as RadioButton).isChecked = true
                }
                card.addView(down); card.addView(up); card.addView(step)
                button(card, R.string.rig_start_tracking, true) { startTracking() }
                button(card, R.string.rig_stop_tracking, tracked = false) { stopTracking() }
                button(card, R.string.rig_mem_save_sat) { saveTransponder() }
            } catch (error: IllegalArgumentException) {
                card.addView(Brand.text(this, 14f).apply { text = getString(R.string.rig_plan_error, errorText(error)) })
            }
            card.addView(satStatus)
        }
    }

    private fun parseTransmitters(norad: Int): List<Transmitter> {
        val text = intent.getStringExtra(EXTRA_TRANSMITTERS) ?: return emptyList()
        requireUi(text.length <= 65536) { UiText(R.string.err_plan_too_long) }
        try {
            val array = JSONArray(text)
            return (0 until minOf(array.length(), 100)).map { index ->
                val item = array.getJSONObject(index)
                val down = item.getLong("downlinkHz")
                requireUi(down > 0) { UiText(R.string.err_plan_incomplete, "downlinkHz") }
                val up = if (item.has("uplinkHz") && !item.isNull("uplinkHz")) item.getLong("uplinkHz") else null
                Transmitter(norad, item.optString("description", ""), down, item.optString("mode", ""), up, item.optBoolean("invert", false))
            }
        } catch (error: JSONException) {
            throw LocalizedArgumentException(UiText(R.string.err_plan_incomplete, error.message), error)
        }
    }

    private fun transponderText(transmitter: Transmitter): String {
        val inverting = if (transmitter.invert) " " + getString(R.string.rig_inverting) else ""
        val text = if (transmitter.uplinkHz == null)
            getString(R.string.rig_transponder_simplex, mhzText(transmitter.downlinkHz), transmitter.mode, transmitter.description)
        else getString(R.string.rig_transponder_duplex, mhzText(transmitter.downlinkHz), mhzText(transmitter.uplinkHz),
            transmitter.mode, transmitter.description)
        return text + inverting
    }

    private fun fillTransponder(transmitter: Transmitter) {
        downEdit?.setText(String.format(Locale.ROOT, "%.6f", transmitter.downlinkHz / 1e6))
        upEdit?.setText(transmitter.uplinkHz?.let { String.format(Locale.ROOT, "%.6f", it / 1e6) } ?: "")
        stepEdit?.setText(if (transmitter.mode.contains("FM", ignoreCase = true)) "100" else "20")
        satMode = if (transmitter.mode.contains("FM", ignoreCase = true)) RigMode.FM else RigMode.USB
    }

    private fun buildSstv(body: LinearLayout) = section(body, R.string.rig_section_sstv) { card ->
        card.addView(Brand.text(this, 13f, colors.muted).apply { setText(R.string.rig_sstv_help) })
        callsign = Brand.text(this, 15f).apply { text = ProfileStore.describeCallsign(this@RigActivity); contentDescription = text }
        card.addView(callsign)
        label(card, R.string.cat_sstv_mode)
        sstvModeSpinner = spinner(transmitModes.map { it.name })
        card.addView(sstvModeSpinner)
        button(card, R.string.rig_send_image, true) { chooseImage() }
        stopTx = button(card, R.string.rig_stop_tx, tracked = false) { txCancel = true; sstvStatus.setText(R.string.cat_sstv_tx_stopping) }
        button(card, R.string.rig_receive) { startReceive() }
        stopReceive = button(card, R.string.rig_stop_receive, tracked = false) { rxStop = true; capture?.stop() }
        card.addView(sstvStatus)
        picture = ImageView(this).apply { adjustViewBounds = true; contentDescription = getString(R.string.sstv_image_description) }
        card.addView(picture)
    }

    /*
     * ACARS is RECEIVE-ONLY. Transmitting on aeronautical frequencies is illegal for amateur stations, so nothing in this
     * section may call Rig.ptt or play encoder audio to the radio; the encoder is only used for the "Generate test WAV" file.
     */
    private fun buildAcars(body: LinearLayout) = section(body, R.string.rig_section_acars) { card ->
        card.addView(Brand.text(this, 13f, colors.muted).apply { setText(R.string.acars_help) })
        label(card, R.string.acars_channel_label)
        acarsSpinner = spinner(AcarsChannels.ALL.map { channel ->
            getString(R.string.acars_channel_item, mhzText(channel.hz), getString(channel.region.labelRes))
        }).apply { contentDescription = getString(R.string.acars_channel_label) }
        card.addView(acarsSpinner)
        acarsStatus = live(Brand.text(this, 14f, colors.accent))
        button(card, R.string.acars_tune, true) { tuneAcars() }
        acarsToggle = button(card, R.string.acars_start, tracked = false) { toggleAcars() }
        button(card, R.string.acars_generate_wav) { generateAcarsWav() }
        card.addView(acarsStatus)
        acarsMessages = Brand.text(this, 12f).apply {
            typeface = Typeface.MONOSPACE
            setText(R.string.acars_no_messages)
        }
        card.addView(ScrollView(this).apply {
            layoutParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, (240 * resources.displayMetrics.density).toInt())
            isNestedScrollingEnabled = true
            addView(acarsMessages)
        })
    }

    private fun selectedAcarsChannel() =
        AcarsChannels.ALL[acarsSpinner.selectedItemPosition.coerceIn(0, AcarsChannels.ALL.lastIndex)]

    private fun tuneAcars() {
        val r = rig ?: run { acarsStatus.setText(R.string.rig_connect_first); return }
        val channel = selectedAcarsChannel()
        operation(acarsStatus) {
            AcarsChannels.tune(r, channel)
            refresh(r)
            getString(R.string.acars_tuned, mhzText(channel.hz))
        }
    }

    private fun toggleAcars() {
        if (acarsActive) { acarsStop = true; return }
        if (!foreground || rxActive) return
        val channel = selectedAcarsChannel()
        if (!channel.decodable) { acarsStatus.setText(R.string.acars_vdl_not_decodable); return }
        if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            pendingAudio = { toggleAcars() }
            requestPermissions(arrayOf(Manifest.permission.RECORD_AUDIO), AUDIO_PERMISSION)
            return
        }
        val token = generation
        acarsStop = false
        acarsActive = true
        acarsToggle.setText(R.string.acars_stop)
        acarsStatus.setText(R.string.acars_listening)
        audioWorker.execute {
            val failure = try {
                runAcars(channel, token)
                null
            } catch (error: CancellationException) {
                null
            } catch (error: CodecException) {
                if (error.reason == CodecException.Reason.CANCELLED) null else FtxCodecs.errorText(error).resolve(this)
            } catch (error: IOException) {
                errorText(error)
            } catch (error: IllegalStateException) {
                errorText(error)
            } catch (error: IllegalArgumentException) {
                errorText(error)
            }
            runOnUiThread {
                if (token == generation) acarsActive = false
                if (!isDestroyed) {
                    acarsToggle.setText(R.string.acars_start)
                    acarsStatus.text = failure ?: getString(R.string.acars_stopped)
                }
            }
        }
    }

    /** Audio worker: reads the microphone into a rolling buffer until stopped. Receive only. */
    private fun runAcars(channel: AcarsChannel, token: Int) {
        val rolling = AcarsRolling(LiveAudio.SAMPLE_RATE, channel.hz)
        val budget = WorkBudget {
            if (acarsStop || token != generation || Thread.currentThread().isInterrupted) {
                throw CodecException(CodecException.Reason.CANCELLED, "ACARS decoding stopped")
            }
        }
        MicrophoneSource(applicationContext).use { source ->
            source.start()
            try {
                val buffer = ShortArray(4800)
                val samples = FloatArray(buffer.size)
                while (!acarsStop && token == generation && !Thread.currentThread().isInterrupted) {
                    val count = source.read(buffer, buffer.size)
                    if (count <= 0) {
                        if (acarsStop) break
                        throw LocalizedIOException(UiText(R.string.err_mic_no_pcm, count))
                    }
                    for (i in 0 until count) samples[i] = buffer[i] / 32768f
                    val found = rolling.feed(samples, count, budget)
                    if (found.isNotEmpty()) runOnUiThread { if (!isDestroyed) showAcars(found) }
                }
            } finally {
                source.stop()
            }
        }
    }

    private fun showAcars(entries: List<AcarsEntry>) {
        entries.forEach { acarsLog.add(it) }
        val time = DateTimeFormatter.ofPattern("HH:mm:ss", Locale.ROOT).withZone(ZoneId.of("UTC"))
        acarsMessages.text = acarsLog.snapshot().asReversed().joinToString("\n\n") { entry ->
            getString(R.string.acars_entry, time.format(Instant.ofEpochMilli(entry.timeMillis)), mhzText(entry.hz),
                entry.registration, entry.label, entry.flight, entry.text,
                getString(if (entry.crcOk) R.string.acars_crc_ok else R.string.acars_crc_bad))
        }
    }

    /** Test WAV for loopback only; it is saved or shared as a file and never sent to the radio. */
    private fun generateAcarsWav() {
        if (!foreground) return
        pickingImage = true
        try {
            startActivityForResult(Intent(Intent.ACTION_CREATE_DOCUMENT).apply {
                addCategory(Intent.CATEGORY_OPENABLE); type = "audio/wav"
                putExtra(Intent.EXTRA_TITLE, "bricohams-acars-test.wav")
            }, SAVE_ACARS_WAV)
        } catch (error: ActivityNotFoundException) {
            pickingImage = false
            acarsStatus.text = getString(R.string.acars_wav_error, errorText(error))
        }
    }

    private fun saveAcarsWav(uri: android.net.Uri) {
        audioWorker.execute {
            val message = try {
                val audio = AcarsCodec().encode("2|N12345|H1|1|RADICODEX ACARS TEST", 0.0)
                val stream = contentResolver.openOutputStream(uri, "wt") ?: throw LocalizedIOException(UiText(R.string.err_ftx_no_write_stream))
                stream.use { WavIo.write(audio, it) }
                getString(R.string.acars_wav_saved)
            } catch (error: IOException) {
                getString(R.string.acars_wav_error, errorText(error))
            } catch (error: SecurityException) {
                getString(R.string.acars_wav_error, errorText(error))
            } catch (error: CodecException) {
                getString(R.string.acars_wav_error, FtxCodecs.errorText(error).resolve(this))
            }
            runOnUiThread { if (!isDestroyed) acarsStatus.text = message }
        }
    }

    private fun updateControls() {
        val ready = idle
        controls.forEach { it.isEnabled = ready }
        val r = rig
        memoriesButton.isEnabled = ready && r?.supportsMemories != false
        newMemoryButton.isEnabled = ready && r?.supportsMemoryWrite != false
        setVfoB.visibility = if (r != null && !r.supportsVfoB) View.GONE else View.VISIBLE
        stopMemories.isEnabled = busy
        stopTx.isEnabled = txActive
        stopReceive.isEnabled = rxActive
        ftxCard.visibility = if (r is Ftx1Rig) View.VISIBLE else View.GONE
        updateMeterCard(r)
    }

    /** Runs the same catch list as the rest of the CAT code; the callers turn the exception into text. */
    private inline fun <T> attempt(failure: (Exception) -> T, block: () -> T): T = try {
        block()
    } catch (error: IOException) {
        failure(error)
    } catch (error: IllegalArgumentException) {
        failure(error)
    } catch (error: IllegalStateException) {
        failure(error)
    } catch (error: SecurityException) {
        failure(error)
    } catch (error: UnsupportedOperationException) {
        failure(error)
    }

    /** Errors that leave the serial link usable; everything else closes the connection. */
    private fun recoverable(error: Exception) = error is IllegalArgumentException || error is UnsupportedOperationException ||
        (error is LocalizedIOException && isRejected(error)) ||
        (error is LocalizedStateException && error.text.id == R.string.err_rig_unconfirmed)

    private fun fail(error: Exception): String {
        if (recoverable(error)) return errorText(error)
        return try {
            closeRadio()
            getString(R.string.rig_failed_closed, errorText(error))
        } catch (cleanup: IOException) {
            getString(R.string.rig_failed_release, errorText(error), errorText(cleanup))
        }
    }

    /** Runs [action] on the worker; its text (if any) goes to [target]. */
    private fun operation(target: TextView, progress: Int? = null, action: () -> String?) {
        if (!idle || !foreground) return
        busy = true
        progress?.let { target.setText(it) }
        updateControls()
        val token = generation
        worker.execute {
            if (token != generation) return@execute
            val message = attempt({ fail(it) }) { action() }
            runOnUiThread {
                if (token == generation && !isDestroyed) {
                    busy = false
                    if (rig == null) status.setText(R.string.rig_disconnected)
                    message?.let { target.text = it }
                    updateControls()
                }
            }
        }
    }

    /** Worker thread: re-reads the radio and updates the status card. */
    private fun refresh(r: Rig) {
        val current = r.status()
        val lines = ArrayList<String>()
        lines.add(identity)
        lines.add(getString(R.string.rig_vfo_a, mhzText(current.frequencyHz), current.mode?.name ?: "?"))
        if (r.supportsVfoB) {
            attempt<Unit>({ }) { lines.add(getString(R.string.rig_vfo_b, mhzText(r.frequency(Vfo.B)))) }
        }
        // MAIN S-meter (SM0;) only for the FTX-1; a failed read just leaves it out.
        var signal: Int? = null
        if (r is Ftx1Rig) attempt<Unit>({ }) {
            signal = r.signal()
            lines.add(getString(R.string.rig_smeter, signal, RigSpeech.bar(signal!!)))
        }
        val text = lines.joinToString("\n")
        val spoken = signal
        runOnUiThread {
            if (!isDestroyed && rig === r) {
                status.text = text
                updateMeterCard(r)
                announce(current.frequencyHz, current.mode?.name, spoken)
                if (!r.supportsMemories) memStatus.setText(R.string.rig_no_memories)
            }
        }
        readMeters(r, true)
    }

    private fun parseMhz(text: String): Long? {
        val scaled = text.trim().toBigDecimalOrNull()?.movePointRight(6)?.stripTrailingZeros() ?: return null
        if (scaled.scale() > 0 || scaled.signum() <= 0 || scaled > BigDecimal(10_000_000_000L)) return null
        return scaled.longValueExact()
    }

    private fun setFrequency(vfo: Vfo) {
        val r = rig ?: run { notice.setText(R.string.rig_connect_first); return }
        val hz = parseMhz(frequency.text.toString()) ?: run { notice.setText(R.string.rig_invalid_frequency); return }
        operation(notice) { r.setFrequency(vfo, hz); refresh(r); null }
    }

    // USB

    private fun usbEntries() = manager.deviceList.values.filter { SerialRadio.description(it) != null }.sortedBy { it.deviceName }
        .flatMap { device -> (0 until SerialRadio.portCount(device).coerceAtLeast(1)).map { device to it } }

    private fun entryLabel(device: UsbDevice, port: Int): String {
        val description = SerialRadio.description(device) ?: ""
        return if (SerialRadio.portCount(device) > 1)
            getString(R.string.rig_device_entry_port, device.vendorId, device.productId, description, port)
        else getString(R.string.rig_device_entry, device.vendorId, device.productId, description)
    }

    /** Once per screen: reuses the USB device that passed the profile connection test and connects to it. */
    private fun useProfileDevice() {
        profileDeviceTried = true
        val stored = ProfileStore.usbDevice(this) ?: return
        if (ProfileStore.load(this).radio?.rig == null || chosen != null || !idle) return
        val entries = usbEntries()
        val match = UsbIdentity.find(stored, entries.map { (device, port) -> UsbIdentity.of(device, port) })
        val entry = match?.let { entries[entries.indexOfFirst { (d, p) -> UsbIdentity.of(d, p) == it }] }
        if (entry == null) {
            notice.setText(R.string.rig_profile_device_missing)
            chooseDevice()
            return
        }
        chosen = entry.first
        chosenPort = entry.second
        chosenLabel = entryLabel(entry.first, entry.second)
        connectPressed()
        notice.text = getString(R.string.rig_profile_device, chosenLabel)
    }

    private fun chooseDevice() {
        if (!idle) return
        val entries = usbEntries()
        if (entries.isEmpty()) {
            notice.setText(R.string.rig_no_devices)
            return
        }
        val labels = entries.map { (device, port) -> entryLabel(device, port) }
        AlertDialog.Builder(this).setTitle(R.string.usb_select_device)
            .setItems(labels.toTypedArray()) { _, index ->
                chosen = entries[index].first
                chosenPort = entries[index].second
                chosenLabel = labels[index]
                notice.text = getString(R.string.rig_device_selected, chosenLabel)
            }.show()
    }

    private fun parseBaud(): Int? = baud.text.toString().trim().toIntOrNull()?.takeIf { it in 300..4_000_000 }
        ?: run { notice.setText(R.string.rig_invalid_baud); null }

    private fun parseAddress(): Int? = address.text.toString().trim().toIntOrNull(16)?.takeIf { it in 0x01..0xDF }
        ?: run { notice.setText(R.string.rig_invalid_address); null }

    private fun selectedModel() = models[modelSpinner.selectedItemPosition.coerceIn(0, models.lastIndex)]

    private fun connectPressed() {
        if (!idle) return
        val device = chosen ?: run { notice.setText(R.string.rig_choose_first); return }
        val model = selectedModel()
        parseBaud() ?: return
        if (model == RigModel.IC705) parseAddress() ?: return
        requestUsbPermission(device)
    }

    private fun requestUsbPermission(device: UsbDevice) {
        requested = device
        if (manager.hasPermission(device)) { connect(device); return }
        val flags = PendingIntent.FLAG_UPDATE_CURRENT or if (Build.VERSION.SDK_INT >= 31) PendingIntent.FLAG_MUTABLE else 0
        val intent = Intent(USB_PERMISSION).setPackage(packageName)
        try {
            awaitingPermission = true
            manager.requestPermission(device, PendingIntent.getBroadcast(this, 12, intent, flags))
            notice.setText(R.string.cat_waiting_permission)
        } catch (error: SecurityException) {
            awaitingPermission = false
            notice.text = getString(R.string.cat_permission_error, errorText(error))
        }
    }

    /** The permission dialog may finish while the screen is stopped; the receiver only lives between start and stop. */
    private fun consumePermission() {
        if (!awaitingPermission) return
        val device = requested ?: return
        if (manager.hasPermission(device)) {
            awaitingPermission = false
            connect(device)
        }
    }

    private fun connect(device: UsbDevice) {
        val model = selectedModel()
        val rate = parseBaud() ?: return
        val civ = if (model == RigModel.IC705) parseAddress() ?: return else DEFAULT_ADDRESS
        val port = chosenPort
        preferences.edit().putString("model", model.name).putInt("baud", rate)
            .putString("address", address.text.toString().trim().uppercase()).apply()
        operation(notice, R.string.rig_connecting) {
            closeRadio()
            try {
                open(device, model, rate, port, civ)
            } catch (error: Exception) {
                val id = (error as? LocalizedError)?.text?.id
                val silent = id in setOf(R.string.err_rig_timeout, R.string.err_rig_reply_invalid, R.string.err_rig_wrong_model)
                when {
                    // Measured: the (tr)uSDX works at 115200; 38400 is only a fallback probe for older firmware.
                    model == RigModel.TRUSDX && silent -> {
                        val other = if (rate == 115200) 38400 else 115200
                        closeRadio()
                        open(device, model, other, port, civ)
                        preferences.edit().putInt("baud", other).apply()
                        runOnUiThread { baud.setText(other.toString()) }
                    }
                    // Not needed by the QMX (answers with DTR low); harmless fallback for CDC radios that need DTR high.
                    (model == RigModel.QMX || model == RigModel.QDX || model == RigModel.THD75) && silent -> {
                        closeRadio()
                        open(device, model, rate, port, civ, dtr = true)
                    }
                    else -> throw error
                }
            }
            getString(R.string.rig_connected, model.label)
        }
    }

    /** Worker thread: opens the port, identifies the radio and shows its state. */
    private fun open(device: UsbDevice, model: RigModel, rate: Int, port: Int, civ: Int, dtr: Boolean = false) {
        val link = SerialRadio.open(manager, device, rigSerialSettings(model, rate, port, SerialRadio.enhancedPort(device), dtr))
        attach(link, model, rate, civ)
    }

    /** Worker thread: identifies the radio on an open transport and shows its state. */
    private fun attach(link: RadioBytes, model: RigModel, rate: Int, civ: Int) {
        transport = link
        val opened = openRig(model, link, civ)
        rig = opened
        identity = opened.identify()
        linkBaud = rate
        refresh(opened)
    }

    /** Worker thread. Releases PTT, turns split off and closes the transport; waits for running transmissions first. */
    private fun closeRadio() {
        session = null
        txCancel = true
        rxStop = true
        for (future in listOf(txFuture, rxFuture)) {
            try { future?.get(6, TimeUnit.SECONDS) } catch (_: Exception) { }
        }
        val r = rig
        val link = transport
        rig = null; transport = null
        val problems = ArrayList<Exception>()
        if (r != null) {
            if (pttHeld) attempt<Unit>({ problems.add(it) }) { releasePtt(r) }
            attempt<Unit>({ problems.add(it) }) { tracker?.stop() }
        }
        disposeOrbit()
        try { link?.close() } catch (error: IOException) { problems.add(error) }
        val first = problems.firstOrNull() ?: return
        problems.drop(1).forEach(first::addSuppressed)
        throw IOException(getString(R.string.rig_stop_error, errorText(first)), first)
    }

    private fun releasePtt(r: Rig) {
        var last: Exception? = null
        for (round in 1..3) {
            try {
                r.ptt(false)
                pttHeld = false
                return
            } catch (error: Exception) {
                last?.let(error::addSuppressed)
                last = error
                Thread.sleep(50)
            }
        }
        throw requireNotNull(last)
    }

    private fun suspendConnection(message: String) {
        session = null
        txCancel = true
        rxStop = true
        acarsStop = true
        acarsActive = false
        capture?.cancel()
        pendingAudio = null
        pickingImage = false
        generation++
        busy = false; txActive = false; rxActive = false
        updateControls()
        val token = generation
        worker.execute {
            try { closeRadio() } catch (error: IOException) {
                android.util.Log.e("BricohamsRigCAT", "Radio release not confirmed", error)
                runOnUiThread { if (token == generation && !isDestroyed) notice.text = errorText(error) }
            }
        }
        status.text = message
    }

    // PTT test

    private fun pttTest() {
        val r = rig ?: run { notice.setText(R.string.rig_connect_first); return }
        val call = try { ProfileStore.requireCallsign(this) } catch (error: IllegalArgumentException) {
            notice.text = errorText(error); return
        }
        AlertDialog.Builder(this).setTitle(R.string.rig_ptt_title)
            .setMessage(getString(R.string.rig_ptt_message, call, r.model.label))
            .setNegativeButton(R.string.action_cancel) { _, _ -> notice.setText(R.string.sstv_cancelled) }
            .setPositiveButton(R.string.action_transmit) { _, _ -> runPttTest(r) }.show()
    }

    /** Right before keying: the TH-D75 keys PTT on its control band, so band A is selected unless satellite tracking already chose the uplink band. */
    internal fun prepareTransmit(r: Rig) {
        if (!trackingUplink) r.selectTxVfo(Vfo.A)
    }

    private fun runPttTest(r: Rig) {
        val token = generation
        operation(notice, R.string.rig_ptt_running) {
            try {
                pttHeld = true
                prepareTransmit(r)
                r.ptt(true)
                var waited = 0
                while (waited < 3000 && token == generation) { Thread.sleep(100); waited += 100 }
            } finally {
                releasePtt(r)
            }
            getString(R.string.rig_ptt_done)
        }
    }

    // Memories

    private fun channelLimits(model: RigModel) = when (model) {
        RigModel.IC705 -> 0..99
        RigModel.FTX1 -> 1..999
        RigModel.THD75 -> Th75Rig.CHANNELS
        else -> 1..99
    }

    private fun readMemories() {
        val r = rig ?: run { memStatus.setText(R.string.rig_connect_first); return }
        if (!r.supportsMemories) { memStatus.setText(R.string.rig_no_memories); return }
        val limits = channelLimits(r.model)
        val from = memFrom.text.toString().trim().toIntOrNull()
        val to = memTo.text.toString().trim().toIntOrNull()
        if (from == null || to == null || from !in limits || to !in limits || from > to || to - from + 1 > MAX_CHANNELS) {
            memStatus.text = getString(R.string.rig_invalid_channels, limits.first, limits.last, MAX_CHANNELS)
            return
        }
        memoryCancel = false
        val token = generation
        operation(memStatus, R.string.rig_reading_memories) {
            val list = r.memories(from..to) { !memoryCancel && foreground && token == generation }
            runOnUiThread { if (token == generation && !isDestroyed) showMemories(list) }
            getString(if (memoryCancel) R.string.rig_memories_stopped else R.string.rig_memories_done, list.size)
        }
    }

    private fun memoryText(memory: RigMemory): String {
        val text = getString(R.string.rig_memory_row, memory.channel, mhzText(memory.frequencyHz), memory.mode?.name ?: "-", memory.name)
        return if (memory.txHz == null) text else text + "  TX " + mhzText(memory.txHz)
    }

    private fun showMemories(list: List<RigMemory>) {
        lastMemories = list
        memList.removeAllViews()
        for (memory in list) {
            val text = memoryText(memory)
            memList.addView(Brand.card(this).apply {
                isClickable = true; isFocusable = true
                contentDescription = text
                addView(Brand.text(this@RigActivity, 14f).apply { this.text = text })
                setOnClickListener { chooseMemoryAction(memory, text) }
            })
        }
    }

    private fun chooseMemoryAction(memory: RigMemory, text: String) {
        val writable = rig?.supportsMemoryWrite == true
        val labels = listOfNotNull(getString(R.string.rig_mem_tune), if (writable) getString(R.string.rig_mem_edit) else null)
        AlertDialog.Builder(this).setTitle(text).setItems(labels.toTypedArray()) { _, which ->
            if (which == 0) applyMemory(memory)
            else showMemoryEditor(memory.channel, mhzText(memory.frequencyHz), memory.mode ?: RigMode.FM, memory.name,
                memory.txHz?.let(::mhzText) ?: "", memStatus)
        }.show()
    }

    private fun firstFreeChannel(limits: IntRange): Int {
        val used = lastMemories.map { it.channel }.toSet()
        return limits.firstOrNull { it !in used } ?: limits.first
    }

    private fun showMemoryEditor(channel: Int, rx: String, mode: RigMode, name: String, tx: String, target: TextView) {
        val r = rig ?: run { target.setText(R.string.rig_connect_first); return }
        if (!r.supportsMemoryWrite) { target.setText(R.string.rig_mem_write_unsupported); return }
        val limits = channelLimits(r.model)
        val form = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            val padding = Brand.dp(this@RigActivity, 20)
            setPadding(padding, padding / 2, padding, padding / 2)
            background = Brand.rounded(this@RigActivity, colors.surface, 20)
        }
        val channelEdit = field(R.string.rig_mem_channel_hint, channel.toString(), InputType.TYPE_CLASS_NUMBER)
        val rxEdit = field(R.string.rig_mem_freq_hint, rx, decimal)
        val modePicker = spinner(rigModes.map { it.name }).apply { setSelection(rigModes.indexOf(mode).coerceAtLeast(0)) }
        val nameEdit = field(R.string.rig_mem_name_hint, name, InputType.TYPE_CLASS_TEXT).apply {
            filters = arrayOf(InputFilter.LengthFilter(12))
        }
        val txEdit = field(R.string.rig_mem_tx_hint, tx, decimal)
        form.addView(channelEdit)
        form.addView(rxEdit)
        label(form, R.string.rig_mem_mode_label)
        form.addView(modePicker)
        form.addView(nameEdit)
        form.addView(txEdit)
        val dialog = AlertDialog.Builder(this).setTitle(R.string.rig_mem_edit_title).setView(ScrollView(this).apply { addView(form) })
            .setNegativeButton(R.string.action_cancel, null)
            .setPositiveButton(R.string.rig_mem_save, null).create()
        dialog.show()
        dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener {
            val invalid = getString(R.string.rig_mem_invalid, limits.first, limits.last)
            val number = channelEdit.text.toString().trim().toIntOrNull()
            val rxHz = parseMhz(rxEdit.text.toString())
            val txText = txEdit.text.toString().trim()
            val txHz = if (txText.isEmpty()) null else parseMhz(txText)
            val range = r.model.rangeHz
            when {
                number == null || number !in limits -> channelEdit.error = invalid
                rxHz == null || rxHz !in range -> rxEdit.error = invalid
                txText.isNotEmpty() && (txHz == null || txHz !in range) -> txEdit.error = invalid
                else -> {
                    dialog.dismiss()
                    val picked = rigModes[modePicker.selectedItemPosition.coerceIn(0, rigModes.lastIndex)]
                    saveMemory(r, RigMemory(number, rxHz, picked, nameEdit.text.toString().trim(), txHz), target)
                }
            }
        }
    }

    private fun saveMemory(r: Rig, memory: RigMemory, target: TextView) {
        val write = {
            operation(target, R.string.rig_mem_writing) {
                r.writeMemory(memory)
                val stored = r.memories(memory.channel..memory.channel).firstOrNull()
                runOnUiThread {
                    if (!isDestroyed && rig === r) {
                        showMemories((lastMemories.filter { it.channel != memory.channel } + listOfNotNull(stored)).sortedBy { it.channel })
                    }
                }
                getString(R.string.rig_mem_saved, memory.channel)
            }
        }
        val existing = lastMemories.firstOrNull { it.channel == memory.channel }
        if (existing == null) write() else AlertDialog.Builder(this).setTitle(R.string.rig_mem_edit_title)
            .setMessage(getString(R.string.rig_mem_overwrite, memory.channel, memoryText(existing)))
            .setNegativeButton(R.string.action_cancel, null)
            .setPositiveButton(R.string.rig_mem_save) { _, _ -> write() }.show()
    }

    private fun saveTransponder() {
        val r = rig ?: run { satStatus.setText(R.string.rig_connect_first); return }
        if (!r.supportsMemoryWrite) { satStatus.setText(R.string.rig_mem_write_unsupported); return }
        val down = parseMhz(downEdit?.text?.toString().orEmpty())
        val upText = upEdit?.text?.toString().orEmpty().trim()
        val up = if (upText.isEmpty()) null else parseMhz(upText)
        if (down == null || (upText.isNotEmpty() && up == null)) { satStatus.setText(R.string.rig_invalid_sat_frequency); return }
        val name = selectedPlan?.tle?.name.orEmpty().take(12)
        showMemoryEditor(firstFreeChannel(channelLimits(r.model)), mhzText(down), satMode, name, up?.let(::mhzText) ?: "", satStatus)
    }

    private fun applyMemory(memory: RigMemory) {
        val r = rig ?: run { memStatus.setText(R.string.rig_connect_first); return }
        operation(memStatus) {
            r.setFrequency(Vfo.A, memory.frequencyHz)
            memory.mode?.let { r.setMode(it) }
            refresh(r)
            getString(R.string.rig_memory_applied, memory.channel)
        }
    }

    // Satellite

    private fun startTracking() {
        val plan = selectedPlan ?: return
        if (!idle || !foreground) return
        val r = rig ?: run { satStatus.setText(R.string.rig_connect_first); return }
        val downText = downEdit?.text?.toString().orEmpty()
        val upText = upEdit?.text?.toString().orEmpty().trim()
        val down = parseMhz(downText)
        val up = if (upText.isEmpty()) null else parseMhz(upText)
        if (down == null || (upText.isNotEmpty() && up == null)) { satStatus.setText(R.string.rig_invalid_sat_frequency); return }
        val step = stepEdit?.text?.toString()?.trim()?.toLongOrNull()
        if (step == null || step !in 1L..5000L) { satStatus.setText(R.string.rig_invalid_step); return }
        val downVfo = r.model.satDownlinkVfo
        for ((vfo, hz) in listOfNotNull(downVfo to down, up?.let { downVfo.other() to it })) {
            try {
                r.checkTunable(vfo, hz)
            } catch (_: LocalizedArgumentException) {
                val bandA = r.model == RigModel.THD75 && vfo == Vfo.A
                val first = if (bandA) Th75Rig.BAND_A_RANGES.first().first else r.model.rangeHz.first
                val last = if (bandA) Th75Rig.BAND_A_RANGES.last().last else r.model.rangeHz.last
                satStatus.text = getString(R.string.rig_sat_range, r.model.label, mhzText(hz), mhzText(first), mhzText(last))
                return
            }
        }
        if (System.currentTimeMillis() >= plan.pass.los.time) { satStatus.setText(R.string.rig_pass_over); return }
        val mine = Any()
        session = mine
        val token = generation
        updateControls()
        satStatus.setText(R.string.rig_tracking_start)
        worker.execute {
            if (token != generation || session !== mine) return@execute
            attempt<Unit>({ endTracking(mine, token, getString(R.string.rig_tracking_failed, errorText(it))) }) {
                val engine = SatelliteOrbit(plan.tle, plan.observer,
                    assets.open("satellite-6.0.1.js").bufferedReader().use { it.readText() },
                    assets.open("orbital-engine.js").bufferedReader().use { it.readText() })
                orbit = engine
                tracker = RigTracker(r, down, up, engine::rangeRateKmS, engine::look, step, pttOn = { pttHeld })
                trackingUplink = up != null
                trackStep(mine, token, requireNotNull(tracker), plan)
            }
        }
    }

    private fun trackStep(mine: Any, token: Int, current: RigTracker, plan: SatellitePlan) {
        if (token != generation || session !== mine) return
        attempt<Unit>({ endTracking(mine, token, getString(R.string.rig_tracking_failed, errorText(it))) }) {
            val now = System.currentTimeMillis()
            if (now >= plan.pass.los.time) {
                endTracking(mine, token, getString(R.string.rig_pass_over))
                return
            }
            // Before AOS the satellite is below the horizon: wait instead of failing, then enable split once.
            if (now < plan.pass.aos.time) {
                val text = getString(R.string.rig_tracking_waiting, (plan.pass.aos.time - now + 999) / 1000)
                runOnUiThread { if (!isDestroyed && session === mine) satStatus.text = text }
                worker.schedule({ trackStep(mine, token, current, plan) }, 1000, TimeUnit.MILLISECONDS)
                return
            }
            val step = if (trackingStarted) current.step() else { trackingStarted = true; current.start() }
            val sent = listOfNotNull("RX".takeIf { step.sentDownlink }, "TX".takeIf { step.sentUplink }).joinToString("+").ifEmpty { "-" }
            val position = step.look
            val line = if (step.uplinkHz == null)
                getString(R.string.rig_tracking_rx, mhzText(step.downlinkHz), position.azimuth, position.elevation)
            else getString(R.string.rig_tracking_rx_tx, mhzText(step.downlinkHz), mhzText(step.uplinkHz), position.azimuth, position.elevation)
            val note = if (rig?.model == RigModel.THD75 && step.uplinkHz != null) "\n" + getString(R.string.rig_tracking_ctcss_note) else ""
            val text = line + "\n" + getString(R.string.rig_tracking_sent, sent) + note
            runOnUiThread { if (!isDestroyed && session === mine) satStatus.text = text }
            rig?.let { readMeters(it, false) }
            if (token == generation && session === mine) worker.schedule({ trackStep(mine, token, current, plan) }, 1000, TimeUnit.MILLISECONDS)
        }
    }

    private fun stopTracking() {
        val mine = session ?: return
        val token = generation
        worker.execute { endTracking(mine, token, getString(R.string.rig_tracking_stopped)) }
    }

    /** Worker thread: ends one tracking session, switching split off (best effort). */
    private fun endTracking(mine: Any, token: Int, message: String) {
        if (session !== mine) return
        session = null
        var text = message
        attempt<Unit>({ text += " " + getString(R.string.rig_tracking_stop_failed, errorText(it)) }) { tracker?.stop() }
        disposeOrbit()
        runOnUiThread {
            if (!isDestroyed && token == generation) {
                satStatus.text = text
                updateControls()
            }
        }
    }

    private fun disposeOrbit() {
        tracker = null
        trackingUplink = false
        orbit?.close()
        orbit = null
    }

    // SSTV

    private fun chooseImage() {
        if (!idle || !foreground) return
        try {
            ProfileStore.requireCallsign(this)
        } catch (error: IllegalArgumentException) {
            sstvStatus.text = errorText(error)
            return
        }
        if (rig == null) { sstvStatus.setText(R.string.rig_connect_first); return }
        pickingImage = true
        try {
            startActivityForResult(Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
                addCategory(Intent.CATEGORY_OPENABLE); type = "image/*"
            }, PICK_IMAGE)
        } catch (error: ActivityNotFoundException) {
            pickingImage = false
            sstvStatus.text = getString(R.string.sstv_error, errorText(error))
        }
    }

    @Deprecated("Platform callback")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == SAVE_ACARS_WAV) {
            pickingImage = false
            val target = data?.data
            if (resultCode != RESULT_OK || target == null) acarsStatus.setText(R.string.sstv_cancelled)
            else saveAcarsWav(target)
            return
        }
        if (requestCode != PICK_IMAGE) return
        pickingImage = false
        val uri = data?.data
        if (resultCode != RESULT_OK || uri == null) { sstvStatus.setText(R.string.sstv_cancelled); return }
        val call = try { ProfileStore.requireCallsign(this) } catch (error: IllegalArgumentException) {
            sstvStatus.text = errorText(error); return
        }
        val mode = transmitModes[sstvModeSpinner.selectedItemPosition.coerceIn(0, transmitModes.lastIndex)]
        audioWorker.execute {
            val message = try {
                val bytes = contentResolver.readDocument(uri, 20 shl 20)
                val frame = loadFrame(bytes, call, mode)
                val pixels = IntArray(mode.width * mode.height)
                frame.getPixels(pixels, 0, mode.width, 0, 0, mode.width, mode.height)
                runOnUiThread { if (!isDestroyed && foreground) { picture.setImageBitmap(frame); confirmTransmit(call, mode, pixels) } }
                null
            } catch (error: OutOfMemoryError) {
                getString(R.string.sstv_error, getString(R.string.err_image_memory))
            } catch (error: IOException) {
                getString(R.string.sstv_error, errorText(error))
            } catch (error: SecurityException) {
                getString(R.string.sstv_error, errorText(error))
            } catch (error: IllegalArgumentException) {
                getString(R.string.sstv_error, errorText(error))
            }
            if (message != null) runOnUiThread { if (!isDestroyed) sstvStatus.text = message }
        }
    }

    /** Decodes at the smallest power-of-two subsampling that still covers the mode resolution, never the full-size bitmap. */
    private fun loadFrame(bytes: ByteArray, call: String, mode: SstvMode): Bitmap {
        val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        BitmapFactory.decodeByteArray(bytes, 0, bytes.size, bounds)
        if (bounds.outWidth <= 0 || bounds.outHeight <= 0) throw IOException(getString(R.string.cat_image_unknown))
        var sample = 1
        while (bounds.outWidth / (sample * 2) >= mode.width && bounds.outHeight / (sample * 2) >= mode.height) sample *= 2
        val options = BitmapFactory.Options().apply { inSampleSize = sample; inPreferredConfig = Bitmap.Config.ARGB_8888 }
        val source = BitmapFactory.decodeByteArray(bytes, 0, bytes.size, options) ?: throw IOException(getString(R.string.cat_image_unknown))
        try {
            return stamp(source, call, mode)
        } finally {
            source.recycle()
        }
    }

    /** Frame of the mode's size with the station callsign printed on it: identification is mandatory. */
    private fun stamp(source: Bitmap, call: String, mode: SstvMode): Bitmap {
        val frame = Bitmap.createScaledBitmap(source, mode.width, mode.height, true).copy(Bitmap.Config.ARGB_8888, true)
        val scale = mode.height / 240f
        val canvas = Canvas(frame)
        canvas.drawRect(0f, 200f * scale, mode.width.toFloat(), mode.height.toFloat(), Paint().apply { color = Color.BLACK })
        canvas.drawText(call, 8f * scale, mode.height - 8f * scale, Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.WHITE; textSize = 32f * scale; typeface = Typeface.DEFAULT_BOLD
        })
        return frame
    }

    private fun confirmTransmit(call: String, mode: SstvMode, pixels: IntArray) {
        val model = rig?.model?.label ?: ""
        AlertDialog.Builder(this).setTitle(R.string.cat_transmit_title)
            .setMessage(getString(R.string.rig_transmit_message, call, mode.name, Sstv.durationSeconds(mode).toInt(), model))
            .setNegativeButton(R.string.action_cancel) { _, _ -> sstvStatus.setText(R.string.sstv_cancelled) }
            .setPositiveButton(R.string.action_transmit) { _, _ -> startTransmit(call, mode, pixels) }.show()
    }

    /** Runs on [txWorker] so the command worker stays free; PTT is always released in the finally blocks. */
    private fun startTransmit(call: String, mode: SstvMode, pixels: IntArray) {
        if (!idle || !foreground) return
        val r = rig ?: run { sstvStatus.setText(R.string.rig_connect_first); return }
        val token = generation
        txCancel = false
        txActive = true
        updateControls()
        sstvStatus.setText(R.string.cat_sstv_sending)
        txFuture = txWorker.submit {
            val message = try {
                attempt({ getString(R.string.sstv_error, errorText(it)) }) {
                    val keep = { !txCancel && foreground && token == generation }
                    val seconds: Double
                    val stream = audioStream(r)
                    if (stream != null) {
                        val audio = Sstv.encode(pixels, KenwoodTs480Subset.TX_RATE, mode)
                        stream.transmitAudio(audio, keep)
                        seconds = audio.size.toDouble() / KenwoodTs480Subset.TX_RATE
                    } else {
                        val audio = Sstv.encode(pixels, LiveAudio.SAMPLE_RATE, mode)
                        playWithPtt(r, audio, keep)
                        seconds = audio.size.toDouble() / LiveAudio.SAMPLE_RATE
                    }
                    if (txCancel) getString(R.string.sstv_cancelled)
                    else getString(R.string.rig_sstv_sent, call, seconds, mode.name)
                }
            } catch (error: OutOfMemoryError) {
                getString(R.string.sstv_error, getString(R.string.err_image_memory))
            }
            runOnUiThread {
                if (!isDestroyed) {
                    sstvStatus.text = message
                    if (token == generation) { txActive = false; updateControls() }
                }
            }
        }
    }

    /** Keys PTT, plays [audio] through the phone (or a USB audio interface) and always releases PTT. */
    private fun playWithPtt(r: Rig, audio: ShortArray, keep: () -> Boolean) {
        val rate = LiveAudio.SAMPLE_RATE
        requireUi(audio.isNotEmpty() && audio.size * 1000L / rate <= MAX_TX_MS) { UiText(R.string.err_audio_length, MAX_TX_MS / 1000, 120) }
        val sink = AudioTrackSink(rate, applicationContext)
        var failure: Throwable? = null
        var cleanupFailure: Exception? = null
        try {
            checkUi(sink.requestFocus()) { UiText(R.string.err_audio_focus) }
            pttHeld = true
            prepareTransmit(r)
            r.ptt(true)
            sink.start()
            val begin = System.nanoTime() / 1_000_000
            val limit = begin + audio.size * 1000L / rate + 5_000
            var progressAt = begin
            var lastPlayed = -1L
            var offset = 0
            val chunk = maxOf(1, rate / 10)
            while (offset < audio.size || sink.playedFrames() < audio.size) {
                checkUi(keep()) { UiText(R.string.err_tx_cancelled) }
                checkUi(!sink.focusLost()) { UiText(R.string.err_audio_focus_lost) }
                var moved = false
                if (offset < audio.size) {
                    val written = sink.write(audio, offset, minOf(chunk, audio.size - offset))
                    if (written < 0) throw LocalizedIOException(UiText(R.string.err_audio_out_failed, written))
                    offset += written
                    moved = written > 0
                }
                val played = sink.playedFrames()
                if (played != lastPlayed) { lastPlayed = played; moved = true }
                val now = System.nanoTime() / 1_000_000
                if (moved) progressAt = now else checkUi(now - progressAt < STALL_MS) { UiText(R.string.err_audio_stall) }
                checkUi(now <= limit) { UiText(R.string.err_audio_stall) }
                if (!moved || offset >= audio.size) Thread.sleep(if (offset < audio.size) 20 else 50)
            }
        } catch (error: Throwable) {
            failure = error
            throw error
        } finally {
            try { sink.stop() } catch (_: RuntimeException) { }
            try {
                if (pttHeld) releasePtt(r)
            } catch (cleanup: Exception) {
                if (failure == null) cleanupFailure = cleanup else failure.addSuppressed(cleanup)
            } finally {
                try { sink.abandonFocus() } finally { sink.close() }
            }
        }
        cleanupFailure?.let { throw it }
    }

    private fun startReceive() {
        if (!idle || !foreground || acarsActive) return
        val trusdx = audioStream(rig)
        var recording: LiveAudio? = null
        if (trusdx == null) {
            if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
                pendingAudio = { startReceive() }
                requestPermissions(arrayOf(Manifest.permission.RECORD_AUDIO), AUDIO_PERMISSION)
                return
            }
            recording = LiveAudio(LiveAudio.SSTV_SECONDS) { MicrophoneSource(applicationContext) }
            capture = recording
        }
        val token = generation
        rxStop = false
        rxActive = true
        updateControls()
        sstvStatus.text = getString(R.string.rig_receiving, LiveAudio.SSTV_SECONDS)
        rxFuture = audioWorker.submit {
            val message = try {
                attempt({
                    if (it is CancellationException) getString(R.string.live_cancelled) else getString(R.string.sstv_error, errorText(it))
                }) {
                    val audio = if (trusdx != null) trusdx.receiveAudio(LiveAudio.SSTV_SECONDS) { !rxStop && foreground && token == generation }
                        else requireNotNull(recording).record()
                    val result = Sstv.decode(audio)
                    val decoded = Bitmap.createBitmap(result.pixels, result.width, result.height, Bitmap.Config.ARGB_8888)
                    runOnUiThread { if (!isDestroyed) picture.setImageBitmap(decoded) }
                    val warning = result.warning.resolve(this@RigActivity)
                    if (result.complete) getString(R.string.sstv_complete, result.startSeconds, warning)
                    else getString(R.string.sstv_partial, result.decodedRows, result.height, result.startSeconds, warning)
                }
            } catch (error: OutOfMemoryError) {
                getString(R.string.sstv_error, getString(R.string.err_image_memory))
            }
            runOnUiThread {
                if (capture === recording) capture = null
                if (!isDestroyed) {
                    sstvStatus.text = message
                    if (token == generation) { rxActive = false; updateControls() }
                }
            }
        }
    }

    @Deprecated("Platform callback")
    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode != AUDIO_PERMISSION) return
        val action = pendingAudio
        pendingAudio = null
        if (grantResults.firstOrNull() == PackageManager.PERMISSION_GRANTED) {
            sstvStatus.setText(R.string.live_permission_ready)
            if (action != null && foreground) action()
        } else sstvStatus.setText(R.string.live_permission_denied)
    }

    override fun onStart() {
        super.onStart()
        foreground = true
        registerUsbReceiver(detachReceiver, UsbManager.ACTION_USB_DEVICE_DETACHED)
        registerUsbReceiver(attachReceiver, UsbManager.ACTION_USB_DEVICE_ATTACHED)
        registerUsbReceiver(permissionReceiver, USB_PERMISSION)
        consumePermission()
        if (!profileDeviceTried) useProfileDevice()
        mainHandler.removeCallbacks(digitalTick)
        mainHandler.post(digitalTick)
    }

    private fun registerUsbReceiver(receiver: BroadcastReceiver, action: String) {
        if (Build.VERSION.SDK_INT >= 33) {
            registerReceiver(receiver, IntentFilter(action), RECEIVER_NOT_EXPORTED)
        } else {
            @Suppress("UnspecifiedRegisterReceiverFlag")
            registerReceiver(receiver, IntentFilter(action))
        }
    }

    override fun onStop() {
        foreground = false
        mainHandler.removeCallbacks(digitalTick)
        unregisterReceiver(permissionReceiver)
        unregisterReceiver(detachReceiver)
        unregisterReceiver(attachReceiver)
        // The system image picker stops this screen; nothing is keyed or tracked at that point, so keep the link open.
        if (!pickingImage) suspendConnection(getString(R.string.rig_suspended))
        super.onStop()
    }

    override fun onDestroy() {
        mainHandler.removeCallbacksAndMessages(null)
        speech?.stop()
        speech?.shutdown()
        speech = null
        // Destroyed while the image picker kept the link open: release it before the worker stops.
        if (transport != null) worker.execute { try { closeRadio() } catch (_: IOException) { } }
        worker.shutdown()
        txWorker.shutdown()
        audioWorker.shutdownNow()
        super.onDestroy()
    }
}
