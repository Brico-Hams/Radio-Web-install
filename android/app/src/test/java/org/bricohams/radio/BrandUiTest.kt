package org.bricohams.radio

import android.graphics.Color
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.EditText
import android.widget.ImageButton
import android.widget.TextView
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.annotation.Config
import kotlin.math.max
import kotlin.math.min
import kotlin.math.pow

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [28], qualifiers = "es-w320dp-h640dp")
class BrandUiTest {
    private fun views(view: View): List<View> = listOf(view) +
        if (view is ViewGroup) (0 until view.childCount).flatMap { views(view.getChildAt(it)) } else emptyList()

    private fun luminance(color: Int): Double {
        fun linear(value: Int): Double {
            val s = value / 255.0
            return if (s <= 0.04045) s / 12.92 else ((s + 0.055) / 1.055).pow(2.4)
        }
        return 0.2126 * linear(Color.red(color)) + 0.7152 * linear(Color.green(color)) + 0.0722 * linear(Color.blue(color))
    }

    private fun contrast(first: Int, second: Int): Double {
        val a = luminance(first)
        val b = luminance(second)
        return (max(a, b) + 0.05) / (min(a, b) + 0.05)
    }

    @Test fun palettesProvideReadableTextAndOrangeActionsInBothSystemModes() {
        for (mode in listOf("notnight", "night")) {
            RuntimeEnvironment.setQualifiers("es-w320dp-h640dp-$mode")
            val colors = Brand.Palette(RuntimeEnvironment.getApplication())
            for (background in listOf(colors.background, colors.surface, colors.surfaceHigh)) {
                assertTrue("$mode body", contrast(colors.text, background) >= 4.5)
                assertTrue("$mode supporting text", contrast(colors.muted, background) >= 4.5)
                assertTrue("$mode action", contrast(colors.accent, background) >= 4.5)
            }
            assertTrue("$mode selected action", contrast(colors.onAccent, colors.accent) >= 4.5)
        }
    }

    @Test fun secondaryScreensShareLocalizedHeadersAndAccessibleNativeControls() {
        for (locale in listOf("es", "en-rUS", "fr", "de")) {
            RuntimeEnvironment.setQualifiers("$locale-w320dp-h640dp")
            for (screen in listOf(CatActivity::class.java, ChannelActivity::class.java,
                SstvActivity::class.java, LiveAudioActivity::class.java)) {
                val controller = Robolectric.buildActivity(screen).setup()
                try {
                    val activity = controller.get()
                    val all = views(activity.window.decorView)
                    val back = all.filterIsInstance<ImageButton>().single {
                        it.contentDescription == activity.getString(R.string.navigate_back)
                    }
                    assertTrue(back.layoutParams.height >= Brand.dp(activity, 48))
                    all.filterIsInstance<Button>().forEach {
                        assertTrue(it.text.toString(), it.minHeight >= Brand.dp(activity, 48))
                        assertFalse(it.text.toString(), it.transformationMethod?.javaClass?.simpleName == "AllCapsTransformationMethod")
                    }
                    all.filterIsInstance<EditText>().filter { it.id != R.id.cat_callsign }.forEach { field ->
                        assertTrue("Missing label for ${field.id}", all.filterIsInstance<TextView>().any { it.labelFor == field.id })
                    }
                    assertTrue(back.performClick())
                    assertTrue(activity.isFinishing)
                } finally { controller.pause().stop().destroy() }
            }
        }
    }

    @Test fun mainNavigationKeepsSelectionAndAllToolsReachableWithLargeText() {
        RuntimeEnvironment.setFontScale(1.6f)
        val controller = Robolectric.buildActivity(MainActivity::class.java).setup()
        try {
            val activity = controller.get()
            val all = views(activity.window.decorView)
            val buttons = all.filterIsInstance<Button>()
            for ((label, target) in listOf(
                R.string.home_open_cat to CatActivity::class.java,
                R.string.home_open_channels to ChannelActivity::class.java,
                R.string.home_open_sstv to SstvActivity::class.java,
                R.string.home_open_live to LiveAudioActivity::class.java,
                R.string.home_open_satellites to SatelliteActivity::class.java)) {
                buttons.single { it.text == activity.getString(label) }.performClick()
                assertEquals(target.name, org.robolectric.Shadows.shadowOf(activity).nextStartedActivity.component?.className)
            }
            val nav = buttons.single { it.text == activity.getString(R.string.tab_logbook) }
            assertTrue(nav.performClick())
            assertTrue(nav.isSelected)
            assertNotNull(activity.findViewById<EditText>(R.id.contact_call))
            val root = activity.findViewById<View>(android.R.id.content)
            root.measure(View.MeasureSpec.makeMeasureSpec(320, View.MeasureSpec.EXACTLY),
                View.MeasureSpec.makeMeasureSpec(640, View.MeasureSpec.EXACTLY))
            root.layout(0, 0, 320, 640)
            assertTrue(nav.height >= Brand.dp(activity, 48))
        } finally {
            controller.pause().stop().destroy()
            RuntimeEnvironment.setFontScale(1f)
        }
    }
}
