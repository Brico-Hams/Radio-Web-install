package org.bricohams.stationagent

import android.hardware.usb.UsbDevice
import android.hardware.usb.UsbManager
import android.os.SystemClock
import com.hoho.android.usbserial.driver.Cp21xxSerialDriver
import com.hoho.android.usbserial.driver.UsbSerialPort
import java.io.ByteArrayOutputStream
import java.io.Closeable
import java.io.IOException
import java.net.ProtocolException
import java.net.SocketTimeoutException

interface CatBytes {
    fun write(bytes: ByteArray, timeout: Int)
    fun read(bytes: ByteArray, timeout: Int): Int
}

class ReadonlyCat(private val bytes: CatBytes) {
    companion object {
        val commands = setOf("ID", "FA", "FB", "MD0", "MD1", "PC", "AC", "TX",
            "FT", "ST", "IF", "VX", "KS", "KP", "KR", "BI")
    }

    private fun exchange(command: String): String {
        require(command in commands) { "CAT command not allowed" }
        val deadline = SystemClock.elapsedRealtime() + 1000
        bytes.write("$command;".toByteArray(Charsets.US_ASCII), 200)
        val output = ByteArrayOutputStream(64)
        val buffer = ByteArray(64)
        while (SystemClock.elapsedRealtime() < deadline) {
            val count = bytes.read(buffer, minOf(50, (deadline - SystemClock.elapsedRealtime()).toInt().coerceAtLeast(1)))
            if (count < 0 || count > buffer.size || output.size() + count > 64) {
                throw ProtocolException("Invalid CAT length")
            }
            for (index in 0 until count) {
                val value = buffer[index].toInt() and 255
                if (value !in 32..126) throw ProtocolException("Invalid CAT byte")
                output.write(value)
                if (value == ';'.code) {
                    val frame = output.toString(Charsets.US_ASCII.name())
                    // Discard unsolicited frames; only the reply to this command is accepted.
                    if (frame.startsWith(command)) {
                        if (index != count - 1) throw ProtocolException("Unexpected trailing CAT data")
                        return frame
                    }
                    output.reset()
                }
            }
        }
        throw SocketTimeoutException("CAT deadline exceeded")
    }

    fun identify(): String {
        val reply = exchange("ID")
        if (reply != "ID0840;") throw ProtocolException("Unexpected CAT identity")
        return reply
    }

    fun read(command: String): String {
        require(command in commands) { "CAT command not allowed" }
        val identity = identify()
        return if (command == "ID") identity else exchange(command)
    }
}

class UsbCat(manager: UsbManager, device: UsbDevice, config: AgentConfig) : Closeable {
    private val port: UsbSerialPort
    val cat: ReadonlyCat

    init {
        require(device.deviceName == config.deviceName && device.vendorId == 0x10c4 &&
            device.productId == 0xea70 && device.interfaceCount == 2 && config.port == 0 &&
            device.getInterface(0).id == 0) { "Unsupported USB interface" }
        if (!manager.hasPermission(device)) throw SecurityException("USB permission required")
        // CP2105 3.9.0 opens with DTR/RTS false and flow control NONE; never reuse CDC defaults.
        port = Cp21xxSerialDriver(device).ports[config.port]
        val connection = manager.openDevice(device) ?: throw IOException("USB open failed")
        try {
            port.open(connection)
            port.setDTR(false)
            port.setRTS(false)
            port.setFlowControl(UsbSerialPort.FlowControl.NONE)
            port.setParameters(config.baud, 8, UsbSerialPort.STOPBITS_1, UsbSerialPort.PARITY_NONE)
            port.purgeHwBuffers(true, true)
            cat = ReadonlyCat(object : CatBytes {
                override fun write(bytes: ByteArray, timeout: Int) = port.write(bytes, timeout)
                override fun read(bytes: ByteArray, timeout: Int) = port.read(bytes, timeout)
            })
            cat.identify()
        } catch (error: IOException) {
            if (port.isOpen) {
                try { port.close() }
                catch (closing: IOException) { error.addSuppressed(closing) }
            }
            connection.close()
            throw error
        } catch (error: SecurityException) {
            connection.close()
            throw error
        }
    }

    override fun close() = port.close()
}
