package org.bricohams.radio

import android.Manifest
import android.content.pm.PackageManager
import android.net.http.SslError
import android.os.Bundle
import android.text.InputType
import android.util.Log
import android.view.View
import android.webkit.CookieManager
import android.webkit.PermissionRequest
import android.webkit.SslErrorHandler
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.TextView

class RemoteStationActivity : LocalizedActivity() {
    private lateinit var browser: WebView
    private lateinit var status: TextView
    private lateinit var host: EditText
    private var origin: String? = null
    private var foreground = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val colors = Brand.Palette(this)
        val body = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            val pad = Brand.dp(this@RemoteStationActivity, 16)
            setPadding(pad, pad, pad, pad)
            setBackgroundColor(colors.background)
            fitsSystemWindows = true
        }
        body.addView(Brand.heading(this, getString(R.string.remote_title)))
        body.addView(Brand.text(this).apply { setText(R.string.remote_help) })
        host = EditText(this).apply {
            hint = getString(R.string.remote_host)
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_URI
            importantForAutofill = View.IMPORTANT_FOR_AUTOFILL_NO
            setSingleLine()
        }
        body.addView(host)
        body.addView(Brand.button(this, getString(R.string.remote_connect)) {
            stopSession()
            try {
                val url = RemoteStationUrl.parse(host.text.toString())
                origin = url
                host.isEnabled = false
                browser.loadUrl(url)
                status.setText(R.string.remote_loading)
            } catch (_: IllegalArgumentException) {
                Log.w("RadiCodexRemote", "Station URL rejected")
                status.setText(R.string.remote_invalid)
            }
        })
        body.addView(Brand.button(this, getString(R.string.remote_disconnect)) {
            stopSession()
            status.setText(R.string.remote_stopped)
        })
        status = Brand.text(this, 13f, colors.muted).apply {
            setText(R.string.remote_stopped)
            accessibilityLiveRegion = View.ACCESSIBILITY_LIVE_REGION_POLITE
        }
        body.addView(status)
        browser = WebView(this).apply {
            importantForAutofill = View.IMPORTANT_FOR_AUTOFILL_NO_EXCLUDE_DESCENDANTS
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.allowFileAccess = false
            settings.allowContentAccess = false
            settings.mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            settings.cacheMode = WebSettings.LOAD_NO_CACHE
            settings.mediaPlaybackRequiresUserGesture = true
            @Suppress("DEPRECATION")
            settings.saveFormData = false
        }
        CookieManager.getInstance().setAcceptThirdPartyCookies(browser, false)
        browser.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView, url: String) {
                if (foreground && origin?.let { RemoteStationUrl.sameOrigin(url, it) } == true) {
                    status.setText(R.string.remote_ready)
                }
            }
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                if (request.url.toString() == "about:blank") return false
                if (origin?.let { RemoteStationUrl.sameOrigin(request.url.toString(), it) } == true) return false
                Log.w("RadiCodexRemote", "Cross-origin navigation blocked")
                status.setText(R.string.remote_invalid)
                return true
            }
            override fun onReceivedSslError(view: WebView, handler: SslErrorHandler, error: SslError) {
                handler.cancel()
                stopSession()
                status.setText(R.string.remote_tls_error)
            }
            override fun onReceivedError(view: WebView, request: WebResourceRequest, error: WebResourceError) {
                if (request.isForMainFrame && request.url.toString() != "about:blank") {
                    stopSession()
                    status.setText(R.string.remote_load_error)
                }
            }
            override fun onReceivedHttpError(view: WebView, request: WebResourceRequest, response: WebResourceResponse) {
                if (request.isForMainFrame) {
                    stopSession()
                    status.setText(R.string.remote_load_error)
                }
            }
        }
        browser.webChromeClient = object : WebChromeClient() {
            override fun onPermissionRequest(request: PermissionRequest) {
                val permitted = foreground &&
                    origin?.let { RemoteStationUrl.sameOrigin(request.origin.toString(), it) } == true &&
                    request.resources.contentEquals(arrayOf(PermissionRequest.RESOURCE_AUDIO_CAPTURE))
                if (!permitted) {
                    Log.w("RadiCodexRemote", "Web media permission denied")
                    request.deny()
                    return
                }
                if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) {
                    request.grant(arrayOf(PermissionRequest.RESOURCE_AUDIO_CAPTURE))
                } else {
                    request.deny()
                    requestPermissions(arrayOf(Manifest.permission.RECORD_AUDIO), 82)
                }
            }
        }
        body.addView(browser, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, 0, 1f))
        setContentView(body)
    }

    private fun stopSession() {
        origin = null
        if (::host.isInitialized) host.isEnabled = true
        if (::browser.isInitialized) {
            browser.evaluateJavascript("window.dispatchEvent(new Event('blur'))", null)
            browser.stopLoading()
            browser.loadUrl("about:blank")
            browser.clearHistory()
        }
    }

    override fun onResume() {
        super.onResume()
        foreground = true
        browser.onResume()
    }
    override fun onPause() {
        foreground = false
        stopSession()
        status.setText(R.string.remote_stopped)
        browser.onPause()
        super.onPause()
    }
    override fun onDestroy() {
        stopSession()
        browser.destroy()
        super.onDestroy()
    }
    override fun onRequestPermissionsResult(code: Int, permissions: Array<out String>, results: IntArray) {
        super.onRequestPermissionsResult(code, permissions, results)
        if (code == 82) {
            status.setText(if (results.singleOrNull() == PackageManager.PERMISSION_GRANTED)
                R.string.remote_permission_retry else R.string.remote_permission_denied)
        }
    }
}
