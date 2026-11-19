package org.bricohams.radio

import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.net.http.SslCertificate
import android.net.http.SslError
import android.os.Build
import android.os.Bundle
import android.text.InputType
import android.view.View
import android.view.WindowInsets
import android.view.WindowManager
import android.webkit.GeolocationPermissions
import android.webkit.PermissionRequest
import android.webkit.SslErrorHandler
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import java.io.ByteArrayInputStream
import java.security.MessageDigest
import java.security.cert.CertificateFactory
import java.security.cert.X509Certificate

/** Controls a radio through the desktop RadiCodex remote agent: pairing screen, then its web console in a locked-down WebView. */
class RemoteShackActivity : LocalizedActivity() {
    private var pairing: RemotePairing? = null
    private var web: WebView? = null
    private var status: TextView? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE)
        pairing = RemoteShackStore.load(this)
        val link = intent?.dataString
        if (link != null && !acceptLink(link)) Toast.makeText(this, R.string.remote_pair_invalid, Toast.LENGTH_LONG).show()
        render()
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        val link = intent.dataString ?: return
        if (acceptLink(link)) render() else Toast.makeText(this, R.string.remote_pair_invalid, Toast.LENGTH_LONG).show()
    }

    private fun acceptLink(link: String): Boolean {
        val parsed = RemoteShack.parse(link) ?: return false
        if (!RemoteShackStore.save(this, parsed)) return false
        pairing = parsed
        return true
    }

    private fun root(): LinearLayout = LinearLayout(this).apply {
        orientation = LinearLayout.VERTICAL
        setBackgroundColor(getColor(R.color.brand_background))
        setOnApplyWindowInsetsListener { view, insets ->
            if (Build.VERSION.SDK_INT >= 30) {
                val bars = insets.getInsets(WindowInsets.Type.systemBars() or WindowInsets.Type.displayCutout())
                view.setPadding(bars.left, bars.top, bars.right, bars.bottom)
            } else {
                @Suppress("DEPRECATION")
                view.setPadding(insets.systemWindowInsetLeft, insets.systemWindowInsetTop,
                    insets.systemWindowInsetRight, insets.systemWindowInsetBottom)
            }
            insets
        }
    }

    private fun render() {
        web?.let { it.stopLoading(); it.destroy() }
        web = null
        if (pairing == null) pairingScreen() else consoleScreen()
    }

    private fun pairingScreen() {
        val pad = Brand.dp(this, 16)
        val layout = root().apply { setPadding(pad, pad, pad, pad) }
        layout.addView(Brand.heading(this, getString(R.string.remote_title)))
        layout.addView(Brand.text(this, 15f).apply { text = getString(R.string.remote_pair_help); setPadding(0, pad, 0, pad) })
        val input = EditText(this).apply {
            hint = getString(R.string.remote_pair_hint)
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_URI or InputType.TYPE_TEXT_FLAG_NO_SUGGESTIONS
            setSingleLine(false); minLines = 3
        }
        layout.addView(input)
        layout.addView(BrandUi.secondaryButton(this, getString(R.string.remote_paste)) { paste(input) })
        layout.addView(BrandUi.primaryButton(this, getString(R.string.remote_pair)) {
            if (acceptLink(input.text.toString())) { input.setText(""); render() }
            else status?.text = getString(R.string.remote_pair_invalid)
        })
        status = Brand.text(this, 14f).apply { setPadding(0, pad, 0, 0) }
        layout.addView(status)
        setContentView(layout)
    }

    private fun paste(input: EditText) {
        val clipboard = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
        val text = clipboard.primaryClip?.takeIf { it.itemCount > 0 }?.getItemAt(0)?.coerceToText(this)?.toString()
        if (text.isNullOrBlank()) status?.text = getString(R.string.remote_clipboard_empty) else input.setText(text.trim())
    }

    private fun consoleScreen() {
        val current = pairing ?: return
        val layout = root()
        val bar = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL }
        bar.addView(BrandUi.secondaryButton(this, getString(R.string.remote_reload)) { web?.reload() },
            LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f))
        bar.addView(BrandUi.secondaryButton(this, getString(R.string.remote_forget)) {
            RemoteShackStore.clear(this); pairing = null; render()
        }, LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f))
        layout.addView(bar)
        status = Brand.text(this, 14f).apply { visibility = View.GONE; setPadding(Brand.dp(this@RemoteShackActivity, 12), 0, 0, 0) }
        layout.addView(status)
        val view = WebView(this)
        configure(view, current)
        layout.addView(view, LinearLayout.LayoutParams(-1, 0, 1f))
        web = view
        setContentView(layout)
        view.loadUrl(current.consoleUrl)
    }

    private fun configure(view: WebView, current: RemotePairing) {
        view.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            allowFileAccess = false
            allowContentAccess = false
            @Suppress("DEPRECATION") allowFileAccessFromFileURLs = false
            @Suppress("DEPRECATION") allowUniversalAccessFromFileURLs = false
            mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            setGeolocationEnabled(false)
            javaScriptCanOpenWindowsAutomatically = false
            setSupportMultipleWindows(false)
        }
        view.webViewClient = object : WebViewClient() {
            override fun onReceivedSslError(view: WebView, handler: SslErrorHandler, error: SslError) {
                val seen = error.certificate?.let { x509(it) }?.let { RemoteShack.fingerprintOf(it) }
                if (seen != null && sameHost(error.url, current) &&
                    MessageDigest.isEqual(seen.toByteArray(), current.fingerprint.toByteArray())) {
                    handler.proceed()
                } else {
                    handler.cancel()
                    showStatus(getString(R.string.remote_cert_mismatch))
                }
            }

            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                if (sameHost(request.url.toString(), current)) return false
                if (request.url.scheme == "http" || request.url.scheme == "https") {
                    try { startActivity(Intent(Intent.ACTION_VIEW, request.url)) } catch (error: android.content.ActivityNotFoundException) { }
                }
                return true
            }
        }
        view.webChromeClient = object : WebChromeClient() {
            override fun onPermissionRequest(request: PermissionRequest) = request.deny()
            override fun onGeolocationPermissionsShowPrompt(origin: String, callback: GeolocationPermissions.Callback) =
                callback.invoke(origin, false, false)
        }
    }

    private fun sameHost(url: String?, current: RemotePairing): Boolean {
        val uri = try { Uri.parse(url ?: return false) } catch (error: RuntimeException) { return false }
        val port = if (uri.port == -1) 443 else uri.port
        return uri.scheme == "https" && uri.host.equals(current.host, ignoreCase = true) && port == current.port
    }

    private fun x509(certificate: SslCertificate): X509Certificate? {
        if (Build.VERSION.SDK_INT >= 29) return certificate.x509Certificate
        val der = SslCertificate.saveState(certificate)?.getByteArray("x509-certificate") ?: return null
        return try {
            CertificateFactory.getInstance("X.509").generateCertificate(ByteArrayInputStream(der)) as? X509Certificate
        } catch (error: java.security.GeneralSecurityException) { null }
    }

    private fun showStatus(message: String) {
        status?.apply { text = message; visibility = View.VISIBLE }
        Toast.makeText(this, message, Toast.LENGTH_LONG).show()
    }

    override fun onResume() {
        super.onResume()
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        web?.onResume()
    }

    override fun onPause() {
        web?.onPause()
        window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        super.onPause()
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        val view = web
        if (view != null && view.canGoBack()) view.goBack() else @Suppress("DEPRECATION") super.onBackPressed()
    }

    override fun onDestroy() {
        web?.destroy()
        web = null
        super.onDestroy()
    }
}
