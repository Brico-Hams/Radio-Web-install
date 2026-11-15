package org.bricohams.radio

import android.app.Activity
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.ImageButton
import android.widget.TextView
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [28], qualifiers = "es")
class UiOverhaulTest {
    private val app get() = RuntimeEnvironment.getApplication()

    private fun views(view: View): List<View> = listOf(view) +
        if (view is ViewGroup) (0 until view.childCount).flatMap { views(view.getChildAt(it)) } else emptyList()

    private fun all(activity: Activity) = views(activity.window.decorView)

    private fun texts(activity: Activity) = all(activity).filterIsInstance<TextView>().map { it.text.toString() }

    private fun profile(radio: ProfileRadio) =
        ProfileStore.save(app, StationProfile(radio, "EA1ABC", radio.transports.firstOrNull(), radio.defaultBaud))

    private fun <T : Activity> open(type: Class<T>, check: (T) -> Unit) {
        val controller = Robolectric.buildActivity(type).setup()
        try { check(controller.get()) } finally { controller.pause().stop().destroy() }
    }

    private fun assertHelpButtons(activity: Activity, minimum: Int) {
        val helps = all(activity).filter { it.id == R.id.help_button }.filterIsInstance<ImageButton>()
        assertTrue("${activity.javaClass.simpleName} help buttons", helps.size >= minimum)
        for (button in helps) {
            assertFalse(button.contentDescription.isNullOrBlank())
            assertTrue(button.getTag(R.id.help_text).toString().isNotBlank())
            assertTrue(button.layoutParams.height >= Brand.dp(activity, 48))
        }
    }

    @Test fun homeShowsOnlyToolsTheRadioEnablesAndListsTheRestAsUnavailable() {
        val expectations = mapOf(
            ProfileRadio.UVK5 to setOf("UVK5_CAT", "CHANNELS", "DIAGNOSTICS", "TEMPLATES"),
            ProfileRadio.IC705 to setOf("RIG_CAT"),
            ProfileRadio.FTX1 to setOf("RIG_CAT", "DIAGNOSTICS", "TEMPLATES"))
        for ((radio, specific) in expectations) {
            profile(radio)
            open(MainActivity::class.java) { activity ->
                val tags = all(activity).mapNotNull { it.tag as? String }
                val enabled = Tool.values().filter { "tool_" + it.name in tags }.map { it.name }.toSet()
                assertEquals(radio.name, specific + setOf("SSTV", "LIVE_AUDIO", "ROTOR"), enabled)
                val unavailable = Tool.values().filter { "unavailable_" + it.name in tags }.map { it.name }.toSet()
                assertEquals(radio.name, Tool.values().map { it.name }.toSet() - enabled, unavailable)
                for (always in listOf("tool_satellites", "tool_ftx", "tool_logbook")) assertTrue(always in tags)
                val list = activity.findViewById<View>(R.id.home_unavailable_list)
                assertEquals(View.GONE, list.visibility)
                assertTrue(texts(activity).any { it.contains(radio.label(activity)) })
                activity.findViewById<View>(R.id.home_unavailable_toggle).performClick()
                assertEquals(View.VISIBLE, list.visibility)
            }
        }
    }

    @Test fun homeWithoutProfileKeepsEveryToolAndOffersSetup() {
        open(MainActivity::class.java) { activity ->
            val tags = all(activity).mapNotNull { it.tag as? String }
            for (tool in Tool.values()) assertTrue(tool.name, "tool_" + tool.name in tags)
            assertTrue(texts(activity).contains(activity.getString(R.string.home_profile_setup)))
        }
    }

    @Test fun homeProfileCardShowsRadioCallsignAndConnectionState() {
        profile(ProfileRadio.IC705)
        open(MainActivity::class.java) { activity ->
            val card = activity.findViewById<ViewGroup>(R.id.home_profile_card)
            val cardTexts = views(card).filterIsInstance<TextView>().map { it.text.toString() }
            assertTrue(cardTexts.contains(ProfileRadio.IC705.label(activity)))
            assertTrue(cardTexts.contains(activity.getString(R.string.home_profile_callsign, "EA1ABC")))
            assertTrue(cardTexts.contains(activity.getString(R.string.home_profile_status_untested)))
            assertTrue(views(card).filterIsInstance<Button>().any { it.text == activity.getString(R.string.profile_edit) })
        }
    }

    @Test fun everySectionHeaderOfTheMainScreensHasHelp() {
        profile(ProfileRadio.IC705)
        open(MainActivity::class.java) { activity ->
            assertHelpButtons(activity, 8)
            for (tab in listOf(R.string.tab_logbook, R.string.tab_ardf, R.string.tab_morse)) {
                all(activity).filterIsInstance<Button>().first { it.text == activity.getString(tab) }.performClick()
                assertHelpButtons(activity, 1)
            }
        }
        open(RigActivity::class.java) { assertHelpButtons(it, 6) } // radio, frequency, meter, digital, memories, SSTV; satellite needs a pass
        open(CatActivity::class.java) { assertHelpButtons(it, 4) }
        open(RotorActivity::class.java) { assertHelpButtons(it, 1) }
    }

    @Test fun rigKeepsEverySection() {
        open(RigActivity::class.java) { activity ->
            val shown = texts(activity)
            for (title in listOf(R.string.rig_section_radio, R.string.rig_section_frequency, R.string.rig_section_meter,
                R.string.rig_dig_title, R.string.rig_section_memories, R.string.rig_section_sstv)) { // the satellite section is built only when opened with a pass (EXTRA_PLAN)
                assertTrue(activity.getString(title), activity.getString(title) in shown)
            }
        }
    }

    @Test fun catKeepsEveryControl() {
        open(CatActivity::class.java) { activity ->
            val buttons = all(activity).filterIsInstance<Button>().map { it.text.toString() }
            for (label in listOf(R.string.cat_choose_device, R.string.cat_query, R.string.cat_tune, R.string.cat_stop,
                R.string.usb_disconnect, R.string.cat_send_robot36, R.string.cat_sstv_stop_tx, R.string.cat_sstv_record,
                R.string.cat_sstv_stop)) {
                assertTrue(activity.getString(label), activity.getString(label) in buttons)
            }
            assertNotNull(activity.findViewById<View>(R.id.cat_frequency))
        }
    }

    @Test fun mainKeepsEverySectionAndTab() {
        profile(ProfileRadio.UVK5)
        open(MainActivity::class.java) { activity ->
            val shown = texts(activity)
            for (label in listOf(R.string.home_export_json, R.string.home_import_json, R.string.home_offline, R.string.home_features,
                R.string.home_ardf_note, R.string.home_privacy, R.string.profile_edit)) {
                assertTrue(activity.getString(label), activity.getString(label) in shown)
            }
            fun tab(label: Int) = all(activity).filterIsInstance<Button>().first { it.text == activity.getString(label) }.performClick()
            tab(R.string.tab_logbook)
            assertNotNull(activity.findViewById<View>(R.id.contact_call))
            assertTrue(activity.getString(R.string.logbook_empty_title) in texts(activity))
            tab(R.string.tab_ardf)
            assertNotNull(activity.findViewById<View>(R.id.session_name))
            tab(R.string.tab_morse)
            assertNotNull(activity.findViewById<View>(R.id.morse_input))
        }
    }

    @Test fun firstRunTipIsDismissibleAndRemembered() {
        open(ProfileActivity::class.java) { activity ->
            val tip = all(activity).single { it.tag == "first_run_tip" } as ViewGroup
            views(tip).filterIsInstance<Button>().single().performClick()
            assertTrue(all(activity).none { it.tag == "first_run_tip" })
        }
        open(ProfileActivity::class.java) { activity -> assertTrue(all(activity).none { it.tag == "first_run_tip" }) }
    }

    @Test fun helpLinksFollowTheLanguage() {
        assertEquals("https://brico-hams.github.io/Radio-Web-install/ayuda-android.html", BrandUi.helpUrl(app, "ayuda-android"))
    }

    @Test fun themeChoiceIsStoredAndRejectsUnknownValues() {
        AppTheme.save(app, "dark")
        assertEquals("dark", AppTheme.selected(app))
        assertThrows(IllegalArgumentException::class.java) { AppTheme.save(app, "neon") }
        AppTheme.save(app, "system")
    }
}
