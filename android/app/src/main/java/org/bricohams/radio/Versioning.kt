package org.bricohams.radio

import android.content.Context
import android.util.Log
import java.util.Locale
import java.util.zip.CRC32

/** Minimal key/value store so version and firmware tracking stay testable without Android. */
interface KeyValueStore {
    fun get(key: String): String?
    fun put(key: String, value: String)
}

class PrefsStore(private val context: Context, private val name: String) : KeyValueStore {
    private val prefs get() = context.getSharedPreferences(name, Context.MODE_PRIVATE)
    override fun get(key: String): String? = prefs.getString(key, null)
    override fun put(key: String, value: String) { prefs.edit().putString(key, value).apply() }
}

data class AppVersion(val code: Long, val name: String) {
    override fun toString() = "$name ($code)"
}

data class VersionChange(val previous: AppVersion?, val current: AppVersion) {
    val downgrade get() = previous != null && current.code < previous.code
}

object VersionTracker {
    private const val CODE = "code"
    private const val NAME = "name"
    private const val HISTORY = "history"
    private const val HISTORY_LINES = 20

    /**
     * Compares the running version with the stored one and stores the running one. Returns the change to announce, or null when
     * nothing changed. A fresh install (nothing stored, not [upgradedInPlace]) is recorded silently: there is nothing "new" for it.
     */
    fun check(store: KeyValueStore, current: AppVersion, upgradedInPlace: Boolean, now: Long = System.currentTimeMillis()): VersionChange? {
        val code = store.get(CODE)?.toLongOrNull()
        val previous = if (code == null) null else AppVersion(code, store.get(NAME) ?: "?")
        if (previous == current) return null
        store.put(CODE, current.code.toString())
        store.put(NAME, current.name)
        if (previous == null && !upgradedInPlace) return null
        val line = "$now ${previous ?: "?"} -> $current"
        store.put(HISTORY, (listOf(line) + (store.get(HISTORY)?.lines().orEmpty().filter { it.isNotBlank() })).take(HISTORY_LINES).joinToString("\n"))
        Log.i("RadiCodexVersion", line)
        return VersionChange(previous, current)
    }

    fun history(store: KeyValueStore): List<String> = store.get(HISTORY)?.lines().orEmpty().filter { it.isNotBlank() }

    @Suppress("DEPRECATION")
    fun running(context: Context): AppVersion {
        val info = context.packageManager.getPackageInfo(context.packageName, 0)
        val code = if (android.os.Build.VERSION.SDK_INT >= 28) info.longVersionCode else info.versionCode.toLong()
        return AppVersion(code, info.versionName ?: "?")
    }

    fun upgradedInPlace(context: Context): Boolean {
        val info = context.packageManager.getPackageInfo(context.packageName, 0)
        return info.lastUpdateTime > info.firstInstallTime
    }

    fun store(context: Context): KeyValueStore = PrefsStore(context, "version-control")
}

/** Bundled release notes: assets/changelog-<versionCode>.<language>.md with a Spanish fallback. */
object Changelog {
    fun candidates(code: Long, language: String): List<String> =
        listOf("$code.$language.md", "$code.${language.substringBefore('-')}.md", "$code.es.md").distinct()

    /** First candidate that [open] can read (null = missing), rendered as plain text; [dropTitle] removes a leading heading. */
    fun load(code: Long, language: String, dropTitle: Boolean = false, open: (String) -> String?): String? {
        for (name in candidates(code, language)) open("changelog-$name")?.let { return plain(if (dropTitle) withoutTitle(it) else it) }
        return null
    }

    fun withoutTitle(markdown: String): String {
        val lines = markdown.lines()
        val first = lines.indexOfFirst { it.isNotBlank() }
        return if (first >= 0 && lines[first].trimStart().startsWith("#")) lines.drop(first + 1).joinToString("\n") else markdown
    }

    fun plain(markdown: String): String = markdown.lines().joinToString("\n") { line ->
        line.replace(Regex("^#+\\s*"), "").replace(Regex("^\\s*[-*]\\s+"), "• ")
    }.trim()

    fun forContext(context: Context, code: Long, dropTitle: Boolean = false): String? {
        val language = context.resources.configuration.locales[0].toLanguageTag()
        return load(code, language, dropTitle) { path ->
            try { context.assets.open(path).use { String(it.readBytes(), Charsets.UTF_8) } } catch (_: java.io.IOException) { null }
        }
    }
}

data class FirmwareChange(val radio: String, val before: String, val now: String)

/** Firmware version tracking per radio. The key must identify the physical unit (USB ids + serial) so two radios do not mix. */
object FirmwareTracker {
    private const val HISTORY = "fw-history"

    fun radioKey(vendorId: Int, productId: Int, serial: String?): String =
        String.format(Locale.ROOT, "%04X:%04X:%s", vendorId, productId, serial?.takeIf { it.isNotBlank() } ?: "-")

    /** Stores [firmware] for [radioKey]; returns the change when a different value had been stored before. */
    fun record(store: KeyValueStore, radioKey: String, label: String, firmware: String, now: Long = System.currentTimeMillis()): FirmwareChange? {
        if (firmware.isBlank()) return null
        val key = "fw.$radioKey"
        val before = store.get(key)
        if (before == firmware) return null
        store.put(key, firmware)
        if (before == null) return null
        val line = "$now $label [$radioKey] $before -> $firmware"
        store.put(HISTORY, (listOf(line) + (store.get(HISTORY)?.lines().orEmpty().filter { it.isNotBlank() })).take(20).joinToString("\n"))
        Log.i("RadiCodexFirmware", line)
        return FirmwareChange(label, before, firmware)
    }

    /** CRC of the Quansheng multiboot slot headers (slot, name, firmware text, size); null when they could not be read. */
    fun slotsFingerprint(slots: List<SlotInfo>?): String? {
        if (slots.isNullOrEmpty()) return null
        val crc = CRC32()
        crc.update(slots.joinToString("|") { "${it.slot}:${it.name}/${it.firmware}/${it.size}" }.toByteArray(Charsets.UTF_8))
        return String.format(Locale.ROOT, "slots %08X", crc.value)
    }
}
