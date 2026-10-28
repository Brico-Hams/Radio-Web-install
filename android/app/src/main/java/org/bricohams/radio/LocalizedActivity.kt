package org.bricohams.radio

import android.app.Activity
import android.content.Context
import android.content.res.Configuration
import android.os.Build
import android.view.Gravity
import android.view.View
import android.view.WindowInsets
import android.widget.ImageButton
import android.widget.LinearLayout
import android.widget.ScrollView
import java.util.Locale

object AppLanguage {
    val tags = listOf("", "es", "en-US", "fr", "de")
    private const val PREFERENCES = "app-language"

    fun selected(context: Context): String =
        context.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE).getString("locale", "") ?: ""

    fun save(context: Context, tag: String) {
        require(tag in tags)
        checkUi(context.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE).edit().putString("locale", tag).commit()) {
            UiText(R.string.language_save_error)
        }
    }

    fun localized(context: Context): Context {
        val tag = selected(context)
        if (tag.isEmpty()) return context
        val configuration = Configuration(context.resources.configuration)
        configuration.setLocale(Locale.forLanguageTag(tag))
        return context.createConfigurationContext(configuration)
    }
}

open class LocalizedActivity : Activity() {
    override fun attachBaseContext(newBase: Context) {
        super.attachBaseContext(AppLanguage.localized(newBase))
    }

    override fun setContentView(view: View) {
        val title = when (this) {
            is CatActivity -> R.string.screen_cat
            is ChannelActivity -> R.string.screen_channels
            is SstvActivity -> R.string.screen_sstv
            is LiveAudioActivity -> R.string.screen_live
            else -> null
        }
        if (title == null) {
            super.setContentView(view)
            return
        }
        (view as? ScrollView)?.let { scroll ->
            scroll.isFillViewport = true
            (scroll.getChildAt(0) as? LinearLayout)?.let { body ->
                body.setOnApplyWindowInsetsListener(null)
                Brand.styleForm(body)
            }
        }
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(getColor(R.color.brand_background))
            setOnApplyWindowInsetsListener { target, insets ->
                if (Build.VERSION.SDK_INT >= 30) {
                    val bars = insets.getInsets(WindowInsets.Type.systemBars() or WindowInsets.Type.displayCutout())
                    target.setPadding(bars.left, bars.top, bars.right, bars.bottom)
                } else {
                    @Suppress("DEPRECATION")
                    target.setPadding(insets.systemWindowInsetLeft, insets.systemWindowInsetTop,
                        insets.systemWindowInsetRight, insets.systemWindowInsetBottom)
                }
                insets
            }
        }
        root.addView(LinearLayout(this).apply {
            gravity = Gravity.CENTER_VERTICAL
            setPadding(Brand.dp(context, 12), Brand.dp(context, 8), Brand.dp(context, 18), Brand.dp(context, 8))
            addView(ImageButton(context).apply {
                setImageResource(R.drawable.ic_back)
                setBackgroundResource(R.drawable.brand_button)
                setPadding(Brand.dp(context, 14), Brand.dp(context, 14), Brand.dp(context, 14), Brand.dp(context, 14))
                contentDescription = getString(R.string.navigate_back)
                setOnClickListener { finish() }
            }, LinearLayout.LayoutParams(Brand.dp(context, 52), Brand.dp(context, 52)))
            addView(Brand.heading(context, getString(title)).apply {
                setPadding(Brand.dp(context, 14), 0, 0, 0)
            }, LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f))
        })
        root.addView(view, LinearLayout.LayoutParams(-1, 0, 1f))
        super.setContentView(root)
    }
}
