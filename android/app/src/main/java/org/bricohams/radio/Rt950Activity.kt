package org.bricohams.radio

import android.Manifest
import android.app.AlertDialog
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.text.InputType
import android.view.View
import android.view.ViewGroup
import android.view.WindowInsets
import android.widget.ArrayAdapter
import android.widget.AdapterView
import android.widget.Button
import android.widget.CheckBox
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.RadioButton
import android.widget.RadioGroup
import android.widget.ScrollView
import android.widget.Spinner
import android.widget.TextView
import org.json.JSONArray
import org.json.JSONException
import org.json.JSONObject
import java.io.File
import java.io.IOException
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale
import java.util.concurrent.Executors

/**
 * Radtel RT-950 Pro over BLE: full backup, APRS configuration, APRS messages through the radio's KISS TNC and a Doppler
 * channel plan (the radio has no live CAT: every frequency change is a clone session that mutes RX and writes flash).
 * All radio I/O runs on [worker]; writes stay disabled until a complete backup was read in this session.
 */
class Rt950Activity : LocalizedActivity() {
    companion object {
        const val EXTRA_PLAN = "rt950-plan"
        const val EXTRA_TRANSMITTERS = "rt950-transmitters"
        private const val PERMISSION_REQUEST = 95
        private const val PREFERENCES = "rt950"
        private const val SCAN_MS = 15_000L
    }

    private val colors by lazy { Brand.Palette(this) }
    private val worker = Executors.newSingleThreadExecutor()
    private val mainHandler = Handler(Looper.getMainLooper())
    private val clock = DateTimeFormatter.ofPattern("HH:mm:ss", Locale.ROOT).withZone(ZoneId.systemDefault())
    private lateinit var chat: AprsChatPanel
    private lateinit var preferences: android.content.SharedPreferences
    @Volatile private var transport: BleRt950Transport? = null
    @Volatile private var kissLink: Rt950BleKissLink? = null
    @Volatile private var backup: Rt950Backup? = null
    @Volatile private var backupDone = false
    private var stopScan: (() -> Unit)? = null
    private val found = HashSet<String>()
    private var aprsOriginal: Rt950AprsSettings? = null

    private lateinit var status: TextView
    private lateinit var notice: TextView
    private lateinit var devices: LinearLayout
    private lateinit var backupStatus: TextView
    private lateinit var cloneNote: TextView
    private lateinit var aprsOn: CheckBox
    private lateinit var callsignEdit: EditText
    private lateinit var ssidEdit: EditText
    private lateinit var symbolSpinner: Spinner
    private lateinit var routingEdit: EditText
    private lateinit var positionEdit: EditText
    private lateinit var priorityEdit: EditText
    private lateinit var delayEdit: EditText
    private lateinit var beaconTypeEdit: EditText
    private lateinit var intervalSpinner: Spinner
    private lateinit var route1Edit: EditText
    private lateinit var route1Ssid: EditText
    private lateinit var route2Edit: EditText
    private lateinit var route2Ssid: EditText
    private lateinit var sendCustom: CheckBox
    private lateinit var customMessage: EditText
    private lateinit var satStatus: TextView
    private var plan: SatellitePlan? = null
    private var transmitters: List<Transmitter> = emptyList()
    private var chosen = 0
    private lateinit var zoneEdit: EditText
    private lateinit var slotEdit: EditText
    private lateinit var ctcssEdit: EditText
    @Volatile private var variant = Rt950Variant.UNKNOWN
    @Volatile private var backupManifest: File? = null
    @Volatile private var failedZones: Set<Int> = emptySet()
    private lateinit var zpCountry: Spinner
    private lateinit var zpRegion: Spinner
    private lateinit var zpAirports: CheckBox
    private lateinit var zpPmr: CheckBox
    private lateinit var zpCb: CheckBox
    private lateinit var zpOverwrite: CheckBox
    private lateinit var zpFirstZone: EditText
    private lateinit var zpStatus: TextView
    private var zpDataset: ChannelTemplates.Dataset? = null
    private var zpRegions = listOf<ChannelTemplates.Region>()

    private val ticker = object : Runnable {
        override fun run() {
            chat.tick()
            mainHandler.postDelayed(this, 1000)
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        preferences = getSharedPreferences(PREFERENCES, MODE_PRIVATE)
        chat = AprsChatPanel(this, preferences, colors, worker, { kissLink }) { notice.text = it }
        val body = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            val padding = Brand.dp(this@Rt950Activity, 16)
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
        body.addView(Brand.heading(this, getString(R.string.rt950_title)))
        status = live(Brand.text(this, 15f)).apply { setText(R.string.rt950_disconnected) }
        body.addView(Brand.card(this).apply { addView(status) })
        notice = live(Brand.text(this, 14f, colors.accent))
        body.addView(notice)
        body.addView(Brand.text(this, 13f, colors.muted).apply { setText(R.string.rt950_intro) })
        buildConnect(body)
        buildBackup(body)
        buildAprs(body)
        buildMessages(body)
        buildSatellite(body)
        buildZonePlan(body)
        setContentView(scroll)
        mainHandler.post(ticker)
    }

    override fun onDestroy() {
        mainHandler.removeCallbacksAndMessages(null)
        stopScan?.invoke()
        val link = transport
        transport = null
        kissLink = null
        worker.execute { link?.close() }
        worker.shutdown()
        super.onDestroy()
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

    private fun note(parent: LinearLayout, text: Int) =
        parent.addView(Brand.text(this, 13f, colors.muted).apply { setText(text) })

    private fun button(parent: LinearLayout, label: Int, primary: Boolean = false, action: () -> Unit): Button =
        Brand.button(this, getString(label), primary, action).also { parent.addView(it) }

    private fun field(parent: LinearLayout, label: Int, initial: String = "", type: Int = InputType.TYPE_CLASS_TEXT): EditText {
        note(parent, label)
        return EditText(this).apply {
            setTextColor(colors.text); setHintTextColor(colors.muted)
            inputType = type
            setText(initial)
            contentDescription = getString(label)
            layoutParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT)
            parent.addView(this)
        }
    }

    private fun check(parent: LinearLayout, label: Int, checked: Boolean = false) = CheckBox(this).apply {
        setText(label)
        setTextColor(colors.text)
        isChecked = checked
        minHeight = Brand.dp(this@Rt950Activity, 48)
        parent.addView(this)
    }

    private fun themedAdapter(items: List<String>) = object : ArrayAdapter<String>(this@Rt950Activity, android.R.layout.simple_spinner_dropdown_item, items) {
        override fun getView(position: Int, convertView: View?, parent: ViewGroup): View =
            super.getView(position, convertView, parent).also { (it as? TextView)?.setTextColor(colors.text) }
        override fun getDropDownView(position: Int, convertView: View?, parent: ViewGroup): View =
            super.getDropDownView(position, convertView, parent).also {
                (it as? TextView)?.setTextColor(colors.text)
                it.setBackgroundColor(colors.surfaceHigh)
            }
    }

    private fun spinner(parent: LinearLayout, label: Int, items: List<String>): Spinner {
        note(parent, label)
        return Spinner(this).apply {
            adapter = themedAdapter(items)
            contentDescription = getString(label)
            layoutParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT)
            parent.addView(this)
        }
    }

    private val numeric = InputType.TYPE_CLASS_NUMBER
    private val callType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_FLAG_CAP_CHARACTERS

    private fun work(task: () -> Unit) = worker.execute {
        try { task() } catch (error: Exception) { runOnUiThread { notice.text = errorText(error) } }
    }

    private fun blePermissions(): Boolean {
        val needed = if (Build.VERSION.SDK_INT >= 31) arrayOf(Manifest.permission.BLUETOOTH_SCAN, Manifest.permission.BLUETOOTH_CONNECT)
            else arrayOf(Manifest.permission.ACCESS_FINE_LOCATION)
        val missing = needed.filter { checkSelfPermission(it) != PackageManager.PERMISSION_GRANTED }
        if (missing.isEmpty()) return true
        requestPermissions(missing.toTypedArray(), PERMISSION_REQUEST)
        return false
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode != PERMISSION_REQUEST) return
        if (grantResults.isNotEmpty() && grantResults.all { it == PackageManager.PERMISSION_GRANTED }) startScan()
        else notice.setText(R.string.rt950_permission_denied)
    }

    // (a) Connection

    private fun buildConnect(body: LinearLayout) = section(body, R.string.rt950_section_connect) { card ->
        note(card, R.string.rt950_connect_help)
        button(card, R.string.rt950_scan, true) { startScan() }
        devices = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        card.addView(devices)
        button(card, R.string.rt950_disconnect) { disconnect() }
    }

    private fun startScan() {
        if (!blePermissions()) return
        stopScan?.invoke()
        devices.removeAllViews(); found.clear()
        try {
            stopScan = BleRt950Transport.scan(this) { _, address ->
                runOnUiThread { if (found.add(address)) devices.addView(Brand.button(this, getString(R.string.rt950_device, address), false) { connectTo(address) }) }
            }
            notice.setText(R.string.rt950_scanning)
            mainHandler.postDelayed({ stopScan?.invoke(); stopScan = null }, SCAN_MS)
        } catch (error: IOException) {
            notice.text = errorText(error)
        }
    }

    private fun connectTo(address: String) {
        stopScan?.invoke(); stopScan = null
        status.setText(R.string.rt950_connecting)
        backupDone = false
        backupManifest = null
        failedZones = emptySet()
        work {
            transport?.close()
            val link = BleRt950Transport(this, address)
            try {
                link.connect()
            } catch (error: Exception) {
                link.close()
                runOnUiThread { status.setText(R.string.rt950_disconnected) }
                throw error
            }
            link.onLost = { runOnUiThread { if (transport === link) { transport = null; kissLink = null; status.setText(R.string.rt950_link_lost) } } }
            kissLink = Rt950BleKissLink.over(link).also { it.onFrame = chat::onFrame }
            transport = link
            runOnUiThread { status.setText(R.string.rt950_connected); notice.text = "" }
        }
    }

    private fun disconnect() = work {
        transport?.close()
        transport = null
        kissLink = null
        runOnUiThread { status.setText(R.string.rt950_disconnected) }
    }

    /** One clone session: KISS delivery is paused meanwhile and may stay silent afterwards until the radio is power cycled. */
    private fun <T> clone(chosen: Rt950Variant = variant, block: (Rt950Session) -> T): T {
        val link = transport ?: throw LocalizedStateException(UiText(R.string.err_rt950_not_connected))
        link.beginClone()
        val session = Rt950Session(link, variant = chosen)
        try {
            return block(session)
        } finally {
            session.end()
            link.endClone()
            kissLink?.resetDecoder()
            runOnUiThread { cloneNote.visibility = View.VISIBLE }
        }
    }

    private fun requireBackup() = checkUi(backupDone) { UiText(R.string.err_rt950_need_backup) }

    // (b) Full backup

    private fun buildBackup(body: LinearLayout) = section(body, R.string.rt950_section_backup) { card ->
        note(card, R.string.rt950_backup_help)
        button(card, R.string.rt950_backup_read, true) { readBackup() }
        backupStatus = live(Brand.text(this, 14f, colors.accent)).apply { setText(R.string.rt950_backup_required) }
        card.addView(backupStatus)
        cloneNote = Brand.text(this, 13f, colors.muted).apply { setText(R.string.rt950_clone_note); visibility = View.GONE }
        card.addView(cloneNote)
    }

    private fun readBackup() = work {
        val result = clone { session ->
            session.readAll { done, total -> runOnUiThread { backupStatus.text = getString(R.string.rt950_backup_progress, done, total) } }
        }
        val stamp = DateTimeFormatter.ofPattern("yyyyMMdd-HHmmss", Locale.ROOT).withZone(ZoneId.systemDefault()).format(Instant.now())
        // The in-memory copy is replaced by the one reloaded from disk, which proves every part against the manifest SHA-256.
        val saved = Rt950BackupStore.write(File(filesDir, "backups"), result, stamp)
        backup = saved.backup
        backupManifest = saved.manifest
        backupDone = true
        runOnUiThread { backupStatus.text = getString(R.string.rt950_backup_saved, result.model, saved.hash) }
    }

    // (c) APRS configuration

    private val symbols get() = listOf(R.string.rt950_symbol_pedestrian, R.string.rt950_symbol_bicycle, R.string.rt950_symbol_car,
        R.string.rt950_symbol_rv, R.string.rt950_symbol_user).map { getString(it) }

    private fun buildAprs(body: LinearLayout) = section(body, R.string.rt950_section_aprs) { card ->
        note(card, R.string.rt950_aprs_help)
        button(card, R.string.rt950_aprs_read) { readAprs() }
        aprsOn = check(card, R.string.rt950_aprs_enabled)
        callsignEdit = field(card, R.string.rt950_aprs_callsign, "", callType)
        ssidEdit = field(card, R.string.rt950_aprs_ssid, "0", numeric)
        symbolSpinner = spinner(card, R.string.rt950_aprs_symbol, symbols)
        routingEdit = field(card, R.string.rt950_aprs_routing, "0", numeric)
        positionEdit = field(card, R.string.rt950_aprs_position, "0", numeric)
        priorityEdit = field(card, R.string.rt950_aprs_priority, "0", numeric)
        delayEdit = field(card, R.string.rt950_aprs_tx_delay, "0", numeric)
        beaconTypeEdit = field(card, R.string.rt950_aprs_beacon_type, "0", numeric)
        intervalSpinner = spinner(card, R.string.rt950_aprs_interval, Rt950Aprs.BEACON_MINUTES)
        route1Edit = field(card, R.string.rt950_aprs_route1, "", callType)
        route1Ssid = field(card, R.string.rt950_aprs_route1_ssid, "0", numeric)
        route2Edit = field(card, R.string.rt950_aprs_route2, "", callType)
        route2Ssid = field(card, R.string.rt950_aprs_route2_ssid, "0", numeric)
        sendCustom = check(card, R.string.rt950_aprs_send_custom)
        customMessage = field(card, R.string.rt950_aprs_custom_message)
        button(card, R.string.rt950_aprs_write, true) { confirmAprs() }
    }

    private fun readAprs() = work {
        val settings = Rt950Aprs.decode(clone { it.readAprs() })
        aprsOriginal = settings
        runOnUiThread { fillAprs(settings); notice.setText(R.string.rt950_aprs_loaded) }
    }

    private fun fillAprs(s: Rt950AprsSettings) {
        aprsOn.isChecked = s.aprsEnabled
        callsignEdit.setText(s.callsign); ssidEdit.setText(s.ssid.toString())
        symbolSpinner.setSelection(s.radioSymbol.coerceIn(0, 4))
        routingEdit.setText(s.routingSelect.toString()); positionEdit.setText(s.myPosition.toString())
        priorityEdit.setText(s.priority.toString()); delayEdit.setText(s.dataTxDelay.toString())
        beaconTypeEdit.setText(s.beaconTxType.toString())
        intervalSpinner.setSelection(s.timedBeaconTime.coerceIn(0, 9))
        route1Edit.setText(s.customRouting1); route1Ssid.setText(s.customRouting1Ssid.toString())
        route2Edit.setText(s.customRouting2); route2Ssid.setText(s.customRouting2Ssid.toString())
        sendCustom.isChecked = s.sendCustomMessage
        customMessage.setText(s.customMessage)
        chat.suggestCallsign(s.callsign)
    }

    private fun num(edit: EditText) = edit.text.toString().trim().toInt()

    private fun collectAprs(base: Rt950AprsSettings) = base.copy(
        aprsEnabled = aprsOn.isChecked, callsign = callsignEdit.text.toString().trim().uppercase(), ssid = num(ssidEdit),
        radioSymbol = symbolSpinner.selectedItemPosition, routingSelect = num(routingEdit), myPosition = num(positionEdit),
        priority = num(priorityEdit), dataTxDelay = num(delayEdit), beaconTxType = num(beaconTypeEdit),
        timedBeaconTime = intervalSpinner.selectedItemPosition,
        customRouting1 = route1Edit.text.toString().trim().uppercase(), customRouting1Ssid = num(route1Ssid),
        customRouting2 = route2Edit.text.toString().trim().uppercase(), customRouting2Ssid = num(route2Ssid),
        sendCustomMessage = sendCustom.isChecked, customMessage = customMessage.text.toString())

    private fun aprsLines(s: Rt950AprsSettings): List<Pair<Int, String>> = listOf(
        R.string.rt950_aprs_enabled to s.aprsEnabled.toString(), R.string.rt950_aprs_callsign to s.callsign,
        R.string.rt950_aprs_ssid to s.ssid.toString(), R.string.rt950_aprs_symbol to symbols[s.radioSymbol.coerceIn(0, 4)],
        R.string.rt950_aprs_routing to s.routingSelect.toString(), R.string.rt950_aprs_position to s.myPosition.toString(),
        R.string.rt950_aprs_priority to s.priority.toString(), R.string.rt950_aprs_tx_delay to s.dataTxDelay.toString(),
        R.string.rt950_aprs_beacon_type to s.beaconTxType.toString(),
        R.string.rt950_aprs_interval to Rt950Aprs.BEACON_MINUTES[s.timedBeaconTime.coerceIn(0, 9)],
        R.string.rt950_aprs_route1 to s.customRouting1, R.string.rt950_aprs_route1_ssid to s.customRouting1Ssid.toString(),
        R.string.rt950_aprs_route2 to s.customRouting2, R.string.rt950_aprs_route2_ssid to s.customRouting2Ssid.toString(),
        R.string.rt950_aprs_send_custom to s.sendCustomMessage.toString(), R.string.rt950_aprs_custom_message to s.customMessage)

    private fun confirmAprs() {
        try {
            requireBackup()
            val old = aprsOriginal ?: throw LocalizedStateException(UiText(R.string.err_rt950_aprs_not_read))
            val new = collectAprs(old)
            val changes = aprsLines(old).zip(aprsLines(new)).filter { it.first.second != it.second.second }
                .joinToString("\n") { getString(R.string.rt950_aprs_diff, getString(it.first.first), it.first.second, it.second.second) }
            if (changes.isEmpty()) { notice.setText(R.string.rt950_aprs_no_changes); return }
            AlertDialog.Builder(this).setTitle(R.string.rt950_aprs_confirm_title)
                .setMessage(getString(R.string.rt950_aprs_confirm_body, changes))
                .setNegativeButton(R.string.action_cancel, null)
                .setPositiveButton(R.string.rt950_aprs_write) { _, _ -> writeAprs(new) }.show()
        } catch (error: IllegalArgumentException) {
            notice.text = errorText(error)
        } catch (error: IllegalStateException) {
            notice.text = errorText(error)
        }
    }

    private fun writeAprs(settings: Rt950AprsSettings) = work {
        requireBackup()
        clone { it.writeAprs(settings) }
        aprsOriginal = settings
        runOnUiThread { notice.setText(R.string.rt950_aprs_written) }
    }

    // (d) APRS messages

    private fun buildMessages(body: LinearLayout) = section(body, R.string.rt950_section_messages) { card ->
        chat.build(card, R.string.rt950_msg_help)
    }

    // (e) Satellites: Doppler channel plan

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

    private fun mhz(hz: Long) = String.format(Locale.ROOT, "%.5f", hz / 1e6)

    private fun describe(channel: Rt950Channel?) =
        if (channel == null) getString(R.string.rt950_sat_empty)
        else "RX ${mhz(channel.rxHz)} TX ${channel.txHz?.let { mhz(it) } ?: "-"} ${channel.name}".trim()

    private fun buildSatellite(body: LinearLayout) = section(body, R.string.rt950_section_sat) { card ->
        note(card, R.string.rt950_sat_help)
        val planText = intent.getStringExtra(EXTRA_PLAN)
        if (planText == null) { note(card, R.string.rt950_sat_no_plan); return@section }
        try {
            val decoded = SatellitePlanJson.decode(planText)
            plan = decoded
            val all = parseTransmitters(decoded.tle.norad)
            transmitters = all.filter { it.mode.contains("FM", true) }.ifEmpty { all }
            card.addView(Brand.text(this, 14f).apply {
                text = getString(R.string.rt950_sat_pass, decoded.tle.name, clock.format(Instant.ofEpochMilli(decoded.pass.aos.time)),
                    clock.format(Instant.ofEpochMilli(decoded.pass.los.time)), decoded.pass.maximum.elevation)
            })
            val group = RadioGroup(this)
            transmitters.forEachIndexed { index, t ->
                group.addView(RadioButton(this).apply {
                    id = View.generateViewId()
                    tag = index
                    setTextColor(colors.text)
                    text = getString(R.string.rt950_sat_transmitter, mhz(t.downlinkHz), t.uplinkHz?.let { mhz(it) } ?: "-", t.mode, t.description)
                    minHeight = Brand.dp(this@Rt950Activity, 48)
                })
            }
            group.setOnCheckedChangeListener { _, id -> (group.findViewById<RadioButton>(id)?.tag as? Int)?.let { chosen = it } }
            if (transmitters.isEmpty()) note(card, R.string.rt950_sat_no_transmitters)
            else { card.addView(group); (group.getChildAt(0) as RadioButton).isChecked = true }
            zoneEdit = field(card, R.string.rt950_sat_zone, "10", numeric)
            slotEdit = field(card, R.string.rt950_sat_first_slot, "1", numeric)
            ctcssEdit = field(card, R.string.rt950_sat_ctcss, "", InputType.TYPE_CLASS_NUMBER or InputType.TYPE_NUMBER_FLAG_DECIMAL)
            button(card, R.string.rt950_sat_prepare, true) { prepareDoppler() }
        } catch (error: IllegalArgumentException) {
            card.addView(Brand.text(this, 14f).apply { text = errorText(error) })
        }
        satStatus = live(Brand.text(this, 14f, colors.accent))
        card.addView(satStatus)
    }

    private fun prepareDoppler() {
        try {
            requireBackup()
            val current = plan ?: return
            val transmitter = transmitters.getOrNull(chosen) ?: throw LocalizedArgumentException(UiText(R.string.rt950_sat_no_transmitters))
            val zone = num(zoneEdit)
            val first = num(slotEdit)
            requireUi(zone in 1..Rt950Protocol.ZONES && first in 1..Rt950Protocol.ZONE_SLOTS - Rt950Doppler.POINTS.size + 1) {
                UiText(R.string.err_rt950_slot)
            }
            val ctcss = ctcssEdit.text.toString().trim().takeIf { it.isNotEmpty() }?.toBigDecimal()?.movePointRight(1)?.intValueExact()
            val pass = current.pass
            val times = listOf(pass.aos.time, (pass.aos.time + pass.maximum.time) / 2, pass.maximum.time,
                (pass.maximum.time + pass.los.time) / 2, pass.los.time)
            satStatus.setText(R.string.rt950_sat_computing)
            work {
                val engine = SatelliteOrbit(current.tle, current.observer,
                    assets.open("satellite-6.0.1.js").bufferedReader().use { it.readText() },
                    assets.open("orbital-engine.js").bufferedReader().use { it.readText() })
                val channels = Rt950Doppler.channels(current.tle.name, transmitter.downlinkHz, transmitter.uplinkHz, ctcss, times, engine::rangeRateKmS)
                runOnUiThread { satStatus.text = ""; confirmDoppler(zone, first, channels) }
            }
        } catch (error: ArithmeticException) {
            notice.text = errorText(error)
        } catch (error: IllegalArgumentException) {
            notice.text = errorText(error)
        } catch (error: IllegalStateException) {
            notice.text = errorText(error)
        }
    }

    private fun confirmDoppler(zone: Int, first: Int, channels: List<Rt950Channel>) {
        val saved = backup
        val lines = channels.mapIndexed { index, channel ->
            val slot = first + index
            val old = saved?.channelRecord(zone, slot)?.let { Rt950Channels.decode(it) }
            getString(R.string.rt950_sat_slot_line, zone, slot, describe(channel), describe(old))
        }.joinToString("\n")
        AlertDialog.Builder(this).setTitle(R.string.rt950_sat_confirm_title)
            .setMessage(getString(R.string.rt950_sat_confirm_body, lines))
            .setNegativeButton(R.string.action_cancel, null)
            .setPositiveButton(R.string.rt950_sat_write) { _, _ ->
                work {
                    requireBackup()
                    val count = clone { it.writeChannels(zone, channels.mapIndexed { index, c -> first + index to c }.toMap()) }
                    runOnUiThread { satStatus.text = getString(R.string.rt950_sat_written, channels.size, count) }
                }
            }.show()
    }

    // (f) Template zones written to the radio

    private fun readAsset(name: String) = assets.open("channel-templates/$name").use { String(it.readBytes(), Charsets.UTF_8) }

    private fun buildZonePlan(body: LinearLayout) = section(body, R.string.rt950_zp_section) { card ->
        note(card, R.string.rt950_zp_help)
        zpCountry = spinner(card, R.string.template_country, ChannelTemplates.countries.map { "${it.code} - ${it.name}" })
        zpRegion = spinner(card, R.string.rt950_zp_region, listOf(getString(R.string.template_all_zones)))
        zpAirports = check(card, R.string.template_airports, true)
        zpPmr = check(card, R.string.template_pmr)
        zpCb = check(card, R.string.template_cb)
        val variantSpinner = spinner(card, R.string.rt950_zp_variant, listOf(R.string.rt950_zp_variant_unknown,
            R.string.rt950_zp_variant_ch960, R.string.rt950_zp_variant_ch990).map { getString(it) })
        variantSpinner.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
            override fun onItemSelected(parent: AdapterView<*>?, view: View?, position: Int, id: Long) { variant = Rt950Variant.values()[position] }
            override fun onNothingSelected(parent: AdapterView<*>?) = Unit
        }
        note(card, R.string.rt950_zp_variant_warning)
        zpFirstZone = field(card, R.string.rt950_zp_first_zone, "", InputType.TYPE_CLASS_NUMBER)
        zpOverwrite = check(card, R.string.rt950_zp_overwrite)
        button(card, R.string.rt950_zp_preview) { previewZonePlan() }
        button(card, R.string.rt950_zp_write, true) { confirmZonePlan() }
        button(card, R.string.rt950_restore) { confirmRestore() }
        zpStatus = live(Brand.text(this, 14f, colors.accent))
        card.addView(zpStatus)
        loadZpCountry()
        zpCountry.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
            override fun onItemSelected(parent: AdapterView<*>?, view: View?, position: Int, id: Long) { loadZpCountry() }
            override fun onNothingSelected(parent: AdapterView<*>?) = Unit
        }
    }

    private fun loadZpCountry() {
        try {
            val selected = ChannelTemplates.countries[zpCountry.selectedItemPosition]
            val loaded = ChannelTemplates.dataset(selected, readAsset("${selected.code}.json"), readAsset("${selected.code}-airports.json"))
            zpDataset = loaded
            zpRegions = loaded.regions.sortedBy { it.name }
            zpRegion.adapter = themedAdapter(listOf(getString(R.string.template_all_zones)) + zpRegions.map { it.name })
            zpPmr.visibility = if (selected.pmr) View.VISIBLE else View.GONE
            if (!selected.pmr) zpPmr.isChecked = false
            zpCb.visibility = if (selected.code == "ES") View.VISIBLE else View.GONE
            if (selected.code != "ES") zpCb.isChecked = false
        } catch (error: Exception) {
            zpDataset = null
            zpStatus.text = getString(R.string.template_load_error, errorText(error))
        }
    }

    /** Needs the in-session backup: occupancy is judged on the backup, never on a fresh read. */
    private fun currentZonePlan(): Rt950ZoneWriter.Plan {
        requireBackup()
        val saved = backup ?: throw LocalizedStateException(UiText(R.string.err_rt950_need_backup))
        val loaded = zpDataset ?: throw LocalizedStateException(UiText(R.string.err_rt950_plan_empty))
        val chosen = variant
        val region = zpRegions.getOrNull(zpRegion.selectedItemPosition - 1)?.id ?: ""
        val channels = ChannelTemplates.select(loaded, region, zpAirports.isChecked, zpPmr.isChecked && loaded.country.pmr,
            zpCb.isChecked && loaded.country.code == "ES")
        val profile = ChannelTemplates.profiles(readAsset("profiles.json")).first { it.id == "rt950pro" }
        val zonePlan = ChannelTemplates.zonePlan(profile, channels, variantConfirmed = chosen == Rt950Variant.CH990)
        if (zpFirstZone.text.isNullOrBlank()) zpFirstZone.setText(Rt950ZoneWriter.defaultFirstZone(saved, chosen).toString())
        val first = zpFirstZone.text.toString().trim().toIntOrNull() ?: 0
        return Rt950ZoneWriter.plan(zonePlan, saved, chosen, first)
    }

    private fun previewZonePlan() {
        try {
            val plan = currentZonePlan()
            val lines = plan.zones.map {
                getString(R.string.rt950_zp_zone_line, it.zone, it.name, it.slots.size,
                    if (it.occupied == 0) getString(R.string.rt950_zp_state_empty) else getString(R.string.rt950_zp_state_occupied, it.occupied))
            } + getString(R.string.rt950_zp_omitted, plan.omitted)
            zpStatus.text = lines.joinToString("\n")
        } catch (error: IllegalArgumentException) {
            notice.text = errorText(error)
        } catch (error: IllegalStateException) {
            notice.text = errorText(error)
        }
    }

    private fun variantLabel(value: Rt950Variant) = getString(when (value) {
        Rt950Variant.UNKNOWN -> R.string.rt950_zp_variant_unknown
        Rt950Variant.CH960 -> R.string.rt950_zp_variant_ch960
        Rt950Variant.CH990 -> R.string.rt950_zp_variant_ch990
    })

    private fun confirmZonePlan() {
        try {
            val plan = currentZonePlan()
            val overwrite = zpOverwrite.isChecked
            Rt950ZoneWriter.check(plan, plan.variant, overwrite)
            val lines = plan.zones.joinToString("\n") {
                getString(R.string.rt950_zp_confirm_line, it.zone, it.name, 1, it.slots.size, it.slots.size, it.replaced)
            }
            AlertDialog.Builder(this).setTitle(R.string.rt950_zp_confirm_title)
                .setMessage(getString(R.string.rt950_zp_confirm_body, variantLabel(plan.variant), lines))
                .setNegativeButton(R.string.action_cancel, null)
                .setPositiveButton(R.string.rt950_zp_write) { _, _ -> writeZonePlan(plan, overwrite) }.show()
        } catch (error: IllegalArgumentException) {
            notice.text = errorText(error)
        } catch (error: IllegalStateException) {
            notice.text = errorText(error)
        }
    }

    private fun writeZonePlan(plan: Rt950ZoneWriter.Plan, overwrite: Boolean) = work {
        requireBackup()
        val results = clone(plan.variant) { Rt950ZoneWriter.write(it, plan, overwrite) }
        failedZones = Rt950ZoneWriter.affectedZones(results)
        val text = results.joinToString("\n") {
            when (it.status) {
                Rt950ZoneWriter.Status.OK -> getString(R.string.rt950_zp_result_ok, it.zone)
                Rt950ZoneWriter.Status.MISMATCH -> getString(R.string.rt950_zp_result_mismatch, it.zone, it.detail ?: "")
                Rt950ZoneWriter.Status.ERROR -> getString(R.string.rt950_zp_result_error, it.zone, it.detail ?: "")
                Rt950ZoneWriter.Status.NOT_ATTEMPTED -> getString(R.string.rt950_zp_result_skipped, it.zone)
            }
        } + if (failedZones.isEmpty()) "" else "\n" + getString(R.string.rt950_zp_failed_hint)
        runOnUiThread { zpStatus.text = text }
    }

    private fun confirmRestore() {
        try {
            requireBackup()
            val zones = failedZones
            val scope = if (zones.isEmpty()) getString(R.string.rt950_restore_scope_all)
                else getString(R.string.rt950_restore_scope_zones, zones.sorted().joinToString(", "))
            val chosen = variant
            AlertDialog.Builder(this).setTitle(R.string.rt950_restore_confirm_title)
                .setMessage(getString(R.string.rt950_restore_confirm_body, scope))
                .setNegativeButton(R.string.action_cancel, null)
                .setPositiveButton(R.string.rt950_restore) { _, _ -> restoreBackup(zones, chosen) }.show()
        } catch (error: IllegalStateException) {
            notice.text = errorText(error)
        }
    }

    private fun restoreBackup(zones: Set<Int>, chosen: Rt950Variant) = work {
        requireBackup()
        val manifest = backupManifest ?: throw LocalizedStateException(UiText(R.string.err_rt950_need_backup))
        val saved = Rt950BackupStore.load(manifest)
        val written = clone(chosen) { it.restoreChannels(saved, zones.ifEmpty { null }) }
        failedZones = emptySet()
        runOnUiThread {
            zpStatus.text = if (written.isEmpty()) getString(R.string.rt950_restore_none) else getString(R.string.rt950_restore_done, written.size)
        }
    }
}
