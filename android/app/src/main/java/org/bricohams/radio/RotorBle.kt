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
import android.bluetooth.le.ScanFilter
import android.bluetooth.le.ScanResult
import android.bluetooth.le.ScanSettings
import android.content.Context
import android.os.Build
import android.os.ParcelUuid
import org.json.JSONObject
import java.util.concurrent.LinkedBlockingQueue
import java.util.concurrent.TimeUnit

/**
 * Secure BLE link to the rotor: bonded, encrypted and MITM-authenticated with the 6-digit passkey shown in the
 * rotor's setup (Android asks for it in the system pairing dialog). Used when the phone must stay on another
 * Wi-Fi/mobile network. The caller must hold BLUETOOTH_SCAN/CONNECT (API 31+) or location (API 26-30).
 */
@SuppressLint("MissingPermission")
class BleRotorTransport(context: Context, private val token: String) : RotorTransport {
    private sealed class Event {
        class State(val status: Int, val state: Int) : Event()
        class Services(val status: Int) : Event()
        class Descriptor(val status: Int) : Event()
        class Written(val status: Int) : Event()
        class Notification(val value: ByteArray) : Event()
    }

    private val context = context.applicationContext
    private val events = LinkedBlockingQueue<Event>()
    private val assembler = RotorProtocol.Assembler()
    private var gatt: BluetoothGatt? = null
    private var rx: BluetoothGattCharacteristic? = null
    private var nextId = 1L

    init { requireUi(RotorProtocol.validToken(token)) { UiText(R.string.rotor_err_token) } }

    private val callback = object : BluetoothGattCallback() {
        override fun onConnectionStateChange(gatt: BluetoothGatt, status: Int, newState: Int) { events.add(Event.State(status, newState)) }
        override fun onServicesDiscovered(gatt: BluetoothGatt, status: Int) { events.add(Event.Services(status)) }
        override fun onDescriptorWrite(gatt: BluetoothGatt, descriptor: BluetoothGattDescriptor, status: Int) { events.add(Event.Descriptor(status)) }
        override fun onCharacteristicWrite(gatt: BluetoothGatt, characteristic: BluetoothGattCharacteristic, status: Int) { events.add(Event.Written(status)) }
        override fun onCharacteristicChanged(gatt: BluetoothGatt, characteristic: BluetoothGattCharacteristic, value: ByteArray) {
            if (characteristic.uuid == RotorProtocol.TX) events.add(Event.Notification(value.copyOf()))
        }
        @Deprecated("Deprecated in API 33")
        override fun onCharacteristicChanged(gatt: BluetoothGatt, characteristic: BluetoothGattCharacteristic) {
            // API 33+ calls both overloads; only the legacy one exists below 33.
            @Suppress("DEPRECATION")
            if (Build.VERSION.SDK_INT < 33 && characteristic.uuid == RotorProtocol.TX) events.add(Event.Notification(characteristic.value.copyOf()))
        }
    }

    private fun fail(): Nothing = throw LocalizedIOException(UiText(R.string.rotor_err_ble))
    private inline fun <reified T : Event> await(timeoutMs: Long): T {
        val deadline = System.nanoTime() + timeoutMs * 1000000
        while (true) {
            val left = (deadline - System.nanoTime()) / 1000000
            if (left <= 0) throw LocalizedIOException(UiText(R.string.rotor_err_ble_timeout))
            val event = events.poll(left, TimeUnit.MILLISECONDS) ?: continue
            if (event is Event.State && event.state != BluetoothProfile.STATE_CONNECTED) {
                close(); throw LocalizedIOException(UiText(R.string.rotor_err_ble_lost))
            }
            if (event is T) return event
        }
    }

    private fun find(): BluetoothDevice {
        val manager = context.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
        val adapter = manager?.adapter ?: throw LocalizedIOException(UiText(R.string.rotor_err_no_ble))
        if (!adapter.isEnabled) throw LocalizedIOException(UiText(R.string.rotor_err_ble_off))
        adapter.bondedDevices.orEmpty().firstOrNull { it.name == RotorProtocol.BLE_NAME }?.let { return it }
        val scanner = adapter.bluetoothLeScanner ?: throw LocalizedIOException(UiText(R.string.rotor_err_ble_off))
        val found = LinkedBlockingQueue<BluetoothDevice>()
        val scan = object : ScanCallback() {
            override fun onScanResult(callbackType: Int, result: ScanResult) { found.offer(result.device) }
        }
        scanner.startScan(listOf(ScanFilter.Builder().setServiceUuid(ParcelUuid(RotorProtocol.SERVICE)).build()),
            ScanSettings.Builder().setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY).build(), scan)
        try {
            return found.poll(12, TimeUnit.SECONDS) ?: throw LocalizedIOException(UiText(R.string.rotor_err_ble_not_found))
        } finally {
            scanner.stopScan(scan)
        }
    }

    /** Finds, bonds (system passkey dialog) and subscribes. Blocks up to ~2 minutes while the user types the passkey. */
    fun connect() {
        val device = find()
        if (device.bondState != BluetoothDevice.BOND_BONDED) {
            if (device.bondState == BluetoothDevice.BOND_NONE && !device.createBond()) fail()
            val deadline = System.currentTimeMillis() + 120000
            var seenBonding = false
            while (device.bondState != BluetoothDevice.BOND_BONDED) {
                if (device.bondState == BluetoothDevice.BOND_BONDING) seenBonding = true
                else if (seenBonding) throw LocalizedIOException(UiText(R.string.rotor_err_ble_bond))
                if (System.currentTimeMillis() > deadline) throw LocalizedIOException(UiText(R.string.rotor_err_ble_bond))
                Thread.sleep(250)
            }
        }
        val link = device.connectGatt(context, false, callback, BluetoothDevice.TRANSPORT_LE) ?: fail()
        gatt = link
        val state = await<Event.State>(15000)
        if (state.status != BluetoothGatt.GATT_SUCCESS) { close(); fail() }
        if (!link.discoverServices()) { close(); fail() }
        if (await<Event.Services>(15000).status != BluetoothGatt.GATT_SUCCESS) { close(); fail() }
        val service = link.getService(RotorProtocol.SERVICE) ?: run { close(); throw LocalizedIOException(UiText(R.string.rotor_err_ble_not_found)) }
        val write = service.getCharacteristic(RotorProtocol.RX)
        val notify = service.getCharacteristic(RotorProtocol.TX)
        val descriptor = notify?.getDescriptor(RotorProtocol.CCCD)
        if (write == null || descriptor == null || !link.setCharacteristicNotification(notify, true)) { close(); fail() }
        val enable = BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE
        val started = if (Build.VERSION.SDK_INT >= 33) link.writeDescriptor(descriptor, enable) == BluetoothStatusCodes.SUCCESS
            else @Suppress("DEPRECATION") run { descriptor.value = enable; link.writeDescriptor(descriptor) }
        if (!started || await<Event.Descriptor>(15000).status != BluetoothGatt.GATT_SUCCESS) { close(); fail() }
        rx = write
        nextId = 1
        assembler.reset()
    }

    private fun writeFrame(link: BluetoothGatt, characteristic: BluetoothGattCharacteristic, frame: ByteArray) {
        val type = BluetoothGattCharacteristic.WRITE_TYPE_DEFAULT
        val started = if (Build.VERSION.SDK_INT >= 33) link.writeCharacteristic(characteristic, frame, type) == BluetoothStatusCodes.SUCCESS
            else @Suppress("DEPRECATION") run { characteristic.writeType = type; characteristic.value = frame; link.writeCharacteristic(characteristic) }
        if (!started || await<Event.Written>(5000).status != BluetoothGatt.GATT_SUCCESS) fail()
    }

    override fun exchange(method: String, path: String, body: JSONObject?): RotorResponse {
        val link = gatt ?: throw LocalizedIOException(UiText(R.string.rotor_err_ble_lost))
        val characteristic = rx ?: throw LocalizedIOException(UiText(R.string.rotor_err_ble_lost))
        val id = nextId++
        events.removeAll { it is Event.Notification }
        assembler.reset()
        RotorProtocol.frames(RotorProtocol.request(id, method, path, token, body)).forEach { writeFrame(link, characteristic, it) }
        val deadline = System.currentTimeMillis() + 20000
        while (true) {
            val notification = await<Event.Notification>(maxOf(1, deadline - System.currentTimeMillis()))
            val text = assembler.feed(notification.value) ?: continue
            val (answer, code, data) = RotorProtocol.envelope(text)
            if (answer == id) return RotorResponse(code, data)
            if (answer == 0L) throw RotorException(code, data.optString("error"))
        }
    }

    override fun close() {
        val link = gatt
        gatt = null; rx = null
        try { link?.disconnect(); link?.close() } catch (_: SecurityException) {}
    }
}
