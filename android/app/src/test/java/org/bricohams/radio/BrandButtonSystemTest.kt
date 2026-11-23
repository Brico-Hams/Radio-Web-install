package org.bricohams.radio

import android.graphics.Color
import android.graphics.drawable.StateListDrawable
import android.view.View
import android.widget.Button
import android.widget.HorizontalScrollView
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

/** Colour tokens, per-state WCAG contrast and sizes of the shared button system (replaces CSS parsing on Android). */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [28], qualifiers = "es-w320dp-h640dp")
class BrandButtonSystemTest {
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

    private fun palette(mode: String): Brand.Palette {
        RuntimeEnvironment.setQualifiers("es-w320dp-h640dp-$mode")
        return Brand.Palette(RuntimeEnvironment.getApplication())
    }

    private val modes = listOf("notnight", "night")

    @Test fun everyKindAndStateKeepsLabelContrastAndVisibleBorders() {
        for (mode in modes) {
            val c = palette(mode)
            for (kind in BrandUi.ButtonKind.values()) for (state in BrandUi.ButtonState.values()) {
                val look = BrandUi.buttonLook(c, kind, state)
                val id = "$mode $kind $state"
                val labelMin = if (state == BrandUi.ButtonState.DISABLED) 3.0 else 4.5
                assertTrue("$id label ${contrast(look.text, look.fill)}", contrast(look.text, look.fill) >= labelMin)
                if (state == BrandUi.ButtonState.NORMAL || state == BrandUi.ButtonState.FOCUSED) {
                    // The button edge (border, or fill when borderless) must stand out from the page and its card.
                    val edge = if (kind == BrandUi.ButtonKind.SECONDARY) look.border else look.fill
                    assertTrue("$id edge vs background", contrast(edge, c.background) >= 3.0)
                }
                if (state == BrandUi.ButtonState.FOCUSED) {
                    assertEquals("$id ring is the focus token", c.focus, look.ring)
                    assertTrue("$id ring", contrast(requireNotNull(look.ring), c.background) >= 3.0)
                } else assertNull(id, look.ring)
            }
            assertTrue("$mode secondary on card", contrast(c.borderStrong, c.surface) >= 3.0)
            assertTrue("$mode danger white label", contrast(c.onDanger, c.danger) >= 4.5)
            assertEquals("$mode danger label is white", Color.WHITE, c.onDanger)
            assertEquals("$mode primary label graphite", Color.parseColor("#23272B"), c.onAccent)
        }
    }

    @Test fun statesAreVisiblyDistinct() {
        for (mode in modes) {
            val c = palette(mode)
            for (kind in BrandUi.ButtonKind.values()) {
                val fills = BrandUi.ButtonState.values().filter { it != BrandUi.ButtonState.FOCUSED }
                    .map { BrandUi.buttonLook(c, kind, it).fill }
                assertEquals("$mode $kind states reuse a fill", fills.size, fills.toSet().size)
            }
            assertNotEquals(BrandUi.buttonLook(c, BrandUi.ButtonKind.PRIMARY, BrandUi.ButtonState.NORMAL).border,
                BrandUi.buttonLook(c, BrandUi.ButtonKind.SELECTED, BrandUi.ButtonState.NORMAL).border)
        }
    }

    @Test fun themeButtonDrawableUsesSecondaryTokensAndFocusRing() {
        val context = RuntimeEnvironment.getApplication()
        val xml = java.io.File("src/main/res/drawable/brand_button.xml").readText()
        for (token in listOf("brand_disabled_fill", "brand_focus", "brand_surface", "brand_secondary_pressed",
            "brand_secondary_hover", "brand_border_strong")) assertTrue(token, xml.contains("@color/$token"))
        assertTrue(xml.contains("android:width=\"3dp\""))
        assertTrue(BrandUi.buttonBackground(context, BrandUi.ButtonKind.PRIMARY) is StateListDrawable)
        val style = java.io.File("src/main/res/values/styles.xml").readText()
        listOf("android:textSize\">16sp", "android:textStyle\">bold", "android:minHeight\">52dp", "android:minWidth\">48dp")
            .forEach { assertTrue(it, style.contains(it)) }
    }

    @Test fun sharedButtonsAreLargeSixteenSpAndNeverTruncated() {
        for (mode in modes) {
            palette(mode)
            val context = RuntimeEnvironment.getApplication()
            val density = context.resources.displayMetrics.density
            val views = listOf<TextView>(
                Brand.button(context, "Primary", true) {}, Brand.button(context, "Secondary") {},
                BrandUi.dangerButton(context, "Stop TX") {}, Brand.chip(context, "Selected", true) {},
                Brand.chip(context, "Plain", false) {})
            for (view in views) {
                assertTrue("${view.text}", view.minHeight >= (48 * density).toInt())
                assertTrue("${view.text}", view.minWidth >= (48 * density).toInt())
                assertEquals("${view.text}", 16f, view.textSize / context.resources.displayMetrics.scaledDensity, 0.01f)
                assertTrue("${view.text}", view.maxLines == Int.MAX_VALUE && view.ellipsize == null)
                assertTrue("${view.text}", view.isFocusable)
            }
            val selected = views[3]
            assertNotNull("check mark is the non-colour cue", selected.compoundDrawablesRelative[0])
            assertNull(views[4].compoundDrawablesRelative[0])
        }
    }

    @Test fun bottomNavigationScrollsInsteadOfTruncatingSatellites() {
        RuntimeEnvironment.setFontScale(1.6f)
        val controller = Robolectric.buildActivity(MainActivity::class.java).setup()
        try {
            val activity = controller.get()
            val label = activity.getString(R.string.nav_satellites)
            val all = flatten(activity.window.decorView)
            val satellites = all.filterIsInstance<Button>().single { it.text == label }
            assertTrue(all.filterIsInstance<HorizontalScrollView>().any { it.indexOfChild(satellites.parent as View) >= 0 })
            assertEquals(Int.MAX_VALUE, satellites.maxLines)
            assertNull(satellites.ellipsize)
            val root = activity.findViewById<View>(android.R.id.content)
            root.measure(View.MeasureSpec.makeMeasureSpec(320, View.MeasureSpec.EXACTLY),
                View.MeasureSpec.makeMeasureSpec(640, View.MeasureSpec.EXACTLY))
            root.layout(0, 0, 320, 640)
            assertTrue(satellites.paint.measureText(label) <= satellites.width - satellites.paddingLeft - satellites.paddingRight)
            assertTrue(satellites.height >= Brand.dp(activity, 48))
        } finally {
            controller.pause().stop().destroy()
            RuntimeEnvironment.setFontScale(1f)
        }
    }

    private fun flatten(view: View): List<View> = listOf(view) +
        if (view is android.view.ViewGroup) (0 until view.childCount).flatMap { flatten(view.getChildAt(it)) } else emptyList()
}
