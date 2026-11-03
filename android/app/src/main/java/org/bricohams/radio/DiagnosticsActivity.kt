package org.bricohams.radio

import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.graphics.Color
import android.hardware.usb.UsbDevice
import android.hardware.usb.UsbManager
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.Gravity
import android.view.ViewGroup
import android.view.WindowInsets
import android.view.WindowManager
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import java.net.Inet4Address
import java.net.NetworkInterface
import java.text.DateFormat
import java.util.Date
import java.util.concurrent.Executors

/**
 * "Puente / Diagnostico": lists the USB serial adapters, recognises each radio, runs the receive-only self-test and offers an
 * optional raw TCP bridge. All USB I/O runs on [worker]; the bridge only lives while this screen is visible (no background
 * service, so there is no Android 14 foreground-service type to declare).
 */
class DiagnosticsActivity : LocalizedActivity() {
    companion object {
        private const val USB_PERMISSION = "org.bricohams.radio.DIAG_USB_PERMISSION"
    }

    private val worker = Executors.newSingleThreadExecutor()
    private val mainHandler = Handler(Looper.getMainLooper())
    private val manager by lazy { getSystemService(USB_SERVICE) as UsbManager }
    private lateinit var content: LinearLayout
    private lateinit var status: TextView
    private lateinit var devicesBox: LinearLayout
    private lateinit var resultsBox: TextView
    private lateinit var bridgeStatus: TextView
    private var entries: List<Pair<UsbDevice, UsbEntry>> = emptyList()
    private val results = ArrayList<DiagResult>()
    private val firmwareLines = java.util.concurrent.CopyOnWriteArrayList<String>()
    private val queue = ArrayDeque<UsbDevice>()
    private var awaiting: UsbDevice? = null
    private var onGranted: ((UsbDevice) -> Unit)? = null
    @Volatile private var running = false
    @Volatile private var bridge: TcpBridge? = null
    @Volatile private var bridgeRadio: RadioBytes? = null
    private var foreground = false

    private val permissionReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            if (intent.action != USB_PERMISSION) return
            @Suppress("DEPRECATION")
            val device = intent.getParcelableExtra<UsbDevice>(UsbManager.EXTRA_DEVICE)
            val wanted = awaiting
            if (device == null || wanted == null || device.deviceName != wanted.deviceName) return
            awaiting = null
            val action = onGranted
            if (manager.hasPermission(device)) action?.invoke(device) else {
                status.setText(R.string.cat_permission_denied)
                running = false
                if (queue.isNotEmpty()) { running = true; nextInQueue() }
            }
        }
    }
    private val usbChange = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            if (foreground && !running) refreshDevices()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        content = MaxWidthLinearLayout(this, 900).apply {
            orientation = LinearLayout.VERTICAL
            val padding = Brand.dp(this@DiagnosticsActivity, 16)
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
        content.addView(Brand.heading(this, getString(R.string.diag_title)))
        status = Brand.text(this, 16f).apply { setText(R.string.diag_intro) }
        content.addView(status)
        content.addView(Brand.button(this, getString(R.string.diag_refresh)) { refreshDevices() })
        devicesBox = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        content.addView(devicesBox)
        content.addView(Brand.button(this, getString(R.string.diag_run_all), primary = true) { runAll() })
        content.addView(Brand.text(this, 14f).apply { setText(R.string.diag_run_all_hint) })
        for (module in QuanshengModule.values()) {
            content.addView(Brand.button(this, getString(module.title)) { runModule(module) })
        }
        resultsBox = Brand.text(this, 14f).apply {
            typeface = android.graphics.Typeface.MONOSPACE
            setTextIsSelectable(true)
        }
        content.addView(Brand.card(this).apply { addView(resultsBox) })
        content.addView(Brand.button(this, getString(R.string.diag_save_report)) { saveReport() })
        content.addView(Brand.button(this, getString(R.string.diag_share)) { share() })

        content.addView(Brand.heading(this, getString(R.string.diag_bridge_title)))
        content.addView(Brand.card(this).apply {
            addView(Brand.text(this@DiagnosticsActivity, 15f, Brand.Palette(this@DiagnosticsActivity).accent).apply {
                setText(R.string.diag_bridge_warning)
            })
        })
        bridgeStatus = Brand.text(this, 15f).apply { setText(R.string.diag_bridge_off) }
        content.addView(bridgeStatus)
        content.addView(Brand.button(this, getString(R.string.diag_bridge_stop)) {
            stopBridge(); bridgeStatus.setText(R.string.diag_bridge_off)
        })
        setContentView(ScrollView(this).apply {
            addView(content, FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT, Gravity.CENTER_HORIZONTAL))
        })
        refreshDevices()
    }

    private fun entry(device: UsbDevice): UsbEntry {
        val name = try { device.productName } catch (_: SecurityException) { null } ?: device.deviceName
        return UsbEntry(name, device.vendorId, device.productId, SerialRadio.description(device), SerialRadio.portCount(device),
            RadioIdentifier.identify(device.vendorId, device.productId))
    }

    private fun refreshDevices() {
        entries = manager.deviceList.values.filter { SerialRadio.description(it) != null }.map { it to entry(it) }
        devicesBox.removeAllViews()
        if (entries.isEmpty()) {
            devicesBox.addView(Brand.text(this, 15f).apply { setText(R.string.diag_no_devices) })
            return
        }
        for ((device, info) in entries) {
            devicesBox.addView(Brand.card(this).apply {
                val ids = String.format(java.util.Locale.ROOT, "%04X:%04X", info.vendorId, info.productId)
                addView(Brand.text(this@DiagnosticsActivity, 16f, bold = true).apply { text = "${info.name} ($ids)" })
                val kind = if (info.kind == RadioKind.UNKNOWN) getString(R.string.diag_kind_unknown) else info.kind.label
                    .let { if (info.kind == RadioKind.YAESU_HRI) "$it (no CAT)" else it }
                addView(Brand.text(this@DiagnosticsActivity, 14f).apply {
                    text = getString(R.string.diag_device_line, kind, info.driver ?: "-", info.ports)
                })
                if (info.kind.probeable) {
                    addView(Brand.row(this@DiagnosticsActivity,
                        Brand.button(this@DiagnosticsActivity, getString(R.string.diag_test_one)) { runOne(device) },
                        Brand.button(this@DiagnosticsActivity, getString(R.string.diag_bridge_start)) { startBridge(device) }))
                }
            })
        }
    }

    private fun runAll() {
        if (running) return
        val targets = entries.filter { it.second.kind.probeable }.map { it.first }
        if (targets.isEmpty()) { status.setText(R.string.diag_no_devices); return }
        begin(targets)
    }

    private fun runOne(device: UsbDevice) {
        if (!running) begin(listOf(device))
    }

    private fun begin(targets: List<UsbDevice>) {
        results.clear(); resultsBox.text = ""
        stopBridge()
        queue.clear(); queue.addAll(targets)
        running = true
        nextInQueue()
    }

    private fun nextInQueue() {
        val device = queue.removeFirstOrNull()
        if (device == null) {
            running = false
            status.setText(R.string.diag_done)
            if (results.isNotEmpty()) saveReport()
            return
        }
        status.text = getString(R.string.diag_running, entry(device).name)
        withPermission(device) { granted -> worker.execute { test(granted) } }
    }

    private fun withPermission(device: UsbDevice, action: (UsbDevice) -> Unit) {
        if (manager.hasPermission(device)) { action(device); return }
        awaiting = device
        onGranted = action
        val flags = PendingIntent.FLAG_UPDATE_CURRENT or if (Build.VERSION.SDK_INT >= 31) PendingIntent.FLAG_MUTABLE else 0
        val intent = Intent(USB_PERMISSION).setPackage(packageName)
        try {
            manager.requestPermission(device, PendingIntent.getBroadcast(this, 14, intent, flags))
            status.setText(R.string.cat_waiting_permission)
        } catch (error: SecurityException) {
            awaiting = null
            running = false
            status.text = getString(R.string.cat_permission_error, errorText(error))
        }
    }

    private fun openFor(device: UsbDevice, kind: RadioKind, baud: Int? = null): RadioBytes {
        val model = kind.model
        val settings = when {
            kind == RadioKind.QUANSHENG -> SerialRadio.quanshengSettings(device)
            model == null -> SerialSettings()
            else -> rigSerialSettings(model, baud ?: model.defaultBaud, 0, SerialRadio.enhancedPort(device))
        }
        return SerialRadio.open(manager, device, settings)
    }

    private fun test(device: UsbDevice) {
        val info = entry(device)
        val runner = DiagnosticsRunner({ getString(it) }, { errorText(it) })
        val found: List<DiagResult> = try {
            if (info.kind == RadioKind.QUANSHENG) attemptQuansheng(runner, device) else {
                val first = attempt(runner, device, info.kind, null)
                // (tr)uSDX runs at 115200 (measured); 38400 is only a fallback probe for older firmware.
                val best = if (info.kind == RadioKind.TRUSDX && !first.passed) {
                    val second = attempt(runner, device, info.kind, 38400)
                    if (second.passed) second else first
                } else first
                // CH340 1A86:7523 is shared by the (tr)uSDX and the Quansheng programming cable: try the radio hello too.
                if (info.kind == RadioKind.TRUSDX && !best.passed) {
                    val quansheng = attemptQuansheng(runner, device)
                    if (quansheng.firstOrNull()?.steps?.firstOrNull()?.ok == true) quansheng else listOf(best)
                } else listOf(best)
            }
        } catch (error: Exception) {
            listOf(DiagResult(info.kind.label, listOf(DiagStep(getString(R.string.diag_step_open), false, errorText(error)))))
        }
        mainHandler.post {
            if (isDestroyed) return@post
            results.addAll(found)
            renderResults()
            nextInQueue()
        }
    }

    /** Every Quansheng module, one after another, on a single USB session (read-only; USB-C CDC or CH340 jack lines). */
    private fun attemptQuansheng(runner: DiagnosticsRunner, device: UsbDevice): List<DiagResult> {
        val link = openFor(device, RadioKind.QUANSHENG, null)
        try {
            val memory = QuanshengMemory(link)
            val results = runner.runQuanshengAll(memory, CatProtocol(link))
            noteQuansheng(device, memory)
            return results
        } finally {
            try { link.close() } catch (_: java.io.IOException) { }
        }
    }

    /** Hello string and (when readable, read-only) the slot-header CRC are tracked separately so a failed slot read never looks like a change. */
    private fun noteQuansheng(device: UsbDevice, memory: QuanshengMemory) {
        if (memory.firmware.isEmpty()) return
        noteFirmware(device, RadioKind.QUANSHENG.label, memory.firmware)
        val slots = try { QuanshengReadOnly(memory).slots() } catch (_: Exception) { null }
        FirmwareTracker.slotsFingerprint(slots)?.let { noteFirmware(device, RadioKind.QUANSHENG.label + " (slots)", it) }
    }

    /** Remembers the firmware per radio (USB ids + serial); a different value than last time is announced and added to the report. */
    private fun noteFirmware(device: UsbDevice, label: String, firmware: String?) {
        if (firmware.isNullOrBlank()) return
        val serial = try { device.serialNumber } catch (_: SecurityException) { null }
        val key = FirmwareTracker.radioKey(device.vendorId, device.productId, serial) + "|" + label
        firmwareLines.add("$label: $firmware")
        val change = FirmwareTracker.record(PrefsStore(this, "firmware-control"), key, label, firmware) ?: return
        firmwareLines.add("CAMBIO DE FIRMWARE en ${change.radio}: antes ${change.before}, ahora ${change.now}. Revalidar pruebas y ajustes.")
        mainHandler.post { if (!isDestroyed) ReleaseNotices.showFirmwareChanges(this, listOf(change)) }
    }

    private fun quanshengCandidate(): UsbDevice? = entries.firstOrNull {
        it.second.kind == RadioKind.QUANSHENG ||
            (it.second.vendorId == RadioIdentifier.CH340_VID && it.second.productId == RadioIdentifier.CH340_PID)
    }?.first

    /** Step by step: one Quansheng module per button press. */
    private fun runModule(module: QuanshengModule) {
        if (running) return
        val device = quanshengCandidate()
        if (device == null) { status.setText(R.string.diag_no_devices); return }
        running = true
        stopBridge()
        status.text = getString(R.string.diag_running, getString(module.title))
        withPermission(device) { granted -> worker.execute { testModule(granted, module) } }
    }

    private fun testModule(device: UsbDevice, module: QuanshengModule) {
        val runner = DiagnosticsRunner({ getString(it) }, { errorText(it) })
        val result = try {
            val link = openFor(device, RadioKind.QUANSHENG, null)
            try {
                val memory = QuanshengMemory(link)
                val outcome = runner.runQuanshengModule(module, memory, CatProtocol(link))
                noteQuansheng(device, memory)
                outcome
            } finally {
                try { link.close() } catch (_: java.io.IOException) { }
            }
        } catch (error: Exception) {
            DiagResult(getString(module.title), listOf(DiagStep(getString(R.string.diag_step_open), false, errorText(error))))
        }
        mainHandler.post {
            if (isDestroyed) return@post
            results.add(result)
            renderResults()
            running = false
            status.setText(R.string.diag_done)
        }
    }

    private fun saveReport() {
        renderResults()
        status.text = try {
            val directory = java.io.File(getExternalFilesDir(null) ?: filesDir, "diagnostics").apply { mkdirs() }
            val file = java.io.File(directory, "radicodex-diag-" +
                java.text.SimpleDateFormat("yyyyMMdd-HHmmss", java.util.Locale.ROOT).format(Date()) + ".txt")
            file.writeText(resultsBox.text.toString())
            getString(R.string.diag_report_saved, file.absolutePath)
        } catch (error: java.io.IOException) {
            getString(R.string.diag_report_save_error, errorText(error))
        }
    }

    private fun attempt(runner: DiagnosticsRunner, device: UsbDevice, kind: RadioKind, baud: Int?): DiagResult {
        val link = openFor(device, kind, baud)
        try {
            return if (kind == RadioKind.QUANSHENG) runner.runQuansheng(CatProtocol(link))
            else {
                val rig = openRig(requireNotNull(kind.model), link)
                val result = runner.runRig(rig, kind.label)
                // Only when identification worked: asking a silent radio again would just repeat the failure.
                if (result.steps.firstOrNull()?.ok == true) {
                    val version = try { rig.firmwareVersion() } catch (_: Exception) { null }
                    noteFirmware(device, kind.label, version)
                }
                result
            }
        } finally {
            try { link.close() } catch (_: java.io.IOException) { }
        }
    }

    private fun renderResults() {
        resultsBox.text = DiagnosticsReport.build(versionName(), "${Build.MANUFACTURER} ${Build.MODEL} (Android ${Build.VERSION.RELEASE})",
            DateFormat.getDateTimeInstance().format(Date()), entries.map { it.second }, results, firmwareLines.distinct())
    }

    private fun versionName(): String = runCatching { VersionTracker.running(this).let { "${it.name} (codigo ${it.code})" } }.getOrNull() ?: "?"

    private fun share() {
        renderResults()
        val send = Intent(Intent.ACTION_SEND).setType("text/plain")
            .putExtra(Intent.EXTRA_SUBJECT, getString(R.string.diag_title))
            .putExtra(Intent.EXTRA_TEXT, resultsBox.text.toString())
        startActivity(Intent.createChooser(send, getString(R.string.diag_share)))
    }

    private fun startBridge(device: UsbDevice) {
        if (running) return
        running = true
        withPermission(device) { granted ->
            worker.execute {
                try {
                    stopBridgeBlocking()
                    val kind = entry(granted).kind
                    val link = openFor(granted, kind)
                    val server = TcpBridge(link, onClient = { who ->
                        mainHandler.post { bridgeStatus.text = who?.let { getString(R.string.diag_bridge_client, it) } ?: lanText() }
                    })
                    server.start()
                    bridgeRadio = link
                    bridge = server
                    mainHandler.post {
                        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
                        bridgeStatus.text = lanText()
                    }
                } catch (error: Exception) {
                    mainHandler.post { bridgeStatus.text = getString(R.string.diag_bridge_error, errorText(error)) }
                } finally {
                    running = false
                }
            }
        }
    }

    private fun lanText(): String {
        val addresses = try {
            NetworkInterface.getNetworkInterfaces().toList().filter { it.isUp && !it.isLoopback }
                .flatMap { it.inetAddresses.toList() }.filterIsInstance<Inet4Address>().map { it.hostAddress }
        } catch (_: java.io.IOException) { emptyList() }
        return getString(R.string.diag_bridge_on, addresses.joinToString().ifEmpty { "?" }, bridge?.localPort ?: TcpBridge.DEFAULT_PORT)
    }

    private fun stopBridge() {
        window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        worker.execute { stopBridgeBlocking() }
    }

    private fun stopBridgeBlocking() {
        bridge?.stop(); bridge = null
        try { bridgeRadio?.close() } catch (_: java.io.IOException) { }
        bridgeRadio = null
    }

    private fun register(receiver: BroadcastReceiver, filter: IntentFilter) {
        if (Build.VERSION.SDK_INT >= 33) registerReceiver(receiver, filter, RECEIVER_NOT_EXPORTED)
        else {
            @Suppress("UnspecifiedRegisterReceiverFlag")
            registerReceiver(receiver, filter)
        }
    }

    override fun onStart() {
        super.onStart()
        foreground = true
        register(permissionReceiver, IntentFilter(USB_PERMISSION))
        register(usbChange, IntentFilter(UsbManager.ACTION_USB_DEVICE_ATTACHED).apply {
            addAction(UsbManager.ACTION_USB_DEVICE_DETACHED)
        })
        refreshDevices()
    }

    override fun onStop() {
        foreground = false
        unregisterReceiver(permissionReceiver)
        unregisterReceiver(usbChange)
        // The bridge never outlives the visible screen: nothing here keeps the process alive in the background.
        if (bridge != null) {
            stopBridge()
            bridgeStatus.setText(R.string.diag_bridge_off)
        }
        super.onStop()
    }

    override fun onDestroy() {
        worker.execute { stopBridgeBlocking() }
        worker.shutdown()
        super.onDestroy()
    }
}
