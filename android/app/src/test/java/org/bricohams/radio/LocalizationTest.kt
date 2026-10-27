package org.bricohams.radio

import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.annotation.Config
import org.robolectric.util.ReflectionHelpers

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [28])
class LocalizationTest {
    private fun views(view: View): List<View> = listOf(view) +
        if (view is ViewGroup) (0 until view.childCount).flatMap { views(view.getChildAt(it)) } else emptyList()
    private fun buttons(activity: android.app.Activity) =
        views(activity.window.decorView).filterIsInstance<Button>().map { it.text.toString() }

    private fun assertLocale(qualifiers: String, export: String, logbook: String) {
        RuntimeEnvironment.setQualifiers(qualifiers)
        val context = RuntimeEnvironment.getApplication()
        assertEquals("Bricohams Beta", context.getString(R.string.app_name))
        assertEquals(export, context.getString(R.string.sstv_export))
        val sstv = Robolectric.buildActivity(SstvActivity::class.java).setup()
        try { assertTrue(buttons(sstv.get()).contains(export)) } finally { sstv.pause().stop().destroy() }
        val main = Robolectric.buildActivity(MainActivity::class.java).setup()
        try {
            val activity = main.get()
            views(activity.window.decorView).filterIsInstance<Button>().single { it.text == logbook }.performClick()
            assertEquals("Guardia", ReflectionHelpers.getField<String>(activity, "tab"))
        } finally { main.pause().stop().destroy() }
    }

    private fun texts(activity: android.app.Activity) =
        views(activity.window.decorView).filterIsInstance<TextView>().joinToString("\n") { it.text }

    /** Validation failures raised by domain validators reach the screen in the active locale. */
    private fun assertValidationErrors(qualifiers: String, morse: String, observer: String, rejected: String, noTone: String) {
        RuntimeEnvironment.setQualifiers(qualifiers)
        val context = RuntimeEnvironment.getApplication()
        assertEquals(rejected, context.errorText(LocalizedArgumentException(UiText(R.string.err_cat_rejected, 3))))
        assertEquals(context.getString(R.string.morse_no_tone, context.getString(R.string.morse_warning)),
            UiText(R.string.morse_no_tone, UiText(R.string.morse_warning)).resolve(context))
        assertTrue(context.getString(R.string.morse_no_tone, "").startsWith(noTone))
        assertEquals("raw", context.errorText(IllegalStateException("raw")))
        assertEquals(context.getString(R.string.error_unknown), context.errorText(null))
        val main = Robolectric.buildActivity(MainActivity::class.java).setup()
        try {
            val activity = main.get()
            views(activity.window.decorView).filterIsInstance<Button>()
                .single { it.text == context.getString(R.string.tab_morse) }.performClick()
            assertEquals("Morse", ReflectionHelpers.getField<String>(activity, "tab"))
            activity.findViewById<EditText>(R.id.morse_input).setText("abc")
            views(activity.window.decorView).filterIsInstance<Button>()
                .single { it.text == context.getString(R.string.morse_interpret) }.performClick()
            assertTrue(texts(activity), texts(activity).contains(morse))
        } finally { main.pause().stop().destroy() }
        val satellite = Robolectric.buildActivity(SatelliteActivity::class.java).setup()
        try {
            val activity = satellite.get()
            views(activity.window.decorView).filterIsInstance<Button>()
                .single { it.text == context.getString(R.string.satellite_tab_settings) }.performClick()
            for ((id, value) in listOf(R.id.satellite_latitude to "91", R.id.satellite_longitude to "0",
                R.id.satellite_height to "0")) {
                activity.findViewById<EditText>(id).setText(value)
            }
            views(activity.window.decorView).filterIsInstance<Button>()
                .single { it.text == context.getString(R.string.satellite_save_observer) }.performClick()
            assertTrue(texts(activity), texts(activity).contains(observer))
        } finally { satellite.pause().stop().destroy() }
    }

    @Test fun spanishIsDefault() = assertLocale("es", "Guardar imagen PNG", "Guardia")
    @Test fun unsupportedLocaleFallsBackToSpanish() = assertLocale("it", "Guardar imagen PNG", "Guardia")
    @Test fun englishUs() = assertLocale("en-rUS", "Save PNG image", "Logbook")
    @Test fun french() = assertLocale("fr", "Enregistrer l'image PNG", "Carnet")
    @Test fun german() = assertLocale("de", "PNG-Bild speichern", "Logbuch")

    @Test fun legacySatelliteStringsHaveSpanishFallback() {
        RuntimeEnvironment.setQualifiers("es")
        val context = RuntimeEnvironment.getApplication()
        assertEquals("Bricohams Beta - Satélites SGP4 sin conexión.", context.getString(R.string.satellite_intro))
        assertEquals("Nombre del satélite", context.getString(R.string.satellite_name))
        assertEquals("Línea 1 del TLE (69 caracteres)", context.getString(R.string.satellite_line1))
        assertEquals("Línea 2 del TLE (69 caracteres)", context.getString(R.string.satellite_line2))
        assertEquals("Downlink FM RX nominal (MHz)", context.getString(R.string.satellite_downlink))
    }

    @Test fun redesignedSatelliteFormatsAndLogbookValidation() {
        for ((qualifiers, ended) in listOf("es" to "Terminado", "en-rUS" to "Ended",
            "fr" to "Terminé", "de" to "Beendet")) {
            RuntimeEnvironment.setQualifiers(qualifiers)
            val context = RuntimeEnvironment.getApplication()
            val pass = SatellitePass(SatelliteLook(1000, 0.0, 0.0, 1000.0),
                SatelliteLook(2000, 90.0, 45.0, 500.0), SatelliteLook(3000, 180.0, 0.0, 1000.0), false, false)
            assertEquals(ended, SatellitePasses.countdown(pass, 4000, context))
            assertTrue(context.getString(R.string.satellite_results, 1, 2, 0, "").contains("2"))
            assertTrue(context.getString(R.string.cat_pass_saved, "pass.wav", 2L, 3L).contains("pass.wav"))
            try {
                Logbook(name = "", kind = "GENERAL", reference = "", stationCall = "").validated()
                fail("Expected logbook validation")
            } catch (error: LocalizedArgumentException) {
                assertEquals(context.getString(R.string.err_logbook_name), context.errorText(error))
            }
        }
    }

    @Test fun spanishValidationErrors() = assertValidationErrors("es",
        "Introduce puntos y rayas; espacios separan letras y / separa palabras.",
        "Observador: latitud -90..90, longitud -180..180, altura -0.5..9 km.",
        "CAT rechazado: estado 3.", "No se detecta tono suficiente.")
    @Test fun unsupportedLocaleValidationErrorsFallBackToSpanish() = assertValidationErrors("it",
        "Introduce puntos y rayas; espacios separan letras y / separa palabras.",
        "Observador: latitud -90..90, longitud -180..180, altura -0.5..9 km.",
        "CAT rechazado: estado 3.", "No se detecta tono suficiente.")
    @Test fun englishUsValidationErrors() = assertValidationErrors("en-rUS",
        "Enter dots and dashes; spaces separate letters and / separates words.",
        "Observer: latitude -90..90, longitude -180..180, height -0.5..9 km.",
        "CAT rejected: status 3.", "No sufficient tone detected.")
    @Test fun frenchValidationErrors() = assertValidationErrors("fr",
        "Saisissez des points et des traits ; les espaces séparent les lettres et / sépare les mots.",
        "Observateur : latitude -90..90, longitude -180..180, altitude -0.5..9 km.",
        "CAT refusé : état 3.", "Aucune tonalité suffisante détectée.")
    @Test fun germanValidationErrors() = assertValidationErrors("de",
        "Punkte und Striche eingeben; Leerzeichen trennen Buchstaben, / trennt Wörter.",
        "Beobachter: Breite -90..90, Länge -180..180, Höhe -0.5..9 km.",
        "CAT abgelehnt: Status 3.", "Kein ausreichender Ton erkannt.")
}