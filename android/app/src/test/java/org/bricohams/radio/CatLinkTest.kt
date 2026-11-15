package org.bricohams.radio

import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.annotation.Config
import java.io.IOException
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.util.ArrayDeque

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [28], qualifiers = "es")
class CatLinkTest {
    private val app get() = RuntimeEnvironment.getApplication()

    private class FakeRadio(val firmware: String? = "F4HWN v6.1.0 BricoHams", val armed: Boolean = true) : RadioBytes {
        val buffer = ArrayDeque<Byte>()
        var closed = false
        override fun write(bytes: ByteArray, timeoutMs: Int) {
            val (type, request) = QuanshengFrames.decode(bytes)
            if (type == 0x0514) {
                firmware ?: return
                QuanshengFrames.encode(0x0515, firmware.toByteArray(Charsets.US_ASCII).copyOf(32)).forEach(buffer::add)
                return
            }
            val sequence = ByteBuffer.wrap(request).order(ByteOrder.LITTLE_ENDIAN).getShort(2)
            val response = ByteBuffer.allocate(16).order(ByteOrder.LITTLE_ENDIAN)
                .put(1).put(if (armed) 0 else 5).putShort(sequence).putInt(7).putInt(if (armed) 14580000 else 0)
                .putInt(if (armed) 1 else 0).array()
            QuanshengFrames.encode(0x7b01, response).forEach(buffer::add)
        }
        override fun read(length: Int, timeoutMs: Int): ByteArray {
            if (buffer.size < length) throw IOException("Mock timeout")
            return ByteArray(length) { buffer.removeFirst() }
        }
        override fun close() { closed = true }
    }

    private fun connect(radio: FakeRadio?, published: MutableList<RadioBytes> = ArrayList()) =
        CatLink.connect(CatTransport.USB_CDC, 0x36B7, 0xFFFF,
            open = { radio ?: throw LocalizedIOException(UiText(R.string.err_usb_open_failed)) },
            protocol = { CatProtocol(it, sleep = {}) }, publish = { port, _ -> published.add(port) })

    @Test fun uvk5DefaultsToCdc() {
        assertEquals(CatTransport.USB_CDC, ProfileRadio.UVK5.transports.first())
        ProfileStore.save(app, StationProfile(ProfileRadio.UVK5, "EA1ABC", null))
        assertEquals(CatTransport.USB_CDC, ProfileStore.load(app).transport)
    }

    @Test fun savedCdcDeviceOverridesStoredSerialTransport() {
        ProfileStore.save(app, StationProfile(ProfileRadio.UVK5, "EA1ABC", CatTransport.USB_SERIAL))
        assertEquals(CatTransport.USB_SERIAL, ProfileStore.load(app).transport)
        ProfileStore.saveUsbDevice(app, UsbIdentity(0x36B7, 0xFFFF, null, 0))
        assertEquals(CatTransport.USB_CDC, ProfileStore.load(app).transport)
        assertEquals(CatTransport.USB_SERIAL, CatLink.transportFor(CatTransport.USB_SERIAL, ProfileRadio.UVK5, UsbIdentity(0x1A86, 0x7523, null, 0)))
        assertEquals(CatTransport.USB_SERIAL, CatLink.transportFor(CatTransport.USB_SERIAL, ProfileRadio.FT817, UsbIdentity(0x36B7, 0xFFFF, null, 0)))
    }

    @Test fun handshakeSucceeds() {
        val radio = FakeRadio()
        val published = ArrayList<RadioBytes>()
        val state = connect(radio, published)
        assertTrue(state.active)
        assertEquals(listOf<RadioBytes>(radio), published)
        assertFalse(radio.closed)
    }

    @Test fun silentRadioFailsAtHelloAndClosesPort() {
        val radio = FakeRadio(firmware = null)
        val error = assertThrows(CatConnectException::class.java) { connect(radio) }
        assertEquals(CatStep.IDENTIFY, error.step)
        assertEquals(CatTransport.USB_CDC, error.transport)
        assertTrue(radio.closed)
        val text = error.text.resolve(app)
        assertTrue(text, text.contains("36B7:FFFF") && text.contains("CDC"))
    }

    @Test fun unsupportedFirmwareFailsAtHello() {
        val radio = FakeRadio(firmware = "OEM v2.1")
        assertEquals(CatStep.IDENTIFY, assertThrows(CatConnectException::class.java) { connect(radio) }.step)
        assertTrue(radio.closed)
    }

    @Test fun openFailureIsReportedWithStep() {
        val error = assertThrows(CatConnectException::class.java) { connect(null) }
        assertEquals(CatStep.OPEN, error.step)
    }

    @Test fun notArmedRadioKeepsTheLinkOpen() {
        val radio = FakeRadio(armed = false)
        assertThrows(CatNotArmedException::class.java) { connect(radio) }
        assertFalse(radio.closed)
    }

    @Test fun leaseStopsRenewingOnceTheLinkFails() {
        var now = 0L
        val failing = object : RadioBytes by FakeRadio() {
            override fun write(bytes: ByteArray, timeoutMs: Int) = throw IOException("unplugged")
        }
        val dead = CatLease(CatProtocol(failing, sleep = {}), 14580000, clock = { now })
        repeat(CatLease.MAX_TRANSIENT_FAILURES) {
            now += CatLease.RENEW_MS
            assertEquals(CatLease.Result.RETRY, dead.renewIfDue())
        }
        now += CatLease.RENEW_MS
        assertThrows(IOException::class.java) { dead.renewIfDue() }
    }
}
