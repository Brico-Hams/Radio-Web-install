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
import android.text.InputType
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
 * Profile wizard, also used to edit the profile: Radio, then Callsign, then CAT control. Opened automatically on the first
 * launch (no profile yet) and from the home screen afterwards. "Probar conexión" runs the radio's existing identify path.
 */
class ProfileActivity : LocalizedActivity() {
    companion object {
        private const val USB_PERMISSION = "org.bricohams.radio.PROFILE_USB_PERMISSION"
        private const val STEPS = 3
        private val STEP_NAMES = listOf(R.string.profile_step_radio, R.string.profile_step_callsign, R.string.profile_step_cat)
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
    private var callEdit: EditText? = null
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
        if (savedInstanceState != null) {
            step = savedInstanceState.getInt("step", 0).coerceIn(0, STEPS - 1)
            radio = ProfileRadio.values().firstOrNull { it.name == savedInstanceState.getString("radio") } ?: radio
            callsign = savedInstanceState.getString("callsign", callsign)
            transport = CatTransport.values().firstOrNull { it.name == savedInstanceState.getString("transport") } ?: transport
            baud = savedInstanceState.getString("baud", baud); civ = savedInstanceState.getString("civ", civ)
            host = savedInstanceState.getString("host", host); port = savedInstanceState.getString("port", port)
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
        body.addView(Brand.heading(this, getString(R.string.profile_title)))
        (status.parent as? LinearLayout)?.removeView(status)
        body.addView(status)
        body.addView(Brand.heading(this, getString(R.string.profile_step, step + 1, STEPS, getString(STEP_NAMES[step]))))
        when (step) {
            0 -> radioStep()
            1 -> callsignStep()
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
    }

    private fun draft() = StationProfile(radio, callsign, transport, baud.trim().toIntOrNull() ?: 0, civ, host, port)

    private fun next() {
        collect()
        try {
            when (step) {
                0 -> requireNotNullUi(radio) { UiText(R.string.profile_radio_required) }
                1 -> callsign = Callsign.normalize(callsign)
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
