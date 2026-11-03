package org.bricohams.radio

import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageInfo
import android.content.pm.PackageInstaller
import android.content.pm.PackageManager
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.net.Uri
import android.os.Build
import android.provider.Settings
import android.util.Log
import java.io.File
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL
import java.security.MessageDigest

/** Network access for the update channel; fakeable in tests. Only plain GETs: nothing identifying is ever sent. */
interface OtaTransport {
    fun get(url: String, maxBytes: Int): ByteArray
    fun download(url: String, target: File, expectedSize: Long, onProgress: (Long) -> Unit)
}

/** HTTPS only (also across redirects), no cookies, a fixed generic User-Agent so the device model is not leaked. */
class HttpsTransport(private val connect: (URL) -> HttpURLConnection = { it.openConnection() as HttpURLConnection }) : OtaTransport {
    companion object {
        private const val MAX_REDIRECTS = 5
        private const val CONNECT_MS = 15_000
        private const val READ_MS = 30_000
    }

    private fun open(start: String): HttpURLConnection {
        var current = start
        for (hop in 0..MAX_REDIRECTS) {
            OtaManifestParser.requireHttps(current)
            val connection = connect(URL(current))
            var redirected = false
            try {
                connection.instanceFollowRedirects = false
                connection.connectTimeout = CONNECT_MS
                connection.readTimeout = READ_MS
                connection.setRequestProperty("User-Agent", "RadiCodex-OTA")
                connection.setRequestProperty("Accept-Encoding", "identity")
                val code = connection.responseCode
                if (code == 301 || code == 302 || code == 303 || code == 307 || code == 308) {
                    val location = connection.getHeaderField("Location") ?: throw OtaException(OtaFailure.HTTP, "redirect")
                    current = URL(URL(current), location).toString()
                    redirected = true
                } else if (code != 200) throw OtaException(OtaFailure.HTTP, code.toString())
            } catch (error: Exception) {
                connection.disconnect()
                throw error
            }
            if (!redirected) return connection
            connection.disconnect()
        }
        throw OtaException(OtaFailure.HTTP, "redirects")
    }

    override fun get(url: String, maxBytes: Int): ByteArray {
        val connection = open(url)
        try {
            if (connection.contentLengthLong > maxBytes) throw OtaException(OtaFailure.MANIFEST_TOO_LARGE)
            val out = java.io.ByteArrayOutputStream()
            connection.inputStream.use { input ->
                val buffer = ByteArray(8192)
                while (true) {
                    val count = input.read(buffer)
                    if (count < 0) break
                    out.write(buffer, 0, count)
                    if (out.size() > maxBytes) throw OtaException(OtaFailure.MANIFEST_TOO_LARGE)
                }
            }
            return out.toByteArray()
        } finally { connection.disconnect() }
    }

    override fun download(url: String, target: File, expectedSize: Long, onProgress: (Long) -> Unit) {
        val connection = open(url)
        try {
            val announced = connection.contentLengthLong
            if (announced >= 0 && announced != expectedSize) throw OtaException(OtaFailure.SIZE_MISMATCH, "$announced / $expectedSize")
            var total = 0L
            connection.inputStream.use { input ->
                java.io.FileOutputStream(target).use { output ->
                    val buffer = ByteArray(64 * 1024)
                    while (true) {
                        val count = input.read(buffer)
                        if (count < 0) break
                        total += count
                        if (total > expectedSize) throw OtaException(OtaFailure.SIZE_MISMATCH, ">$expectedSize")
                        output.write(buffer, 0, count)
                        onProgress(total)
                    }
                    output.fd.sync()
                }
            }
        } finally { connection.disconnect() }
    }
}

/** What [OtaUpdater.check] found: a verified, applicable, newer release. */
class OtaOffer(val manifest: OtaManifest)

/**
 * Check + download + verify. Any failed check deletes what was downloaded and throws [OtaException]; the caller must not install
 * unless [download] returned normally AND [OtaPlatform.verifyArchive] passed.
 */
class OtaUpdater(
    private val transport: OtaTransport,
    private val publicKey: ByteArray?,
    private val packageName: String,
    private val installedCode: Long,
    private val deviceSdk: Int,
    private val freeSpace: (File) -> Long = { it.usableSpace }
) {
    /** Returns the offer, or null when the installed version is already the newest. */
    fun check(url: String = OtaConfig.MANIFEST_URL): OtaOffer? {
        val bytes = try {
            transport.get(url, OtaConfig.MAX_MANIFEST_BYTES)
        } catch (error: IOException) {
            if (url != OtaConfig.MANIFEST_URL) throw error
            transport.get(OtaConfig.FALLBACK_MANIFEST_URL, OtaConfig.MAX_MANIFEST_BYTES)
        }
        val manifest = OtaManifestParser.parse(bytes, publicKey, packageName)
        if (!OtaPolicy.isNewer(installedCode, manifest.versionCode)) return null
        OtaPolicy.requireApplicable(manifest, installedCode, deviceSdk)
        return OtaOffer(manifest)
    }

    /** Downloads into [directory] (app-specific storage) and verifies size + SHA-256. Returns the verified APK file. */
    fun download(manifest: OtaManifest, directory: File, onProgress: (Long) -> Unit = {}): File {
        OtaPolicy.requireApplicable(manifest, installedCode, deviceSdk)
        OtaManifestParser.requireHttps(manifest.apkUrl)
        directory.mkdirs()
        directory.listFiles()?.forEach { it.delete() }
        if (freeSpace(directory) < manifest.size * 2) throw OtaException(OtaFailure.NO_SPACE)
        val part = File(directory, "radicodex-${manifest.versionCode}.apk.part")
        try {
            transport.download(manifest.apkUrl, part, manifest.size, onProgress)
            OtaPolicy.verifyDownload(part, manifest)
            val apk = File(directory, "radicodex-${manifest.versionCode}.apk")
            if (!part.renameTo(apk)) throw IOException("rename")
            return apk
        } catch (error: Exception) {
            part.delete()
            throw error
        }
    }
}

/** Android side: connectivity policy, APK inspection and the PackageInstaller session. */
object OtaPlatform {
    private const val TAG = "RadiCodexOta"
    private const val PREFERENCES = "ota"
    const val ACTION_RESULT = "org.bricohams.radio.OTA_RESULT"

    private fun prefs(context: Context) = context.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE)

    fun autoCheckEnabled(context: Context) = prefs(context).getBoolean("auto", true)
    fun setAutoCheck(context: Context, value: Boolean) { prefs(context).edit().putBoolean("auto", value).apply() }
    fun meteredAllowed(context: Context) = prefs(context).getBoolean("metered", false)
    fun setMeteredAllowed(context: Context, value: Boolean) { prefs(context).edit().putBoolean("metered", value).apply() }
    fun lastCheck(context: Context) = prefs(context).getLong("lastCheck", 0)
    fun markChecked(context: Context, now: Long = System.currentTimeMillis()) { prefs(context).edit().putLong("lastCheck", now).apply() }
    fun offered(context: Context): Pair<Long, String>? =
        prefs(context).getString("offeredName", null)?.let { prefs(context).getLong("offeredCode", 0) to it }
    fun setOffered(context: Context, manifest: OtaManifest?) {
        prefs(context).edit().apply {
            if (manifest == null) { remove("offeredName"); remove("offeredCode") }
            else { putString("offeredName", manifest.versionName); putLong("offeredCode", manifest.versionCode) }
        }.apply()
    }

    private fun packageInfo(context: Context, flags: Int): PackageInfo = context.packageManager.getPackageInfo(context.packageName, flags)

    @Suppress("DEPRECATION")
    private fun codeOf(info: PackageInfo): Long = if (Build.VERSION.SDK_INT >= 28) info.longVersionCode else info.versionCode.toLong()

    fun installedCode(context: Context): Long = codeOf(packageInfo(context, 0))

    fun updater(context: Context, transport: OtaTransport = HttpsTransport()): OtaUpdater {
        if (!OtaConfig.enabled) throw OtaException(OtaFailure.NOT_CONFIGURED)
        return OtaUpdater(transport, OtaConfig.publicKey, context.packageName, installedCode(context), Build.VERSION.SDK_INT)
    }

    /** Unmetered (Wi-Fi / Ethernet) unless the user opted in to metered networks; throws the reason otherwise. */
    fun requireNetwork(context: Context) {
        val manager = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        val capabilities = manager.activeNetwork?.let { manager.getNetworkCapabilities(it) }
        if (capabilities == null || !capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)) throw OtaException(OtaFailure.OFFLINE)
        if (!meteredAllowed(context) && !capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_NOT_METERED)) throw OtaException(OtaFailure.METERED)
    }

    fun stagingDirectory(context: Context) = File(context.filesDir, "ota")

    /** Package info plus the signing certificates (DER) of the installed app, or of the APK at [archive] when given. */
    @Suppress("DEPRECATION")
    private fun signers(context: Context, archive: String?): Pair<PackageInfo?, List<ByteArray>> {
        val manager = context.packageManager
        if (Build.VERSION.SDK_INT >= 28) {
            val flags = PackageManager.GET_SIGNING_CERTIFICATES
            val info = if (archive == null) packageInfo(context, flags) else manager.getPackageArchiveInfo(archive, flags)
            val signing = info?.signingInfo
            val certificates = when {
                signing == null -> emptyList()
                signing.hasMultipleSigners() -> signing.apkContentsSigners.toList()
                else -> signing.signingCertificateHistory.takeLast(1)
            }
            return Pair(info, certificates.map { it.toByteArray() })
        }
        val flags = PackageManager.GET_SIGNATURES
        val info = if (archive == null) packageInfo(context, flags) else manager.getPackageArchiveInfo(archive, flags)
        return Pair(info, info?.signatures?.map { it.toByteArray() } ?: emptyList())
    }

    /** Last gate before installing: package, exact version, higher than installed, and the SAME signing certificate as this app. */
    fun verifyArchive(context: Context, apk: File, manifest: OtaManifest) {
        val (info, candidate) = signers(context, apk.absolutePath)
        if (info == null) throw OtaException(OtaFailure.APK_UNREADABLE)
        OtaPolicy.verifyArchive(manifest, info.packageName, codeOf(info), info.versionName, context.packageName, installedCode(context))
        OtaPolicy.requireSameSigner(signers(context, null).second, candidate)
    }

    fun canInstall(context: Context) = context.packageManager.canRequestPackageInstalls()

    fun unknownSourcesIntent(context: Context): Intent =
        Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:${context.packageName}"))

    /**
     * Streams the verified file into a PackageInstaller session (hashing again on the way) and commits it. Android shows its own
     * confirmation (USER_ACTION_REQUIRED); there is no silent install path.
     */
    fun install(context: Context, apk: File, manifest: OtaManifest) {
        if (!canInstall(context)) throw OtaException(OtaFailure.INSTALL_BLOCKED)
        val installer = context.packageManager.packageInstaller
        val params = PackageInstaller.SessionParams(PackageInstaller.SessionParams.MODE_FULL_INSTALL).apply {
            setAppPackageName(context.packageName)
            setSize(apk.length())
            if (Build.VERSION.SDK_INT >= 31) setRequireUserAction(PackageInstaller.SessionParams.USER_ACTION_REQUIRED)
        }
        val id = installer.createSession(params)
        val session = installer.openSession(id)
        try {
            val digest = MessageDigest.getInstance("SHA-256")
            apk.inputStream().use { input ->
                session.openWrite("base.apk", 0, apk.length()).use { output ->
                    val buffer = ByteArray(64 * 1024)
                    while (true) {
                        val count = input.read(buffer)
                        if (count < 0) break
                        digest.update(buffer, 0, count)
                        output.write(buffer, 0, count)
                    }
                    session.fsync(output)
                }
            }
            if (Hex.encode(digest.digest()) != manifest.sha256) throw OtaException(OtaFailure.HASH_MISMATCH)
            val flags = PendingIntent.FLAG_UPDATE_CURRENT or if (Build.VERSION.SDK_INT >= 31) PendingIntent.FLAG_MUTABLE else 0
            val callback = Intent(context, OtaInstallReceiver::class.java).setAction(ACTION_RESULT)
            session.commit(PendingIntent.getBroadcast(context, id, callback, flags).intentSender)
            Log.i(TAG, "install session $id committed for ${manifest.versionName} (${manifest.versionCode})")
        } catch (error: Exception) {
            session.abandon()
            throw error
        } finally {
            session.close()
        }
    }

    fun cleanup(context: Context) { stagingDirectory(context).listFiles()?.forEach { it.delete() } }
}

/** Receives the PackageInstaller result: forwards Android's confirmation screen and reports the outcome to the open screen. */
class OtaInstallReceiver : BroadcastReceiver() {
    companion object {
        /** Set by OtaActivity while it is visible; receives (success, message). */
        @Volatile var listener: ((Boolean, String) -> Unit)? = null
    }

    override fun onReceive(context: Context, intent: Intent) {
        val status = intent.getIntExtra(PackageInstaller.EXTRA_STATUS, PackageInstaller.STATUS_FAILURE)
        when (status) {
            PackageInstaller.STATUS_PENDING_USER_ACTION -> {
                @Suppress("DEPRECATION")
                val confirm = intent.getParcelableExtra<Intent>(Intent.EXTRA_INTENT)
                if (confirm != null) context.startActivity(confirm.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
            }
            PackageInstaller.STATUS_SUCCESS -> {
                OtaPlatform.cleanup(context)
                listener?.invoke(true, context.getString(R.string.ota_install_ok))
            }
            else -> {
                val detail = intent.getStringExtra(PackageInstaller.EXTRA_STATUS_MESSAGE) ?: status.toString()
                Log.w("RadiCodexOta", "install status $status: $detail")
                OtaPlatform.cleanup(context)
                val message = if (status == PackageInstaller.STATUS_FAILURE_ABORTED) context.getString(R.string.ota_install_cancelled)
                else context.getString(R.string.ota_install_failed, detail)
                listener?.invoke(false, message)
            }
        }
    }
}
