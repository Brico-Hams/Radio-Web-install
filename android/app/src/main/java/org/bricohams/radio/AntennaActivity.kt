package org.bricohams.radio

import android.annotation.SuppressLint
import android.content.Context
import android.content.Intent
import android.hardware.usb.UsbManager
import android.net.Uri
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.View
import android.webkit.JavascriptInterface
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.LinearLayout
import android.widget.TextView
import org.json.JSONObject
import java.io.ByteArrayInputStream
import java.io.FileNotFoundException
import java.io.IOException
import java.util.concurrent.Executors

/** Pure helpers of the antenna screen: asset serving rules, CSP, radio ids and the samples pushed to the page. */
object AntennaWeb {
    const val HOST = "appassets.invalid"
    const val ROOT = "/antenna/"
    const val PAGE = "https://$HOST${ROOT}index.html"
    const val BRIDGE = "AndroidAntenna"
    /** No network, no inline code, no frames: the page only runs files bundled in the APK. */
    const val CSP = "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' blob: data:; worker-src 'self'; " +
        "connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'"
    /** Files copied by the syncAntennaAssets Gradle task; anything else is a 404. */
    val FILES = mapOf(
        "index.html" to "text/html", "antenna-core.js" to "text/javascript", "antenna-ui.js" to "text/javascript",
        "antenna-worker.js" to "text/javascript", "ui-i18n.js" to "text/javascript", "ui-translations.js" to "text/javascript",
        "antenna.css" to "text/css", "styles.css" to "text/css")
    private const val MAX_CSV_BYTES = 2_000_000

    /** Radio id of antenna-core RADIO_PROFILES for the band filter; "" when the profile has no single entry (IC-705 has 5 plans). */
    fun bandRadioId(radio: ProfileRadio?): String = when (radio) {
        ProfileRadio.FTX1 -> "ftx1"
        ProfileRadio.TRUSDX -> "trusdx"
        ProfileRadio.QMX -> "qmx"
        ProfileRadio.THD75 -> "thd75"
        else -> ""
    }

    /**
     * Radios whose SWR meter read command is sourced in the repo and wired to a native Rig: IC-705 (CI-V 15 12 on p.5 and 1C 00 on
     * p.15 of the IC-705 CI-V Reference Guide, rigplane ic705.toml) and FTX-1 (RM6,
     * CAT Operation Reference Manual 2508-C). Every other radio is "pendiente de fuente" and the measurement stays disabled.
     */
    fun meterRadioId(radio: ProfileRadio?): String? = when (radio) {
        ProfileRadio.IC705 -> "ic705"
        ProfileRadio.FTX1 -> "ftx1"
        else -> null
    }

    fun pageUrl(language: String): String = PAGE + "?lang=" + (if (language in setOf("es", "en", "fr", "de")) language else "es")

    /** Serves the bundled file for [uri], or a 403/404 response; never touches the network. */
    fun respond(context: Context, uri: Uri): WebResourceResponse {
        val name = uri.path?.takeIf { uri.scheme == "https" && uri.host == HOST && it.startsWith(ROOT) }?.removePrefix(ROOT)
        val mime = name?.let { FILES[it] }
            ?: return answer(403, "Forbidden", "text/plain", ByteArray(0))
        return try {
            val bytes = context.assets.open("antenna" + "/" + name).use { it.readBytes() }
            answer(200, "OK", mime, bytes)
        } catch (_: FileNotFoundException) {
            answer(404, "Not Found", "text/plain", ByteArray(0))
        } catch (_: IOException) {
            answer(404, "Not Found", "text/plain", ByteArray(0))
        }
    }

    private fun answer(status: Int, reason: String, mime: String, bytes: ByteArray) =
        WebResourceResponse(mime, "utf-8", status, reason,
            mapOf("Content-Security-Policy" to CSP, "X-Content-Type-Options" to "nosniff", "Cache-Control" to "no-store"),
            ByteArrayInputStream(bytes))

    /** One sample for window.AntennaMeasure.addSample: [raw] is the 0..255 meter value, only present while the radio reports TX. */
    fun sampleJson(radioId: String, transmitting: Boolean, freqHz: Long?, raw: Int?): String = JSONObject()
        .put("running", true).put("connected", true).put("ptt", transmitting).put("radioId", radioId)
        .put("freqHz", if (transmitting) freqHz else JSONObject.NULL).put("swr", if (transmitting) raw else JSONObject.NULL)
        .put("source", if (transmitting) "raw" else JSONObject.NULL).toString()

    /** Quotes [text] as a JavaScript string literal (JSON plus the two line separators JSON allows but JavaScript does not). */
    fun jsString(text: String): String = JSONObject.quote(text).replace("\u2028", "\\u2028").replace("\u2029", "\\u2029")

    fun readCsv(context: Context, uri: Uri): String {
        val input = context.contentResolver.openInputStream(uri) ?: throw FileNotFoundException(uri.toString())
        input.use {
            val out = java.io.ByteArrayOutputStream()
            val buffer = ByteArray(8192)
            while (true) {
                val count = it.read(buffer)
                if (count < 0) break
                if (out.size() + count > MAX_CSV_BYTES) throw IOException("CSV too large")
                out.write(buffer, 0, count)
            }
            return String(out.toByteArray(), Charsets.UTF_8)
        }
    }
}

/** The only object the page can reach: exactly two read-only methods, no radio access and no file paths. */
class AntennaBridge(private val radioId: () -> String, private val pickCsv: () -> Unit) {
    /** Radio id of the active profile for band preselection ("" when unknown). */
    @JavascriptInterface fun activeRadioId(): String = radioId()

    /** Opens the system file picker (SAF); the CSV text comes back through window.AntennaMeasure.importCsvText. */
    @JavascriptInterface fun importCsv() = pickCsv()
}

/**
 * Offline HF/VHF antenna designer: the desktop engine (antenna-core.js, antenna-ui.js, antenna-worker.js) bundled as assets and shown
 * in a WebView without network access. "Measure SWR from radio" reads the profile radio's SWR meter only while the radio reports TX;
 * this screen never keys the radio.
 */
class AntennaActivity : LocalizedActivity() {
    companion object {
        private const val PICK_CSV = 81
        private const val POLL_MS = 400L
    }

    private val colors by lazy { Brand.Palette(this) }
    private val main = Handler(Looper.getMainLooper())
    private val worker = Executors.newSingleThreadExecutor()
    internal lateinit var web: WebView
    private lateinit var status: TextView
    private lateinit var start: View
    private lateinit var stop: View
    @Volatile private var measuring = false

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(colors.background)
            fitsSystemWindows = true
        }
        val padding = Brand.dp(this, 8)
        status = Brand.text(this, 13f, colors.muted).apply {
            setText(R.string.antenna_measure_idle)
            accessibilityLiveRegion = View.ACCESSIBILITY_LIVE_REGION_POLITE
            setPadding(padding, padding, padding, 0)
        }
        start = Brand.button(this, getString(R.string.antenna_measure_start), true) { startMeasuring() }
        stop = Brand.button(this, getString(R.string.antenna_measure_stop)) { stopMeasuring() }.apply { isEnabled = false }
        root.addView(Brand.text(this, 13f, colors.muted).apply {
            setText(R.string.antenna_measure_warning)
            setPadding(padding, padding, padding, 0)
        })
        root.addView(LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL; addView(start, weighted()); addView(stop, weighted()) })
        root.addView(status)
        web = WebView(this).apply {
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.allowFileAccess = false
            settings.allowContentAccess = false
            settings.blockNetworkLoads = true
            settings.setSupportMultipleWindows(false)
            settings.mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            webViewClient = object : WebViewClient() {
                override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse =
                    AntennaWeb.respond(this@AntennaActivity, request.url)
                override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean = request.url.host != AntennaWeb.HOST
            }
            addJavascriptInterface(AntennaBridge({ AntennaWeb.bandRadioId(ProfileStore.load(this@AntennaActivity).radio) }, { pickCsv() }),
                AntennaWeb.BRIDGE)
        }
        root.addView(web, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, 0, 1f))
        setContentView(root)
        web.loadUrl(AntennaWeb.pageUrl(resources.configuration.locales[0].language))
    }

    private fun weighted() = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)

    override fun onStop() {
        stopMeasuring()
        super.onStop()
    }

    override fun onDestroy() {
        measuring = false
        worker.shutdown()
        web.destroy()
        super.onDestroy()
    }

    private fun pickCsv() {
        main.post {
            val intent = Intent(Intent.ACTION_OPEN_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("*/*")
                .putExtra(Intent.EXTRA_MIME_TYPES, arrayOf("text/csv", "text/plain", "text/comma-separated-values", "application/vnd.ms-excel"))
            @Suppress("DEPRECATION")
            startActivityForResult(intent, PICK_CSV)
        }
    }

    @Deprecated("Deprecated in Java")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        @Suppress("DEPRECATION")
        super.onActivityResult(requestCode, resultCode, data)
        val uri = data?.data
        if (requestCode != PICK_CSV || resultCode != RESULT_OK || uri == null) return
        worker.execute {
            try {
                val text = AntennaWeb.readCsv(this, uri)
                main.post { web.evaluateJavascript("window.AntennaMeasure&&window.AntennaMeasure.importCsvText(${AntennaWeb.jsString(text)})", null) }
            } catch (error: Exception) {
                main.post { setStatus(getString(R.string.antenna_import_error, errorText(error))) }
            }
        }
    }

    private fun setStatus(text: String) {
        status.text = text
        web.evaluateJavascript("window.AntennaMeasure&&window.AntennaMeasure.setStatus(${AntennaWeb.jsString(text)})", null)
    }

    /** Opens the profile radio read-only and polls TX state, frequency and SWR meter; PTT is never written. */
    private fun startMeasuring() {
        if (measuring) return
        val profile = ProfileStore.load(this)
        val model = profile.radio?.rig
        val radioId = AntennaWeb.meterRadioId(profile.radio)
        if (model == null || radioId == null) { setStatus(getString(R.string.antenna_measure_pending)); return }
        val manager = getSystemService(Context.USB_SERVICE) as UsbManager
        val stored = ProfileStore.usbDevice(this)
        val device = stored?.let { id -> manager.deviceList.values.firstOrNull { it.vendorId == id.vendorId && it.productId == id.productId } }
        if (device == null) { setStatus(getString(R.string.antenna_measure_no_device)); return }
        if (!manager.hasPermission(device)) { setStatus(getString(R.string.antenna_measure_no_permission)); return }
        measuring = true
        start.isEnabled = false; stop.isEnabled = true
        setStatus(getString(R.string.antenna_measure_running))
        worker.execute {
            var link: RadioBytes? = null
            try {
                link = SerialRadio.open(manager, device, rigSerialSettings(model, profile.baud, 0, SerialRadio.enhancedPort(device)))
                val rig = openRig(model, link, profile.civAddress.toInt(16))
                rig.identify()
                if (!rig.supportsSwrMeter || !rig.supportsTxStatus) throw IOException(getString(R.string.antenna_measure_pending))
                while (measuring) {
                    val transmitting = rig.isTransmitting()
                    val sample = if (transmitting) AntennaWeb.sampleJson(radioId, true, rig.frequency(Vfo.A), rig.swrMeter())
                    else AntennaWeb.sampleJson(radioId, false, null, null)
                    main.post { if (measuring) web.evaluateJavascript("window.AntennaMeasure&&window.AntennaMeasure.addSample($sample)", null) }
                    Thread.sleep(POLL_MS)
                }
            } catch (_: InterruptedException) {
            } catch (error: Exception) {
                main.post { setStatus(getString(R.string.antenna_measure_error, errorText(error))) }
            } finally {
                try { link?.close() } catch (_: IOException) { }
                measuring = false
                main.post { start.isEnabled = true; stop.isEnabled = false }
            }
        }
    }

    private fun stopMeasuring() {
        if (!measuring) return
        measuring = false
        setStatus(getString(R.string.antenna_measure_stopped))
    }
}
