package org.bricohams.radio

import android.app.AlertDialog
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.hardware.usb.UsbDevice
import android.hardware.usb.UsbManager
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.content.pm.PackageManager
import android.text.Editable
import android.text.InputType
import android.text.TextWatcher
import java.util.Locale
import android.view.View
import android.view.WindowInsets
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.RadioButton
import android.widget.RadioGroup
import android.widget.ScrollView
import android.widget.TextView
import java.io.IOException
import java.util.concurrent.Executors

/**
 * Profile wizard, also used to edit the profile: Radio, Callsign, Location (GPS and Maidenhead locator), then CAT control. Opened
 * automatically on the first launch (no profile yet) and from the home screen afterwards. "Probar conexión" runs the radio's
 * existing identify path.
 */
class ProfileActivity : LocalizedActivity() {
    companion object {
        private const val USB_PERMISSION = "org.bricohams.radio.PROFILE_USB_PERMISSION"
        private const val LOCATION_REQUEST = 63
        private const val STEPS = 4
        private val STEP_NAMES = listOf(R.string.profile_step_radio, R.string.profile_step_callsign,
            R.string.profile_step_location, R.string.profile_step_cat)
    }

    private val colors by lazy { Brand.Palette(this) }
    private val worker = Executors.newSingleThreadExecutor()
    private val mainHandler = Handler(Looper.getMainLooper())
    private val manager by lazy { getSystemService(USB_SERVICE) as UsbManager }
    private lateinit var body: LinearLayout
    private lateinit var status: TextView
    private var step = 0
    private var radio: ProfileRadio? = null
    private var callsign = ""
    private var transport: CatTransport? = null
    private var baud = ""
    private var civ = StationProfile.DEFAULT_CIV
    private var host = ""
    private var port = ""
    private var latitude = ""
    private var longitude = ""
    private var heightKm = ""
    private var locator = ""
    private var approximate = false
    private var updating = false
    private var phoneLocation: PhoneLocation? = null
    private var callEdit: EditText? = null
    private var latEdit: EditText? = null
    private var lonEdit: EditText? = null
    private var heightEdit: EditText? = null
    private var locEdit: EditText? = null
    private var approxNote: TextView? = null
    private var baudEdit: EditText? = null
    private var civEdit: EditText? = null
    private var hostEdit: EditText? = null
    private var portEdit: EditText? = null
    private var requested: UsbDevice? = null
    private var requestedProfile: StationProfile? = null
    @Volatile private var testing = false

    private val permissionReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            if (intent.action != USB_PERMISSION) return
            val device = requested ?: return
            val profile = requestedProfile ?: return
            if (manager.hasPermission(device)) runProbe(device, profile) else message(getString(R.string.cat_permission_denied))
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val saved = ProfileStore.load(this)
        radio = saved.radio; callsign = saved.callsign; transport = saved.transport
        baud = saved.baud.takeIf { it > 0 }?.toString() ?: ""; civ = saved.civAddress; host = saved.host; port = saved.port
        latitude = saved.latitude; longitude = saved.longitude; heightKm = saved.heightKm; locator = saved.locator
        approximate = saved.approximate
        if (savedInstanceState != null) {
            step = savedInstanceState.getInt("step", 0).coerceIn(0, STEPS - 1)
            radio = ProfileRadio.values().firstOrNull { it.name == savedInstanceState.getString("radio") } ?: radio
            callsign = savedInstanceState.getString("callsign", callsign)
            transport = CatTransport.values().firstOrNull { it.name == savedInstanceState.getString("transport") } ?: transport
            baud = savedInstanceState.getString("baud", baud); civ = savedInstanceState.getString("civ", civ)
            host = savedInstanceState.getString("host", host); port = savedInstanceState.getString("port", port)
            latitude = savedInstanceState.getString("latitude", latitude); longitude = savedInstanceState.getString("longitude", longitude)
            heightKm = savedInstanceState.getString("height", heightKm); locator = savedInstanceState.getString("locator", locator)
            approximate = savedInstanceState.getBoolean("approximate", approximate)
        }
        body = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            val padding = Brand.dp(this@ProfileActivity, 16)
            setPadding(padding, padding, padding, padding)
        }
        status = Brand.text(this, 15f, colors.accent).apply { accessibilityLiveRegion = View.ACCESSIBILITY_LIVE_REGION_POLITE }
        setContentView(ScrollView(this).apply {
            setBackgroundColor(colors.background)
            isFillViewport = true
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
        })
        render()
    }

    override fun onSaveInstanceState(outState: Bundle) {
        collect()
        super.onSaveInstanceState(outState)
        outState.putInt("step", step)
        outState.putString("radio", radio?.name)
        outState.putString("callsign", callsign)
        outState.putString("transport", transport?.name)
        outState.putString("baud", baud); outState.putString("civ", civ)
        outState.putString("host", host); outState.putString("port", port)
        outState.putString("latitude", latitude); outState.putString("longitude", longitude)
        outState.putString("height", heightKm); outState.putString("locator", locator)
        outState.putBoolean("approximate", approximate)
    }

    override fun onPause() {
        phoneLocation?.stop()
        super.onPause()
    }

    override fun onStart() {
        super.onStart()
        if (Build.VERSION.SDK_INT >= 33) registerReceiver(permissionReceiver, IntentFilter(USB_PERMISSION), RECEIVER_NOT_EXPORTED)
        else {
            @Suppress("UnspecifiedRegisterReceiverFlag")
            registerReceiver(permissionReceiver, IntentFilter(USB_PERMISSION))
        }
    }

    override fun onStop() {
        unregisterReceiver(permissionReceiver)
        super.onStop()
    }

    override fun onDestroy() {
        worker.shutdown()
        super.onDestroy()
    }

    private fun message(text: String) { status.text = text }

    private fun note(text: Int) = Brand.text(this, 14f, colors.muted).apply { setText(text) }.also(body::addView)

    private fun label(text: Int) = Brand.text(this, 13f, colors.muted).apply { setText(text) }.also(body::addView)

    private fun edit(caption: Int, initial: String, type: Int, identifier: Int = View.generateViewId()): EditText {
        val captionView = label(caption)
        return EditText(this).apply {
            id = identifier
            setTextColor(colors.text); setHintTextColor(colors.muted)
            inputType = type
            setText(initial)
            minHeight = Brand.dp(this@ProfileActivity, 52)
            captionView.labelFor = identifier
            body.addView(this)
        }
    }

    private fun choice(text: String, checked: Boolean, action: () -> Unit) = RadioButton(this).apply {
        id = View.generateViewId()
        this.text = text
        textSize = 16f
        setTextColor(colors.text)
        minHeight = Brand.dp(this@ProfileActivity, 56)
        isChecked = checked
        setOnClickListener { action() }
    }

    private fun render() {
        body.removeAllViews()
        callEdit = null; baudEdit = null; civEdit = null; hostEdit = null; portEdit = null
        latEdit = null; lonEdit = null; heightEdit = null; locEdit = null; approxNote = null
        body.addView(Brand.heading(this, getString(R.string.profile_title)))
        (status.parent as? LinearLayout)?.removeView(status)
        body.addView(status)
        body.addView(Brand.heading(this, getString(R.string.profile_step, step + 1, STEPS, getString(STEP_NAMES[step]))))
        when (step) {
            0 -> radioStep()
            1 -> callsignStep()
            2 -> locationStep()
            else -> catStep()
        }
        if (step > 0) body.addView(Brand.button(this, getString(R.string.profile_back)) { collect(); step--; message(""); render() })
        body.addView(Brand.button(this, getString(if (step == STEPS - 1) R.string.profile_save else R.string.profile_next), true) { next() })
    }

    private fun radioStep() {
        note(R.string.profile_radio_help)
        val group = RadioGroup(this).apply { contentDescription = getString(R.string.profile_step_radio) }
        for (option in ProfileRadio.values()) {
            group.addView(choice(option.label(this), option == radio) {
                if (option != radio) {
                    radio = option
                    transport = option.transports.firstOrNull()
                    baud = option.defaultBaud.takeIf { it > 0 }?.toString() ?: ""
                    civ = StationProfile.DEFAULT_CIV
                }
            })
        }
        body.addView(group)
    }

    private fun callsignStep() {
        note(R.string.profile_callsign_help)
        callEdit = edit(R.string.profile_callsign_label, callsign,
            InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_FLAG_CAP_CHARACTERS or InputType.TYPE_TEXT_FLAG_NO_SUGGESTIONS,
            R.id.profile_callsign)
    }

    private fun locationStep() {
        note(R.string.profile_location_help)
        body.addView(Brand.button(this, getString(R.string.profile_gps_get)) { useGps() })
        val decimal = InputType.TYPE_CLASS_NUMBER or InputType.TYPE_NUMBER_FLAG_DECIMAL or InputType.TYPE_NUMBER_FLAG_SIGNED
        val lat = edit(R.string.profile_latitude, latitude, decimal, R.id.profile_latitude)
        val lon = edit(R.string.profile_longitude, longitude, decimal, R.id.profile_longitude)
        heightEdit = edit(R.string.profile_height, heightKm, decimal, R.id.profile_height)
        val loc = edit(R.string.profile_locator_label, locator,
            InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_FLAG_NO_SUGGESTIONS, R.id.profile_locator).apply { hint = "IM98ib" }
        approxNote = Brand.text(this, 14f, colors.muted).apply {
            setText(R.string.profile_position_approximate)
            visibility = if (approximate) View.VISIBLE else View.GONE
        }.also(body::addView)
        latEdit = lat; lonEdit = lon; locEdit = loc
        lat.addTextChangedListener(watcher { coordinatesTyped() })
        lon.addTextChangedListener(watcher { coordinatesTyped() })
        loc.addTextChangedListener(watcher { locatorTyped() })
    }

    private fun watcher(changed: () -> Unit) = object : TextWatcher {
        override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
        override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {}
        override fun afterTextChanged(s: Editable?) { if (!updating) changed() }
    }

    private fun setApproximate(value: Boolean) {
        approximate = value
        approxNote?.visibility = if (value) View.VISIBLE else View.GONE
    }

    private fun number(edit: EditText?) = edit?.text.toString().trim().replace(',', '.').toDoubleOrNull()

    /** Typing coordinates recomputes the locator. */
    private fun coordinatesTyped() {
        setApproximate(false)
        val lat = number(latEdit) ?: return
        val lon = number(lonEdit) ?: return
        try {
            val grid = Maidenhead.fromLatLon(lat, lon)
            updating = true
            locEdit?.setText(grid)
        } catch (_: IllegalArgumentException) {
        } finally { updating = false }
    }

    /** Typing only a locator fills the centre coordinates, marked as approximate. */
    private fun locatorTyped() {
        val text = locEdit?.text.toString()
        if (!Maidenhead.isValid(text)) return
        val centre = Maidenhead.toLatLon(text)
        updating = true
        latEdit?.setText(String.format(Locale.ROOT, "%.5f", centre.latitude))
        lonEdit?.setText(String.format(Locale.ROOT, "%.5f", centre.longitude))
        updating = false
        setApproximate(true)
    }

    /** Same permission and search flow as SatelliteActivity; a second tap ends the search with the best fix so far. */
    private fun useGps() {
        phoneLocation?.takeIf { it.running }?.let { it.finishNow(); return }
        if (!PhoneLocation.hasPermission(this)) {
            message(getString(R.string.satellite_gps_asking))
            requestPermissions(PhoneLocation.PERMISSIONS, LOCATION_REQUEST)
            return
        }
        if (!PhoneLocation.servicesEnabled(this)) {
            message(getString(R.string.satellite_gps_off))
            runCatching { startActivity(Intent(android.provider.Settings.ACTION_LOCATION_SOURCE_SETTINGS)) }
            return
        }
        message(getString(R.string.satellite_gps_searching, (PhoneLocation.TIMEOUT_MS / 1000).toInt()))
        val search = PhoneLocation(this, { progress -> if (!isDestroyed) showProgress(progress) }) { fix, live ->
            if (!isDestroyed) showFix(fix, live)
        }
        phoneLocation = search
        search.start()
    }

    private fun showProgress(progress: SearchProgress) {
        val seconds = ((progress.remainingMs + 999) / 1000).toInt()
        message(getString(if (progress.haveFix) R.string.satellite_gps_refining else R.string.satellite_gps_searching, seconds))
    }

    private fun showFix(fix: PositionFix?, live: Boolean) {
        if (fix == null) {
            message(getString(if (live) R.string.satellite_gps_timeout else R.string.satellite_gps_none))
            return
        }
        val now = System.currentTimeMillis()
        if (fix.ageMs(now) <= LocationSelector.FRESH_MS) PhoneLocation.saveLast(this, fix)
        collect()
        latitude = String.format(Locale.ROOT, "%.5f", fix.latitude)
        longitude = String.format(Locale.ROOT, "%.5f", fix.longitude)
        fix.altitudeM?.let { heightKm = String.format(Locale.ROOT, "%.3f", it / 1000) }
        locator = Maidenhead.fromLatLon(fix.latitude, fix.longitude)
        approximate = false
        if (step == 2) render()
        val accuracy = fix.accuracyM?.let { String.format(Locale.ROOT, "%.0f m", it) } ?: "?"
        val note = if (PhoneLocation.precise(this)) "" else " " + getString(R.string.satellite_gps_approximate)
        message(getString(R.string.satellite_gps_fix_detail, fix.source, accuracy, fix.ageMs(now) / 1000) + note)
    }

    @Deprecated("Platform callback")
    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode != LOCATION_REQUEST) return
        if (grantResults.any { it == PackageManager.PERMISSION_GRANTED }) useGps() else message(getString(R.string.satellite_gps_denied))
    }

    private fun catStep() {
        val chosen = radio ?: return
        note(R.string.profile_cat_help)
        if (chosen.transports.isEmpty()) {
            note(R.string.profile_cat_none)
            return
        }
        label(R.string.profile_transport_label)
        if (chosen.transports.size == 1) {
            body.addView(Brand.text(this, 16f).apply { text = getString(chosen.transports.single().label) })
        } else {
            val group = RadioGroup(this).apply { contentDescription = getString(R.string.profile_transport_label) }
            for (option in chosen.transports) group.addView(choice(getString(option.label), option == transport) { transport = option })
            body.addView(group)
        }
        if (chosen.rig != null) baudEdit = edit(R.string.rig_baud_hint, baud, InputType.TYPE_CLASS_NUMBER)
        if (chosen.usesCivAddress) {
            civEdit = edit(R.string.rig_address_hint, civ, InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_FLAG_CAP_CHARACTERS)
        }
        if (transport == CatTransport.NETWORK) {
            hostEdit = edit(R.string.aprs_chat_host, host, InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_URI)
            portEdit = edit(R.string.aprs_chat_port, port, InputType.TYPE_CLASS_NUMBER)
        }
        if (transport == CatTransport.BLE) note(R.string.profile_test_ble_help)
        body.addView(Brand.button(this, getString(R.string.profile_test)) { testConnection() })
    }

    /** Copies the visible fields into the draft so stepping back and forth keeps what was typed. */
    private fun collect() {
        callEdit?.let { callsign = it.text.toString() }
        baudEdit?.let { baud = it.text.toString() }
        civEdit?.let { civ = it.text.toString() }
        hostEdit?.let { host = it.text.toString() }
        portEdit?.let { port = it.text.toString() }
        latEdit?.let { latitude = it.text.toString() }
        lonEdit?.let { longitude = it.text.toString() }
        heightEdit?.let { heightKm = it.text.toString() }
        locEdit?.let { locator = it.text.toString() }
    }

    private fun draft() = StationProfile(radio, callsign, transport, baud.trim().toIntOrNull() ?: 0, civ, host, port,
        latitude, longitude, heightKm, locator, approximate)

    private fun next() {
        collect()
        try {
            when (step) {
                0 -> requireNotNullUi(radio) { UiText(R.string.profile_radio_required) }
                1 -> callsign = Callsign.normalize(callsign)
                2 -> draft().validatedLocation().let {
                    latitude = it.latitude; longitude = it.longitude; heightKm = it.heightKm
                    locator = it.locator; approximate = it.approximate
                }
                else -> {
                    ProfileStore.save(this, draft())
                    setResult(RESULT_OK)
                    finish()
                    return
                }
            }
        } catch (error: IllegalArgumentException) {
            message(errorText(error))
            return
        }
        step++
        message("")
        render()
    }

    private fun testConnection() {
        collect()
        if (testing) return
        val profile = try { draft().validatedCat() } catch (error: IllegalArgumentException) {
            message(errorText(error)); return
        }
        when (profile.transport) {
            // The BLE link is scanned and opened by the RT-950 screen itself.
            CatTransport.BLE -> {
                message(getString(R.string.profile_test_ble))
                startActivity(Intent(this, Rt950Activity::class.java))
            }
            CatTransport.NETWORK -> runNetworkProbe(profile)
            CatTransport.USB_SERIAL, CatTransport.USB_CDC -> chooseUsb(profile)
            null -> message(getString(R.string.profile_cat_none))
        }
    }

    private fun runNetworkProbe(profile: StationProfile) {
        testing = true
        message(getString(R.string.profile_test_running))
        worker.execute {
            val result = try {
                TcpKissLink.connect(profile.host, TcpKissLink.parsePort(profile.port)).close()
                getString(R.string.profile_test_network_ok, "${profile.host.trim()}:${profile.port.trim()}")
            } catch (error: Exception) { errorText(error) }
            mainHandler.post { testing = false; message(result) }
        }
    }

    private fun usbCandidates(profile: StationProfile) = manager.deviceList.values.filter {
        if (profile.transport == CatTransport.USB_CDC) CdcRadio.compatible(it)
        else SerialRadio.description(it) != null && !CdcRadio.compatible(it)
    }.sortedBy { it.deviceName }

    private fun chooseUsb(profile: StationProfile) {
        val devices = usbCandidates(profile)
        if (devices.isEmpty()) { message(getString(R.string.profile_test_no_usb)); return }
        AlertDialog.Builder(this).setTitle(R.string.usb_select_device)
            .setItems(devices.map { "VID %04X PID %04X - %s".format(it.vendorId, it.productId, SerialRadio.description(it)) }.toTypedArray()) { _, index ->
                requestUsbPermission(devices[index], profile)
            }.show()
    }

    private fun requestUsbPermission(device: UsbDevice, profile: StationProfile) {
        requested = device
        requestedProfile = profile
        if (manager.hasPermission(device)) { runProbe(device, profile); return }
        val flags = PendingIntent.FLAG_UPDATE_CURRENT or if (Build.VERSION.SDK_INT >= 31) PendingIntent.FLAG_MUTABLE else 0
        try {
            manager.requestPermission(device, PendingIntent.getBroadcast(this, 14, Intent(USB_PERMISSION).setPackage(packageName), flags))
            message(getString(R.string.cat_waiting_permission))
        } catch (error: SecurityException) {
            message(getString(R.string.cat_permission_error, errorText(error)))
        }
    }

    private fun runProbe(device: UsbDevice, profile: StationProfile) {
        if (testing) return
        testing = true
        message(getString(R.string.profile_test_running))
        worker.execute {
            val result = try { probe(device, profile) } catch (error: Exception) { errorText(error) }
            mainHandler.post { testing = false; message(result) }
        }
    }

    /** Worker thread: opens the port with the radio's own settings, identifies it as the radio screen does, and closes it. */
    private fun probe(device: UsbDevice, profile: StationProfile): String {
        val chosen = requireNotNull(profile.radio)
        var link: RadioBytes? = null
        try {
            val identity = when {
                chosen.rig != null -> {
                    val model = chosen.rig
                    link = SerialRadio.open(manager, device, rigSerialSettings(model, profile.baud, 0, SerialRadio.enhancedPort(device)))
                    openRig(model, link, profile.civAddress.toInt(16)).identify()
                }
                chosen == ProfileRadio.UVK5 -> {
                    link = SerialRadio.open(manager, device, SerialRadio.quanshengSettings(device))
                    CatProtocol(link).identify()
                }
                else -> {
                    link = CdcRadio.open(manager, device)
                    OpenGd77Link(link).identify().let { "${it.model.name} ${it.firmware} ${it.build}" }
                }
            }
            ProfileStore.saveUsbDevice(this, UsbIdentity.of(device, 0))
            return getString(R.string.profile_test_ok, identity)
        } finally {
            try { link?.close() } catch (_: IOException) { }
        }
    }
}
