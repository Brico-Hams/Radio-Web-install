package org.bricohams.radio

import java.nio.ByteBuffer
import java.nio.ByteOrder

/**
 * OpenGD77 USB CPS protocol (upstream firmware usb_com.c: open-ham/OpenGD77 for MK22, the MD-UV380 STM32 tree for the
 * TYT/Baofeng/Retevis radios). It only has 'R' memory reads, 'W'/'X' writes and 'C' CPS commands: there is no command
 * to tune, change mode or channel, or key the transmitter, so no CAT is offered. The radio computes satellite Doppler
 * itself from its keps and clock; this side can only identify, read the display RAM and set the clock.
 */
object OpenGd77 {
    enum class Family { MK22, STM32, SERIAL }
    enum class ScreenFormat { MONO, RGB565, BGR565 }
    data class Screen(val width: Int, val height: Int, val format: ScreenFormat) {
        val bytes get() = if (format == ScreenFormat.MONO) 128 * ((height + 7) / 8) else width * height * 2
    }
    data class Model(val name: String, val family: Family, val screen: Screen?)
    data class Info(val model: Model, val structVersion: Int, val firmware: String, val build: String)
    enum class Function { FREQUENCY, DOPPLER, CHANNEL, PTT, IDENTIFY, SCREEN, CLOCK, CODEPLUG, KEPS }

    private val MONO = Screen(128, 64, ScreenFormat.MONO)
    private val COLOR = Screen(160, 128, ScreenFormat.RGB565)
    // RadioInfo.radioType order from usb_com.c; display geometry from UC1701.h (MK22) and HX8353E_display.c (STM32).
    val MODELS = listOf(
        Model("GD-77", Family.MK22, MONO),
        Model("GD-77S", Family.MK22, null),
        Model("DM-1801", Family.MK22, MONO),
        Model("RD-5R", Family.MK22, Screen(128, 48, ScreenFormat.MONO)),
        Model("DM-1801A", Family.MK22, MONO),
        Model("MD-9600", Family.STM32, COLOR),
        Model("MD-UV380", Family.STM32, COLOR),
        Model("MD-380", Family.STM32, COLOR),
        Model("DM-1701", Family.STM32, Screen(160, 128, ScreenFormat.BGR565)),
        Model("MD-2017", Family.STM32, COLOR),
        Model("DM-1701 RGB", Family.STM32, COLOR),
        Model("DM-32", Family.SERIAL, null),
        Model("UV008", Family.SERIAL, null)
    )

    /** In this APK: null = supported; otherwise the string resource that explains why not. */
    fun unsupportedReason(model: Model, function: Function): Int? = when (function) {
        Function.FREQUENCY, Function.CHANNEL -> R.string.gd77_reason_no_cat
        Function.DOPPLER -> R.string.gd77_reason_doppler
        Function.PTT -> R.string.gd77_reason_ptt
        Function.KEPS -> R.string.gd77_reason_keps
        Function.SCREEN -> when {
            model.family == Family.SERIAL -> R.string.gd77_reason_serial
            model.screen == null -> R.string.gd77_reason_no_screen
            else -> null
        }
        Function.CLOCK -> if (model.family == Family.SERIAL) R.string.gd77_reason_serial else null
        Function.CODEPLUG -> R.string.gd77_reason_codeplug_web
        Function.IDENTIFY -> null
    }

    const val ACK = '-'.code.toByte()
    fun command(code: Int, vararg options: Int) = byteArrayOf('C'.code.toByte(), code.toByte()) + ByteArray(options.size) { options[it].toByte() }
    val PING = command(254)
    fun read(mode: Int, address: Int, length: Int): ByteArray =
        ByteBuffer.allocate(8).put('R'.code.toByte()).put(mode.toByte()).putInt(address).putShort(length.toShort()).array()
    /** 'C' 6 7: seconds since 1970 UTC, copied little-endian into uiDataGlobal.dateTimeSecs. */
    fun clock(epochSeconds: Long): ByteArray {
        requireUi(epochSeconds in 1..0xFFFF_FFFFL) { UiText(R.string.gd77_err_clock_range) }
        return command(6, 7) + ByteBuffer.allocate(4).order(ByteOrder.LITTLE_ENDIAN).putInt(epochSeconds.toInt()).array()
    }

    fun parseInfo(raw: ByteArray): Info {
        if (raw.size != INFO_BYTES) badReply()
        val buffer = ByteBuffer.wrap(raw).order(ByteOrder.LITTLE_ENDIAN)
        val version = buffer.int
        val type = buffer.int
        if (version !in 1..4 || type !in MODELS.indices) throw LocalizedArgumentException(UiText(R.string.gd77_err_unknown_info))
        fun text(from: Int) = String(raw, from, 16, Charsets.US_ASCII).substringBefore('\u0000').trim()
        return Info(MODELS[type], version, text(8), text(24))
    }

    /** ARGB pixels. MK22 buffers are page ordered (bit y%8 of byte (y/8)*128+x, set = dark); STM32 RGB565 is byte-swapped. */
    fun decodeScreen(raw: ByteArray, screen: Screen): IntArray {
        if (raw.size != screen.bytes) badReply()
        return IntArray(screen.width * screen.height) { index ->
            val x = index % screen.width
            val y = index / screen.width
            if (screen.format == ScreenFormat.MONO) {
                if ((raw[(y shr 3) * 128 + x].toInt() shr (y and 7)) and 1 == 1) 0xFF000000.toInt() else -1
            } else {
                val pixel = ((raw[index * 2].toInt() and 255) shl 8) or (raw[index * 2 + 1].toInt() and 255)
                var red = (pixel shr 11) * 255 / 31
                val green = ((pixel shr 5) and 63) * 255 / 63
                var blue = (pixel and 31) * 255 / 31
                if (screen.format == ScreenFormat.BGR565) red = blue.also { blue = red }
                (0xFF shl 24) or (red shl 16) or (green shl 8) or blue
            }
        }
    }

    fun badReply(): Nothing = throw LocalizedIOException(UiText(R.string.gd77_err_bad_reply))
    const val INFO_BYTES = 46
}

class OpenGd77Link(private val transport: RadioBytes) {
    var info: OpenGd77.Info? = null
        private set

    private fun acknowledged(request: ByteArray) {
        transport.write(request, WRITE_MS)
        if (transport.read(1, READ_MS)[0] != OpenGd77.ACK) throw LocalizedIOException(UiText(R.string.gd77_err_not_confirmed))
    }
    private fun readMemory(mode: Int, length: Int, block: Int): ByteArray {
        val out = ByteArray(length)
        var position = 0
        while (position < length) {
            val count = minOf(block, length - position)
            transport.write(OpenGd77.read(mode, position, count), WRITE_MS)
            val header = transport.read(3, READ_MS)
            val size = ((header[1].toInt() and 255) shl 8) or (header[2].toInt() and 255)
            if (header[0] != 'R'.code.toByte() || size != count) OpenGd77.badReply()
            transport.read(count, READ_MS).copyInto(out, position)
            position += count
        }
        return out
    }

    /** RadioInfo (mode 9) needs no CPS mode, so the radio stays on its own screen (and in the satellite menu). */
    fun identify(): OpenGd77.Info {
        transport.discardPending()
        acknowledged(OpenGd77.PING)
        return OpenGd77.parseInfo(readMemory(9, OpenGd77.INFO_BYTES, OpenGd77.INFO_BYTES)).also { info = it }
    }
    fun ping() = acknowledged(OpenGd77.PING)
    private fun connected(): OpenGd77.Info {
        checkUi(info != null) { UiText(R.string.gd77_err_not_connected) }
        return info!!
    }
    fun readScreen(): IntArray {
        val model = connected().model
        val screen = model.screen ?: throw LocalizedStateException(UiText(R.string.gd77_reason_no_screen))
        // usb_com.c clamps a reply to COM_REQUESTBUFFER_SIZE - 3 (1533 B on STM32); MK22 keeps the CPS block size.
        val raw = readMemory(6, screen.bytes, if (model.family == OpenGd77.Family.STM32) 512 else 32)
        return OpenGd77.decodeScreen(raw, screen)
    }
    fun syncClock(epochSeconds: Long) {
        if (connected().model.family == OpenGd77.Family.SERIAL) throw LocalizedStateException(UiText(R.string.gd77_reason_serial))
        acknowledged(OpenGd77.clock(epochSeconds))
    }

    companion object {
        const val WRITE_MS = 1000
        const val READ_MS = 2000
    }
}
