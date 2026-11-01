package org.bricohams.radio

import org.junit.Assert.*
import org.junit.Test
import java.io.IOException
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.util.ArrayDeque

class OpenGd77Test {
    /** Answers like usb_com.c: '-' to every 'C' command, "R" + big-endian length + data to every read. */
    private class Radio(private val type: Int, private val version: Int = 3) : RadioBytes {
        val buffer = ArrayDeque<Byte>()
        val requests = ArrayList<ByteArray>()
        var reject = false
        override fun write(bytes: ByteArray, timeoutMs: Int) {
            requests.add(bytes.copyOf())
            if (bytes[0] == 'C'.code.toByte()) { buffer.add(if (reject) 0 else OpenGd77.ACK); return }
            assertEquals('R'.code.toByte(), bytes[0])
            val request = ByteBuffer.wrap(bytes)
            val mode = bytes[1].toInt()
            val address = request.getInt(2)
            val length = request.getShort(6).toInt()
            val data = if (mode == 9) ByteBuffer.allocate(46).order(ByteOrder.LITTLE_ENDIAN).putInt(version).putInt(type).array()
                .also { "R20261101".toByteArray().copyInto(it, 8); "20261101120000".toByteArray().copyInto(it, 24) }
                .copyOfRange(address, address + length)
            else ByteArray(length) { ((address + it) and 255).toByte() }
            buffer.add('R'.code.toByte()); buffer.add((length shr 8).toByte()); buffer.add(length.toByte())
            data.forEach(buffer::add)
        }
        override fun read(length: Int, timeoutMs: Int): ByteArray {
            if (buffer.size < length) throw IOException("timeout")
            return ByteArray(length) { buffer.removeFirst() }
        }
        override fun close() {}
    }

    @Test fun identifiesWithoutEnteringCpsMode() {
        val radio = Radio(type = 6)
        val info = OpenGd77Link(radio).identify()
        assertEquals("MD-UV380", info.model.name)
        assertEquals("R20261101", info.firmware)
        assertEquals("20261101120000", info.build)
        assertFalse("C 0 would leave the satellite menu", radio.requests.any { it[0] == 'C'.code.toByte() && it[1] == 0.toByte() })
        assertArrayEquals(byteArrayOf('C'.code.toByte(), 254.toByte()), radio.requests.first())
    }

    @Test fun rejectsUnknownInfoAndUnconfirmedCommands() {
        assertThrows(LocalizedArgumentException::class.java) { OpenGd77Link(Radio(type = 13)).identify() }
        assertThrows(LocalizedArgumentException::class.java) { OpenGd77Link(Radio(type = 0, version = 99)).identify() }
        assertThrows(LocalizedIOException::class.java) { OpenGd77Link(Radio(type = 0).apply { reject = true }).identify() }
    }

    @Test fun readsScreenInBlocksTheFirmwareAccepts() {
        for ((type, size, block) in listOf(Triple(0, 1024, 32), Triple(6, 40960, 512), Triple(3, 768, 32))) {
            val radio = Radio(type)
            val link = OpenGd77Link(radio)
            link.identify()
            val before = radio.requests.size
            val pixels = link.readScreen()
            val reads = radio.requests.drop(before)
            assertTrue(reads.all { it[0] == 'R'.code.toByte() && it[1] == 6.toByte() })
            assertEquals(size, reads.sumOf { ByteBuffer.wrap(it).getShort(6).toInt() })
            assertTrue(reads.all { ByteBuffer.wrap(it).getShort(6) <= block })
            val screen = link.info!!.model.screen!!
            assertEquals(screen.width * screen.height, pixels.size)
        }
    }

    @Test fun refusesScreenAndClockWhereUnsupported() {
        val noScreen = OpenGd77Link(Radio(type = 1)).apply { identify() }
        assertThrows(LocalizedStateException::class.java) { noScreen.readScreen() }
        val serial = OpenGd77Link(Radio(type = 11)).apply { identify() }
        assertThrows(LocalizedStateException::class.java) { serial.syncClock(1_793_534_400) }
        assertThrows(LocalizedStateException::class.java) { OpenGd77Link(Radio(type = 0)).readScreen() }
    }

    @Test fun clockCommandIsLittleEndianUtcSeconds() {
        assertArrayEquals(byteArrayOf(0x43, 6, 7, 0xC0.toByte(), 0x29, 0xE7.toByte(), 0x6A), OpenGd77.clock(1_793_534_400))
        assertThrows(LocalizedArgumentException::class.java) { OpenGd77.clock(0) }
        val radio = Radio(type = 0)
        OpenGd77Link(radio).apply { identify() }.syncClock(1_793_534_400)
        assertArrayEquals(OpenGd77.clock(1_793_534_400), radio.requests.last())
    }

    @Test fun decodesMonoPagesAndSwappedRgb565() {
        val mono = ByteArray(1024).apply { this[128 + 5] = (1 shl 2).toByte() } // x=5, y=10
        val image = OpenGd77.decodeScreen(mono, OpenGd77.MODELS[0].screen!!)
        assertEquals(0xFF000000.toInt(), image[10 * 128 + 5])
        assertEquals(-1, image[0])
        val color = ByteArray(160 * 128 * 2).apply { this[0] = 0xF8.toByte() }
        assertEquals(0xFFFF0000.toInt(), OpenGd77.decodeScreen(color, OpenGd77.MODELS[6].screen!!)[0])
        assertEquals(0xFF0000FF.toInt(), OpenGd77.decodeScreen(color, OpenGd77.MODELS[8].screen!!)[0])
        assertThrows(LocalizedIOException::class.java) { OpenGd77.decodeScreen(ByteArray(10), OpenGd77.MODELS[0].screen!!) }
    }

    @Test fun noModelClaimsTuningDopplerChannelOrPtt() {
        for (model in OpenGd77.MODELS) {
            for (function in listOf(OpenGd77.Function.FREQUENCY, OpenGd77.Function.DOPPLER, OpenGd77.Function.CHANNEL,
                OpenGd77.Function.PTT, OpenGd77.Function.KEPS)) {
                assertNotNull("${model.name} $function", OpenGd77.unsupportedReason(model, function))
            }
            assertNull(OpenGd77.unsupportedReason(model, OpenGd77.Function.IDENTIFY))
        }
        assertNull(OpenGd77.unsupportedReason(OpenGd77.MODELS[0], OpenGd77.Function.SCREEN))
        assertNotNull(OpenGd77.unsupportedReason(OpenGd77.MODELS[1], OpenGd77.Function.SCREEN))
        assertEquals(OpenGd77Activity.LABELS.keys, OpenGd77.Function.values().toSet())
    }
}
