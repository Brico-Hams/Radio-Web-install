package org.bricohams.radio

import android.annotation.SuppressLint
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
import android.os.Build
import java.util.UUID
import java.util.concurrent.LinkedBlockingQueue
import java.util.concurrent.TimeUnit

/**
 * BLE link to a Radtel RT-950 Pro (advertises as "walkie-talkie"; it must not be connected to another app). UUIDs, the
 * unlock write and the pacing follow infamy/NeonPlug and nivingoonesekera's ble_bridge (MIT). ffe1 carries both the clone
 * protocol and, when the radio's "KISS TNC over BLE" options are on, KISS frames: notifications go to the clone buffer
 * only while [beginClone] is active, otherwise to [kissListener]. The caller must hold BLUETOOTH_SCAN/CONNECT (API 31+)
 * or location (API 26-30).
 */
@SuppressLint("MissingPermission")
class BleRt950Transport(context: Context, private val address: String) : RadioBytes {
    private sealed class Event {
        class State(val status: Int, val state: Int) : Event()
        class Services(val status: Int) : Event()
        class Descriptor(val status: Int) : Event()
        class Written(val status: Int) : Event()
    }

    private val context = context.applicationContext
    private val events = LinkedBlockingQueue<Event>()
    /** Clone-session bytes; an empty array is the "link lost" sentinel. */
    private val data = LinkedBlockingQueue<ByteArray>()
    private var pending = ByteArray(0)
    private var gatt: BluetoothGatt? = null
    private var channel: BluetoothGattCharacteristic? = null
    @Volatile private var cloneActive = false
    @Volatile private var lost = false

    /** Receives raw ffe1 notification chunks while no clone session is open (feed them to a [KissDecoder]). */
    @Volatile var kissListener: ((ByteArray) -> Unit)? = null
    /** Called once when the link drops after a successful connect. */
    @Volatile var onLost: (() -> Unit)? = null

    val connected get() = gatt != null && !lost

    private val callback = object : BluetoothGattCallback() {
        override fun onConnectionStateChange(gatt: BluetoothGatt, status: Int, newState: Int) {
            events.add(Event.State(status, newState))
            if (newState != BluetoothProfile.STATE_CONNECTED) {
                val first = !lost
                lost = true
                data.add(ByteArray(0))
                if (first) onLost?.invoke()
            }
        }
        override fun onServicesDiscovered(gatt: BluetoothGatt, status: Int) { events.add(Event.Services(status)) }
        override fun onDescriptorWrite(gatt: BluetoothGatt, descriptor: BluetoothGattDescriptor, status: Int) { events.add(Event.Descriptor(status)) }
        override fun onCharacteristicWrite(gatt: BluetoothGatt, characteristic: BluetoothGattCharacteristic, status: Int) { events.add(Event.Written(status)) }
        override fun onCharacteristicChanged(gatt: BluetoothGatt, characteristic: BluetoothGattCharacteristic, value: ByteArray) {
            dispatch(characteristic, value.copyOf())
        }
        @Deprecated("Deprecated in API 33")
        override fun onCharacteristicChanged(gatt: BluetoothGatt, characteristic: BluetoothGattCharacteristic) {
            // API 33+ calls both overloads; only the legacy one exists below 33.
            @Suppress("DEPRECATION")
            if (Build.VERSION.SDK_INT < 33) dispatch(characteristic, characteristic.value.copyOf())
        }
    }

    private fun dispatch(characteristic: BluetoothGattCharacteristic, value: ByteArray) {
        if (characteristic.uuid != DATA) return
        if (cloneActive) data.add(value) else kissListener?.invoke(value)
    }

    /** Clone and KISS traffic must never be mixed: start of a clone session drops KISS delivery and stale bytes. */
    fun beginClone() {
        data.clear(); pending = ByteArray(0)
        cloneActive = true
    }

    fun endClone() {
        cloneActive = false
        data.clear(); pending = ByteArray(0)
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

    private fun findUnlock(link: BluetoothGatt): BluetoothGattCharacteristic? =
        link.getService(UNLOCK_SERVICE)?.getCharacteristic(UNLOCK)
            ?: link.services.firstNotNullOfOrNull { it.getCharacteristic(UNLOCK) }

    /** Connects, subscribes to ffe1 and sends the unlock to ff31. Blocks while connecting. */
    fun connect() {
        val manager = context.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
        val adapter = manager?.adapter ?: throw LocalizedIOException(UiText(R.string.err_rt950_no_ble))
        if (!adapter.isEnabled) throw LocalizedIOException(UiText(R.string.err_rt950_ble_off))
        val device = try { adapter.getRemoteDevice(address) } catch (_: IllegalArgumentException) { fail() }
        val link = device.connectGatt(context, false, callback, BluetoothDevice.TRANSPORT_LE) ?: fail()
        gatt = link
        val state = await<Event.State>(15000)
        if (state.status != BluetoothGatt.GATT_SUCCESS) { close(); fail() }
        if (!link.discoverServices()) { close(); fail() }
        if (await<Event.Services>(15000).status != BluetoothGatt.GATT_SUCCESS) { close(); fail() }
        val notify = link.getService(SERVICE)?.getCharacteristic(DATA)
        val descriptor = notify?.getDescriptor(CCCD)
        if (notify == null || descriptor == null || !link.setCharacteristicNotification(notify, true)) {
            close(); throw LocalizedIOException(UiText(R.string.err_rt950_ble_not_found))
        }
        val enable = BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE
        val started = if (Build.VERSION.SDK_INT >= 33) link.writeDescriptor(descriptor, enable) == BluetoothStatusCodes.SUCCESS
            else @Suppress("DEPRECATION") run { descriptor.value = enable; link.writeDescriptor(descriptor) }
        if (!started || await<Event.Descriptor>(15000).status != BluetoothGatt.GATT_SUCCESS) { close(); fail() }
        channel = notify
        val unlock = findUnlock(link) ?: run { close(); throw LocalizedIOException(UiText(R.string.err_rt950_ble_not_found)) }
        writeChunks(link, unlock, UNLOCK_BYTES)
        Thread.sleep(500)
    }

    private fun writeChunks(link: BluetoothGatt, characteristic: BluetoothGattCharacteristic, bytes: ByteArray) {
        val withResponse = characteristic.properties and BluetoothGattCharacteristic.PROPERTY_WRITE != 0
        val type = if (withResponse) BluetoothGattCharacteristic.WRITE_TYPE_DEFAULT else BluetoothGattCharacteristic.WRITE_TYPE_NO_RESPONSE
        var offset = 0
        while (offset < bytes.size) {
            val chunk = bytes.copyOfRange(offset, minOf(bytes.size, offset + CHUNK))
            val started = if (Build.VERSION.SDK_INT >= 33) link.writeCharacteristic(characteristic, chunk, type) == BluetoothStatusCodes.SUCCESS
                else @Suppress("DEPRECATION") run { characteristic.writeType = type; characteristic.value = chunk; link.writeCharacteristic(characteristic) }
            if (!started) fail()
            if (withResponse) {
                if (await<Event.Written>(5000).status != BluetoothGatt.GATT_SUCCESS) fail()
            } else Thread.sleep(PACING_MS)
            offset += CHUNK
        }
    }

    /** Raw write on ffe1 (clone requests and KISS frames alike). */
    override fun write(bytes: ByteArray, timeoutMs: Int) {
        val link = gatt ?: throw LocalizedIOException(UiText(R.string.err_rt950_ble_lost))
        val characteristic = channel ?: throw LocalizedIOException(UiText(R.string.err_rt950_ble_lost))
        if (lost) throw LocalizedIOException(UiText(R.string.err_rt950_ble_lost))
        writeChunks(link, characteristic, bytes)
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
        gatt = null; channel = null
        kissListener = null
        try { link?.disconnect(); link?.close() } catch (_: SecurityException) {}
    }

    companion object {
        const val DEVICE_NAME = "walkie-talkie"
        private const val CHUNK = 20
        private const val PACING_MS = 30L
        val SERVICE: UUID = UUID.fromString("0000ffe0-0000-1000-8000-00805f9b34fb")
        val DATA: UUID = UUID.fromString("0000ffe1-0000-1000-8000-00805f9b34fb")
        val UNLOCK_SERVICE: UUID = UUID.fromString("0000ff30-0000-1000-8000-00805f9b34fb")
        val UNLOCK: UUID = UUID.fromString("0000ff31-0000-1000-8000-00805f9b34fb")
        val CCCD: UUID = UUID.fromString("00002902-0000-1000-8000-00805f9b34fb")
        val UNLOCK_BYTES = byteArrayOf(0x3F, 0x3F, 0x3F, 0x3F, 0x02, 0x2E, 0x17, 0x1D, 0x5E, 0x57, 0x25, 0x2F, 0x57, 0x13,
            0x62, 0x56, 0x04, 0x4B, 0x23, 0x42)

        /** Scans for radios named "walkie-talkie"; returns the function that stops the scan. */
        fun scan(context: Context, onFound: (name: String, address: String) -> Unit): () -> Unit {
            val manager = context.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
            val adapter = manager?.adapter ?: throw LocalizedIOException(UiText(R.string.err_rt950_no_ble))
            if (!adapter.isEnabled) throw LocalizedIOException(UiText(R.string.err_rt950_ble_off))
            val scanner = adapter.bluetoothLeScanner ?: throw LocalizedIOException(UiText(R.string.err_rt950_ble_off))
            val callback = object : ScanCallback() {
                override fun onScanResult(callbackType: Int, result: ScanResult) {
                    val name = result.scanRecord?.deviceName ?: result.device.name
                    if (name == DEVICE_NAME) onFound(name, result.device.address)
                }
            }
            scanner.startScan(null, ScanSettings.Builder().setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY).build(), callback)
            return { try { scanner.stopScan(callback) } catch (_: RuntimeException) {} }
        }
    }
}
