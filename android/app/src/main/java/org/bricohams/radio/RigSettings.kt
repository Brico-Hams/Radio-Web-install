package org.bricohams.radio

enum class SettingKind { BYTE, LEVEL, BOOL, ENUM, COMPOSITE }

/**
 * One IC-705 setting of the CI-V command "1A 05 <sub>" (IC-705 CI-V Reference Guide rev. 6, command table printed pp.5-8).
 * [exclusion] ids and the table mirror data/radio-settings-catalog.json (family ic705-civ); tests/radio-settings.test.cjs
 * compares both. A setting with an exclusion or a pending reason is shown read-only.
 */
data class Ic705Setting(
    val page: Int,
    val sub: String,
    val label: String,
    val kind: SettingKind,
    val min: Int = 0,
    val max: Int = 0,
    val options: List<Pair<String, String>> = emptyList(),
    val exclusion: String? = null
) {
    val id get() = "ic705-1a05-$sub"
    val writable get() = exclusion == null && kind != SettingKind.COMPOSITE
    /** BCD digits on the wire: two for one data byte, four for the 0000~0255 / 0000~0511 level form. */
    val digits get() = if (kind == SettingKind.LEVEL) 4 else 2
    val choices: List<Pair<String, String>> get() = if (kind == SettingKind.BOOL) listOf("00" to "OFF", "01" to "ON") else options

    /** Operator value to the wire digit string, or null when outside the sourced options / range. */
    fun encode(input: String): String? {
        val text = input.trim()
        if (kind == SettingKind.ENUM || kind == SettingKind.BOOL) return text.takeIf { value -> choices.any { it.first == value } }
        if (kind == SettingKind.COMPOSITE || !Regex("\\d{1,4}").matches(text)) return null
        val number = text.toInt()
        return if (number in min..max) number.toString().padStart(digits, '0') else null
    }

    fun display(value: String): String = choices.firstOrNull { it.first == value }?.let { "$value = ${it.second}" } ?: value
}

object Ic705Settings {
    private fun opts(text: String) = text.split("|").map { it.substringBefore("=") to it.substringAfter("=") }
    private fun byte(page: Int, sub: String, label: String, min: Int, max: Int, exclusion: String? = null) =
        Ic705Setting(page, sub, label, SettingKind.BYTE, min, max, exclusion = exclusion)
    private fun level(page: Int, sub: String, label: String, min: Int, max: Int, exclusion: String? = null) =
        Ic705Setting(page, sub, label, SettingKind.LEVEL, min, max, exclusion = exclusion)
    private fun bool(page: Int, sub: String, label: String, exclusion: String? = null) =
        Ic705Setting(page, sub, label, SettingKind.BOOL, exclusion = exclusion)
    private fun enum(page: Int, sub: String, label: String, options: String, exclusion: String? = null) =
        Ic705Setting(page, sub, label, SettingKind.ENUM, options = opts(options), exclusion = exclusion)
    private fun composite(page: Int, sub: String, label: String) = Ic705Setting(page, sub, label, SettingKind.COMPOSITE)

    val all: List<Ic705Setting> = listOf(
        byte(5, "0002", "RX SSB bass (00=-5 .. 10=+5)", 0, 10),
        byte(5, "0003", "RX SSB treble (00=-5 .. 10=+5)", 0, 10),
        byte(5, "0005", "RX AM bass (00=-5 .. 10=+5)", 0, 10),
        byte(5, "0006", "RX AM treble (00=-5 .. 10=+5)", 0, 10),
        byte(5, "0008", "RX FM bass (00=-5 .. 10=+5)", 0, 10),
        byte(5, "0009", "RX FM treble (00=-5 .. 10=+5)", 0, 10),
        level(5, "0029", "Beep level", 0, 255),
        bool(5, "0030", "Beep level limit"),
        bool(5, "0031", "Beep (confirmation)"),
        bool(5, "0032", "Home CH beep"),
        enum(5, "0033", "Band edge beep", "00=OFF|01=ON (Default)|02=ON (User)|03=ON (User) & TX Limit", "tx-region"),
        enum(5, "0034", "Auto power OFF", "00=OFF|01=30 min|02=60 min|03=90 min|04=120 min", "auto-off"),
        enum(5, "0036", "Max TX power (battery pack)", "00=0.5 W|01=1 W|02=2.5 W|03=5 W", "tx-region"),
        enum(5, "0037", "Max TX power (DC 13.8 V)", "00=0.5 W|01=1 W|02=2.5 W|03=5 W|04=10 W", "tx-region"),
        enum(6, "0043", "Time-out timer", "00=OFF|01=3 min|02=5 min|03=10 min|04=20 min|05=30 min", "tx-safety"),
        bool(6, "0044", "PTT lock", "tx-safety"),
        bool(6, "0045", "Quick split"),
        bool(6, "0047", "Split lock"),
        bool(6, "0048", "Tuner PTT start", "tx-safety"),
        enum(6, "0049", "Auto repeater", "00=OFF|01=ON (DUP)|02=ON (DUP,TONE)"),
        enum(6, "0050", "RTTY mark frequency", "00=1275 Hz|01=1615 Hz|02=2125 Hz"),
        enum(6, "0051", "RTTY shift width", "00=170 Hz|01=200 Hz|02=425 Hz"),
        enum(6, "0052", "RTTY keying polarity", "00=Normal|01=Reverse"),
        enum(6, "0053", "Speech language", "00=Japanese|01=English"),
        enum(6, "0054", "Speech alphabet", "00=Normal|01=Phonetic Code"),
        enum(6, "0055", "Speech speed", "00=Slow|01=Fast"),
        enum(6, "0056", "RX call sign speech", "00=OFF|01=ON (Kerchunk)|02=ON (All)"),
        bool(6, "0057", "RX>CS speech"),
        bool(6, "0058", "MIC Up/Down speech"),
        bool(6, "0059", "S-level speech"),
        bool(6, "0060", "Mode speech"),
        level(6, "0061", "Speech level", 0, 255),
        enum(6, "0062", "[SPEECH/LOCK] switch", "00=SPEECH/LOCK|01=LOCK/SPEECH"),
        enum(6, "0063", "Lock function", "00=MAIN DIAL|01=PANEL"),
        enum(6, "0064", "Memo pad quantity", "00=5 ch|01=10 ch"),
        enum(6, "0065", "Main dial auto TS", "00=OFF|01=Low|02=High"),
        enum(6, "0066", "MIC Up/Down speed", "00=Slow|01=Fast"),
        enum(6, "0067", "[NOTCH] switch (SSB)", "00=Auto|01=Manual|02=Auto/Manual"),
        enum(6, "0068", "[NOTCH] switch (AM)", "00=Auto|01=Manual|02=Auto/Manual"),
        bool(6, "0069", "SSB/CW synchronous tuning"),
        enum(6, "0070", "CW normal side", "00=LSB|01=USB"),
        bool(6, "0071", "Charging (power ON)", "link-serial"),
        bool(6, "0072", "USB power input (phone, tablet, PC)", "link-serial"),
        enum(6, "0073", "Power OFF setting (for remote control)", "00=Shutdown only|01=Standby/Shutdown", "link-serial"),
        level(7, "0089", "REF adjust", 0, 511, "calibration-reset"),
        enum(7, "0107", "SP jack function", "00=Speaker|01=Phone|02=Phone (L+R)"),
        byte(7, "0108", "Phones level (00=-15 .. 30=+15)", 0, 30),
        enum(7, "0109", "USB AF/IF output select", "00=AF|01=IF", "link-serial"),
        level(7, "0110", "USB AF output level", 0, 255, "link-serial"),
        level(7, "0113", "USB IF output level", 0, 255, "link-serial"),
        enum(8, "0118", "DATA OFF MOD input", "00=MIC|01=USB|02=MIC, USB|03=WLAN", "link-serial"),
        enum(8, "0119", "DATA MOD input", "00=MIC|01=USB|02=MIC, USB|03=WLAN", "link-serial"),
        bool(8, "0120", "SEND output HF", "tx-safety"),
        bool(8, "0121", "SEND output 50M", "tx-safety"),
        bool(8, "0123", "SEND output 144M", "tx-safety"),
        bool(8, "0124", "SEND output 430M", "tx-safety"),
        enum(8, "0125", "USB SEND", "00=OFF|01=USB (A) DTR|02=USB (A) RTS|03=USB (B) DTR|04=USB (B) RTS", "tx-safety"),
        enum(8, "0126", "USB keying (CW)", "00=OFF|01=USB (A) DTR|02=USB (A) RTS|03=USB (B) DTR|04=USB (B) RTS", "tx-safety"),
        enum(8, "0127", "USB keying (RTTY)", "00=OFF|01=USB (A) DTR|02=USB (A) RTS|03=USB (B) DTR|04=USB (B) RTS", "tx-safety"),
        bool(8, "0131", "CI-V transceive", "link-serial"),
        bool(8, "0132", "CI-V USB echo back", "link-serial"),
        enum(8, "0133", "USB (B) function", "00=OFF|01=RTTY Decode|02=DV Data|03=Weather", "link-serial"),
        level(8, "0136", "LCD backlight", 0, 255),
        bool(8, "0137", "LCD backlight auto adjust"),
        enum(8, "0138", "Screen saver (battery pack)", "00=OFF|01=1 min|02=2 min|03=5 min|04=15 min|05=30 min|06=60 min"),
        enum(8, "0139", "Screen saver (DC 13.8 V)", "00=OFF|01=1 min|02=2 min|03=5 min|04=15 min|05=30 min|06=60 min"),
        bool(8, "0140", "Screen OFF [POWER] switch"),
        bool(8, "0141", "RX LED"),
        bool(8, "0142", "Meter peak hold"),
        bool(8, "0143", "Memory name"),
        bool(8, "0144", "Group name popup"),
        composite(5, "0001", "RX SSB HPF/LPF"),
        composite(6, "0046", "Split offset frequency")
    )
}

/** CI-V Reference Guide printed p.2 (frame) and printed pp.5-8 (1A 05 <sub>): read has no data, set carries BCD data. */
fun IcomCiv.readSetting(setting: Ic705Setting): ByteArray =
    body(0x1A, 0x05, setting.sub.substring(0, 2).toInt(16), setting.sub.substring(2).toInt(16))

fun IcomCiv.writeSetting(setting: Ic705Setting, digits: String): ByteArray {
    require(digits.length == setting.digits && digits.all { it in '0'..'9' })
    return readSetting(setting) + ByteArray(digits.length / 2) { ((digits[2 * it] - '0') shl 4 or (digits[2 * it + 1] - '0')).toByte() }
}

/** Data bytes after "1A 05 <sub>" as the BCD digit string. */
fun IcomCiv.settingDigits(setting: Ic705Setting, reply: ByteArray): String {
    if (reply.size != 4 + setting.digits / 2) invalidReply()
    return buildString {
        for (index in 4 until reply.size) {
            val value = bcd(reply[index].toInt() and 255)
            if (value < 0) invalidReply()
            append(String.format(java.util.Locale.ROOT, "%02d", value))
        }
    }
}

/** Radio side of the settings protocol; [IcomCivRig] implements it. */
interface SettingsIo {
    fun readSetting(setting: Ic705Setting): String
    fun writeSetting(setting: Ic705Setting, digits: String)
}

/** The audit trail entry of one settings step; the operator is the local user of the app. */
data class SettingsAudit(val atMs: Long, val event: String, val id: String, val detail: String)

/**
 * Safe write: operator confirmation happens in the UI, then: refuse while transmitting (or when TX state is unknown),
 * one write at a time, rate limit, read the backup, write, read back, restore the backup on mismatch, audit every step.
 */
class RigSettingsService(
    private val io: SettingsIo,
    private val isTransmitting: () -> Boolean?,
    private val clock: () -> Long = { System.nanoTime() / 1_000_000 },
    private val minIntervalMs: Long = 1000,
    private val log: (String) -> Unit = {}
) {
    class Result(val backup: String, val value: String)

    private val trail = ArrayList<SettingsAudit>()
    private var busy = false
    private var lastWriteAt = Long.MIN_VALUE / 2

    @Synchronized fun audit(): List<SettingsAudit> = trail.toList()

    @Synchronized private fun record(event: String, setting: Ic705Setting, detail: String = "") {
        val entry = SettingsAudit(clock(), event, setting.id, detail)
        trail.add(entry)
        if (trail.size > 500) trail.removeAt(0)
        log("settings $event ${setting.id} $detail")
    }

    private fun refuse(setting: Ic705Setting, event: String, text: UiText): Nothing {
        record(event, setting, text.toString())
        throw LocalizedArgumentException(text)
    }

    fun read(setting: Ic705Setting): String = io.readSetting(setting)

    fun write(setting: Ic705Setting, input: String): Result {
        if (!setting.writable) refuse(setting, "refused", UiText(R.string.rig_settings_err_readonly))
        synchronized(this) {
            if (busy) throw LocalizedArgumentException(UiText(R.string.rig_settings_err_busy))
            if (clock() - lastWriteAt < minIntervalMs) throw LocalizedArgumentException(UiText(R.string.rig_settings_err_rate))
            busy = true
        }
        try {
            val value = setting.encode(input) ?: refuse(setting, "rejected", UiText(R.string.rig_settings_err_value))
            if (isTransmitting() != false) refuse(setting, "refused", UiText(R.string.rig_settings_err_tx))
            synchronized(this) { lastWriteAt = clock() }
            val backup = io.readSetting(setting)
            record("backup", setting, "backup=$backup target=$value")
            if (isTransmitting() != false) refuse(setting, "refused", UiText(R.string.rig_settings_err_tx))
            var failure: Exception? = null
            try {
                io.writeSetting(setting, value)
                val observed = io.readSetting(setting)
                if (observed != value) failure = LocalizedArgumentException(UiText(R.string.rig_settings_err_mismatch, setting.display(observed)))
            } catch (error: java.io.IOException) {
                failure = error
            }
            if (failure != null) {
                val restored = try {
                    io.writeSetting(setting, backup)
                    io.readSetting(setting) == backup
                } catch (_: java.io.IOException) {
                    false
                }
                record("failed", setting, "backup=$backup target=$value restored=$restored")
                throw LocalizedArgumentException(UiText(if (restored) R.string.rig_settings_err_restored else R.string.rig_settings_err_restore_failed, failure), failure)
            }
            record("written", setting, "backup=$backup value=$value")
            return Result(backup, value)
        } finally {
            synchronized(this) { busy = false }
        }
    }
}
