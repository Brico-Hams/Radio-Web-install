package org.bricohams.radio

import java.io.File
import java.io.IOException
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
    private val clock: () -> Long = { System.nanoTime() / 1_000_000 }
) {
    var firmware = ""; private set
    /** F4HWN v6.0 has no physical Flash reader: channels can be read but never written. */
    var legacyReadOnly = true; private set
    private var timestamp = 0

    private fun le(size: Int) = ByteBuffer.allocate(size).order(ByteOrder.LITTLE_ENDIAN)
    private fun view(bytes: ByteArray) = ByteBuffer.wrap(bytes).order(ByteOrder.LITTLE_ENDIAN)
    private fun remaining(deadline: Long): Int {
        val left = deadline - clock()
        if (left <= 0) throw IOException("Tiempo agotado esperando respuesta F4HWN.")
        return left.coerceAtMost(1000).toInt()
    }

    @Synchronized fun exchange(type: Int, payload: ByteArray, expected: Int = type + 1, timeoutMs: Long = 4000): ByteArray {
        val deadline = clock() + timeoutMs
        transport.write(QuanshengFrames.encode(type, payload), remaining(deadline))
        var previous = 0
        while (true) {
            val byte = transport.read(1, remaining(deadline)).single().toInt() and 255
            if (previous != 0xab || byte != 0xcd) { previous = byte; continue }
            val length = transport.read(2, remaining(deadline))
            val size = view(length).short.toInt() and 65535
            require(size in 4..512) { "Longitud de paquete F4HWN fuera de rango." }
            val tail = transport.read(size + 4, remaining(deadline))
            val (responseType, response) = QuanshengFrames.decode(byteArrayOf(0xab.toByte(), 0xcd.toByte()) + length + tail)
            if (responseType == expected) return response
            previous = 0
        }
    }

    fun identify(): String {
        timestamp = System.currentTimeMillis().toInt()
        val response = exchange(0x0514, le(4).putInt(timestamp).array())
        require(response.size >= 16) { "Respuesta de identificacion incompleta." }
        val name = response.copyOfRange(0, 16).takeWhile { it != 0.toByte() }.toByteArray().toString(Charsets.US_ASCII)
        val match = requireNotNull(Regex("F4HWN.*v(\\d+)(?:\\.(\\d+))?", RegexOption.IGNORE_CASE).find(name)) {
            "Firmware no compatible: $name. Se requiere F4HWN v6+."
        }
        val major = match.groupValues[1].toInt()
        require(major >= 6) { "Firmware no compatible: $name. Se requiere F4HWN v6+." }
        firmware = name
        legacyReadOnly = major == 6 && (match.groupValues[2].toIntOrNull() ?: 0) == 0
        return name
    }

    private fun checkIdentified() = require(firmware.isNotEmpty()) { "Identifica primero la radio." }

    fun readConfiguration(progress: (Double) -> Unit = {}): ByteArray {
        checkIdentified()
        require(Regex("^F4HWN.*v6\\.", RegexOption.IGNORE_CASE).containsMatchIn(firmware)) { "La gestion de canales solo admite F4HWN v6.x." }
        val out = ByteArray(QuanshengChannels.CONFIG_SIZE)
        var offset = 0
        while (offset < out.size) {
            val length = minOf(128, out.size - offset)
            val data = exchange(0x051b, le(8).putShort(offset.toShort()).put(length.toByte()).put(0).putInt(timestamp).array())
            require(data.size == length + 4 && (view(data).short.toInt() and 65535) == offset && (data[2].toInt() and 255) == length) {
                "Respuesta de configuracion incorrecta en 0x%x.".format(offset)
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
            require(data.size == 20 && (view(data).short.toInt() and 65535) == 0xb000 + offset && data[2].toInt() == 16) {
                "Respuesta de calibracion incorrecta."
            }
            data.copyInto(out, offset, 4)
            progress((offset + 16) / 512.0)
        }
        return out
    }

    fun readFlashBlock(address: Int, length: Int): ByteArray {
        require(address >= 0 && length in 1..128 && address + length <= FLASH_SIZE) { "Rango de lectura Flash invalido." }
        val data = exchange(0x0738, le(10).putInt(address).putShort(length.toShort()).putInt(timestamp).array())
        require(data.size == length + 7 && view(data).getInt(0) == address &&
            (view(data).getShort(4).toInt() and 65535) == length && data[6].toInt() == 0) {
            "Lectura Flash rechazada en 0x%x. Se requiere Labs con acceso Flash externa.".format(address)
        }
        return data.copyOfRange(7, data.size)
    }

    fun verifyFlash(flash: ByteArray): Long {
        val response = exchange(0x073e, le(12).putInt(0).putInt(flash.size).putInt(timestamp).array(), 0x073f, 30000)
        require(response.size == 13 && view(response).getInt(0) == 0 && view(response).getInt(4) == flash.size &&
            response[12].toInt() == 0) { "La radio no pudo verificar toda la Flash. Se requiere Labs con CRC de lectura fisica." }
        val radio = view(response).getInt(8).toLong() and 0xffffffffL
        require(radio == crc32(flash)) { "El CRC de la Flash leida no coincide con la radio. No se habilitara escritura." }
        return radio
    }

    /** Calibration + full 2 MiB external Flash checked by the radio's CRC + validated Main image, as the web backup. */
    fun backup(progress: (String, Double) -> Unit = { _, _ -> }): Map<String, ByteArray> {
        identify()
        val calibration = readCalibration { progress("Leyendo calibracion", it) }
        require(!legacyReadOnly) { "F4HWN v6.0 no admite el respaldo Flash completo: escritura bloqueada. Usa Labs v6.1+." }
        val flash = ByteArray(FLASH_SIZE)
        for (address in 0 until FLASH_SIZE step 128) {
            readFlashBlock(address, 128).copyInto(flash, address)
            progress("Leyendo Flash externa (2 MiB, 10-20 min)", (address + 128).toDouble() / FLASH_SIZE)
        }
        progress("Verificando CRC-32 en la radio", 1.0)
        verifyFlash(flash)
        require(calibration.contentEquals(flash.copyOfRange(0x10000, 0x10200))) { "La calibracion no coincide con la Flash fisica. Respaldo bloqueado." }
        return linkedMapOf("calibration.bin" to calibration, "external-flash.bin" to flash, "base-firmware.bin" to baseFromFlash(flash))
    }

    /** Writes only the channel area (records, names, attributes) and re-reads everything; returns the blocks written. */
    fun writeConfiguration(image: ByteArray, original: ByteArray, progress: (Double) -> Unit = {}): Int {
        checkIdentified()
        require(!legacyReadOnly) { "F4HWN v6.0: escritura bloqueada." }
        require(image.size == QuanshengChannels.CONFIG_SIZE && original.size == QuanshengChannels.CONFIG_SIZE)
        require(image.copyOfRange(QuanshengChannels.PROTECTED_FROM, image.size)
            .contentEquals(original.copyOfRange(QuanshengChannels.PROTECTED_FROM, original.size))) {
            "Solo se pueden modificar memorias, nombres y atributos; VFO y ajustes estan protegidos."
        }
        require(readConfiguration().contentEquals(original)) { "La configuracion de la radio ha cambiado. Vuelve a leer antes de escribir." }
        val writes = plan(image, original)
        writes.forEachIndexed { index, (offset, bytes) ->
            val response = exchange(0x051d, le(16).putShort(offset.toShort()).put(8).put(0).putInt(timestamp).put(bytes).array())
            require(response.size == 2 && (view(response).short.toInt() and 65535) == offset) {
                "Escritura rechazada en 0x%x.".format(offset)
            }
            progress((index + 1).toDouble() / writes.size)
        }
        require(readConfiguration().contentEquals(image)) {
            "La relectura no coincide. Escritura parcial o rechazada; conserva el respaldo y no continues."
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
            require(magic == 0x31424d46 && version == 1 && flags and 1 != 0) {
                "Main no inicializado o cabecera no compatible. No hay copia de firmware base valida."
            }
            require(size in 1..0x1d800) { "Tamano de Main invalido." }
            val image = flash.copyOfRange(0x21000, 0x21000 + size)
            require(crc32(image) == crc) { "El CRC del firmware base Main no coincide." }
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
        require(files.keys.containsAll(listOf("calibration.bin", "external-flash.bin", "base-firmware.bin"))) { "Respaldo incompleto." }
        val directory = File(root, "quansheng-$now")
        if (!directory.mkdirs()) throw IOException("No se pudo crear la carpeta del respaldo.")
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
            require(file.isFile && sha256(file.readBytes()) == expected) { "La copia persistente cambio o esta corrupta: $name." }
        }
    }

    companion object {
        fun sha256(bytes: ByteArray): String = MessageDigest.getInstance("SHA-256").digest(bytes).joinToString("") { "%02x".format(it) }
    }
}
