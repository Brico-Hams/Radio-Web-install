package org.bricohams.radio

import android.Manifest
import android.annotation.SuppressLint
import android.app.AlertDialog
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothGatt
import android.bluetooth.BluetoothGattCallback
import android.bluetooth.BluetoothGattCharacteristic
import android.bluetooth.BluetoothGattDescriptor
import android.bluetooth.BluetoothManager
import android.bluetooth.BluetoothProfile
import android.bluetooth.BluetoothStatusCodes
import android.bluetooth.le.ScanCallback
import android.bluetooth.le.ScanResult
import android.bluetooth.le.ScanSettings
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.View
import android.view.WindowInsets
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import java.util.UUID
import java.util.concurrent.Executors
import java.util.concurrent.LinkedBlockingQueue
import java.util.concurrent.TimeUnit

/**
 * Read-only GATT session for the undocumented Radtel RT-S10. It connects, lists the services and, only for the optional
 * identification handshake, subscribes to ffe1 and writes the handshake bytes that [Rt950Session.handshake] sends. It
 * never sends the RT-950 ff31 unlock and never writes anything else. The caller must hold BLUETOOTH_SCAN/CONNECT (API 31+)
 * or location (API 26-30) and must call [close].
 */
@SuppressLint("MissingPermission")
class RtS10Gatt(context: Context, private val address: String) : RadioBytes {
    private sealed class Event {
        class State(val status: Int, val state: Int) : Event()
        class Services(val status: Int) : Event()
        class Descriptor(val status: Int) : Event()
        class Written(val status: Int) : Event()
    }

    private val context = context.applicationContext
    private val events = LinkedBlockingQueue<Event>()
    /** Notification bytes; an empty array is the "link lost" sentinel. */
    private val data = LinkedBlockingQueue<ByteArray>()
    private var pending = ByteArray(0)
    private var gatt: BluetoothGatt? = null
    private var serial: BluetoothGattCharacteristic? = null
    @Volatile private var lost = false

    private val callback = object : BluetoothGattCallback() {
        override fun onConnectionStateChange(gatt: BluetoothGatt, status: Int, newState: Int) {
            events.add(Event.State(status, newState))
            if (newState != BluetoothProfile.STATE_CONNECTED) { lost = true; data.add(ByteArray(0)) }
        }
        override fun onServicesDiscovered(gatt: BluetoothGatt, status: Int) { events.add(Event.Services(status)) }
        override fun onDescriptorWrite(gatt: BluetoothGatt, descriptor: BluetoothGattDescriptor, status: Int) { events.add(Event.Descriptor(status)) }
        override fun onCharacteristicWrite(gatt: BluetoothGatt, characteristic: BluetoothGattCharacteristic, status: Int) { events.add(Event.Written(status)) }
        override fun onCharacteristicChanged(gatt: BluetoothGatt, characteristic: BluetoothGattCharacteristic, value: ByteArray) {
            if (characteristic.uuid == SERIAL) data.add(value.copyOf())
        }
        @Deprecated("Deprecated in API 33")
        override fun onCharacteristicChanged(gatt: BluetoothGatt, characteristic: BluetoothGattCharacteristic) {
            // API 33+ calls both overloads; only the legacy one exists below 33.
            @Suppress("DEPRECATION")
            if (Build.VERSION.SDK_INT < 33 && characteristic.uuid == SERIAL) data.add(characteristic.value.copyOf())
        }
    }

    private fun fail(): Nothing = throw LocalizedIOException(UiText(R.string.err_rt950_ble))

    private inline fun <reified T : Event> await(timeoutMs: Long): T {
        val deadline = System.nanoTime() + timeoutMs * 1000000
        while (true) {
            val left = (deadline - System.nanoTime()) / 1000000
            if (left <= 0) throw LocalizedIOException(UiText(R.string.err_rt950_ble_timeout))
            val event = events.poll(left, TimeUnit.MILLISECONDS) ?: continue
            if (event is Event.State && event.state != BluetoothProfile.STATE_CONNECTED) {
                close(); throw LocalizedIOException(UiText(R.string.err_rt950_ble_lost))
            }
            if (event is T) return event
        }
    }

    /** Connects, discovers services and returns every service and characteristic with its property flags. */
    fun connect(): List<RtS10Probe.Service> {
        val manager = context.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
        val adapter = manager?.adapter ?: throw LocalizedIOException(UiText(R.string.err_rt950_no_ble))
        if (!adapter.isEnabled) throw LocalizedIOException(UiText(R.string.err_rt950_ble_off))
        val device = try { adapter.getRemoteDevice(address) } catch (_: IllegalArgumentException) { fail() }
        val link = device.connectGatt(context, false, callback, BluetoothDevice.TRANSPORT_LE) ?: fail()
        gatt = link
        try {
            if (await<Event.State>(15000).status != BluetoothGatt.GATT_SUCCESS) fail()
            if (!link.discoverServices()) fail()
            if (await<Event.Services>(15000).status != BluetoothGatt.GATT_SUCCESS) fail()
        } catch (error: Exception) {
            close(); throw error
        }
        serial = link.getService(SERIAL_SERVICE)?.getCharacteristic(SERIAL)
        return link.services.map { service ->
            RtS10Probe.Service(service.uuid.toString(), service.characteristics.map {
                RtS10Probe.Characteristic(it.uuid.toString(), it.properties)
            })
        }
    }

    /** Subscribes to ffe1 notifications (the only descriptor write); needed to receive the handshake replies. */
    fun subscribeSerial() {
        val link = gatt ?: throw LocalizedIOException(UiText(R.string.err_rt950_ble_lost))
        val characteristic = serial ?: throw LocalizedIOException(UiText(R.string.err_rt950_ble_not_found))
        val descriptor = characteristic.getDescriptor(CCCD) ?: throw LocalizedIOException(UiText(R.string.err_rt950_ble_not_found))
        if (!link.setCharacteristicNotification(characteristic, true)) fail()
        val enable = BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE
        val started = if (Build.VERSION.SDK_INT >= 33) link.writeDescriptor(descriptor, enable) == BluetoothStatusCodes.SUCCESS
            else @Suppress("DEPRECATION") run { descriptor.value = enable; link.writeDescriptor(descriptor) }
        if (!started || await<Event.Descriptor>(15000).status != BluetoothGatt.GATT_SUCCESS) fail()
    }

    override fun write(bytes: ByteArray, timeoutMs: Int) {
        val link = gatt ?: throw LocalizedIOException(UiText(R.string.err_rt950_ble_lost))
        val characteristic = serial ?: throw LocalizedIOException(UiText(R.string.err_rt950_ble_lost))
        if (lost) throw LocalizedIOException(UiText(R.string.err_rt950_ble_lost))
        val withResponse = characteristic.properties and BluetoothGattCharacteristic.PROPERTY_WRITE != 0
        val type = if (withResponse) BluetoothGattCharacteristic.WRITE_TYPE_DEFAULT else BluetoothGattCharacteristic.WRITE_TYPE_NO_RESPONSE
        var offset = 0
        while (offset < bytes.size) {
            val chunk = bytes.copyOfRange(offset, minOf(bytes.size, offset + CHUNK))
            events.removeIf { it is Event.Written }
            val started = if (Build.VERSION.SDK_INT >= 33) link.writeCharacteristic(characteristic, chunk, type) == BluetoothStatusCodes.SUCCESS
                else @Suppress("DEPRECATION") run { characteristic.writeType = type; characteristic.value = chunk; link.writeCharacteristic(characteristic) }
            if (!started) fail()
            if (withResponse) {
                if (await<Event.Written>(timeoutMs.toLong()).status != BluetoothGatt.GATT_SUCCESS) fail()
            } else Thread.sleep(PACING_MS)
            offset += CHUNK
        }
    }

    override fun read(length: Int, timeoutMs: Int): ByteArray {
        val deadline = System.nanoTime() + timeoutMs * 1000000L
        while (pending.size < length) {
            val left = (deadline - System.nanoTime()) / 1000000
            if (left <= 0) throw LocalizedIOException(UiText(R.string.err_rt950_ble_timeout))
            val chunk = data.poll(left, TimeUnit.MILLISECONDS) ?: continue
            if (chunk.isEmpty()) throw LocalizedIOException(UiText(R.string.err_rt950_ble_lost))
            pending += chunk
        }
        val out = pending.copyOfRange(0, length)
        pending = pending.copyOfRange(length, pending.size)
        return out
    }

    override fun discardPending() {
        data.clear(); pending = ByteArray(0)
    }

    override fun close() {
        val link = gatt
        gatt = null; serial = null
        try { link?.disconnect(); link?.close() } catch (_: SecurityException) {}
    }

    companion object {
        private const val CHUNK = 20
        private const val PACING_MS = 30L
        private val SERIAL_SERVICE = UUID.fromString(RtS10Probe.RADTEL_SERVICE)
        private val SERIAL = UUID.fromString(RtS10Probe.RADTEL_SERIAL)
        private val CCCD = UUID.fromString("00002902-0000-1000-8000-00805f9b34fb")

        /** Scans for every BLE device (the RT-S10 advertised name is unknown); returns the function that stops the scan. */
        fun scan(context: Context, onFound: (name: String, address: String) -> Unit): () -> Unit {
            val manager = context.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
            val adapter = manager?.adapter ?: throw LocalizedIOException(UiText(R.string.err_rt950_no_ble))
            if (!adapter.isEnabled) throw LocalizedIOException(UiText(R.string.err_rt950_ble_off))
            val scanner = adapter.bluetoothLeScanner ?: throw LocalizedIOException(UiText(R.string.err_rt950_ble_off))
            val callback = object : ScanCallback() {
                override fun onScanResult(callbackType: Int, result: ScanResult) {
                    onFound(result.scanRecord?.deviceName ?: result.device.name ?: "", result.device.address)
                }
            }
            scanner.startScan(null, ScanSettings.Builder().setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY).build(), callback)
            return { try { scanner.stopScan(callback) } catch (_: RuntimeException) {} }
        }
    }
}

/** Experimental, read-only screen for the Radtel RT-S10: BLE scan, GATT service listing, optional handshake, report. */
class RtS10Activity : LocalizedActivity() {
    companion object {
        private const val PERMISSION_REQUEST = 910
        private const val SCAN_MS = 15_000L
    }

    private val colors by lazy { Brand.Palette(this) }
    private val worker = Executors.newSingleThreadExecutor()
    private val mainHandler = Handler(Looper.getMainLooper())
    private var stopScan: (() -> Unit)? = null
    private val found = HashSet<String>()
    private var selectedName = ""
    private var selectedAddress: String? = null
    private var services: List<RtS10Probe.Service> = emptyList()
    private var handshake: RtS10Probe.Handshake = RtS10Probe.Handshake.NotTried
    @Volatile private var busy = false

    private lateinit var notice: TextView
    private lateinit var selection: TextView
    private lateinit var devices: LinearLayout
    private lateinit var servicesText: TextView
    private lateinit var handshakeButton: Button
    private val actions = ArrayList<Button>()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val body = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            val padding = Brand.dp(this@RtS10Activity, 16)
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
        body.addView(Brand.heading(this, getString(R.string.rts10_title)))
        body.addView(Brand.card(this).apply {
            addView(Brand.text(this@RtS10Activity, 14f, colors.accent, true).apply { setText(R.string.rts10_notice) })
        })
        notice = live(Brand.text(this, 14f, colors.accent))
        body.addView(notice)

        section(body, R.string.rts10_section_search) { card ->
            note(card, R.string.rts10_search_help)
            button(card, R.string.rts10_scan, true) { startScan() }
            devices = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
            card.addView(devices)
        }
        section(body, R.string.rts10_section_read) { card ->
            selection = live(Brand.text(this, 14f)).apply { setText(R.string.rts10_none_selected) }
            card.addView(selection)
            actions.add(button(card, R.string.rts10_connect, true) { readServices() })
            servicesText = Brand.text(this, 13f).apply { setTextIsSelectable(true) }
            card.addView(servicesText)
            handshakeButton = button(card, R.string.rts10_handshake) { confirmHandshake() }.apply { visibility = View.GONE }
            actions.add(handshakeButton)
        }
        section(body, R.string.rts10_section_share) { card ->
            note(card, R.string.rts10_share_help)
            button(card, R.string.rts10_copy_report) { shareReport() }
            button(card, R.string.rts10_satellites) { startActivity(Intent(this, SatelliteActivity::class.java)) }
        }
        setContentView(scroll)
    }

    override fun onDestroy() {
        mainHandler.removeCallbacksAndMessages(null)
        stopScan?.invoke(); stopScan = null
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
        Brand.button(this, getString(label), primary, action).also {
            it.minHeight = maxOf(it.minHeight, Brand.dp(this, 48))
            parent.addView(it)
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
        else notice.setText(R.string.rts10_permission_denied)
    }

    private fun startScan() {
        if (!blePermissions()) return
        stopScan?.invoke()
        devices.removeAllViews(); found.clear()
        try {
            stopScan = RtS10Gatt.scan(this) { name, address ->
                runOnUiThread {
                    if (isDestroyed || !found.add(address)) return@runOnUiThread
                    val label = getString(R.string.rts10_device, name.ifBlank { getString(R.string.rts10_unnamed) }, address)
                    devices.addView(Brand.button(this, label, false) { select(name, address) }.apply {
                        minHeight = maxOf(minHeight, Brand.dp(this@RtS10Activity, 48))
                    })
                }
            }
            notice.setText(R.string.rts10_scanning)
            mainHandler.postDelayed({ stopScan?.invoke(); stopScan = null }, SCAN_MS)
        } catch (error: Exception) {
            notice.text = errorText(error)
        }
    }

    private fun select(name: String, address: String) {
        stopScan?.invoke(); stopScan = null
        selectedName = name
        selectedAddress = address
        services = emptyList()
        handshake = RtS10Probe.Handshake.NotTried
        servicesText.text = ""
        handshakeButton.visibility = View.GONE
        selection.text = getString(R.string.rts10_selected, name.ifBlank { getString(R.string.rts10_unnamed) }, address)
        notice.text = ""
    }

    private fun setBusy(value: Boolean) {
        busy = value
        actions.forEach { it.isEnabled = !value }
    }

    private fun runTask(task: () -> Unit) {
        if (busy) return
        setBusy(true)
        worker.execute {
            try { task() } catch (error: Exception) { runOnUiThread { if (!isDestroyed) notice.text = errorText(error) } }
            finally { runOnUiThread { if (!isDestroyed) setBusy(false) } }
        }
    }

    private fun readServices() {
        val address = selectedAddress ?: run { notice.setText(R.string.rts10_select_first); return }
        if (!blePermissions()) return
        notice.setText(R.string.rts10_connecting)
        runTask {
            val link = RtS10Gatt(this, address)
            try {
                val listed = link.connect()
                runOnUiThread { showServices(listed); notice.setText(R.string.rts10_read_done) }
            } finally {
                link.close()
            }
        }
    }

    private fun showServices(found: List<RtS10Probe.Service>) {
        services = found
        servicesText.text = found.joinToString("\n\n") { service ->
            getString(R.string.rts10_service, service.uuid) + service.characteristics.joinToString("") {
                "\n" + getString(R.string.rts10_characteristic, it.uuid, RtS10Probe.describeProperties(it.properties))
            }
        }.ifEmpty { getString(R.string.rts10_no_services) }
        handshakeButton.visibility = if (RtS10Probe.hasRadtelSerial(found)) View.VISIBLE else View.GONE
    }

    private fun confirmHandshake() {
        AlertDialog.Builder(this).setTitle(R.string.rts10_handshake_confirm_title)
            .setMessage(R.string.rts10_handshake_confirm_message)
            .setPositiveButton(R.string.rts10_handshake_confirm) { _, _ -> tryHandshake() }
            .setNegativeButton(android.R.string.cancel, null).show()
    }

    /** Sends only the RT-950 identification handshake, then ends the session; never reads or writes radio memory. */
    private fun tryHandshake() {
        val address = selectedAddress ?: return
        if (!blePermissions()) return
        notice.setText(R.string.rts10_handshake_running)
        runTask {
            val link = RtS10Gatt(this, address)
            val result = try {
                val listed = link.connect()
                runOnUiThread { showServices(listed) }
                link.subscribeSerial()
                val session = Rt950Session(link)
                try {
                    RtS10Probe.Handshake.Ok(session.handshake())
                } catch (error: Exception) {
                    RtS10Probe.Handshake.Failed(errorText(error))
                } finally {
                    session.end()
                }
            } catch (error: Exception) {
                RtS10Probe.Handshake.Failed(errorText(error))
            } finally {
                link.close()
            }
            runOnUiThread {
                handshake = result
                notice.text = when (result) {
                    is RtS10Probe.Handshake.Ok -> getString(R.string.rts10_handshake_ok, result.model)
                    is RtS10Probe.Handshake.Failed -> getString(R.string.rts10_handshake_failed, result.message)
                    RtS10Probe.Handshake.NotTried -> ""
                }
            }
        }
    }

    private fun shareReport() {
        val address = selectedAddress ?: run { notice.setText(R.string.rts10_select_first); return }
        val text = RtS10Probe.Report(selectedName, address, services, handshake).report()
        startActivity(Intent.createChooser(Intent(Intent.ACTION_SEND).setType("text/plain")
            .putExtra(Intent.EXTRA_SUBJECT, getString(R.string.rts10_share_subject))
            .putExtra(Intent.EXTRA_TEXT, text), getString(R.string.rts10_copy_report)))
    }
}
