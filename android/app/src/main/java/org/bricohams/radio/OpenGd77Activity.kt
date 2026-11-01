package org.bricohams.radio

import android.app.AlertDialog
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.graphics.Bitmap
import android.hardware.usb.UsbDevice
import android.hardware.usb.UsbManager
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.widget.Button
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import java.util.concurrent.Executors

/**
 * OpenGD77 over USB CDC: identify, live screen and UTC clock (for the radio's own satellite predictions and Doppler).
 * Every function the firmware cannot do over USB is listed as unsupported for the detected model instead of faked.
 */
class OpenGd77Activity : LocalizedActivity() {
    private val worker = Executors.newSingleThreadExecutor()
    private val mainHandler = Handler(Looper.getMainLooper())
    private val manager by lazy { getSystemService(USB_SERVICE) as UsbManager }
    private lateinit var status: TextView
    private lateinit var screen: ImageView
    private lateinit var capabilities: TextView
    private val controls = ArrayList<Button>()
    private var requested: UsbDevice? = null
    @Volatile private var transport: RadioBytes? = null
    @Volatile private var link: OpenGd77Link? = null
    @Volatile private var busy = false
    private val permissionReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            if (intent.action != USB_PERMISSION) return
            val device = requested ?: return
            if (manager.hasPermission(device)) connect(device) else status.setText(R.string.cat_permission_denied)
        }
    }
    private val detachReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            @Suppress("DEPRECATION")
            val device = intent.getParcelableExtra<UsbDevice>(UsbManager.EXTRA_DEVICE)
            if (device?.deviceName == requested?.deviceName) operation { closeRadio(); getString(R.string.cat_usb_detached) }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val colors = Brand.Palette(this)
        val content = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            val padding = Brand.dp(this@OpenGd77Activity, 16)
            setPadding(padding, padding, padding, padding)
            setBackgroundColor(colors.background)
        }
        content.addView(Brand.heading(this, getString(R.string.gd77_title)))
        status = Brand.text(this).apply { setText(R.string.gd77_intro); accessibilityLiveRegion = android.view.View.ACCESSIBILITY_LIVE_REGION_POLITE }
        content.addView(status)
        content.addView(Brand.text(this, 14f, colors.muted).apply { setText(R.string.gd77_help) })
        fun button(label: Int, primary: Boolean = false, action: () -> Unit) =
            Brand.button(this, getString(label), primary, action).also { controls.add(it); content.addView(it) }
        button(R.string.cat_choose_device, true) { chooseDevice() }
        button(R.string.gd77_screen) { operation { connected().readScreen().let { pixels -> showScreen(pixels); getString(R.string.gd77_screen_done) } } }
        button(R.string.gd77_clock) {
            operation {
                val seconds = System.currentTimeMillis() / 1000
                connected().syncClock(seconds)
                getString(R.string.gd77_clock_done, java.time.Instant.ofEpochSecond(seconds).toString())
            }
        }
        button(R.string.gd77_ping) { operation { connected().ping(); getString(R.string.gd77_ping_done) } }
        button(R.string.usb_disconnect) { operation { closeRadio(); getString(R.string.gd77_intro) } }
        screen = ImageView(this).apply {
            adjustViewBounds = true
            contentDescription = getString(R.string.gd77_screen_description)
            scaleType = ImageView.ScaleType.FIT_CENTER
        }
        content.addView(screen)
        capabilities = Brand.text(this, 14f)
        content.addView(Brand.card(this).apply { addView(capabilities) })
        setContentView(ScrollView(this).apply { setBackgroundColor(colors.background); addView(content) })
    }

    override fun onStart() {
        super.onStart()
        val detached = IntentFilter(UsbManager.ACTION_USB_DEVICE_DETACHED)
        if (Build.VERSION.SDK_INT >= 33) {
            registerReceiver(permissionReceiver, IntentFilter(USB_PERMISSION), RECEIVER_NOT_EXPORTED)
            registerReceiver(detachReceiver, detached, RECEIVER_NOT_EXPORTED)
        } else {
            @Suppress("UnspecifiedRegisterReceiverFlag")
            registerReceiver(permissionReceiver, IntentFilter(USB_PERMISSION))
            @Suppress("UnspecifiedRegisterReceiverFlag")
            registerReceiver(detachReceiver, detached)
        }
    }
    override fun onStop() {
        unregisterReceiver(permissionReceiver)
        unregisterReceiver(detachReceiver)
        super.onStop()
    }
    override fun onDestroy() {
        worker.execute { closeRadio() }
        worker.shutdown()
        super.onDestroy()
    }

    private fun connected(): OpenGd77Link {
        checkUi(link?.info != null) { UiText(R.string.gd77_err_not_connected) }
        return link!!
    }
    private fun chooseDevice() {
        if (busy) return
        val devices = manager.deviceList.values.filter { CdcRadio.compatible(it) }.sortedBy { it.deviceName }
        if (devices.isEmpty()) {
            status.setText(R.string.gd77_no_devices)
            return
        }
        AlertDialog.Builder(this).setTitle(R.string.usb_select_device)
            .setItems(devices.map { "VID %04X PID %04X - %s".format(it.vendorId, it.productId, it.deviceName) }.toTypedArray()) { _, index ->
                requestUsbPermission(devices[index])
            }.show()
    }
    private fun requestUsbPermission(device: UsbDevice) {
        requested = device
        if (manager.hasPermission(device)) { connect(device); return }
        val flags = PendingIntent.FLAG_UPDATE_CURRENT or if (Build.VERSION.SDK_INT >= 31) PendingIntent.FLAG_MUTABLE else 0
        try {
            manager.requestPermission(device, PendingIntent.getBroadcast(this, 12, Intent(USB_PERMISSION).setPackage(packageName), flags))
            status.setText(R.string.cat_waiting_permission)
        } catch (error: SecurityException) {
            status.text = getString(R.string.cat_permission_error, errorText(error))
        }
    }
    private fun connect(device: UsbDevice) = operation {
        closeRadio()
        val opened = CdcRadio.open(manager, device)
        transport = opened
        val info = OpenGd77Link(opened).also { link = it }.identify()
        mainHandler.post { showCapabilities(info.model) }
        getString(R.string.gd77_connected, info.model.name, info.firmware, info.build)
    }
    private fun closeRadio() {
        link = null
        val old = transport ?: return
        transport = null
        old.close()
    }
    private fun showScreen(pixels: IntArray) {
        val model = connected().info!!.model
        val size = model.screen ?: return
        val bitmap = Bitmap.createBitmap(pixels, size.width, size.height, Bitmap.Config.ARGB_8888)
        mainHandler.post { screen.setImageBitmap(bitmap) }
    }
    private fun showCapabilities(model: OpenGd77.Model) {
        capabilities.text = getString(R.string.gd77_capabilities_title, model.name) + "\n\n" +
            OpenGd77.Function.values().joinToString("\n\n") { function ->
                val reason = OpenGd77.unsupportedReason(model, function)
                val state = getString(if (reason == null) R.string.gd77_supported else R.string.gd77_unsupported)
                "${getString(LABELS.getValue(function))}: $state" + (reason?.let { "\n${getString(it)}" } ?: "")
            }
    }
    /** Radio I/O runs on [worker]; a failure closes the port so the next action starts from a clean connection. */
    private fun operation(block: () -> String?) {
        if (busy) return
        busy = true
        controls.forEach { it.isEnabled = false }
        worker.execute {
            val message = try {
                block()
            } catch (error: Exception) {
                if (error is java.io.IOException) try { closeRadio() } catch (cleanup: Exception) { error.addSuppressed(cleanup) }
                errorText(error)
            }
            mainHandler.post {
                busy = false
                controls.forEach { it.isEnabled = true }
                if (message != null) status.text = message
            }
        }
    }

    companion object {
        const val USB_PERMISSION = "org.bricohams.radio.GD77_USB_PERMISSION"
        val LABELS = mapOf(
            OpenGd77.Function.FREQUENCY to R.string.gd77_fn_frequency,
            OpenGd77.Function.DOPPLER to R.string.gd77_fn_doppler,
            OpenGd77.Function.CHANNEL to R.string.gd77_fn_channel,
            OpenGd77.Function.PTT to R.string.gd77_fn_ptt,
            OpenGd77.Function.IDENTIFY to R.string.gd77_fn_identify,
            OpenGd77.Function.SCREEN to R.string.gd77_fn_screen,
            OpenGd77.Function.CLOCK to R.string.gd77_fn_clock,
            OpenGd77.Function.CODEPLUG to R.string.gd77_fn_codeplug,
            OpenGd77.Function.KEPS to R.string.gd77_fn_keps
        )
    }
}
