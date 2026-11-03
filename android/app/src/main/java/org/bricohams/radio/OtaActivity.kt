package org.bricohams.radio

import android.app.Activity
import android.app.AlertDialog
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.util.Log
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.view.WindowInsets
import android.widget.Button
import android.widget.CheckBox
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import java.util.concurrent.Executors
import kotlin.concurrent.thread

/** Announcements triggered by a version or firmware change. */
object ReleaseNotices {
    fun showWhatsNew(activity: Activity, change: VersionChange) {
        val notes = Changelog.forContext(activity, change.current.code)
        val body = StringBuilder(notes ?: activity.getString(R.string.whatsnew_generic, change.current.toString()))
        change.previous?.let { body.append("\n\n").append(activity.getString(R.string.whatsnew_previous, it.toString())) }
        AlertDialog.Builder(activity)
            .setTitle(activity.getString(R.string.whatsnew_title, change.current.name))
            .setMessage(body)
            .setPositiveButton(R.string.whatsnew_close, null)
            .show()
    }

    fun showFirmwareChanges(activity: Activity, changes: List<FirmwareChange>) {
        if (changes.isEmpty() || activity.isFinishing) return
        AlertDialog.Builder(activity)
            .setTitle(R.string.firmware_changed_title)
            .setMessage(changes.joinToString("\n\n") { activity.getString(R.string.firmware_changed, it.radio, it.before, it.now) })
            .setPositiveButton(R.string.whatsnew_close, null)
            .show()
    }
}

/** At most one silent manifest GET per day, only when due, enabled, on an allowed network and with a release key configured. */
object OtaAutoCheck {
    fun run(activity: Activity, transport: OtaTransport = HttpsTransport(), onOffer: (OtaManifest) -> Unit) {
        val context = activity.applicationContext
        if (!OtaConfig.enabled || OtaConfig.publicKey == null || !OtaPlatform.autoCheckEnabled(context)) return
        if (!OtaPolicy.checkDue(OtaPlatform.lastCheck(context), System.currentTimeMillis())) return
        // Not marked as checked when the network is unsuitable: the next launch on Wi-Fi tries again.
        try { OtaPlatform.requireNetwork(context) } catch (_: OtaException) { return }
        OtaPlatform.markChecked(context)
        thread(name = "ota-check", isDaemon = true) {
            try {
                val offer = OtaPlatform.updater(context, transport).check()
                OtaPlatform.setOffered(context, offer?.manifest)
                if (offer != null) activity.runOnUiThread { if (!activity.isDestroyed) onOffer(offer.manifest) }
            } catch (error: Exception) {
                Log.w("RadiCodexOta", "automatic check failed: ${error.message}")
            }
        }
    }
}

/** "Actualizaciones": manual check, release notes, verified download and Android's own install confirmation. */
class OtaActivity : LocalizedActivity() {
    private val worker = Executors.newSingleThreadExecutor()
    private lateinit var status: TextView
    private lateinit var notes: TextView
    private lateinit var checkButton: Button
    private lateinit var downloadButton: Button
    private var offer: OtaManifest? = null
    @Volatile private var busy = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val padding = Brand.dp(this, 16)
        val content = MaxWidthLinearLayout(this, 900).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(padding, padding, padding, padding)
            setOnApplyWindowInsetsListener { view, insets ->
                if (Build.VERSION.SDK_INT >= 30) {
                    val bars = insets.getInsets(WindowInsets.Type.systemBars())
                    view.setPadding(bars.left + padding, bars.top + padding, bars.right + padding, bars.bottom + padding)
                } else {
                    @Suppress("DEPRECATION")
                    view.setPadding(insets.systemWindowInsetLeft + padding, insets.systemWindowInsetTop + padding,
                        insets.systemWindowInsetRight + padding, insets.systemWindowInsetBottom + padding)
                }
                insets
            }
        }
        val running = VersionTracker.running(this)
        content.addView(Brand.heading(this, getString(R.string.ota_title)))
        content.addView(Brand.text(this, 16f).apply { text = getString(R.string.ota_current, running.name, running.code) })
        status = Brand.text(this, 15f, Brand.Palette(this).accent).apply {
            accessibilityLiveRegion = View.ACCESSIBILITY_LIVE_REGION_POLITE
            text = if (OtaConfig.publicKey == null) getString(R.string.ota_err_not_configured) else ""
        }
        content.addView(status)
        checkButton = Brand.button(this, getString(R.string.ota_check), primary = true) { check() }
        content.addView(checkButton)
        notes = Brand.text(this, 14f).apply { visibility = View.GONE; setTextIsSelectable(true) }
        content.addView(Brand.card(this).apply { addView(notes) }.also { it.visibility = View.GONE; notes.tag = it })
        downloadButton = Brand.button(this, getString(R.string.ota_download), primary = true) { download() }.apply { visibility = View.GONE }
        content.addView(downloadButton)
        content.addView(CheckBox(this).apply {
            setText(R.string.ota_auto)
            setTextColor(Brand.Palette(this@OtaActivity).text)
            isChecked = OtaPlatform.autoCheckEnabled(this@OtaActivity)
            setOnCheckedChangeListener { _, value -> OtaPlatform.setAutoCheck(this@OtaActivity, value) }
        })
        content.addView(CheckBox(this).apply {
            setText(R.string.ota_metered)
            setTextColor(Brand.Palette(this@OtaActivity).text)
            isChecked = OtaPlatform.meteredAllowed(this@OtaActivity)
            setOnCheckedChangeListener { _, value -> OtaPlatform.setMeteredAllowed(this@OtaActivity, value) }
        })
        content.addView(Brand.text(this, 13f, Brand.Palette(this).muted).apply { setText(R.string.ota_privacy) })
        content.addView(Brand.button(this, getString(R.string.navigate_back)) { finish() })
        setContentView(ScrollView(this).apply {
            addView(content, FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT, Gravity.CENTER_HORIZONTAL))
        })
    }

    override fun onStart() {
        super.onStart()
        OtaInstallReceiver.listener = { _, message -> runOnUiThread { if (!isDestroyed) { status.text = message; setBusy(false) } } }
    }

    override fun onStop() {
        OtaInstallReceiver.listener = null
        super.onStop()
    }

    override fun onDestroy() {
        worker.shutdown()
        super.onDestroy()
    }

    private fun setBusy(value: Boolean) {
        busy = value
        checkButton.isEnabled = !value
        downloadButton.isEnabled = !value
    }

    private fun show(text: String) = runOnUiThread { if (!isDestroyed) status.text = text }

    private fun fail(error: Exception) {
        Log.w("RadiCodexOta", "update failed: ${error.message}")
        runOnUiThread { if (!isDestroyed) { status.text = errorText(error); setBusy(false) } }
    }

    private fun check() {
        if (busy) return
        setBusy(true)
        status.setText(R.string.ota_checking)
        worker.execute {
            try {
                OtaPlatform.requireNetwork(this)
                OtaPlatform.markChecked(this)
                val found = OtaPlatform.updater(this).check()
                OtaPlatform.setOffered(this, found?.manifest)
                runOnUiThread { if (!isDestroyed) { showOffer(found?.manifest); setBusy(false) } }
            } catch (error: Exception) { fail(error) }
        }
    }

    private fun showOffer(manifest: OtaManifest?) {
        offer = manifest
        val card = notes.tag as View
        if (manifest == null) {
            status.setText(R.string.ota_up_to_date)
            card.visibility = View.GONE; notes.visibility = View.GONE; downloadButton.visibility = View.GONE
            return
        }
        status.text = getString(R.string.ota_available, manifest.versionName, manifest.versionCode,
            android.text.format.Formatter.formatShortFileSize(this, manifest.size))
        notes.text = getString(R.string.ota_notes_title) + "\n" +
            manifest.notesFor(resources.configuration.locales[0].toLanguageTag())
        card.visibility = View.VISIBLE; notes.visibility = View.VISIBLE; downloadButton.visibility = View.VISIBLE
    }

    private fun download() {
        val manifest = offer ?: return
        if (busy) return
        if (!OtaPlatform.canInstall(this)) {
            status.setText(R.string.ota_unknown_sources)
            startActivity(OtaPlatform.unknownSourcesIntent(this).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
            return
        }
        setBusy(true)
        worker.execute {
            try {
                OtaPlatform.requireNetwork(this)
                val updater = OtaPlatform.updater(this)
                var lastPercent = -1
                val apk = updater.download(manifest, OtaPlatform.stagingDirectory(this)) { done ->
                    val percent = (done * 100 / manifest.size).toInt()
                    if (percent != lastPercent) { lastPercent = percent; show(getString(R.string.ota_downloading, percent)) }
                }
                show(getString(R.string.ota_verifying))
                try {
                    OtaPlatform.verifyArchive(this, apk, manifest)
                    OtaPlatform.install(this, apk, manifest)
                } catch (error: Exception) {
                    OtaPlatform.cleanup(this)
                    throw error
                }
                runOnUiThread { if (!isDestroyed) { status.setText(R.string.ota_ready); setBusy(false) } }
            } catch (error: Exception) { fail(error) }
        }
    }
}
