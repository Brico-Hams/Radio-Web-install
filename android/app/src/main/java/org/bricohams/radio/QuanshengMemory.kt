package org.bricohams.radio

import java.io.File
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.security.MessageDigest
import java.util.zip.CRC32

/**
 * F4HWN v6 memory access over the programming UART, the Android port of quansheng-connector.js:
 * the same commands, block sizes, backup scope and write order (hide, write records, show, re-read).
 */
class QuanshengMemory(
    private val transport: RadioBytes,
    private val clock: () -> Long = { System.nanoTime() / 1_000_000 },
    private val allowExchange: () -> Boolean = { true }
) {
    var firmware = ""; private set
    /** F4HWN v6.0 has no physical Flash reader: channels can be read but never written. */
    var legacyReadOnly = true; private set
    private var timestamp = 0

    private fun le(size: Int) = ByteBuffer.allocate(size).order(ByteOrder.LITTLE_ENDIAN)
    private fun view(bytes: ByteArray) = ByteBuffer.wrap(bytes).order(ByteOrder.LITTLE_ENDIAN)
    private fun remaining(deadline: Long): Int {
        val left = deadline - clock()
        if (left <= 0) throw LocalizedIOException(UiText(R.string.err_f4hwn_timeout))
        return left.coerceAtMost(1000).toInt()
    }

    @Synchronized fun exchange(type: Int, payload: ByteArray, expected: Int = type + 1, timeoutMs: Long = 4000): ByteArray {
        checkUi(allowExchange()) { UiText(R.string.err_usb_session_cancelled) }
        val deadline = clock() + timeoutMs
        transport.write(QuanshengFrames.encode(type, payload), remaining(deadline))
        var previous = 0
        while (true) {
            checkUi(allowExchange()) { UiText(R.string.err_usb_session_cancelled) }
            val byte = transport.read(1, remaining(deadline)).single().toInt() and 255
            if (previous != 0xab || byte != 0xcd) { previous = byte; continue }
            val length = transport.read(2, remaining(deadline))
            val size = view(length).short.toInt() and 65535
            requireUi(size in 4..512) { UiText(R.string.err_f4hwn_packet_length) }
            val tail = transport.read(size + 4, remaining(deadline))
            val (responseType, response) = QuanshengFrames.decode(byteArrayOf(0xab.toByte(), 0xcd.toByte()) + length + tail)
            if (responseType == expected) return response
            previous = 0
        }
    }

    fun identify(): String {
        timestamp = System.currentTimeMillis().toInt()
        val response = exchange(0x0514, le(4).putInt(timestamp).array())
        requireUi(response.size >= 16) { UiText(R.string.err_identification_incomplete) }
        val name = response.copyOfRange(0, 16).takeWhile { it != 0.toByte() }.toByteArray().toString(Charsets.US_ASCII)
        val match = requireNotNullUi(Regex("F4HWN.*v(\\d+)(?:\\.(\\d+))?", RegexOption.IGNORE_CASE).find(name)) {
            UiText(R.string.err_firmware_v6_required, name)
        }
        val major = match.groupValues[1].toInt()
        requireUi(major >= 6) { UiText(R.string.err_firmware_v6_required, name) }
        firmware = name
        legacyReadOnly = major == 6 && (match.groupValues[2].toIntOrNull() ?: 0) == 0
        return name
    }

    private fun checkIdentified() = requireUi(firmware.isNotEmpty()) { UiText(R.string.err_identify_first) }

    fun readConfiguration(progress: (Double) -> Unit = {}): ByteArray {
        checkIdentified()
        requireUi(Regex("^F4HWN.*v6\\.", RegexOption.IGNORE_CASE).containsMatchIn(firmware)) { UiText(R.string.err_channels_v6_only) }
        val out = ByteArray(QuanshengChannels.CONFIG_SIZE)
        var offset = 0
        while (offset < out.size) {
            val length = minOf(128, out.size - offset)
            val data = exchange(0x051b, le(8).putShort(offset.toShort()).put(length.toByte()).put(0).putInt(timestamp).array())
            requireUi(data.size == length + 4 && (view(data).short.toInt() and 65535) == offset && (data[2].toInt() and 255) == length) {
                UiText(R.string.err_config_response, Integer.toHexString(offset))
            }
            data.copyInto(out, offset, 4)
            offset += length
            progress(offset.toDouble() / out.size)
        }
        return out
    }

    fun readCalibration(progress: (Double) -> Unit = {}): ByteArray {
        checkIdentified()
        val out = ByteArray(512)
        for (offset in 0 until 512 step 16) {
            val data = exchange(0x051b, le(8).putShort((0xb000 + offset).toShort()).putShort(16).putInt(timestamp).array())
            requireUi(data.size == 20 && (view(data).short.toInt() and 65535) == 0xb000 + offset && data[2].toInt() == 16) {
                UiText(R.string.err_calibration_response)
            }
            data.copyInto(out, offset, 4)
            progress((offset + 16) / 512.0)
        }
        return out
    }

    fun readFlashBlock(address: Int, length: Int): ByteArray {
        checkIdentified()
        requireUi(address >= 0 && length in 1..128 && address <= FLASH_SIZE - length) { UiText(R.string.err_flash_read_range) }
        val data = exchange(0x0738, le(10).putInt(address).putShort(length.toShort()).putInt(timestamp).array())
        requireUi(data.size == length + 7 && view(data).getInt(0) == address &&
            (view(data).getShort(4).toInt() and 65535) == length && data[6].toInt() == 0) {
            UiText(R.string.err_flash_read_rejected, Integer.toHexString(address))
        }
        return data.copyOfRange(7, data.size)
    }

    fun verifyFlash(flash: ByteArray): Long {
        checkIdentified()
        requireUi(flash.size == FLASH_SIZE) { UiText(R.string.err_flash_full_required) }
        for (address in flash.indices step 4096) {
            val response = exchange(0x073e, le(12).putInt(address).putInt(4096).putInt(timestamp).array(), 0x073f, 30000)
            requireUi(response.size == 13 && view(response).getInt(0) == address && view(response).getInt(4) == 4096 &&
                response[12].toInt() == 0) {
                UiText(R.string.err_flash_sector_verify, Integer.toHexString(address))
            }
            val radio = view(response).getInt(8).toLong() and 0xffffffffL
            requireUi(radio == crc32(flash.copyOfRange(address, address + 4096))) {
                UiText(R.string.err_flash_crc, Integer.toHexString(address))
            }
        }
        return crc32(flash)
    }

    /** Calibration + full 2 MiB external Flash checked by the radio's CRC + validated Main image, as the web backup. */
    fun backup(progress: (UiText, Double) -> Unit = { _, _ -> }): Map<String, ByteArray> {
        identify()
        val calibration = readCalibration { progress(UiText(R.string.backup_stage_calibration), it) }
        requireUi(!legacyReadOnly) { UiText(R.string.err_v60_no_backup) }
        val flash = ByteArray(FLASH_SIZE)
        for (address in 0 until FLASH_SIZE step 128) {
            readFlashBlock(address, 128).copyInto(flash, address)
            progress(UiText(R.string.backup_stage_flash), (address + 128).toDouble() / FLASH_SIZE)
        }
        progress(UiText(R.string.backup_stage_crc), 1.0)
        verifyFlash(flash)
        requireUi(calibration.contentEquals(flash.copyOfRange(0x10000, 0x10200))) { UiText(R.string.err_calibration_mismatch) }
        return linkedMapOf("calibration.bin" to calibration, "external-flash.bin" to flash, "base-firmware.bin" to baseFromFlash(flash))
    }

    /** Writes only the channel area (records, names, attributes) and re-reads everything; returns the blocks written. */
    fun writeConfiguration(image: ByteArray, original: ByteArray, progress: (Double) -> Unit = {}): Int {
        checkIdentified()
        requireUi(!legacyReadOnly) { UiText(R.string.err_v60_write_blocked) }
        require(image.size == QuanshengChannels.CONFIG_SIZE && original.size == QuanshengChannels.CONFIG_SIZE)
        requireUi(image.copyOfRange(QuanshengChannels.PROTECTED_FROM, image.size)
            .contentEquals(original.copyOfRange(QuanshengChannels.PROTECTED_FROM, original.size))) {
            UiText(R.string.err_write_protected_area)
        }
        requireUi(readConfiguration().contentEquals(original)) { UiText(R.string.err_config_changed) }
        val writes = plan(image, original)
        writes.forEachIndexed { index, (offset, bytes) ->
            val response = exchange(0x051d, le(16).putShort(offset.toShort()).put(8).put(0).putInt(timestamp).put(bytes).array())
            requireUi(response.size == 2 && (view(response).short.toInt() and 65535) == offset) {
                UiText(R.string.err_write_rejected, Integer.toHexString(offset))
            }
            progress((index + 1).toDouble() / writes.size)
        }
        requireUi(readConfiguration().contentEquals(image)) {
            UiText(R.string.err_readback_mismatch)
        }
        return writes.size
    }

    companion object {
        const val FLASH_SIZE = 0x200000

        fun crc32(bytes: ByteArray): Long = CRC32().apply { update(bytes) }.value

        /** Main firmware copy kept by F4HWN multiboot at 0x20000 ("FMB1" header, image at 0x21000). */
        fun baseFromFlash(flash: ByteArray): ByteArray {
            require(flash.size == FLASH_SIZE)
            val header = ByteBuffer.wrap(flash, 0x20000, 64).order(ByteOrder.LITTLE_ENDIAN)
            val magic = header.getInt(0x20000)
            val version = header.getShort(0x20004).toInt() and 65535
            val flags = header.getShort(0x20006).toInt() and 65535
            val size = header.getInt(0x20008)
            val crc = header.getInt(0x2000c).toLong() and 0xffffffffL
            requireUi(magic == 0x31424d46 && version == 1 && flags and 1 != 0) {
                UiText(R.string.err_main_header)
            }
            requireUi(size in 1..0x1d800) { UiText(R.string.err_main_size) }
            val image = flash.copyOfRange(0x21000, 0x21000 + size)
            requireUi(crc32(image) == crc) { UiText(R.string.err_main_crc) }
            return image
        }

        /** Write order of the web: hide changed memories, write records/names, then restore their attributes. */
        fun plan(image: ByteArray, original: ByteArray): List<Pair<Int, ByteArray>> {
            val attributes = LinkedHashMap<Int, ByteArray>()
            for (channel in 0 until 1024) {
                val record = channel * 16
                val name = 0x4000 + record
                val attr = 0x8000 + channel * 2
                fun same(at: Int, length: Int) = image.copyOfRange(at, at + length).contentEquals(original.copyOfRange(at, at + length))
                if (same(record, 16) && same(name, 16) && same(attr, 2)) continue
                val block = attr and 7.inv()
                val hidden = attributes.getOrPut(block) { original.copyOfRange(block, block + 8) }
                hidden[attr - block] = (hidden[attr - block].toInt() or 7).toByte()
            }
            val writes = ArrayList<Pair<Int, ByteArray>>()
            for ((offset, bytes) in attributes) if (!bytes.contentEquals(original.copyOfRange(offset, offset + 8))) writes.add(offset to bytes)
            for (offset in 0 until 0x8000 step 8) {
                if (!image.copyOfRange(offset, offset + 8).contentEquals(original.copyOfRange(offset, offset + 8)))
                    writes.add(offset to image.copyOfRange(offset, offset + 8))
            }
            for ((offset, bytes) in attributes) if (!bytes.contentEquals(image.copyOfRange(offset, offset + 8)))
                writes.add(offset to image.copyOfRange(offset, offset + 8))
            return writes
        }
    }
}

/** Persistent backup of one session in app storage, re-verified by SHA-256 before every write (backup-store.js). */
class QuanshengBackups(private val root: File) {
    data class Receipt(val directory: File, val sha256: Map<String, String>, val firmware: String)

    fun save(firmware: String, files: Map<String, ByteArray>, now: Long = System.currentTimeMillis()): Receipt {
        requireUi(files.keys.containsAll(listOf("calibration.bin", "external-flash.bin", "base-firmware.bin"))) { UiText(R.string.err_backup_incomplete) }
        val directory = File(root, "quansheng-$now")
        if (!directory.mkdirs()) throw LocalizedIOException(UiText(R.string.err_backup_folder))
        val hashes = LinkedHashMap<String, String>()
        for ((name, bytes) in files) {
            File(directory, name).writeBytes(bytes)
            hashes[name] = sha256(bytes)
        }
        File(directory, "SHA256SUMS").writeText(hashes.entries.joinToString("") { "${it.value}  ${it.key}\n" })
        File(directory, "info.txt").writeText("firmware=$firmware\nscope=calibracion + Flash externa 2 MiB (CRC de la radio) + Main validado\n")
        val receipt = Receipt(directory, hashes, firmware)
        verify(receipt)
        return receipt
    }

    fun verify(receipt: Receipt) {
        for ((name, expected) in receipt.sha256) {
            val file = File(receipt.directory, name)
            requireUi(file.isFile && sha256(file.readBytes()) == expected) { UiText(R.string.err_backup_copy_corrupt, name) }
        }
    }

    companion object {
        fun sha256(bytes: ByteArray): String = MessageDigest.getInstance("SHA-256").digest(bytes).joinToString("") { "%02x".format(it) }
    }
}
