package com.pr2em.ftx1cat

import android.content.Context
import android.hardware.usb.UsbDevice
import android.hardware.usb.UsbManager
import com.hoho.android.usbserial.driver.UsbSerialDriver
import com.hoho.android.usbserial.driver.UsbSerialPort
import com.hoho.android.usbserial.driver.UsbSerialProber

data class SerialChoice(val driver: UsbSerialDriver, val port: UsbSerialPort, val label: String)

class CatRadio(context: Context) : AutoCloseable {
    private val usb = context.getSystemService(Context.USB_SERVICE) as UsbManager
    private var port: UsbSerialPort? = null

    fun choices(): List<SerialChoice> = UsbSerialProber.getDefaultProber()
        .findAllDrivers(usb)
        .flatMap { driver ->
            driver.ports.mapIndexed { index, serialPort ->
                val device = driver.device
                val name = device.productName ?: "USB serial ${device.deviceName}"
                SerialChoice(driver, serialPort, "$name · interface ${index + 1}")
            }
        }

    fun hasPermission(device: UsbDevice): Boolean = usb.hasPermission(device)

    fun requestPermission(device: UsbDevice, intent: android.app.PendingIntent) {
        usb.requestPermission(device, intent)
    }

    fun open(choice: SerialChoice) {
        close()
        val connection = usb.openDevice(choice.driver.device)
            ?: error("O Android não abriu a porta USB. Autorize o dispositivo e tente novamente.")
        try {
            choice.port.open(connection)
            choice.port.setParameters(38_400, 8, UsbSerialPort.STOPBITS_1, UsbSerialPort.PARITY_NONE)
            port = choice.port
        } catch (error: Exception) {
            connection.close()
            throw error
        }
    }

    @Synchronized
    fun send(command: String) {
        val active = port ?: error("Rádio desconectado")
        active.write(command.toByteArray(Charsets.US_ASCII), 1_000)
    }

    @Synchronized
    fun query(command: String, timeoutMs: Int = 1_500): String {
        val active = port ?: error("Rádio desconectado")
        val buffer = ByteArray(128)
        val reply = StringBuilder()
        active.write(command.toByteArray(Charsets.US_ASCII), 1_000)
        val started = System.currentTimeMillis()
        while (System.currentTimeMillis() - started < timeoutMs) {
            val count = active.read(buffer, 250)
            if (count > 0) {
                reply.append(String(buffer, 0, count, Charsets.US_ASCII))
                val end = reply.indexOf(";")
                if (end >= 0) return reply.substring(0, end + 1)
            }
        }
        error("Sem resposta ao comando $command")
    }

    @Synchronized
    override fun close() {
        try { port?.close() } catch (_: Exception) { }
        port = null
    }
}
