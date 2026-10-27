package org.bricohams.radio

import android.widget.Spinner
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [28])
class AppLanguageTest {
    @Test fun explicitLanguagesPersistWithoutChangingSystemResources() {
        RuntimeEnvironment.setQualifiers("es")
        val context = RuntimeEnvironment.getApplication()
        try {
            for ((tag, label) in listOf("es" to "Idioma de Bricohams", "en-US" to "Bricohams language",
                "fr" to "Langue de Bricohams", "de" to "Bricohams-Sprache")) {
                AppLanguage.save(context, tag)
                assertEquals(tag, AppLanguage.selected(context))
                assertEquals(label, AppLanguage.localized(context).getString(R.string.language_label))
                assertEquals("Idioma de Bricohams", context.getString(R.string.language_label))
            }
            AppLanguage.save(context, "")
            assertSame(context, AppLanguage.localized(context))
            try {
                AppLanguage.save(context, "invalid")
                fail("Unsupported language must be rejected")
            } catch (expected: IllegalArgumentException) {
                assertEquals("", AppLanguage.selected(context))
            }
        } finally { AppLanguage.save(context, "") }
    }

    @Test fun selectorAndOtherScreensUseTheSavedLanguage() {
        val context = RuntimeEnvironment.getApplication()
        AppLanguage.save(context, "fr")
        val main = Robolectric.buildActivity(MainActivity::class.java).setup()
        try {
            val activity = main.get()
            val selector = activity.findViewById<Spinner>(R.id.app_language)
            assertEquals(3, selector.selectedItemPosition)
            assertEquals("Langue de Bricohams", activity.getString(R.string.language_label))
            selector.onItemSelectedListener!!.onItemSelected(selector, null, 2, 2L)
            assertEquals("en-US", AppLanguage.selected(context))
            val sstv = Robolectric.buildActivity(SstvActivity::class.java).setup()
            try {
                assertEquals("Save PNG image", sstv.get().getString(R.string.sstv_export))
            } finally { sstv.pause().stop().destroy() }
            for (type in listOf(MainActivity::class.java, SatelliteActivity::class.java, ChannelActivity::class.java,
                SstvActivity::class.java, LiveAudioActivity::class.java, CatActivity::class.java)) {
                assertTrue(type.name, LocalizedActivity::class.java.isAssignableFrom(type))
            }
        } finally {
            main.pause().stop().destroy()
            AppLanguage.save(context, "")
        }
    }
}
