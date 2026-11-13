package org.bricohams.radio

import org.junit.Assert.*
import org.junit.Test
import java.io.IOException
import java.util.ArrayDeque
import java.util.Random

class Rt950ProtocolTest {
    private class Radio : RadioBytes {
        val main = HashMap<Int, ByteArray>()
        var aprs = ByteArray(128) { 0xFF.toByte() }
        val reads = ArrayList<Int>()
        var key = ByteArray(4)
        var corruptWrites = false
        var dropAfterAprsWrite = false
        var ended = false
        private var dead = false
        private val out = ArrayDeque<Byte>()

        fun block(address: Int) = main.getOrPut(address) { ByteArray(128) { 0xFF.toByte() } }
        private fun reply(vararg bytes: Int) = bytes.forEach { out.add(it.toByte()) }
        private fun reply(bytes: ByteArray) = bytes.forEach { out.add(it) }

        override fun write(bytes: ByteArray, timeoutMs: Int) {
            if (dead) throw IOException("link lost")
            when {
                bytes.contentEquals("PROGRAMBT9000U".toByteArray()) -> reply(0x06)
                bytes.contentEquals("F".toByteArray()) -> reply(ByteArray(16))
                bytes.contentEquals("M".toByteArray()) -> reply("RT-950      ".toByteArray())
                bytes.contentEquals(byteArrayOf(0x45)) -> ended = true
                bytes.size == 25 -> { key = Rt950Protocol.KEYS[Rt950Protocol.keyIndex(bytes)]; reply(0x06) }
                bytes.size == 4 -> {
                    val address = (bytes[1].toInt() and 255 shl 8) or (bytes[2].toInt() and 255)
                    val plain = if (bytes[0].toInt() == 0x54) aprs else { reads.add(address); block(address) }
                    reply(bytes.copyOf()); reply(Rt950Protocol.crypt(plain, key))
                }
                bytes.size == 132 -> {
                    val address = (bytes[1].toInt() and 255 shl 8) or (bytes[2].toInt() and 255)
                    val plain = Rt950Protocol.crypt(bytes.copyOfRange(4, 132), key)
                    if (corruptWrites) plain[0] = (plain[0].toInt() xor 1).toByte()
                    if (bytes[0].toInt() == 0x58) { aprs = plain; if (dropAfterAprsWrite) dead = true } else main[address] = plain
                    reply(0x06)
                }
                else -> fail("unexpected request of ${bytes.size} bytes")
            }
        }

        override fun read(length: Int, timeoutMs: Int): ByteArray {
            if (out.size < length) throw IOException("timeout")
            return ByteArray(length) { out.poll() }
        }

        override fun close() {}
    }

    private fun session(radio: Radio) = Rt950Session(radio, Random(1)) {}.also { it.handshake() }

    @Test fun cryptRoundTripAndSkipRules() {
        val key = "BHT ".toByteArray()
        // Key bytes by position: B H T ' ' B H T ' '.
        val data = byteArrayOf(0x00, 0xFF.toByte(), 'T'.code.toByte(), 0x5A, ('B'.code xor 0xFF).toByte(), 0x22, 0x33, 0x44)
        val crypted = Rt950Protocol.crypt(data, key)
        assertArrayEquals(byteArrayOf(0x00, 0xFF.toByte()), crypted.copyOfRange(0, 2))
        assertEquals(data[2], crypted[2]) // equal to the key byte
        assertEquals(data[3], crypted[3]) // key byte 0x20
        assertEquals(data[4], crypted[4]) // complement of the key byte
        assertEquals((0x22 xor 'H'.code).toByte(), crypted[5])
        assertEquals((0x33 xor 'T'.code).toByte(), crypted[6])
        assertEquals(0x44.toByte(), crypted[7]) // key byte 0x20
        assertArrayEquals(data, Rt950Protocol.crypt(crypted, key))
        val spaced = Rt950Protocol.crypt(byteArrayOf(0x11, 0x22), " EIY".toByteArray())
        assertEquals(0x11.toByte(), spaced[0])
        assertEquals((0x22 xor 'E'.code).toByte(), spaced[1])
    }

    @Test fun headersAndKeySelection() {
        assertArrayEquals(byteArrayOf(0x52, 0x7B, 0x80.toByte(), 0x80.toByte()), Rt950Protocol.header(0x52, 0x7B80))
        assertArrayEquals(byteArrayOf(0x58, 0, 0, 0x80.toByte()), Rt950Protocol.header(0x58, 0))
        assertEquals(20, Rt950Protocol.KEYS.size)
        assertEquals(1, Rt950Protocol.keyIndex(Rt950Protocol.FIXED_KEY_FRAME))
        repeat(50) {
            val frame = Rt950Protocol.buildKeyFrame(Random(it.toLong()))
            assertTrue(Rt950Protocol.keyIndex(frame) in 0 until 20)
        }
    }

    @Test fun channelRoundTripBcdAndEmptySlot() {
        val channel = Rt950Channel(145_212_500, 145_812_500, Rt950Tone.Ctcss(885), Rt950Tone.Dcs(23, true), powerIndex = 2,
            narrow = true, busyLockout = true, scanAdd = true, txEnabled = true, am = false, name = "SO50 AOS", signalling = 3, pttId = 1)
        val record = Rt950Channels.encode(channel)
        assertArrayEquals(byteArrayOf(0x50, 0x12, 0x52, 0x14), record.copyOfRange(0, 4))
        assertArrayEquals(byteArrayOf(0x75.toByte(), 0x03), record.copyOfRange(8, 10))
        assertArrayEquals(byteArrayOf(106, 0), record.copyOfRange(10, 12))
        assertEquals(0xFF.toByte(), record[31])
        assertEquals(channel, Rt950Channels.decode(record))
        val blank = ByteArray(32) { 0xFF.toByte() }
        assertTrue(Rt950Channels.isBlank(blank))
        assertNull(Rt950Channels.decode(blank))
        assertEquals(105, Rt950Channels.DCS_CODES.size)
        assertEquals(891, Rt950Channels.index(10, 1))
        assertThrows(IllegalArgumentException::class.java) { Rt950Channels.index(11, 1) }
        assertThrows(IllegalArgumentException::class.java) { Rt950Channels.encode(channel.copy(rxHz = 145_212_505)) }
    }

    @Test fun encodingKeepsBitsTheAppDoesNotModel() {
        val previous = Rt950Channels.encode(Rt950Channel(145_000_000, 145_000_000, name = "OLD"))
        previous[15] = (previous[15].toInt() or 0x80 or 0x30).toByte()
        previous[16] = 1
        val updated = Rt950Channels.encode(Rt950Channel(146_000_000, null, name = "NEW"), previous)
        assertEquals(0x80, updated[15].toInt() and 0x80)
        assertEquals(0x30, updated[15].toInt() and 0x30)
        assertEquals(1.toByte(), updated[16])
        assertArrayEquals(byteArrayOf(-1, -1, -1, -1), updated.copyOfRange(4, 8))
    }

    @Test fun aprsRoundTrip() {
        val base = ByteArray(128) { 0xFF.toByte() }
        val settings = Rt950AprsSettings(aprsEnabled = true, callsign = "N0CALL", ssid = 7, radioSymbol = 2, timedBeaconTime = 4,
            routingSelect = 1, altitude = -120, customRouting1 = "WIDE1", customRouting1Ssid = 1, sendCustomMessage = true,
            customMessage = "Hola")
        val block = Rt950Aprs.encode(settings, base)
        assertArrayEquals("N0CALL".toByteArray(), block.copyOfRange(17, 23))
        assertEquals(7.toByte(), block[23])
        assertEquals(2.toByte(), block[26])
        assertEquals(4.toByte(), block[36])
        assertEquals(0xFF.toByte(), block[83])
        assertEquals(settings, Rt950Aprs.decode(block))
        assertArrayEquals(block, Rt950Aprs.encode(settings, block))
        assertThrows(IllegalArgumentException::class.java) { Rt950Aprs.encode(settings.copy(ssid = 16), block) }
        assertThrows(IllegalArgumentException::class.java) { Rt950Aprs.encode(settings.copy(callsign = "TOOLONG"), block) }
    }

    @Test fun whitelistAllowsOnlyChannelsAndAprs() {
        assertTrue(Rt950Protocol.isWritable(0x57, 0x0000))
        assertTrue(Rt950Protocol.isWritable(0x57, 0x7B80))
        assertTrue(Rt950Protocol.isWritable(0x58, 0x0000))
        for (address in listOf(0x7C00, 0x8000, 0x9000, 0xA000, 0xB000, 0xC000, 0xD000, 0xE000)) {
            assertFalse(Rt950Protocol.isWritable(0x57, address))
        }
        assertFalse(Rt950Protocol.isWritable(0x58, 0x0080))
        assertFalse(Rt950Protocol.isReadable(0x52, 0x7C00))
        assertFalse(Rt950Protocol.isReadable(0x52, 0xE000))
        val radio = Radio()
        val session = session(radio)
        for (address in listOf(0x7C00, 0x8000, 0xE000)) {
            assertThrows(IllegalArgumentException::class.java) { session.writeBlock(0x57, address, ByteArray(128)) }
        }
        assertTrue(radio.main.isEmpty())
    }

    @Test fun readAllSkipsUnknownRegions() {
        val radio = Radio()
        val backup = Rt950Session(radio, Random(2)) {}.readAll()
        assertEquals("RT-950", backup.model)
        assertEquals(0x7C00 + 0x100 + 0x100 + 0x200 + 0x200 + 0x300 + 0x80 + 0x100, backup.image().size)
        assertTrue(radio.reads.none { it in 0x7C00..0x7FFF || it >= 0xE000 })
        assertTrue(radio.reads.contains(0x7B80))
        assertEquals(128, backup.aprs.size)
    }

    @Test fun writeChannelsReadsBackAndKeepsNeighbours() {
        val radio = Radio()
        val session = session(radio)
        val one = Rt950Channel(145_800_000, 145_800_000, name = "SO50 AOS")
        val two = Rt950Channel(436_795_000, null, name = "SO50 TCA", txEnabled = false)
        assertEquals(2, session.writeChannels(10, mapOf(1 to one, 2 to two)))
        assertEquals(one, Rt950Channels.decode(radio.block(0x6F00).copyOfRange(0x60, 0x80)))
        assertEquals(two, Rt950Channels.decode(radio.block(0x6F80).copyOfRange(0, 0x20)))
        assertTrue(radio.block(0x6F00).copyOfRange(0, 0x60).all { it == 0xFF.toByte() })
        assertTrue(radio.reads.count { it == 0x6F00 } >= 2)
    }

    @Test fun readBackMismatchThrows() {
        val radio = Radio().apply { corruptWrites = true }
        val session = session(radio)
        assertThrows(IllegalStateException::class.java) { session.writeChannels(1, mapOf(1 to Rt950Channel(145_800_000, null))) }
        assertThrows(IllegalStateException::class.java) { session.writeAprs(Rt950AprsSettings(callsign = "N0CALL")) }
    }

    @Test fun aprsWriteWithLostLinkIsNeverSuccess() {
        val radio = Radio().apply { dropAfterAprsWrite = true }
        val session = session(radio)
        assertThrows(Rt950AprsUnverifiedException::class.java) { session.writeAprs(Rt950AprsSettings(callsign = "N0CALL")) }
        session.end()
    }

    @Test fun aprsWriteVerifies() {
        val radio = Radio()
        val session = session(radio)
        session.writeAprs(Rt950AprsSettings(aprsEnabled = true, callsign = "N0CALL", ssid = 9))
        assertEquals("N0CALL", Rt950Aprs.decode(radio.aprs).callsign)
        session.end()
        assertTrue(radio.ended)
    }
}
