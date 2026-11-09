package org.bricohams.radio

import org.json.JSONArray
import org.json.JSONException
import org.json.JSONObject
import java.io.File
import java.io.IOException
import java.security.MessageDigest
import java.util.Base64
import java.util.TreeMap

/**
 * Over-the-air update channel. The manifest `radicodex-update.json` is a GitHub Release asset of Brico-Hams/Radio-Web-install
 * (the "latest" release), signed with an Ed25519 release key whose public half is embedded below. See android/OTA.md.
 */
object OtaConfig {
    /** Primary channel: static GitHub Pages site (ota.html); radicodex-update.json is published there by the release pipeline. */
    const val MANIFEST_URL = "https://brico-hams.github.io/Radio-Web-install/radicodex-update.json"
    /** Fallback when Pages is unreachable or has no manifest: the GitHub Release asset of the latest release. Same signed file. */
    const val FALLBACK_MANIFEST_URL = "https://github.com/Brico-Hams/Radio-Web-install/releases/download/radicodex-ota/radicodex-update.json"
    /** Raw 32-byte Ed25519 release public key as 64 hex digits (`node scripts/ota-manifest.cjs keygen`). Empty = channel disabled. */
    const val PUBLIC_KEY_HEX = "00980a6d0cc6b02e69b24d5d9caf5424bf7a0a4748247f3782f0b91a0134e68d"
    const val CHECK_INTERVAL_MS = 24L * 60 * 60 * 1000
    const val MAX_MANIFEST_BYTES = 64 * 1024
    const val MAX_APK_BYTES = 150L * 1024 * 1024
    const val SCHEMA = 1L

    /** False in the fdroid flavor: no update check, no download and no installer session are ever started. */
    val enabled: Boolean get() = BuildConfig.OTA_ENABLED

    val publicKey: ByteArray? get() = if (PUBLIC_KEY_HEX.length == 64) Hex.decode(PUBLIC_KEY_HEX) else null
}

object Hex {
    fun encode(bytes: ByteArray): String = buildString(bytes.size * 2) {
        for (byte in bytes) { append("0123456789abcdef"[(byte.toInt() shr 4) and 15]); append("0123456789abcdef"[byte.toInt() and 15]) }
    }
    fun decode(text: String): ByteArray? {
        if (text.length % 2 != 0) return null
        val out = ByteArray(text.length / 2)
        for (index in out.indices) {
            val high = Character.digit(text[index * 2], 16)
            val low = Character.digit(text[index * 2 + 1], 16)
            if (high < 0 || low < 0) return null
            out[index] = ((high shl 4) or low).toByte()
        }
        return out
    }
}

enum class OtaFailure(val message: Int) {
    NOT_CONFIGURED(R.string.ota_err_not_configured), MANIFEST_TOO_LARGE(R.string.ota_err_manifest_too_large),
    MANIFEST_INVALID(R.string.ota_err_manifest_invalid), BAD_SIGNATURE(R.string.ota_err_bad_signature),
    WRONG_PACKAGE(R.string.ota_err_wrong_package), NOT_NEWER(R.string.ota_err_not_newer), MIN_SDK(R.string.ota_err_min_sdk),
    INSECURE_URL(R.string.ota_err_insecure_url), SIZE_INVALID(R.string.ota_err_size_invalid),
    SIZE_MISMATCH(R.string.ota_err_size_mismatch), HASH_MISMATCH(R.string.ota_err_hash_mismatch),
    SIGNER_MISMATCH(R.string.ota_err_signer_mismatch), APK_UNREADABLE(R.string.ota_err_apk_unreadable),
    APK_VERSION(R.string.ota_err_apk_version), NO_SPACE(R.string.ota_err_no_space), HTTP(R.string.ota_err_http),
    METERED(R.string.ota_err_metered), OFFLINE(R.string.ota_err_offline), INSTALL_BLOCKED(R.string.ota_err_install_blocked)
}

/** A failed update check; [text] is the localized, user-visible reason. Nothing is installed after one of these. */
class OtaException(val failure: OtaFailure, val detail: String = "") :
    IOException("${failure.name}${if (detail.isEmpty()) "" else ": $detail"}"), LocalizedError {
    override val text get() = UiText(failure.message, detail)
}

data class OtaManifest(
    val versionCode: Long, val versionName: String, val minSdk: Int, val apkUrl: String, val sha256: String,
    val size: Long, val notes: Map<String, String>
) {
    /** Release notes in [language] (a BCP-47 tag or bare language), falling back to Spanish, English and then anything. */
    fun notesFor(language: String): String {
        val base = language.substringBefore('-')
        return notes[language] ?: notes.entries.firstOrNull { it.key.substringBefore('-') == base }?.value
            ?: notes["es"] ?: notes["en-US"] ?: notes.values.firstOrNull() ?: ""
    }
}

object OtaManifestParser {
    private val hex64 = Regex("^[0-9a-f]{64}$")

    /**
     * Canonical form signed by the release tool: object keys sorted by UTF-16 code unit, no whitespace, integers only, and every
     * char outside printable ASCII written as a lowercase \\uXXXX escape. scripts/ota-manifest.cjs implements the same rules.
     */
    fun canonical(value: Any?): String = StringBuilder().also { writeCanonical(it, value) }.toString()

    private fun writeCanonical(out: StringBuilder, value: Any?) {
        when (value) {
            null, JSONObject.NULL -> out.append("null")
            is Boolean -> out.append(value.toString())
            is Int, is Long -> out.append(value.toString())
            is String -> writeString(out, value)
            is JSONObject -> {
                val sorted = TreeMap<String, Any?>()
                for (key in value.keys()) sorted[key] = value.get(key)
                out.append('{')
                var first = true
                for ((key, item) in sorted) {
                    if (!first) out.append(',')
                    first = false
                    writeString(out, key); out.append(':'); writeCanonical(out, item)
                }
                out.append('}')
            }
            is JSONArray -> {
                out.append('[')
                for (index in 0 until value.length()) { if (index > 0) out.append(','); writeCanonical(out, value.get(index)) }
                out.append(']')
            }
            else -> throw OtaException(OtaFailure.MANIFEST_INVALID, "number")
        }
    }

    private fun writeString(out: StringBuilder, text: String) {
        out.append('"')
        for (char in text) when {
            char == '"' -> out.append("\\\"")
            char == '\\' -> out.append("\\\\")
            char.code < 0x20 || char.code > 0x7e -> out.append("\\u").append(String.format("%04x", char.code))
            else -> out.append(char)
        }
        out.append('"')
    }

    /** Verifies the signature first and only then trusts and validates the content. */
    fun parse(bytes: ByteArray, publicKey: ByteArray?, expectedPackage: String): OtaManifest {
        if (publicKey == null) throw OtaException(OtaFailure.NOT_CONFIGURED)
        if (bytes.size > OtaConfig.MAX_MANIFEST_BYTES) throw OtaException(OtaFailure.MANIFEST_TOO_LARGE)
        val root = try { JSONObject(String(bytes, Charsets.UTF_8)) } catch (error: JSONException) {
            throw OtaException(OtaFailure.MANIFEST_INVALID, "JSON")
        }
        val signature = try { Base64.getDecoder().decode(root.optString("signature", "")) } catch (error: IllegalArgumentException) {
            throw OtaException(OtaFailure.BAD_SIGNATURE)
        }
        root.remove("signature")
        val signed = canonical(root).toByteArray(Charsets.UTF_8)
        if (!Ed25519.verify(publicKey, signed, signature)) throw OtaException(OtaFailure.BAD_SIGNATURE)
        return validate(root, expectedPackage)
    }

    private fun invalid(field: String): Nothing = throw OtaException(OtaFailure.MANIFEST_INVALID, field)

    private fun integer(root: JSONObject, key: String): Long {
        val value = root.opt(key)
        return if (value is Int) value.toLong() else if (value is Long) value else invalid(key)
    }

    private fun validate(root: JSONObject, expectedPackage: String): OtaManifest {
        if (integer(root, "schema") != OtaConfig.SCHEMA) invalid("schema")
        if (root.opt("package") != expectedPackage) throw OtaException(OtaFailure.WRONG_PACKAGE, root.optString("package"))
        val versionCode = integer(root, "versionCode")
        if (versionCode <= 0) invalid("versionCode")
        val versionName = root.opt("versionName") as? String ?: invalid("versionName")
        if (versionName.isEmpty() || versionName.length > 32) invalid("versionName")
        val minSdk = integer(root, "minSdk")
        if (minSdk !in 1..99) invalid("minSdk")
        val apk = root.opt("apk") as? JSONObject ?: invalid("apk")
        val url = apk.opt("url") as? String ?: invalid("apk.url")
        requireHttps(url)
        val sha256 = apk.opt("sha256") as? String ?: invalid("apk.sha256")
        if (!hex64.matches(sha256)) invalid("apk.sha256")
        val size = integer(apk, "size")
        if (size <= 0 || size > OtaConfig.MAX_APK_BYTES) throw OtaException(OtaFailure.SIZE_INVALID, size.toString())
        val rawNotes = root.opt("notes") as? JSONObject ?: invalid("notes")
        if (rawNotes.length() > 8) invalid("notes")
        val notes = LinkedHashMap<String, String>()
        for (key in rawNotes.keys()) {
            val text = rawNotes.opt(key) as? String ?: invalid("notes.$key")
            if (key.length > 12 || text.length > 4000) invalid("notes.$key")
            notes[key] = text
        }
        return OtaManifest(versionCode, versionName, minSdk.toInt(), url, sha256, size, notes)
    }

    fun requireHttps(url: String) {
        val parsed = try { java.net.URL(url) } catch (error: java.net.MalformedURLException) { throw OtaException(OtaFailure.INSECURE_URL, url) }
        if (parsed.protocol != "https" || parsed.host.isNullOrEmpty() || parsed.userInfo != null) throw OtaException(OtaFailure.INSECURE_URL, url)
    }
}

/** Decisions that never touch Android: version ordering, scheduling and the integrity / signer checks. */
object OtaPolicy {
    fun isNewer(installedCode: Long, candidateCode: Long) = candidateCode > installedCode

    /** Throws unless [manifest] is a strict upgrade this device can run. */
    fun requireApplicable(manifest: OtaManifest, installedCode: Long, deviceSdk: Int) {
        if (!isNewer(installedCode, manifest.versionCode)) throw OtaException(OtaFailure.NOT_NEWER, manifest.versionCode.toString())
        if (deviceSdk < manifest.minSdk) throw OtaException(OtaFailure.MIN_SDK, manifest.minSdk.toString())
    }

    /** At most one automatic check per interval; a clock that went backwards counts as due. */
    fun checkDue(lastCheckMs: Long, nowMs: Long) = lastCheckMs <= 0 || lastCheckMs > nowMs || nowMs - lastCheckMs >= OtaConfig.CHECK_INTERVAL_MS

    fun sha256(file: File): String {
        val digest = MessageDigest.getInstance("SHA-256")
        file.inputStream().use { input ->
            val buffer = ByteArray(64 * 1024)
            while (true) { val count = input.read(buffer); if (count < 0) break; digest.update(buffer, 0, count) }
        }
        return Hex.encode(digest.digest())
    }

    /** Size first (cheap), then SHA-256, both taken from the signed manifest. */
    fun verifyDownload(file: File, manifest: OtaManifest) {
        if (file.length() != manifest.size) throw OtaException(OtaFailure.SIZE_MISMATCH, "${file.length()} / ${manifest.size}")
        if (sha256(file) != manifest.sha256) throw OtaException(OtaFailure.HASH_MISMATCH)
    }

    /** The package inside the APK must be ours, exactly the announced version, and an upgrade over the installed one. */
    fun verifyArchive(manifest: OtaManifest, archivePackage: String?, archiveCode: Long, archiveName: String?,
        expectedPackage: String, installedCode: Long) {
        if (archivePackage != expectedPackage) throw OtaException(OtaFailure.WRONG_PACKAGE, archivePackage ?: "?")
        if (archiveCode != manifest.versionCode || archiveName != manifest.versionName) {
            throw OtaException(OtaFailure.APK_VERSION, "$archiveName ($archiveCode)")
        }
        if (!isNewer(installedCode, archiveCode)) throw OtaException(OtaFailure.NOT_NEWER, archiveCode.toString())
    }

    /** Signing certificates as raw DER; the set of SHA-256 digests must be identical and non-empty. */
    fun requireSameSigner(installed: Collection<ByteArray>, candidate: Collection<ByteArray>) {
        fun digests(certificates: Collection<ByteArray>) =
            certificates.map { Hex.encode(MessageDigest.getInstance("SHA-256").digest(it)) }.toSet()
        val wanted = digests(installed)
        if (wanted.isEmpty() || wanted != digests(candidate)) throw OtaException(OtaFailure.SIGNER_MISMATCH)
    }
}
