package org.bricohams.radio

import org.junit.Assert.*
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder
import java.io.File
import java.io.IOException
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.util.ArrayDeque

class QuanshengMemoryTest {
    @get:Rule val folder = TemporaryFolder()

    /** Simulated F4HWN v6 radio: logical configuration, calibration, 2 MiB external Flash and channel writes. */
    private class Radio(var firmware: String = "F4HWN v6.1.0") : RadioBytes {
        val buffer = ArrayDeque<Byte>()
        val config = QuanshengChannelsTest.image()
        val calibration = ByteArray(512) { (it * 7).toByte() }
        val flash = ByteArray(QuanshengMemory.FLASH_SIZE) { 0xff.toByte() }
        val writes = ArrayList<Int>()
        var rejectWriteAt = -1
        var crcOffset = 0
        var crcFaultAddress = -1
        val crcRequests = ArrayList<Pair<Int, Int>>()
        var crcResponse: (ByteArray) -> ByteArray = { it }
        val flashRequests = ArrayList<Pair<Int, Int>>()
        var flashReader = true
        init {
            calibration.copyInto(flash, 0x10000)
            val main = ByteArray(4096) { (it % 251).toByte() }
            main.copyInto(flash, 0x21000)
            ByteBuffer.wrap(flash).order(ByteOrder.LITTLE_ENDIAN).putInt(0x20000, 0x31424d46).putShort(0x20004, 1)
                .putShort(0x20006, 1).putInt(0x20008, main.size).putInt(0x2000c, QuanshengMemory.crc32(main).toInt())
        }
        private fun reply(type: Int, data: ByteArray) = QuanshengFrames.encode(type, data).forEach(buffer::add)
        override fun write(bytes: ByteArray, timeoutMs: Int) {
            val (type, request) = QuanshengFrames.decode(bytes)
            val view = ByteBuffer.wrap(request).order(ByteOrder.LITTLE_ENDIAN)
            when (type) {
                0x0514 -> reply(0x0515, firmware.toByteArray().copyOf(16))
                0x051b -> {
                    val offset = view.getShort(0).toInt() and 65535
                    val length = request[2].toInt() and 255
                    val source = if (offset >= 0xb000) calibration.copyOfRange(offset - 0xb000, offset - 0xb000 + length)
                        else config.copyOfRange(offset, offset + length)
                    reply(0x051c, request.copyOfRange(0, 4) + source)
                }
                0x051d -> {
                    val offset = view.getShort(0).toInt() and 65535
                    assertEquals(8, request[2].toInt())
                    if (offset == rejectWriteAt) { reply(0x051e, byteArrayOf(0, 0)); return }
                    request.copyInto(config, offset, 8, 16)
                    writes.add(offset)
                    reply(0x051e, request.copyOfRange(0, 2))
                }
                0x0738 -> {
                    if (!flashReader) return
                    val address = view.getInt(0)
                    val length = view.getShort(4).toInt()
                    flashRequests.add(address to length)
                    reply(0x0739, request.copyOfRange(0, 6) + byteArrayOf(0) + flash.copyOfRange(address, address + length))
                }
                0x073e -> {
                    val address = view.getInt(0)
                    val length = view.getInt(4)
                    require(address >= 0 && length in 1..4096 && address <= flash.size - length)
                    crcRequests.add(address to length)
                    val error = crcOffset + if (address == crcFaultAddress) 1 else 0
                    reply(0x073f, crcResponse(ByteBuffer.allocate(13).order(ByteOrder.LITTLE_ENDIAN).putInt(address)
                        .putInt(length).putInt((QuanshengMemory.crc32(flash.copyOfRange(address, address + length)) + error).toInt())
                        .put(0).array()))
                }
                else -> fail("Comando inesperado 0x%04x".format(type))
            }
        }
        override fun read(length: Int, timeoutMs: Int): ByteArray {
            if (buffer.size < length) throw IOException("Mock timeout")
            return ByteArray(length) { buffer.removeFirst() }
        }
        override fun close() = Unit
    }

    private fun edited(image: ByteArray): ByteArray {
        val channel = QuanshengChannels.read(image).single()
        return QuanshengChannels.update(image, channel.copy(txTone = QuanshengTone.parse("D023N"), power = 3, narrow = true))
    }

    @Test fun fullBackupMatchesTheWebScopeAndIsVerifiedOnDisk() {
        val radio = Radio()
        val memory = QuanshengMemory(radio)
        val files = memory.backup()
        assertEquals(listOf("calibration.bin", "external-flash.bin", "base-firmware.bin"), files.keys.toList())
        assertArrayEquals(radio.calibration, files["calibration.bin"])
        assertArrayEquals(radio.flash, files["external-flash.bin"])
        assertEquals((0 until QuanshengMemory.FLASH_SIZE step 4096).map { it to 4096 }, radio.crcRequests)
        assertEquals(4096, files.getValue("base-firmware.bin").size)
        val backups = QuanshengBackups(folder.root)
        val receipt = backups.save(memory.firmware, files, now = 1)
        backups.verify(receipt)
        assertTrue(File(receipt.directory, "SHA256SUMS").readText().contains("external-flash.bin"))
        File(receipt.directory, "calibration.bin").appendBytes(byteArrayOf(1))
        assertThrows(IllegalArgumentException::class.java) { backups.verify(receipt) }
    }

    @Test fun backupRefusesWrongCrcLegacyFirmwareAndMissingFlashReader() {
        assertThrows(IllegalArgumentException::class.java) { QuanshengMemory(Radio().apply { crcOffset = 1 }).backup() }
        assertThrows(IllegalArgumentException::class.java) { QuanshengMemory(Radio("F4HWN v6.0.0")).backup() }
        val noReader = Radio().apply { flashReader = false }
        assertThrows(IOException::class.java) { QuanshengMemory(noReader, clock = sequence()).backup() }
        val badMain = Radio().apply { flash[0x21000] = (flash[0x21000] + 1).toByte() }
        assertThrows(IllegalArgumentException::class.java) { QuanshengMemory(badMain).backup() }
    }

    private fun sequence(): () -> Long { var time = 0L; return { time += 500; time } }

    @Test fun crcVerificationChecksLastSectorAndRejectsInvalidScopeBeforeTransport() {
        val radio = Radio()
        val memory = QuanshengMemory(radio)
        assertThrows(IllegalArgumentException::class.java) { memory.verifyFlash(radio.flash) }
        memory.identify()
        assertThrows(IllegalArgumentException::class.java) { memory.verifyFlash(ByteArray(4096)) }
        assertTrue(radio.crcRequests.isEmpty())
        radio.crcFaultAddress = QuanshengMemory.FLASH_SIZE - 4096
        val error = assertThrows(IllegalArgumentException::class.java) { memory.verifyFlash(radio.flash) }
        assertTrue(error.message!!.contains("1ff000"))
        assertEquals(512, radio.crcRequests.size)
        assertTrue(radio.writes.isEmpty())
        radio.crcFaultAddress = -1
        radio.crcRequests.clear()
        assertEquals(QuanshengMemory.crc32(radio.flash), memory.verifyFlash(radio.flash))
        assertEquals(512, radio.crcRequests.size)
    }

    @Test fun writeFollowsWebOrderAndIsConfirmedByReread() {
        val radio = Radio()
        val memory = QuanshengMemory(radio)
        memory.identify()
        val original = memory.readConfiguration()
        val image = edited(original)
        assertEquals(QuanshengMemory.plan(image, original).size, memory.writeConfiguration(image, original))
        assertEquals(listOf(0x8000, 8, 0x8000), radio.writes)
        assertArrayEquals(image, radio.config)
        val channel = QuanshengChannels.read(radio.config).single()
        assertEquals("D023N", channel.txTone.label)
        assertEquals(3, channel.power)
        assertTrue(channel.narrow)
    }

    @Test fun crcVerificationRejectsMalformedMetadataBeforeNextSector() {
        val malformed: List<(ByteArray) -> ByteArray> = listOf(
            { it.copyOf(12) },
            { it + byteArrayOf(0) },
            { it.copyOf().apply { this[0] = 1 } },
            { it.copyOf().apply { this[5] = 0 } },
            { it.copyOf().apply { this[12] = 1 } }
        )
        for (response in malformed) {
            val radio = Radio().apply { crcResponse = response }
            val memory = QuanshengMemory(radio).apply { identify() }
            assertThrows(IllegalArgumentException::class.java) { memory.verifyFlash(radio.flash) }
            assertEquals(listOf(0 to 4096), radio.crcRequests)
            assertTrue(radio.writes.isEmpty())
        }
    }

    @Test fun physicalFlashReadRequiresIdentityAndOverflowSafeRange() {
        val radio = Radio()
        val memory = QuanshengMemory(radio)
        assertThrows(IllegalArgumentException::class.java) { memory.readFlashBlock(0, 128) }
        memory.identify()
        for ((address, length) in listOf(-1 to 1, 0 to 0, 0 to 129,
            QuanshengMemory.FLASH_SIZE to 1, Int.MAX_VALUE to 128)) {
            assertThrows(IllegalArgumentException::class.java) { memory.readFlashBlock(address, length) }
        }
        assertTrue(radio.flashRequests.isEmpty())
        val last = QuanshengMemory.FLASH_SIZE - 128
        assertArrayEquals(radio.flash.copyOfRange(last, radio.flash.size), memory.readFlashBlock(last, 128))
        assertEquals(listOf(last to 128), radio.flashRequests)
        assertTrue(radio.writes.isEmpty())
    }

    @Test fun writeIsBlockedWhenUnsafe() {
        val radio = Radio()
        val memory = QuanshengMemory(radio)
        assertThrows(IllegalArgumentException::class.java) { memory.readConfiguration() }
        memory.identify()
        val original = memory.readConfiguration()
        val image = edited(original)
        val settings = image.copyOf().also { it[0xa000] = 1 }
        assertThrows(IllegalArgumentException::class.java) { memory.writeConfiguration(settings, original) }
        radio.config[0x4005] = 'X'.code.toByte()
        assertThrows(IllegalArgumentException::class.java) { memory.writeConfiguration(image, original) }
        assertTrue(radio.writes.isEmpty())
        val legacy = Radio("F4HWN v6.0.0")
        val readOnly = QuanshengMemory(legacy).apply { identify() }
        val legacyImage = readOnly.readConfiguration()
        assertThrows(IllegalArgumentException::class.java) { readOnly.writeConfiguration(edited(legacyImage), legacyImage) }
        assertTrue(legacy.writes.isEmpty())
    }

    @Test fun rejectedBlockStopsTheWrite() {
        val radio = Radio().apply { rejectWriteAt = 8 }
        val memory = QuanshengMemory(radio).apply { identify() }
        val original = memory.readConfiguration()
        assertThrows(IllegalArgumentException::class.java) { memory.writeConfiguration(edited(original), original) }
        // The memory stays hidden (attribute 7) rather than half-written and visible.
        assertEquals(listOf(0x8000), radio.writes)
        assertEquals(7, radio.config[0x8000].toInt() and 7)
    }

    @Test fun cancelledSessionDoesNotSendAnotherWriteOrResume() {
        val radio = Radio()
        var active = true
        val memory = QuanshengMemory(radio, allowExchange = { active }).apply { identify() }
        val original = memory.readConfiguration()
        assertThrows(IllegalStateException::class.java) {
            memory.writeConfiguration(edited(original), original) { active = false }
        }
        assertEquals(listOf(0x8000), radio.writes)
        assertEquals(7, radio.config[0x8000].toInt() and 7)
        assertThrows(IllegalStateException::class.java) { memory.writeConfiguration(edited(original), original) }
        assertEquals(listOf(0x8000), radio.writes)
    }

    @Test fun cancelledBackupDoesNotRequestAnotherFlashBlock() {
        val radio = Radio()
        var active = true
        val memory = QuanshengMemory(radio, allowExchange = { active })
        assertThrows(IllegalStateException::class.java) {
            memory.backup { stage, _ -> if (stage.id == R.string.backup_stage_flash) active = false }
        }
        assertEquals(listOf(0 to 128), radio.flashRequests)
        assertTrue(radio.crcRequests.isEmpty())
        assertTrue(radio.writes.isEmpty())
    }
}
