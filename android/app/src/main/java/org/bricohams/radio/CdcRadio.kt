package org.bricohams.radio

import android.hardware.usb.UsbConstants
import android.hardware.usb.UsbDevice
import android.hardware.usb.UsbDeviceConnection
import android.hardware.usb.UsbEndpoint
import android.hardware.usb.UsbInterface
import android.hardware.usb.UsbManager
import android.os.SystemClock
import java.io.IOException

class CdcRadio private constructor(
    private val connection: UsbDeviceConnection,
    private val control: UsbInterface,
    private val data: UsbInterface,
    private val input: UsbEndpoint,
    private val output: UsbEndpoint
) : RadioBytes {
    private val buffered = RadioReadBuffer()
    private var closed = false
    @Synchronized override fun write(bytes: ByteArray, timeoutMs: Int) {
        check(!closed) { "USB cerrado." }
        require(timeoutMs > 0)
        val deadline = SystemClock.elapsedRealtime() + timeoutMs
        var offset = 0
        while (offset < bytes.size) {
            val left = deadline - SystemClock.elapsedRealtime()
            if (left <= 0) throw IOException("Tiempo agotado escribiendo USB.")
            val count = connection.bulkTransfer(output, bytes, offset, bytes.size - offset, left.toInt())
            if (count <= 0) throw IOException("Fallo de escritura USB o dispositivo desconectado.")
            offset += count
        }
    }
    @Synchronized override fun read(length: Int, timeoutMs: Int): ByteArray {
        check(!closed) { "USB cerrado." }
        return buffered.read(length, timeoutMs) { left ->
            val chunk = ByteArray(input.maxPacketSize.coerceAtLeast(64))
            val count = connection.bulkTransfer(input, chunk, chunk.size, left)
            if (count <= 0) throw IOException("Fallo de lectura USB, timeout o dispositivo desconectado.")
            chunk.copyOf(count)
        }
    }
    @Synchronized override fun close() {
        if (closed) return
        closed = true
        val dataReleased = connection.releaseInterface(data)
        val controlReleased = connection.releaseInterface(control)
        connection.close()
        buffered.clear()
        if (!dataReleased || !controlReleased) throw IOException("No se pudieron liberar todas las interfaces USB; conexion cerrada.")
    }
    companion object {
        fun compatible(device: UsbDevice): Boolean = interfaces(device) != null
        private fun interfaces(device: UsbDevice): Pair<UsbInterface, UsbInterface>? {
            val all = (0 until device.interfaceCount).map(device::getInterface)
            // Ambiguous composite devices need an explicit association descriptor, not a guessed port.
            val controls = all.filter { it.interfaceClass == UsbConstants.USB_CLASS_COMM && it.interfaceSubclass == 2 }
            val data = all.filter { it.interfaceClass == UsbConstants.USB_CLASS_CDC_DATA }
            if (controls.size != 1 || data.size != 1) return null
            return controls.single() to data.single()
        }
        fun open(manager: UsbManager, device: UsbDevice): CdcRadio {
            require(manager.hasPermission(device)) { "Falta permiso Android USB." }
            val (control, data) = requireNotNull(interfaces(device)) { "Solo USB CDC ACM estandar, no CH340/CP210x/Prolific." }
            val endpoints = (0 until data.endpointCount).map(data::getEndpoint)
                .filter { it.type == UsbConstants.USB_ENDPOINT_XFER_BULK }
            val input = requireNotNull(endpoints.singleOrNull { it.direction == UsbConstants.USB_DIR_IN }) { "USB sin entrada bulk unica." }
            val output = requireNotNull(endpoints.singleOrNull { it.direction == UsbConstants.USB_DIR_OUT }) { "USB sin salida bulk unica." }
            val connection = manager.openDevice(device) ?: throw IOException("No se pudo abrir el dispositivo USB.")
            try {
                if (!connection.claimInterface(control, true) || !connection.claimInterface(data, true)) {
                    throw IOException("No se pudieron reclamar las interfaces CDC.")
                }
                val lineCoding = byteArrayOf(0x00, 0x96.toByte(), 0, 0, 0, 0, 8) // 38400, 8N1
                if (connection.controlTransfer(0x21, 0x20, 0, control.id, lineCoding, 7, 1000) != 7 ||
                    connection.controlTransfer(0x21, 0x22, 3, control.id, null, 0, 1000) < 0) {
                    throw IOException("El dispositivo rechazo configuracion CDC 38400 8N1.")
                }
                return CdcRadio(connection, control, data, input, output)
            } catch (error: Exception) {
                connection.close()
                throw error
            }
        }
    }
}
