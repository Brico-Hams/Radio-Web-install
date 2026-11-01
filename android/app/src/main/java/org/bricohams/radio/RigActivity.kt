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
import android.text.InputType
import android.view.View
import android.view.ViewGroup
import android.view.WindowInsets
import android.widget.AdapterView
import android.widget.ArrayAdapter
import android.widget.Button
import android.widget.EditText
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.RadioButton
import android.widget.RadioGroup
import android.widget.ScrollView
import android.widget.Spinner
import android.widget.TextView
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
 * CAT screen for several radios (Yaesu FT-817/857/897, Icom IC-705, Yaesu FTX-1, (tr)uSDX), USB only. All radio I/O runs on
 * [worker] (commands, satellite tracking) or [txWorker] (SSTV transmission, so Stop TX never waits behind a command);
 * [audioWorker] receives. The UI thread only renders and the radio is never polled in the background except while a
 * satellite is tracked. The manifest declares configChanges so rotation does not drop the USB connection.
 */
class RigActivity : LocalizedActivity() {
    companion object {
        const val EXTRA_PLAN = "rig-plan"
        const val EXTRA_TRANSMITTERS = "rig-transmitters"
        private const val USB_PERMISSION = "org.bricohams.radio.RIG_USB_PERMISSION"
        private const val PREFERENCES = "rig-cat"
        private const val PICK_IMAGE = 72
        private const val AUDIO_PERMISSION = 73
        private const val MAX_TX_MS = 110_000L
        private const val STALL_MS = 2_000L
        private const val MAX_CHANNELS = 100
        private const val DEFAULT_ADDRESS = 0xA4
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
    private lateinit var setVfoB: Button
    private lateinit var memFrom: EditText
    private lateinit var memTo: EditText
    private lateinit var memoriesButton: Button
    private lateinit var stopMemories: Button
    private lateinit var memStatus: TextView
    private lateinit var memList: LinearLayout
    private lateinit var satStatus: TextView
    private lateinit var callsign: EditText
    private lateinit var sstvModeSpinner: Spinner
    private lateinit var sstvStatus: TextView
    private lateinit var picture: ImageView
    private lateinit var stopTx: Button
    private lateinit var stopReceive: Button
    private var downEdit: EditText? = null
    private var upEdit: EditText? = null
    private var stepEdit: EditText? = null
    private var lastModel = RigModel.FT817
    private var chosen: UsbDevice? = null
    private var chosenPort = 0
    private var chosenLabel = ""
    private var requested: UsbDevice? = null
    private var awaitingPermission = false
    private var pickingImage = false
    private var pendingAudio: (() -> Unit)? = null
    private var selectedPlan: SatellitePlan? = null
    private var capture: LiveAudio? = null
    private var identity = ""
    // Worker-thread state.
    private var tracker: RigTracker? = null
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
                chosen = null
                suspendConnection(getString(R.string.cat_usb_detached))
            }
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
        body.addView(Brand.heading(this, getString(R.string.rig_title)))
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
        buildMemories(body)
        buildSatellite(body)
        buildSstv(body)
        setContentView(scroll)
        updateControls()
    }

    private fun live(view: TextView) = view.apply { accessibilityLiveRegion = View.ACCESSIBILITY_LIVE_REGION_POLITE }

    private fun section(body: LinearLayout, title: Int, build: (LinearLayout) -> Unit) {
        val card = Brand.card(this)
        card.addView(Brand.text(this, 18f, colors.accent, true).apply {
            setText(title)
            if (Build.VERSION.SDK_INT >= 28) isAccessibilityHeading = true
        })
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

    private fun spinner(items: List<String>) = Spinner(this).apply {
        adapter = object : ArrayAdapter<String>(this@RigActivity, android.R.layout.simple_spinner_dropdown_item, items) {
            override fun getView(position: Int, convertView: View?, parent: ViewGroup): View =
                super.getView(position, convertView, parent).also { (it as? TextView)?.setTextColor(colors.text) }
            override fun getDropDownView(position: Int, convertView: View?, parent: ViewGroup): View =
                super.getDropDownView(position, convertView, parent).also {
                    (it as? TextView)?.setTextColor(colors.text)
                    it.setBackgroundColor(colors.surfaceHigh)
                }
        }
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
                }
                override fun onNothingSelected(parent: AdapterView<*>?) {}
            }
        }
        card.addView(modelSpinner)
        card.addView(baud)
        card.addView(address)
        button(card, R.string.rig_choose_device) { chooseDevice() }
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
    }

    private fun buildMemories(body: LinearLayout) = section(body, R.string.rig_section_memories) { card ->
        memFrom = field(R.string.rig_mem_from_hint, "1", InputType.TYPE_CLASS_NUMBER)
        memTo = field(R.string.rig_mem_to_hint, "20", InputType.TYPE_CLASS_NUMBER)
        card.addView(memFrom)
        card.addView(memTo)
        memoriesButton = button(card, R.string.rig_read_memories, tracked = false) { readMemories() }
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
    }

    private fun buildSstv(body: LinearLayout) = section(body, R.string.rig_section_sstv) { card ->
        card.addView(Brand.text(this, 13f, colors.muted).apply { setText(R.string.rig_sstv_help) })
        callsign = field(R.string.cat_callsign_hint, preferences.getString("callsign", "") ?: "",
            InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_FLAG_CAP_CHARACTERS)
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

    private fun updateControls() {
        val ready = idle
        controls.forEach { it.isEnabled = ready }
        val r = rig
        memoriesButton.isEnabled = ready && r?.supportsMemories != false
        setVfoB.visibility = if (r != null && !r.supportsVfoB) View.GONE else View.VISIBLE
        stopMemories.isEnabled = busy
        stopTx.isEnabled = txActive
        stopReceive.isEnabled = rxActive
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
        val text = lines.joinToString("\n")
        runOnUiThread {
            if (!isDestroyed && rig === r) {
                status.text = text
                if (!r.supportsMemories) memStatus.setText(R.string.rig_no_memories)
            }
        }
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

    private fun chooseDevice() {
        if (!idle) return
        val entries = manager.deviceList.values.filter { SerialRadio.description(it) != null }.sortedBy { it.deviceName }
            .flatMap { device -> (0 until SerialRadio.portCount(device).coerceAtLeast(1)).map { device to it } }
        if (entries.isEmpty()) {
            notice.setText(R.string.rig_no_devices)
            return
        }
        val labels = entries.map { (device, port) ->
            val description = SerialRadio.description(device) ?: ""
            if (SerialRadio.portCount(device) > 1)
                getString(R.string.rig_device_entry_port, device.vendorId, device.productId, description, port)
            else getString(R.string.rig_device_entry, device.vendorId, device.productId, description)
        }
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
                // (tr)uSDX firmware 2.00t+ runs at 115200 bps, older units at 38400 (DL2MAN details page): a wrong rate gives
                // silence or garbage, so try the other one.
                val other = if (rate == 115200) 38400 else 115200
                val id = (error as? LocalizedError)?.text?.id
                if (model != RigModel.TRUSDX || id !in setOf(R.string.err_rig_timeout, R.string.err_rig_reply_invalid,
                        R.string.err_rig_wrong_model)) throw error
                closeRadio()
                open(device, model, other, port, civ)
                preferences.edit().putInt("baud", other).apply()
                runOnUiThread { baud.setText(other.toString()) }
            }
            getString(R.string.rig_connected, model.label)
        }
    }

    /** Worker thread: opens the port, identifies the radio and shows its state. */
    private fun open(device: UsbDevice, model: RigModel, rate: Int, port: Int, civ: Int) {
        val link = SerialRadio.open(manager, device, SerialSettings(rate, model.stopBits, port, dtr = true, rts = false))
        transport = link
        val opened = openRig(model, link, civ)
        rig = opened
        identity = opened.identify()
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
            attempt<Unit>({ problems.add(it) }) { tracker?.stop() }
            if (pttHeld) attempt<Unit>({ problems.add(it) }) { releasePtt(r) }
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
        memoryCancel = true
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
        val call = try { Callsign.normalize(callsign.text.toString()) } catch (error: IllegalArgumentException) {
            notice.text = errorText(error); return
        }
        AlertDialog.Builder(this).setTitle(R.string.rig_ptt_title)
            .setMessage(getString(R.string.rig_ptt_message, call, r.model.label))
            .setNegativeButton(R.string.action_cancel) { _, _ -> notice.setText(R.string.sstv_cancelled) }
            .setPositiveButton(R.string.action_transmit) { _, _ -> runPttTest(r) }.show()
    }

    private fun runPttTest(r: Rig) {
        val token = generation
        operation(notice, R.string.rig_ptt_running) {
            try {
                pttHeld = true
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

    private fun showMemories(list: List<RigMemory>) {
        memList.removeAllViews()
        for (memory in list) {
            val text = getString(R.string.rig_memory_row, memory.channel, mhzText(memory.frequencyHz), memory.mode?.name ?: "-", memory.name)
            memList.addView(Brand.card(this).apply {
                isClickable = true; isFocusable = true
                contentDescription = text
                addView(Brand.text(this@RigActivity, 14f).apply { this.text = text })
                setOnClickListener { applyMemory(memory) }
            })
        }
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
        for (hz in listOfNotNull(down, up)) {
            if (hz !in r.model.rangeHz) {
                satStatus.text = getString(R.string.rig_sat_range, r.model.label, mhzText(hz),
                    mhzText(r.model.rangeHz.first), mhzText(r.model.rangeHz.last))
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
                tracker = RigTracker(r, down, up, engine::rangeRateKmS, engine::look, step)
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
            val text = line + "\n" + getString(R.string.rig_tracking_sent, sent)
            runOnUiThread { if (!isDestroyed && session === mine) satStatus.text = text }
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
        trackingStarted = false
        orbit?.close()
        orbit = null
    }

    // SSTV

    private fun chooseImage() {
        if (!idle || !foreground) return
        try {
            val call = Callsign.normalize(callsign.text.toString())
            preferences.edit().putString("callsign", call).apply()
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
        if (requestCode != PICK_IMAGE) return
        pickingImage = false
        val uri = data?.data
        if (resultCode != RESULT_OK || uri == null) { sstvStatus.setText(R.string.sstv_cancelled); return }
        val call = try { Callsign.normalize(callsign.text.toString()) } catch (error: IllegalArgumentException) {
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
                    if (r is TruSdxRig) {
                        val audio = Sstv.encode(pixels, KenwoodTs480Subset.TX_RATE, mode)
                        r.transmitAudio(audio, keep)
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
        try {
            checkUi(sink.requestFocus()) { UiText(R.string.err_audio_focus) }
            pttHeld = true
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
                if (failure == null) throw cleanup else failure.addSuppressed(cleanup)
            } finally {
                try { sink.abandonFocus() } finally { sink.close() }
            }
        }
    }

    private fun startReceive() {
        if (!idle || !foreground) return
        val trusdx = rig as? TruSdxRig
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
        registerUsbReceiver(permissionReceiver, USB_PERMISSION)
        consumePermission()
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
        unregisterReceiver(detachReceiver)
        unregisterReceiver(permissionReceiver)
        // The system image picker stops this screen; nothing is keyed or tracked at that point, so keep the link open.
        if (!pickingImage) suspendConnection(getString(R.string.rig_suspended))
        super.onStop()
    }

    override fun onDestroy() {
        mainHandler.removeCallbacksAndMessages(null)
        // Destroyed while the image picker kept the link open: release it before the worker stops.
        if (transport != null) worker.execute { try { closeRadio() } catch (_: IOException) { } }
        worker.shutdown()
        txWorker.shutdown()
        audioWorker.shutdownNow()
        super.onDestroy()
    }
}
