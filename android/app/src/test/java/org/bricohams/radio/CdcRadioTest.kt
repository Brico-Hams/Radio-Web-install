package org.bricohams.radio

import android.hardware.usb.UsbConfiguration
import android.hardware.usb.UsbDevice
import android.hardware.usb.UsbDeviceConnection
import android.hardware.usb.UsbEndpoint
import android.hardware.usb.UsbInterface
import android.hardware.usb.UsbManager
import android.os.Parcelable
import android.os.Looper
import android.content.Intent
import android.widget.EditText
import android.widget.Button
import android.widget.TextView
import android.view.View
import android.view.ViewGroup
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.Robolectric
import org.robolectric.RuntimeEnvironment
import org.robolectric.Shadows.shadowOf
import org.robolectric.annotation.Config
import org.robolectric.annotation.Implementation
import org.robolectric.annotation.Implements
import org.robolectric.util.ReflectionHelpers
import org.robolectric.shadows.ShadowAlertDialog
import org.robolectric.util.ReflectionHelpers.ClassParameter.from
import java.io.IOException
import java.util.ArrayDeque
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.util.concurrent.ExecutorService
import java.util.concurrent.TimeUnit
import java.lang.reflect.Proxy
import com.hoho.android.usbserial.driver.UsbSerialPort

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [28], shadows = [CdcRadioTest.Connection::class])
class CdcRadioTest {
    @Implements(UsbDeviceConnection::class)
    class Connection {
        val input = ArrayDeque<Byte>()
        val output = ArrayList<Byte>()
        val controls = ArrayList<List<Int>>()
        var releases = 0
        var closed = false
        var failWrite = false
        val operations = ArrayList<Int>()
        private var packetStart = 0
        private var applied = 14580000
        private var remote = false
        companion object {
            lateinit var last: Connection
            var emulateCat = false
        }
        @Implementation fun claimInterface(intf: UsbInterface, force: Boolean): Boolean {
            last = this
            return force && intf.id in 0..1
        }
        @Implementation fun controlTransfer(type: Int, request: Int, value: Int, index: Int, buffer: ByteArray?, length: Int, timeout: Int): Int {
            controls.add(listOf(type, request, value, index, length))
            if (request == 0x20) assertArrayEquals(byteArrayOf(0, 0x96.toByte(), 0, 0, 0, 0, 8), buffer)
            assertTrue(timeout > 0)
            return length
        }
        @Implementation fun bulkTransfer(endpoint: UsbEndpoint, buffer: ByteArray, offset: Int, length: Int, timeout: Int): Int {
            if (failWrite) return -1
            val count = minOf(3, length)
            for (index in offset until offset + count) output.add(buffer[index])
            if (emulateCat && output.size - packetStart >= 4) {
                val size = (output[packetStart + 2].toInt() and 255) or ((output[packetStart + 3].toInt() and 255) shl 8)
                if (output.size - packetStart == size + 8) {
                    val (type, data) = QuanshengFrames.decode(output.subList(packetStart, output.size).toByteArray())
                    packetStart = output.size
                    val reply = if (type == 0x0514) "F4HWN v6.1.0".toByteArray().copyOf(16) else {
                        val request = ByteBuffer.wrap(data).order(ByteOrder.LITTLE_ENDIAN)
                        val operation = data[1].toInt()
                        operations.add(operation)
                        if (operation == 1) { applied = request.getInt(4); remote = true }
                        if (operation == 2) { applied = 14580000; remote = false }
                        ByteBuffer.allocate(16).order(ByteOrder.LITTLE_ENDIAN)
                            .put(1).put(if (operation == 0) 0 else 1).putShort(request.getShort(2))
                            .putInt(7).putInt(applied).putInt(if (remote) 3 else 1).array()
                    }
                    QuanshengFrames.encode(type + 1, reply).forEach(input::add)
                }
            }
            return count
        }
        @Implementation fun bulkTransfer(endpoint: UsbEndpoint, buffer: ByteArray, length: Int, timeout: Int): Int {
            if (input.isEmpty()) return -1
            val count = minOf(input.size, length)
            repeat(count) { buffer[it] = input.removeFirst() }
            return count
        }
        @Implementation fun releaseInterface(intf: UsbInterface): Boolean { releases++; return true }
        @Implementation fun close() { closed = true }
    }
    private fun endpoint(address: Int): UsbEndpoint = ReflectionHelpers.callConstructor(
        UsbEndpoint::class.java, from(Int::class.javaPrimitiveType, address), from(Int::class.javaPrimitiveType, 2),
        from(Int::class.javaPrimitiveType, 64), from(Int::class.javaPrimitiveType, 0))
    private fun intf(id: Int, clazz: Int, subclass: Int): UsbInterface {
        val result = ReflectionHelpers.callConstructor(UsbInterface::class.java,
            from(Int::class.javaPrimitiveType, id), from(Int::class.javaPrimitiveType, 0), from(String::class.java, "port"),
            from(Int::class.javaPrimitiveType, clazz), from(Int::class.javaPrimitiveType, subclass), from(Int::class.javaPrimitiveType, 0))
        ReflectionHelpers.callInstanceMethod<Unit>(result, "setEndpoints",
            from(Array<Parcelable>::class.java, if (clazz == 10) arrayOf<Parcelable>(endpoint(0x81), endpoint(2)) else emptyArray()))
        return result
    }
    private fun device(vararg interfaces: UsbInterface, vendor: Int = 1, product: Int = 2): UsbDevice {
        val configuration = ReflectionHelpers.callConstructor(UsbConfiguration::class.java,
            from(Int::class.javaPrimitiveType, 1), from(String::class.java, "CDC"),
            from(Int::class.javaPrimitiveType, 0x80), from(Int::class.javaPrimitiveType, 50))
        ReflectionHelpers.callInstanceMethod<Unit>(configuration, "setInterfaces",
            from(Array<Parcelable>::class.java, interfaces.map { it as Parcelable }.toTypedArray()))
        val device = ReflectionHelpers.callConstructor(UsbDevice::class.java,
            from(String::class.java, "/dev/usb/mock"), from(Int::class.javaPrimitiveType, vendor), from(Int::class.javaPrimitiveType, product),
            from(Int::class.javaPrimitiveType, 0), from(Int::class.javaPrimitiveType, 0), from(Int::class.javaPrimitiveType, 0),
            from(String::class.java, "Test"), from(String::class.java, "CDC"), from(String::class.java, "1.0"), from(String::class.java, "test"))
        ReflectionHelpers.callInstanceMethod<Unit>(device, "setConfigurations",
            from(Array<Parcelable>::class.java, arrayOf<Parcelable>(configuration)))
        return device
    }
    private val manager get() = RuntimeEnvironment.getApplication().getSystemService(android.content.Context.USB_SERVICE) as UsbManager

    @Test fun cdcRequiresUnambiguousInterfacesNotVendorUart() {
        assertTrue(CdcRadio.compatible(device(intf(0, 2, 2), intf(1, 10, 0))))
        assertFalse(CdcRadio.compatible(device(intf(0, 255, 0))))
        assertFalse(CdcRadio.compatible(device(intf(0, 2, 2), intf(1, 10, 0), intf(2, 10, 0))))
    }
    @Test fun permissionIsRequiredBeforeOpening() {
        val device = device(intf(0, 2, 2), intf(1, 10, 0))
        shadowOf(manager).addOrUpdateUsbDevice(device, false)
        assertThrows(IllegalArgumentException::class.java) { CdcRadio.open(manager, device) }
        assertThrows(IllegalArgumentException::class.java) { SerialRadio.open(manager, device) }
    }
    @Test fun cdcConfigurationPartialWritesAndBufferedPacketReads() {
        val device = device(intf(0, 2, 2), intf(1, 10, 0))
        shadowOf(manager).addOrUpdateUsbDevice(device, true)
        val radio = CdcRadio.open(manager, device)
        val connection = Connection.last
        assertEquals(listOf(listOf(0x21, 0x20, 0, 0, 7), listOf(0x21, 0x22, 3, 0, 0)), connection.controls)
        val packet = ByteArray(30) { it.toByte() }
        radio.write(packet, 1000)
        assertArrayEquals(packet, connection.output.toByteArray())
        packet.forEach(connection.input::add)
        assertArrayEquals(packet.copyOfRange(0, 1), radio.read(1, 1000))
        assertArrayEquals(packet.copyOfRange(1, 3), radio.read(2, 1000))
        assertArrayEquals(packet.copyOfRange(3, 30), radio.read(27, 1000))
        assertThrows(IOException::class.java) { radio.read(1, 10) }
        connection.failWrite = true
        assertThrows(IOException::class.java) { radio.write(packet, 1000) }
        radio.close()
        radio.close()
        assertEquals(2, connection.releases)
        assertTrue(connection.closed)
        assertThrows(IllegalStateException::class.java) { radio.read(1, 10) }
    }
    private fun views(view: View): List<View> = listOf(view) +
        if (view is ViewGroup) (0 until view.childCount).flatMap { views(view.getChildAt(it)) } else emptyList()
    private fun click(activity: CatActivity, label: String) {
        views(activity.window.decorView).filterIsInstance<Button>().single { it.text == label }.performClick()
    }
    private fun waitForUsb(activity: CatActivity) {
        ReflectionHelpers.getField<ExecutorService>(activity, "worker").submit {}.get(10, TimeUnit.SECONDS)
        shadowOf(Looper.getMainLooper()).idle()
    }
    @Test fun activityIdentifiesTunesAndStopsBeforeClosingWhenHidden() {
        val device = device(intf(0, 2, 2), intf(1, 10, 0))
        shadowOf(manager).addOrUpdateUsbDevice(device, true)
        Connection.emulateCat = true
        val controller = Robolectric.buildActivity(CatActivity::class.java).setup()
        try {
            val activity = controller.get()
            click(activity, "Elegir dispositivo USB")
            val list = ShadowAlertDialog.getLatestAlertDialog().listView
            list.performItemClick(list.getChildAt(0), 0, 0)
            waitForUsb(activity)
            assertTrue(views(activity.window.decorView).filterIsInstance<TextView>().any { it.text.contains("CAT v1 reconocido") })
            activity.findViewById<EditText>(R.id.cat_frequency).setText("436.50000")
            click(activity, "Sintonizar RX temporal (3 s)")
            waitForUsb(activity)
            assertTrue(views(activity.window.decorView).filterIsInstance<TextView>().any { it.text.contains("RX=436500000 Hz") })
            val connection = Connection.last
            controller.pause().stop()
            waitForUsb(activity)
            assertTrue(connection.operations.contains(1))
            assertEquals(listOf(0, 2, 0), connection.operations.takeLast(3))
            assertTrue(connection.closed)
            assertEquals(2, connection.releases)
            controller.start().resume()
        } finally {
            controller.pause().stop().destroy()
            Connection.emulateCat = false
        }
    }
    @Test fun knownUartDriversAreOfferedButUnknownOrMultiportAreNot() {
        val vendors = listOf(Triple(0x1a86, 0x7523, "Ch34x"), Triple(0x10c4, 0xea60, "Cp21xx"),
            Triple(0x0403, 0x6001, "Ftdi"), Triple(0x067b, 0x2303, "Prolific"))
        for ((vendor, product, name) in vendors) {
            assertEquals(name, SerialRadio.description(device(intf(0, 255, 0), vendor = vendor, product = product)))
        }
        assertNull(SerialRadio.description(device(intf(0, 255, 0), vendor = 0x1234, product = 0x5678)))
        assertNull(SerialRadio.description(device(intf(0, 255, 0), intf(1, 255, 0), vendor = 0x0403, product = 0x6010)))
    }
    private class Port {
        var opened = false
        var failSetup = false
        var failWrite = false
        var closes = 0
        val parameters = ArrayList<Int>()
        val input = ArrayDeque<Byte>()
        val output = ArrayList<Byte>()
        val port = Proxy.newProxyInstance(UsbSerialPort::class.java.classLoader, arrayOf(UsbSerialPort::class.java)) { _, method, args ->
            when (method.name) {
                "open" -> { opened = true; null }
                "isOpen" -> opened
                "close" -> { opened = false; closes++; null }
                "setParameters" -> {
                    if (failSetup) throw IOException("Mock setup failure")
                    args.forEach { parameters.add(it as Int) }; null
                }
                "setFlowControl" -> { assertEquals(UsbSerialPort.FlowControl.NONE, args[0]); null }
                "write" -> {
                    if (failWrite) throw IOException("Mock write failure")
                    (args[0] as ByteArray).forEach(output::add); null
                }
                "read" -> {
                    val bytes = args[0] as ByteArray
                    val count = minOf(bytes.size, input.size)
                    repeat(count) { bytes[it] = input.removeFirst() }
                    count
                }
                else -> throw AssertionError("Unexpected serial call: ${method.name}")
            }
        } as UsbSerialPort
    }
    @Test fun serialLibraryWrapperPreservesPacketsAndErrorsWithoutRetrying() {
        val device = device(intf(0, 2, 2), intf(1, 10, 0))
        shadowOf(manager).addOrUpdateUsbDevice(device, true)
        val port = Port()
        val radio = SerialRadio.attach(port.port, requireNotNull(manager.openDevice(device)))
        assertEquals(listOf(38400, 8, 1, 0), port.parameters)
        val bytes = ByteArray(35) { it.toByte() }
        bytes.forEach(port.input::add)
        assertArrayEquals(bytes.copyOfRange(0, 1), radio.read(1, 1000))
        assertArrayEquals(bytes.copyOfRange(1, 35), radio.read(34, 1000))
        radio.write(bytes, 1000)
        assertArrayEquals(bytes, port.output.toByteArray())
        assertThrows(IOException::class.java) { radio.read(1, 1) }
        port.failWrite = true
        assertThrows(IOException::class.java) { radio.write(bytes, 1000) }
        assertEquals(35, port.output.size)
        radio.close(); radio.close()
        assertEquals(1, port.closes)
        assertThrows(IllegalStateException::class.java) { radio.write(bytes, 100) }
    }
    @Test fun serialSetupFailureClosesPortRatherThanReturningUsableConnection() {
        val device = device(intf(0, 2, 2), intf(1, 10, 0))
        shadowOf(manager).addOrUpdateUsbDevice(device, true)
        val port = Port().apply { failSetup = true }
        assertThrows(IOException::class.java) { SerialRadio.attach(port.port, requireNotNull(manager.openDevice(device))) }
        assertFalse(port.opened)
        assertEquals(1, port.closes)
    }
    @Test fun selectedExpiredPassNeverSendsSetAndClosesUsbExplicitly() {
        val point = SatelliteLook(100000, 180.0, 30.0, 1000.0)
        val plan = SatellitePlan(SatellitesTest.tle, SatellitesTest.observer, 145800000,
            SatellitePass(point.copy(time = 99000), point, point.copy(time = 101000), false, false))
        val device = device(intf(0, 2, 2), intf(1, 10, 0))
        shadowOf(manager).addOrUpdateUsbDevice(device, true)
        Connection.emulateCat = true
        val intent = Intent(RuntimeEnvironment.getApplication(), CatActivity::class.java)
            .putExtra("satellite-plan", SatellitePlanJson.encode(plan))
        val controller = Robolectric.buildActivity(CatActivity::class.java, intent).setup()
        try {
            val activity = controller.get()
            click(activity, "Elegir dispositivo USB")
            val list = ShadowAlertDialog.getLatestAlertDialog().listView
            list.performItemClick(list.getChildAt(0), 0, 0)
            waitForUsb(activity)
            click(activity, "Iniciar Doppler del pase seleccionado")
            waitForUsb(activity)
            assertTrue(views(activity.window.decorView).filterIsInstance<TextView>().any { it.text.contains("Fuera del pase CAT") })
            assertFalse(Connection.last.operations.contains(1))
            assertTrue(Connection.last.closed)
        } finally {
            controller.pause().stop().destroy()
            Connection.emulateCat = false
        }
    }
}
