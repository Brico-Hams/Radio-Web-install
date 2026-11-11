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
        val writes = ArrayList<Int>()
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
                    if (bytes[0].toInt() == 0x58) { aprs = plain; if (dropAfterAprsWrite) dead = true } else { main[address] = plain; writes.add(address) }
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

    private fun session(radio: Radio, variant: Rt950Variant = Rt950Variant.UNKNOWN) =
        Rt950Session(radio, Random(1), variant) {}.also { it.handshake() }

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
        assertTrue(Rt950Protocol.isWritable(0x57, 0x7780))
        assertFalse(Rt950Protocol.isWritable(0x57, 0x7B80))
        assertTrue(Rt950Protocol.isWritable(0x57, 0x7B80, Rt950Variant.CH990))
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

    private fun template(name: String, rx: String, mode: String = "FM", tx: String = rx) =
        ChannelTemplates.Channel("k:$name", name, rx, tx, mode, false, "R", "", "", "", "", "ES", "", "", "")

    private fun put(radio: Radio, zone: Int, slot: Int, channel: Rt950Channel) {
        val offset = Rt950Channels.index(zone, slot) * Rt950Protocol.CHANNEL_SIZE
        val address = offset / Rt950Protocol.BLOCK * Rt950Protocol.BLOCK
        Rt950Channels.encode(channel).copyInto(radio.block(address), offset - address)
    }

    private fun backupOf(radio: Radio) = Rt950Session(radio, Random(2)) {}.readAll()

    private fun zonePlan(index: Int, name: String, channels: List<ChannelTemplates.Channel>) = ChannelTemplates.ZonePlan("rt950pro",
        listOf(ChannelTemplates.Zone(index, name, listOf("R"), channels)), emptyMap(), channels, 0, emptyList())

    @Test fun isWritableRangeDependsOnVariant() {
        for (variant in Rt950Variant.values()) {
            assertTrue(Rt950Protocol.isWritable(0x57, 0x77F0 / 0x80 * 0x80, variant))
            assertFalse(Rt950Protocol.isWritable(0x57, 0x7C00, variant))
        }
        for (address in listOf(0x7800, 0x7880, 0x7B80)) {
            assertFalse(Rt950Protocol.isWritable(0x57, address))
            assertFalse(Rt950Protocol.isWritable(0x57, address, Rt950Variant.CH960))
            assertTrue(Rt950Protocol.isWritable(0x57, address, Rt950Variant.CH990))
        }
    }

    @Test fun templateMappingKeepsAmRxOnlyAndTwelveCharNames() {
        val am = Rt950ZoneWriter.toChannel(template("LEMD TWR", "118.30000", "AM"))!!
        assertTrue(am.am)
        assertFalse(am.txEnabled)
        assertEquals(118_300_000L, am.rxHz)
        assertEquals(118_300_000L, am.txHz)
        val fm = Rt950ZoneWriter.toChannel(template("Repetidor ñandú largo", "145.60000", tx = "145.00000"))!!
        assertFalse(fm.am)
        assertFalse(fm.txEnabled)
        assertEquals(145_000_000L, fm.txHz)
        assertEquals(12, fm.name.length)
        assertNull(Rt950ZoneWriter.toChannel(template("USB", "145.60000", "USB")))
        assertNull(Rt950ZoneWriter.toChannel(template("OFFGRID", "145.600005")))
        val radio = Radio()
        val plan = Rt950ZoneWriter.plan(zonePlan(1, "T", listOf(template("LEMD TWR", "118.30000", "AM"))), backupOf(radio), Rt950Variant.UNKNOWN)
        val result = Rt950ZoneWriter.write(session(radio), plan, false)
        assertEquals(Rt950ZoneWriter.Status.OK, result.single().status)
        assertEquals(am, Rt950Channels.decode(radio.block(0x0000).copyOfRange(0, 32)))
    }

    @Test fun channels961To990NeedExplicitCh990() {
        val channel = Rt950Channel(145_800_000, 145_800_000, name = "X")
        for (variant in listOf(Rt950Variant.UNKNOWN, Rt950Variant.CH960)) {
            val radio = Radio()
            assertThrows(IllegalArgumentException::class.java) { session(radio, variant).writeChannels(10, mapOf(70 to channel)) }
            assertTrue(radio.main.isEmpty())
            val plan = Rt950ZoneWriter.Plan(variant, listOf(Rt950ZoneWriter.ZoneWrite(10, "PMR", (1..70).associateWith { channel }, 0, 0)), 0)
            assertThrows(IllegalArgumentException::class.java) { Rt950ZoneWriter.check(plan, variant, true) }
        }
        val radio = Radio()
        assertEquals(1, session(radio, Rt950Variant.CH990).writeChannels(10, mapOf(70 to channel)))
        assertEquals(channel, Rt950Channels.decode(radio.block(0x7800).copyOfRange(0, 32)))
    }

    @Test fun occupiedZonesNeedOverrideAndEmptyZonesDoNot() {
        val radio = Radio()
        put(radio, 3, 5, Rt950Channel(433_500_000, null, name = "KEEP"))
        val backup = backupOf(radio)
        val plan = Rt950ZoneWriter.plan(zonePlan(3, "Z3", listOf(template("A", "145.60000"), template("B", "145.65000"))), backup, Rt950Variant.CH960)
        assertEquals(1, plan.zones.single().occupied)
        assertEquals(0, plan.zones.single().replaced)
        assertThrows(IllegalArgumentException::class.java) { Rt950ZoneWriter.check(plan, Rt950Variant.CH960, false) }
        assertThrows(IllegalArgumentException::class.java) { Rt950ZoneWriter.write(session(radio, Rt950Variant.CH960), plan, false) }
        Rt950ZoneWriter.check(plan, Rt950Variant.CH960, true)
        val empty = Rt950ZoneWriter.plan(zonePlan(4, "Z4", listOf(template("A", "145.60000"))), backup, Rt950Variant.CH960)
        assertEquals(0, empty.zones.single().occupied)
        Rt950ZoneWriter.check(empty, Rt950Variant.CH960, false)
    }

    @Test fun firstZoneShiftsRegionalZonesAndRefusesOverflowWithPmr() {
        val radio = Radio()
        val backup = backupOf(radio)
        val plan = Rt950ZoneWriter.plan(zonePlan(1, "R1", listOf(template("A", "145.60000"))), backup, Rt950Variant.CH960, 5)
        assertEquals(listOf(5), plan.zones.map { it.zone })
        assertEquals(1, Rt950ZoneWriter.write(session(radio, Rt950Variant.CH960), plan, false).size)
        assertEquals("A", Rt950Channels.decode(radio.block(Rt950Channels.index(5, 1) * 32 / 128 * 128)
            .copyOfRange(Rt950Channels.index(5, 1) * 32 % 128, Rt950Channels.index(5, 1) * 32 % 128 + 32))!!.name)
        assertEquals(1, Rt950ZoneWriter.defaultFirstZone(backup, Rt950Variant.CH960))

        val ch = listOf(template("A", "145.60000"))
        val withPmr = ChannelTemplates.ZonePlan("rt950pro", listOf(
            ChannelTemplates.Zone(1, "R1", listOf("R"), ch), ChannelTemplates.Zone(2, "R2", listOf("R2"), ch),
            ChannelTemplates.Zone(10, "PMR446", listOf("PMR446"), ch)), emptyMap(), ch, 0, emptyList())
        assertThrows(IllegalArgumentException::class.java) { Rt950ZoneWriter.plan(withPmr, backup, Rt950Variant.CH960, 9) }
        assertEquals(listOf(8, 9, 10), Rt950ZoneWriter.plan(withPmr, backup, Rt950Variant.CH960, 8).zones.map { it.zone })
    }

    @Test fun verifyReportsMismatchAndAffectedZones() {
        val radio = Radio().apply { corruptWrites = true }
        val plan = Rt950ZoneWriter.plan(zonePlan(1, "Z1", listOf(template("A", "145.60000"))), backupOf(radio), Rt950Variant.UNKNOWN)
        val results = Rt950ZoneWriter.write(session(radio), plan, false)
        assertEquals(Rt950ZoneWriter.Status.MISMATCH, results.single().status)
        assertEquals(setOf(1), Rt950ZoneWriter.affectedZones(results))

        val good = Radio()
        val goodPlan = Rt950ZoneWriter.plan(zonePlan(1, "Z1", listOf(template("A", "145.60000"))), backupOf(good), Rt950Variant.UNKNOWN)
        val live = session(good)
        assertEquals(Rt950ZoneWriter.Status.OK, Rt950ZoneWriter.write(live, goodPlan, false).single().status)
        assertTrue(Rt950ZoneWriter.verifyZone(live, goodPlan.zones.single()).isEmpty())
        good.block(0x0000)[0] = (good.block(0x0000)[0].toInt() xor 1).toByte()
        assertEquals(listOf(1), Rt950ZoneWriter.verifyZone(live, goodPlan.zones.single()))
    }

    @Test fun restoreWritesOnlyDifferingBlocksWithinVariantRange() {
        val radio = Radio()
        val backup = backupOf(radio)
        val channel = Rt950Channel(145_800_000, null, name = "NEW")
        val live = session(radio, Rt950Variant.CH960)
        live.writeChannels(1, mapOf(1 to channel))
        live.writeChannels(10, mapOf(1 to channel))
        radio.block(0x7800)[0] = 0x12
        radio.writes.clear()
        assertEquals(listOf(0x0000), session(radio, Rt950Variant.CH960).restoreChannels(backup, setOf(1)))
        assertEquals(listOf(0x6F00), session(radio, Rt950Variant.CH960).restoreChannels(backup))
        assertEquals(listOf(0x0000, 0x6F00), radio.writes)
        assertEquals(0x12, radio.block(0x7800)[0].toInt())
        assertEquals(emptyList<Int>(), session(radio, Rt950Variant.CH960).restoreChannels(backup))
        assertEquals(listOf(0x7800), session(radio, Rt950Variant.CH990).restoreChannels(backup))
        assertTrue(radio.block(0x7800).contentEquals(backup.part("channels").data.copyOfRange(0x7800, 0x7880)))
    }

    @Test fun restoreFromOlderBackupRevertsOnlyWrittenZone() {
        val radio = Radio()
        val older = backupOf(radio)
        val live = session(radio, Rt950Variant.CH960)
        live.writeChannels(1, mapOf(1 to Rt950Channel(145_800_000, null, name = "NEW")))
        val newer = backupOf(radio)
        radio.block(0x6F00)[0] = 0x55
        assertEquals(emptyList<Int>(), session(radio, Rt950Variant.CH960).restoreChannels(newer, setOf(1)))
        val diff = session(radio, Rt950Variant.CH960).channelDiff(older, setOf(1))
        assertEquals(setOf(1), diff.zones)
        assertEquals(listOf(0x0000), session(radio, Rt950Variant.CH960).restoreChannels(older, setOf(1)))
        assertEquals(0x55, radio.block(0x6F00)[0].toInt())
        assertTrue(radio.block(0x0000).contentEquals(older.part("channels").data.copyOfRange(0, 0x80)))
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
