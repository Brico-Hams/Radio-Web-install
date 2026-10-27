package org.bricohams.radio

import android.hardware.usb.UsbDevice
import android.hardware.usb.UsbDeviceConnection
import android.hardware.usb.UsbManager
import com.hoho.android.usbserial.driver.Ch34xSerialDriver
import com.hoho.android.usbserial.driver.Cp21xxSerialDriver
import com.hoho.android.usbserial.driver.FtdiSerialDriver
import com.hoho.android.usbserial.driver.ProlificSerialDriver
import com.hoho.android.usbserial.driver.UsbSerialDriver
import com.hoho.android.usbserial.driver.UsbSerialPort
import com.hoho.android.usbserial.driver.UsbSerialProber
import java.io.IOException

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
            val found = UsbSerialProber.getDefaultProber().probeDevice(device) ?: return null
            if (found !is Ch34xSerialDriver && found !is Cp21xxSerialDriver &&
                found !is FtdiSerialDriver && found !is ProlificSerialDriver) return null
            return found.takeIf { it.ports.size == 1 }
        }
        fun description(device: UsbDevice): String? = if (CdcRadio.compatible(device)) "CDC ACM" else
            driver(device)?.javaClass?.simpleName?.removeSuffix("SerialDriver")
        fun open(manager: UsbManager, device: UsbDevice): RadioBytes {
            requireUi(manager.hasPermission(device)) { UiText(R.string.err_usb_permission_missing) }
            if (CdcRadio.compatible(device)) return CdcRadio.open(manager, device)
            val driver = requireNotNullUi(driver(device)) { UiText(R.string.err_serial_adapter_unknown) }
            val connection = manager.openDevice(device) ?: throw LocalizedIOException(UiText(R.string.err_serial_open_failed))
            return attach(driver.ports.single(), connection)
        }
        internal fun attach(port: UsbSerialPort, connection: UsbDeviceConnection): SerialRadio {
            try {
                port.open(connection)
                port.setParameters(38400, 8, UsbSerialPort.STOPBITS_1, UsbSerialPort.PARITY_NONE)
                port.flowControl = UsbSerialPort.FlowControl.NONE
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
