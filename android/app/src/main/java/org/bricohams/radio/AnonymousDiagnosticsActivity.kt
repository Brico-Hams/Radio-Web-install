package org.bricohams.radio

import android.os.Bundle
import android.text.InputType
import android.view.View
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ScrollView

class AnonymousDiagnosticsActivity : LocalizedActivity() {
    override fun onCreate(state: Bundle?) {
        super.onCreate(state)
        val body = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            val padding = Brand.dp(context, 16)
            setPadding(padding, padding, padding, padding)
        }
        body.addView(Brand.heading(this, getString(R.string.anon_diag_title)))
        body.addView(Brand.text(this).apply { setText(R.string.anon_diag_privacy) })
        val origin = EditText(this).apply {
            hint = getString(R.string.anon_diag_host)
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_URI
            importantForAutofill = View.IMPORTANT_FOR_AUTOFILL_NO
            setSingleLine()
        }
        val token = EditText(this).apply {
            hint = getString(R.string.anon_diag_token)
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_PASSWORD
            importantForAutofill = View.IMPORTANT_FOR_AUTOFILL_NO
            setSingleLine()
        }
        val status = Brand.text(this).apply {
            setText(if (AnonymousDiagnostics.enabled()) R.string.anon_diag_enabled else R.string.anon_diag_disabled)
            accessibilityLiveRegion = View.ACCESSIBILITY_LIVE_REGION_POLITE
        }
        val preview = Brand.text(this, 12f)
        body.addView(origin)
        body.addView(token)
        body.addView(Brand.button(this, getString(R.string.anon_diag_enable)) {
            AnonymousDiagnostics.disable()
            try {
                AnonymousDiagnostics.enable(origin.text.toString(), token.text.toString())
                token.text.clear()
                status.setText(R.string.anon_diag_enabled)
            } catch (_: IllegalArgumentException) {
                status.setText(R.string.anon_diag_invalid)
            }
        })
        body.addView(Brand.button(this, getString(R.string.anon_diag_disable)) {
            AnonymousDiagnostics.disable()
            token.text.clear()
            status.setText(R.string.anon_diag_disabled)
        })
        body.addView(Brand.button(this, getString(R.string.anon_diag_inspect)) {
            AnonymousDiagnostics.inspect { result ->
                runOnUiThread {
                    if (!isDestroyed) result.fold(
                        onSuccess = { text ->
                            preview.text = text ?: getString(R.string.anon_diag_empty)
                            if (AnonymousDiagnostics.lastFailure) status.setText(R.string.anon_diag_failure)
                        },
                        onFailure = { status.setText(R.string.anon_diag_failure) }
                    )
                }
            }
        })
        body.addView(Brand.button(this, getString(R.string.anon_diag_clear)) {
            AnonymousDiagnostics.clear { result ->
                runOnUiThread {
                    if (!isDestroyed) result.fold(
                        onSuccess = { preview.text = ""; status.setText(R.string.anon_diag_disabled) },
                        onFailure = { status.setText(R.string.anon_diag_failure) }
                    )
                }
            }
        })
        body.addView(status)
        body.addView(preview)
        setContentView(ScrollView(this).apply { fitsSystemWindows = true; addView(body) })
    }
}
