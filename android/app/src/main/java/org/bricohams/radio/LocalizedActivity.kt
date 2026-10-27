package org.bricohams.radio

import android.app.Activity
import android.content.Context
import android.content.res.Configuration
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
}
