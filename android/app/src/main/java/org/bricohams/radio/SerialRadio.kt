package org.bricohams.radio

import android.hardware.usb.UsbConstants
import android.hardware.usb.UsbDevice
import android.hardware.usb.UsbDeviceConnection
import android.hardware.usb.UsbManager
import com.hoho.android.usbserial.driver.CdcAcmSerialDriver
import com.hoho.android.usbserial.driver.Ch34xSerialDriver
import com.hoho.android.usbserial.driver.Cp21xxSerialDriver
import com.hoho.android.usbserial.driver.FtdiSerialDriver
import com.hoho.android.usbserial.driver.ProlificSerialDriver
import com.hoho.android.usbserial.driver.UsbSerialDriver
import com.hoho.android.usbserial.driver.UsbSerialPort
import com.hoho.android.usbserial.driver.UsbSerialProber
import java.io.IOException

data class SerialSettings(val baud: Int = 38400, val stopBits: Int = 1, val portIndex: Int = 0, val dtr: Boolean? = null, val rts: Boolean? = null)

class SerialRadio private constructor(private val port: UsbSerialPort) : RadioBytes {
    private val buffer = RadioReadBuffer()
    private var closed = false
    @Synchronized override fun write(bytes: ByteArray, timeoutMs: Int) {
        checkUi(!closed) { UiText(R.string.err_usb_closed) }
        require(timeoutMs > 0)
        // The library completes partial writes or throws; never retry a CAT SET after a timeout.
        port.write(bytes, timeoutMs)
    }
    @Synchronized override fun read(length: Int, timeoutMs: Int): ByteArray {
        checkUi(!closed) { UiText(R.string.err_usb_closed) }
        return buffer.read(length, timeoutMs) { left ->
            val chunk = ByteArray(4096)
            val count = port.read(chunk, left)
            if (count !in 1..chunk.size) throw LocalizedIOException(UiText(R.string.err_serial_no_data))
            chunk.copyOf(count)
        }
    }
    @Synchronized override fun close() {
        if (closed) return
        closed = true
        buffer.clear()
        port.close()
    }
    companion object {
        private fun driver(device: UsbDevice): UsbSerialDriver? {
            // Composite radios such as the IC-705 expose several CDC ACM pairs under a vendor id the prober may not list.
            val found = UsbSerialProber.getDefaultProber().probeDevice(device)
                ?: (0 until device.interfaceCount).map(device::getInterface)
                    .takeIf { all -> all.count { it.interfaceClass == UsbConstants.USB_CLASS_COMM && it.interfaceSubclass == 2 } > 1 }
                    ?.let { CdcAcmSerialDriver(device) }
                ?: return null
            return when {
                found is Cp21xxSerialDriver -> found // dual CP210x (FTX-1): port 0 is the Enhanced COM / CAT-1 port
                found is Ch34xSerialDriver || found is FtdiSerialDriver || found is ProlificSerialDriver ->
                    found.takeIf { it.ports.size == 1 }
                found is CdcAcmSerialDriver -> found.takeIf { !CdcRadio.compatible(device) && it.ports.isNotEmpty() }
                else -> null
            }
        }
        /** Control lines for a CDC ACM device: untouched settings keep the historic DTR+RTS asserted, explicit ones win. */
        internal fun cdcLines(settings: SerialSettings): Int =
            if (settings.dtr == null && settings.rts == null) CdcRadio.DTR_RTS
            else (if (settings.dtr == true) 1 else 0) or (if (settings.rts == true) 2 else 0)
        /**
         * Quansheng link lines: USB-C CDC gets DTR only (the firmware uses it for synchronous sends; RTS is never asserted),
         * a CH340 programming jack gets both lines low.
         */
        fun quanshengSettings(cdc: Boolean) = SerialSettings(38400, 1, 0, dtr = cdc, rts = false)
        fun quanshengSettings(device: UsbDevice) = quanshengSettings(CdcRadio.compatible(device))
        /** CP2105 / FTX-1: interface 0 is the Enhanced COM port that carries CAT-1 (the Standard port is interface 1). */
        const val CP210X_VENDOR = 0x10C4
        fun enhancedPort(device: UsbDevice): Int? =
            if (device.vendorId == CP210X_VENDOR && portCount(device) > 1) 0 else null
        fun description(device: UsbDevice): String? = if (CdcRadio.compatible(device)) "CDC ACM" else
            driver(device)?.javaClass?.simpleName?.removeSuffix("SerialDriver")
        fun portCount(device: UsbDevice): Int = if (CdcRadio.compatible(device)) 1 else driver(device)?.ports?.size ?: 0
        fun open(manager: UsbManager, device: UsbDevice, settings: SerialSettings = SerialSettings()): RadioBytes {
            requireUi(manager.hasPermission(device)) { UiText(R.string.err_usb_permission_missing) }
            if (CdcRadio.compatible(device)) return CdcRadio.open(manager, device, cdcLines(settings))
            val driver = requireNotNullUi(driver(device)) { UiText(R.string.err_serial_adapter_unknown) }
            requireUi(settings.portIndex in driver.ports.indices) { UiText(R.string.err_rig_port, settings.portIndex) }
            val connection = manager.openDevice(device) ?: throw LocalizedIOException(UiText(R.string.err_serial_open_failed))
            return attach(driver.ports[settings.portIndex], connection, settings)
        }
        internal fun attach(port: UsbSerialPort, connection: UsbDeviceConnection, settings: SerialSettings = SerialSettings()): SerialRadio {
            try {
                port.open(connection)
                port.setParameters(settings.baud, 8,
                    if (settings.stopBits == 2) UsbSerialPort.STOPBITS_2 else UsbSerialPort.STOPBITS_1, UsbSerialPort.PARITY_NONE)
                port.flowControl = UsbSerialPort.FlowControl.NONE
                settings.dtr?.let { port.dtr = it }
                settings.rts?.let { port.rts = it }
                return SerialRadio(port)
            } catch (error: Exception) {
                try {
                    if (port.isOpen) port.close()
                } catch (cleanup: IOException) {
                    error.addSuppressed(cleanup)
                } finally {
                    connection.close()
                }
                throw error
            }
        }
    }
}
