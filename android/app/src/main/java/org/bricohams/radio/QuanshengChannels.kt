package org.bricohams.radio

import java.math.BigDecimal
import java.nio.ByteBuffer
import java.nio.ByteOrder

/** Sub-audio setting of one direction, as F4HWN stores it (code type + index into its tables). */
sealed class QuanshengTone {
    object Off : QuanshengTone()
    data class Ctcss(val index: Int) : QuanshengTone()
    data class Dcs(val index: Int, val inverted: Boolean) : QuanshengTone()

    val label: String get() = when (this) {
        Off -> "OFF"
        is Ctcss -> "%.1f".format(java.util.Locale.ROOT, QuanshengChannels.CTCSS[index] / 10.0)
        is Dcs -> "D%03o%s".format(QuanshengChannels.DCS[index], if (inverted) "I" else "N")
    }

    companion object {
        /** Accepts OFF, a CTCSS tone in Hz ("88.5") or a DCS code ("D023N", "D023I"). */
        fun parse(text: String): QuanshengTone {
            val value = text.trim().uppercase(java.util.Locale.ROOT)
            if (value.isEmpty() || value == "OFF") return Off
            Regex("D([0-7]{3})([NI])").matchEntire(value)?.let { match ->
                val index = QuanshengChannels.DCS.indexOf(match.groupValues[1].toInt(8))
                require(index >= 0) { "Codigo DCS ${match.groupValues[1]} no admitido por F4HWN." }
                return Dcs(index, match.groupValues[2] == "I")
            }
            val tenths = value.toBigDecimalOrNull()?.movePointRight(1)
            require(tenths != null && tenths.stripTrailingZeros().scale() <= 0) { "Tono: OFF, CTCSS en Hz (88.5) o DCS (D023N/D023I)." }
            val index = QuanshengChannels.CTCSS.indexOf(tenths.toInt())
            require(index >= 0) { "Tono CTCSS $text Hz no admitido por F4HWN." }
            return Ctcss(index)
        }
    }
}

data class QuanshengChannel(
    val number: Int,
    val name: String,
    val rx10Hz: Long,
    val tx10Hz: Long,
    val mode: Int,
    val rxTone: QuanshengTone,
    val txTone: QuanshengTone,
    val power: Int,
    val narrow: Boolean,
    val txLock: Boolean
)

/**
 * F4HWN v6 logical configuration (0xA180 bytes, as read with 0x051B): 1024 channel records of 16 bytes at 0,
 * names at 0x4000, 2-byte attributes at 0x8000. Record layout from App/settings.c SETTINGS_SaveChannel:
 * 0 RX (10 Hz), 4 offset, 8 RX code, 9 TX code, 10 code types (TX high, RX low nibble), 11 modulation (high)
 * and offset direction (low), 12 flags: bit 0 reverse, 1 narrow, 2-4 power, 5 busy lock, 6 TX lock.
 */
object QuanshengChannels {
    const val CONFIG_SIZE = 0xa180
    const val PROTECTED_FROM = 0x8800
    // App/dcs.c CTCSS_Options, tenths of Hz.
    val CTCSS = intArrayOf(
        670, 693, 719, 744, 770, 797, 825, 854, 885, 915, 948, 974, 1000, 1035, 1072, 1109, 1148, 1188, 1230, 1273,
        1318, 1365, 1413, 1462, 1514, 1567, 1598, 1622, 1655, 1679, 1713, 1738, 1773, 1799, 1835, 1862, 1899, 1928,
        1966, 1995, 2035, 2065, 2107, 2181, 2257, 2291, 2336, 2418, 2503, 2541)
    // App/dcs.c DCS_OptionsLow with bit 8 set from index 64: the octal DCS code as a number.
    val DCS: IntArray = intArrayOf(
        0x13, 0x15, 0x16, 0x19, 0x1A, 0x1E, 0x23, 0x27, 0x29, 0x2B, 0x2C, 0x35, 0x39, 0x3A, 0x3B, 0x3C,
        0x4C, 0x4D, 0x4E, 0x52, 0x55, 0x59, 0x5A, 0x5C, 0x63, 0x65, 0x6A, 0x6D, 0x6E, 0x72, 0x75, 0x7A,
        0x7C, 0x85, 0x8A, 0x93, 0x95, 0x96, 0xA3, 0xA4, 0xA5, 0xA6, 0xA9, 0xAA, 0xAD, 0xB1, 0xB3, 0xB5,
        0xB6, 0xB9, 0xBC, 0xC6, 0xC9, 0xCD, 0xD5, 0xD9, 0xDA, 0xE3, 0xE6, 0xE9, 0xEE, 0xF4, 0xF5, 0xF9,
        0x09, 0x0A, 0x0B, 0x13, 0x19, 0x1A, 0x25, 0x26, 0x2A, 0x2C, 0x2D, 0x32, 0x34, 0x35, 0x36, 0x43,
        0x46, 0x4E, 0x53, 0x56, 0x5A, 0x66, 0x75, 0x86, 0x8A, 0x94, 0x97, 0x99, 0x9A, 0xAC, 0xB2, 0xB4,
        0xC3, 0xCA, 0xD3, 0xD9, 0xDA, 0xDC, 0xE3, 0xEC
    ).mapIndexed { index, low -> low or if (index >= 64) 0x100 else 0 }.toIntArray()
    // App/settings.h OUTPUT_POWER_*.
    val POWER = listOf("USER", "LOW1", "LOW2", "LOW3", "LOW4", "LOW5", "MID", "HIGH")

    fun version(image: ByteArray): String {
        require(image.size == CONFIG_SIZE) { "La configuracion F4HWN v6 debe tener exactamente $CONFIG_SIZE bytes." }
        val version = image.copyOfRange(0xa160, 0xa170).takeWhile { it != 0.toByte() }.toByteArray().toString(Charsets.US_ASCII)
        require(Regex("v6\\.\\d+\\.\\d+").matches(version)) { "La configuracion no contiene una version F4HWN v6 reconocida." }
        return version
    }

    /** MHz text with up to 5 decimals to 10 Hz units, limited like the web editor to RX VHF 136-174 and UHF 400-470. */
    fun frequency(text: String): Long {
        val value = text.trim()
        require(Regex("\\d{1,3}(\\.\\d{1,5})?").matches(value)) { "Frecuencia: MHz con hasta 5 decimales." }
        val units = BigDecimal(value).movePointRight(5).longValueExact()
        require(units in 13600000..17400000 || units in 40000000..47000000) { "Frecuencias limitadas a 136-174 y 400-470 MHz." }
        return units
    }

    fun mhz(units10Hz: Long): String = BigDecimal.valueOf(units10Hz, 5).toPlainString()

    private fun tone(type: Int, code: Int, number: Int): QuanshengTone = when (type) {
        0 -> QuanshengTone.Off
        1 -> { require(code in CTCSS.indices) { "Canal $number: indice CTCSS corrupto." }; QuanshengTone.Ctcss(code) }
        2, 3 -> { require(code in DCS.indices) { "Canal $number: indice DCS corrupto." }; QuanshengTone.Dcs(code, type == 3) }
        else -> throw IllegalArgumentException("Canal $number: tipo de tono $type desconocido.")
    }
    private fun encode(tone: QuanshengTone): Pair<Int, Int> = when (tone) {
        QuanshengTone.Off -> 0 to 0
        is QuanshengTone.Ctcss -> { require(tone.index in CTCSS.indices); 1 to tone.index }
        is QuanshengTone.Dcs -> { require(tone.index in DCS.indices); (if (tone.inverted) 3 else 2) to tone.index }
    }

    fun read(image: ByteArray): List<QuanshengChannel> {
        version(image)
        val view = ByteBuffer.wrap(image).order(ByteOrder.LITTLE_ENDIAN)
        val channels = ArrayList<QuanshengChannel>()
        for (number in 1..1024) {
            val record = (number - 1) * 16
            if (image[0x8000 + (number - 1) * 2].toInt() and 7 == 7) continue
            val rx = view.getInt(record).toLong() and 0xffffffffL
            if (rx == 0L || rx == 0xffffffffL) continue
            val offset = view.getInt(record + 4).toLong() and 0xffffffffL
            val direction = image[record + 11].toInt() and 15
            require(rx < 150000000 && direction <= 2) { "Canal $number: frecuencia o desplazamiento corruptos." }
            val tx = rx + when (direction) { 1 -> offset; 2 -> -offset; else -> 0 }
            require(tx in 1 until 150000000) { "Canal $number: TX nominal corrupta." }
            val types = image[record + 10].toInt() and 255
            val flags = image[record + 12].toInt() and 255
            val nameBytes = image.copyOfRange(0x4000 + record, 0x4000 + record + 10)
            val name = nameBytes.takeWhile { it != 0.toByte() && it != 0xff.toByte() }.toByteArray().toString(Charsets.US_ASCII).trim()
            channels.add(QuanshengChannel(number, name.ifEmpty { "CH$number" }, rx, tx, (image[record + 11].toInt() and 255) shr 4,
                tone(types and 15, image[record + 8].toInt() and 255, number), tone(types shr 4, image[record + 9].toInt() and 255, number),
                if (flags == 0xff) 1 else (flags shr 2) and 7, flags != 0xff && flags and 2 != 0, flags == 0xff || flags and 64 != 0))
        }
        return channels
    }

    /** Returns a copy of [image] with one existing FM channel changed; every other byte is kept. */
    fun update(image: ByteArray, channel: QuanshengChannel): ByteArray {
        val existing = read(image).firstOrNull { it.number == channel.number }
        require(existing != null && existing.mode == 0) { "Solo se editan canales FM existentes." }
        require(Regex("[\\x20-\\x7e]{1,10}").matches(channel.name)) { "Nombre: 1-10 caracteres ASCII." }
        require(channel.rx10Hz in 13600000..17400000 || channel.rx10Hz in 40000000..47000000) { "RX fuera de 136-174 / 400-470 MHz." }
        require(channel.tx10Hz in 13600000..17400000 || channel.tx10Hz in 40000000..47000000) { "TX fuera de 136-174 / 400-470 MHz." }
        require((channel.rx10Hz < 35000000) == (channel.tx10Hz < 35000000)) { "RX y TX deben permanecer en la misma banda." }
        require(channel.power in POWER.indices) { "Potencia fuera de USER..HIGH." }
        val record = (channel.number - 1) * 16
        val result = image.copyOf()
        val view = ByteBuffer.wrap(result).order(ByteOrder.LITTLE_ENDIAN)
        view.putInt(record, channel.rx10Hz.toInt())
        view.putInt(record + 4, kotlin.math.abs(channel.tx10Hz - channel.rx10Hz).toInt())
        val (rxType, rxCode) = encode(channel.rxTone)
        val (txType, txCode) = encode(channel.txTone)
        result[record + 8] = rxCode.toByte()
        result[record + 9] = txCode.toByte()
        result[record + 10] = ((txType shl 4) or rxType).toByte()
        val direction = if (channel.tx10Hz > channel.rx10Hz) 1 else if (channel.tx10Hz < channel.rx10Hz) 2 else 0
        result[record + 11] = ((result[record + 11].toInt() and 0xf0) or direction).toByte()
        // 0xFF means "unset" to the firmware (defaults, TX locked): start from a clean byte then.
        val oldFlags = (image[record + 12].toInt() and 255).let { if (it == 0xff) 0x40 else it }
        result[record + 12] = ((oldFlags and 0x21) or (channel.power shl 2) or (if (channel.narrow) 2 else 0) or
            (if (channel.txLock) 64 else 0)).toByte()
        val name = 0x4000 + record
        result.fill(0, name, name + 16)
        channel.name.toByteArray(Charsets.US_ASCII).copyInto(result, name)
        // F4HWN frequencyBandTable index in the attribute's low 3 bits, as the web editor does.
        val band = if (channel.rx10Hz < 17400000) 2 else if (channel.rx10Hz < 35000000) 3 else if (channel.rx10Hz < 40000000) 4 else 5
        val attribute = 0x8000 + (channel.number - 1) * 2
        view.putShort(attribute, ((view.getShort(attribute).toInt() and 7.inv()) or band).toShort())
        return result
    }
}
