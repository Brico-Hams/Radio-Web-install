package org.bricohams.radio

import android.app.Activity
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
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import android.view.WindowInsets
import java.io.IOException
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit

class CatActivity : Activity() {
    private val worker = Executors.newSingleThreadScheduledExecutor()
    private val manager by lazy { getSystemService(USB_SERVICE) as UsbManager }
    private lateinit var status: TextView
    private var requested: UsbDevice? = null
    private var permissionResult = false
    private var transport: RadioBytes? = null
    private var protocol: CatProtocol? = null
    private var busy = false
    @Volatile private var foreground = false
    @Volatile private var generation = 0
    private val controls = ArrayList<Button>()
    private var selectedPlan: SatellitePlan? = null
    @Volatile private var trackingRequested = false
    @Volatile private var tracker: SatelliteTracking? = null
    private var orbit: SatelliteOrbit? = null
    private val detachReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            @Suppress("DEPRECATION")
            val device = intent.getParcelableExtra<UsbDevice>(UsbManager.EXTRA_DEVICE)
            if (intent.action == UsbManager.ACTION_USB_DEVICE_DETACHED && device?.deviceName == requested?.deviceName) {
                requested = null
                suspendConnection("USB desconectado. Vuelve a elegir el dispositivo antes de usar CAT.")
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val content = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            val padding = (16 * resources.displayMetrics.density).toInt()
            setPadding(padding, padding, padding, padding)
            setOnApplyWindowInsetsListener { view, insets ->
                if (Build.VERSION.SDK_INT >= 30) {
                    val bars = insets.getInsets(WindowInsets.Type.systemBars())
                    view.setPadding(bars.left + padding, bars.top + padding, bars.right + padding, bars.bottom + padding)
                } else {
                    @Suppress("DEPRECATION")
                    view.setPadding(insets.systemWindowInsetLeft + padding, insets.systemWindowInsetTop + padding,
                        insets.systemWindowInsetRight + padding, insets.systemWindowInsetBottom + padding)
                }
                insets
            }
        }
        status = TextView(this).apply {
            setText(R.string.cat_intro)
            textSize = 17f
        }
        content.addView(status)
        content.addView(TextView(this).apply {
            setText(R.string.cat_help)
        })
        fun button(label: String, action: () -> Unit) {
            val button = Button(this).apply { text = label; setOnClickListener { action() } }
            controls.add(button); content.addView(button)
        }
        button("Elegir dispositivo USB") { chooseDevice() }
        button("Consultar CAT RX") { operation { requireNotNull(protocol) { "Conecta primero USB." }.query() } }
        content.addView(TextView(this).apply { setText(R.string.cat_frequency_label) })
        val frequency = EditText(this).apply {
            id = R.id.cat_frequency
            hint = "145.80000"
            inputType = android.text.InputType.TYPE_CLASS_NUMBER or android.text.InputType.TYPE_NUMBER_FLAG_DECIMAL
        }
        content.addView(frequency)
        button("Sintonizar RX temporal (3 s)") {
            val value = frequency.text.toString().toBigDecimalOrNull()
            val scaled = value?.movePointRight(5)?.stripTrailingZeros()
            if (scaled == null || scaled.scale() > 0 || scaled < java.math.BigDecimal(13600000) ||
                scaled > java.math.BigDecimal(47000000) || !CatProtocol.inBand(scaled.toLong())) {
                status.setText(R.string.cat_invalid_frequency)
            } else operation { requireNotNull(protocol) { "Conecta primero USB." }.tune(scaled.longValueExact()) }
        }
        button("STOP: volver a RX nominal") { operation { requireNotNull(protocol) { "Conecta primero USB." }.stop() } }
        button("Desconectar USB") { operation { closeRadio(); null } }
        val planText = intent.getStringExtra("satellite-plan")
        if (planText != null) {
            try {
                selectedPlan = SatellitePlanJson.decode(planText)
                val plan = requireNotNull(selectedPlan)
                content.addView(TextView(this).apply {
                    text = getString(R.string.cat_selected_pass, plan.tle.name,
                        java.time.Instant.ofEpochMilli(plan.pass.aos.time).toString(),
                        java.time.Instant.ofEpochMilli(plan.pass.los.time).toString(),
                        plan.downlinkHz.toString())
                })
                button("Iniciar Doppler del pase seleccionado") { startTracking() }
                content.addView(Button(this).apply {
                    setText(R.string.cat_stop_tracking)
                    setOnClickListener {
                        trackingRequested = false
                        tracker?.cancel()
                        suspendConnection("Seguimiento detenido. Se intenta STOP y se cierra USB; reconecta antes de iniciar otra sesion.")
                    }
                })
            } catch (error: IllegalArgumentException) {
                status.text = getString(R.string.cat_plan_error, error.message)
            }
        }
        setContentView(ScrollView(this).apply { addView(content) })
    }

    private fun chooseDevice() {
        if (busy) return
        val devices = manager.deviceList.values.filter { SerialRadio.description(it) != null }.sortedBy { it.deviceName }
        if (devices.isEmpty()) {
            status.setText(R.string.cat_no_devices)
            return
        }
        AlertDialog.Builder(this).setTitle("Selecciona el dispositivo de radio")
            .setItems(devices.map { "VID %04X PID %04X - %s - %s".format(it.vendorId, it.productId, SerialRadio.description(it), it.deviceName) }.toTypedArray()) { _, index ->
                val device = devices[index]
                requested = device
                if (manager.hasPermission(device)) connect(device)
                else {
                    val flags = PendingIntent.FLAG_UPDATE_CURRENT or
                        if (Build.VERSION.SDK_INT >= 31) PendingIntent.FLAG_MUTABLE else 0
                    val intent = Intent(this, CatActivity::class.java).apply {
                        action = "org.bricohams.radio.USB_PERMISSION"
                        addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP)
                    }
                    try {
                        manager.requestPermission(device, PendingIntent.getActivity(this, 11, intent, flags))
                        status.setText(R.string.cat_waiting_permission)
                    } catch (error: SecurityException) {
                        status.text = getString(R.string.cat_permission_error, error.message)
                    }
                }
            }.show()
    }
    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        if (intent.action != "org.bricohams.radio.USB_PERMISSION") return
        @Suppress("DEPRECATION")
        val device = intent.getParcelableExtra<UsbDevice>(UsbManager.EXTRA_DEVICE)
        if (device == null || device.deviceName != requested?.deviceName) {
            status.setText(R.string.cat_stale_permission)
            return
        }
        permissionResult = true
        if (foreground) consumePermission()
    }
    private fun consumePermission() {
        if (!permissionResult) return
        permissionResult = false
        val device = requested
        if (device != null && manager.hasPermission(device)) connect(device)
        else status.setText(R.string.cat_permission_denied)
    }
    private fun connect(device: UsbDevice) {
        val token = generation
        operation {
            closeRadio()
            val port = SerialRadio.open(manager, device)
            transport = port
            val cat = CatProtocol(port, allowTune = { foreground && token == generation })
            protocol = cat
            cat.identify()
            cat.query()
        }
    }
    private fun operation(action: () -> CatState?) {
        if (busy || trackingRequested || !foreground) return
        busy = true
        controls.forEach { it.isEnabled = false }
        val token = generation
        worker.execute {
            if (token != generation) return@execute
            var message: String
            try {
                val state = action()
                message = if (state == null) "USB desconectado." else
                    "CAT v1 reconocido. Activo=${state.active}, remoto=${state.remote}, pendiente=${state.pending}, RX=${state.frequency10Hz * 10} Hz. Confirmacion de firmware, no medida RF."
            } catch (error: IOException) {
                message = fail(error)
            } catch (error: IllegalArgumentException) {
                message = fail(error)
            } catch (error: IllegalStateException) {
                message = fail(error)
            } catch (error: SecurityException) {
                message = fail(error)
            } catch (error: UnsupportedOperationException) {
                message = fail(error)
            }
            runOnUiThread {
                if (token == generation && !isDestroyed) {
                    busy = false; controls.forEach { it.isEnabled = true }; status.text = message
                }
            }
        }
    }
    private fun fail(error: Exception): String {
        val port = transport
        protocol = null; transport = null
        return try {
            port?.close()
            "CAT detenido y USB cerrado: ${error.message}. El lease de firmware restaura RX nominal si la radio sigue ejecutando SAT RX."
        } catch (cleanup: IOException) {
            "Error CAT: ${error.message}. Error al liberar USB: ${cleanup.message}. Comprueba la radio."
        }
    }
    private fun closeRadio() {
        val cat = protocol
        val port = transport
        protocol = null; transport = null
        var failure: Exception? = null
        try {
            if (cat != null) {
                val state = cat.query()
                if (state.active && (state.remote || state.pending)) cat.stop()
            }
        } catch (error: IOException) {
            failure = error
        } catch (error: IllegalArgumentException) {
            failure = error
        } catch (error: IllegalStateException) {
            failure = error
        } catch (error: SecurityException) {
            failure = error
        } catch (error: UnsupportedOperationException) {
            failure = error
        } finally {
            try { port?.close() } catch (error: IOException) {
                if (failure == null) failure = error else failure.addSuppressed(error)
            }
        }
        failure?.let { throw IOException("No se confirmo restauracion/cierre CAT: ${it.message}", it) }
    }
    override fun onStart() {
        super.onStart()
        foreground = true
        if (Build.VERSION.SDK_INT >= 33) {
            registerReceiver(detachReceiver, IntentFilter(UsbManager.ACTION_USB_DEVICE_DETACHED), RECEIVER_NOT_EXPORTED)
        } else {
            @Suppress("UnspecifiedRegisterReceiverFlag")
            registerReceiver(detachReceiver, IntentFilter(UsbManager.ACTION_USB_DEVICE_DETACHED))
        }
        consumePermission()
    }
    private fun suspendConnection(message: String) {
        trackingRequested = false
        tracker?.cancel()
        generation++
        val token = generation
        busy = false
        controls.forEach { it.isEnabled = true }
        worker.execute {
            disposeOrbit()
            try { closeRadio() } catch (error: IOException) {
                android.util.Log.e("BricohamsCAT", "No se confirmo STOP/cierre al ocultar pantalla", error)
                runOnUiThread {
                    if (token == generation && !isDestroyed)
                        status.text = getString(R.string.cat_stop_error, error.message)
                }
            }
        }
        status.text = message
    }
    private fun disposeOrbit() {
        tracker?.cancel()
        tracker = null
        orbit?.close()
        orbit = null
    }
    private fun startTracking() {
        if (busy || trackingRequested || !foreground) return
        val plan = selectedPlan ?: return
        val token = generation
        trackingRequested = true
        controls.forEach { it.isEnabled = false }
        status.setText(R.string.cat_tracking_start)
        worker.execute {
            if (token != generation || !trackingRequested) return@execute
            try {
                val cat = requireNotNull(protocol) { "Conecta USB antes de iniciar seguimiento." }
                val engine = SatelliteOrbit(plan.tle, plan.observer,
                    assets.open("satellite-6.0.1.js").bufferedReader().use { it.readText() },
                    assets.open("orbital-engine.js").bufferedReader().use { it.readText() })
                orbit = engine
                tracker = SatelliteTracking({ engine.target(plan, it) }, { frequency, permit -> cat.tune(frequency, permit) })
                trackingStep(token)
            } catch (error: IllegalArgumentException) { trackingError(token, error) }
            catch (error: IllegalStateException) { trackingError(token, error) }
            catch (error: IOException) { trackingError(token, error) }
        }
    }
    private fun trackingStep(token: Int) {
        if (token != generation || !trackingRequested) return
        try {
            val current = requireNotNull(tracker) { "Sesion de seguimiento inexistente." }
            val next = current.step()
            if (next != null && token == generation && trackingRequested) {
                runOnUiThread {
                    if (!isDestroyed && token == generation && trackingRequested)
                        status.text = getString(R.string.cat_tracking_status, next.frequency10Hz * 10, next.look.azimuth, next.look.elevation)
                }
                worker.schedule({ trackingStep(token) }, 750, TimeUnit.MILLISECONDS)
            }
        } catch (error: IllegalArgumentException) { trackingError(token, error) }
        catch (error: IllegalStateException) { trackingError(token, error) }
        catch (error: IOException) { trackingError(token, error) }
        catch (error: SecurityException) { trackingError(token, error) }
        catch (error: UnsupportedOperationException) { trackingError(token, error) }
    }
    private fun trackingError(token: Int, error: Exception) {
        if (token != generation) return
        trackingRequested = false
        disposeOrbit()
        var message = "Seguimiento detenido: ${error.message}."
        try { closeRadio() } catch (cleanup: IOException) {
            message += " STOP/cierre sin confirmar: ${cleanup.message}. Comprueba RX nominal."
        }
        val finalMessage = message
        runOnUiThread {
            if (!isDestroyed && token == generation) {
                controls.forEach { it.isEnabled = true }
                status.text = finalMessage
            }
        }
    }
    override fun onStop() {
        foreground = false
        unregisterReceiver(detachReceiver)
        suspendConnection("CAT suspendido. Volver requiere elegir y conectar USB de nuevo.")
        super.onStop()
    }
    override fun onDestroy() {
        worker.shutdown()
        super.onDestroy()
    }
}
