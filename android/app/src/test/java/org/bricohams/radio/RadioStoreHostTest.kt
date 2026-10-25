package org.bricohams.radio

import android.app.Activity
import android.app.AlertDialog
import android.content.Intent
import android.net.Uri
import android.os.Looper
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.EditText
import org.json.JSONObject
import org.junit.After
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.Shadows.shadowOf
import org.robolectric.shadows.ShadowAlertDialog
import org.robolectric.util.ReflectionHelpers
import org.robolectric.util.ReflectionHelpers.ClassParameter.from
import org.robolectric.annotation.Config
import java.time.Instant
import java.io.ByteArrayInputStream

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [28])
class RadioStoreHostTest {
    private val context get() = RuntimeEnvironment.getApplication()
    @Before fun cleanDatabase() { context.deleteDatabase("bricohams.db") }
    @After fun removeFixture() { context.deleteDatabase("bricohams.db") }

    @Test fun sqlitePersistsUnicodeAndNullableGpsAcrossReopen() {
        val contact = Contact(call = "EA1ABC", utc = Instant.parse("2026-10-25T16:00:00Z"),
            frequencyMHz = "145.500", mode = "FM", sent = "59", received = "57", notes = "Espa\u00f1a")
        val session = RadioStore(context).use { store ->
            store.save(contact)
            val id = store.session("Campo")
            store.observe(id, 1, "Sin posicion", null)
            store.observe(id, 2, "Con posicion", Fix(40.0, -3.0, 12.0, contact.utc))
            id
        }
        RadioStore(context).use { store ->
            assertEquals(contact, store.contacts().single())
            store.save(contact.copy(notes = "Updated"), replaceExisting = true)
            assertEquals("Updated", store.contacts().single().notes)
            assertEquals(listOf(session to "Campo"), store.sessions())
            assertEquals("Baliza 1: 1 observaciones\nBaliza 2: 1 observaciones", store.observationCounts(session))
            val exported = JSONObject(store.export())
            assertEquals(1, exported.getInt("version"))
            val observations = exported.getJSONArray("observations")
            assertEquals(2, observations.length())
            assertTrue(observations.getJSONObject(0).isNull("latitude"))
            assertEquals(40.0, observations.getJSONObject(1).getDouble("latitude"), 0.0)
            assertEquals(12.0, observations.getJSONObject(1).getDouble("accuracy"), 0.0)
            assertEquals(contact.utc.toString(), observations.getJSONObject(1).getString("fix_utc"))
            assertThrows(IllegalArgumentException::class.java) { store.observe(session, 11, "", null) }
            assertEquals(2, JSONObject(store.export()).getJSONArray("observations").length())
            store.deleteContact(contact.id)
            assertTrue(store.contacts().isEmpty())
            assertThrows(IllegalStateException::class.java) { store.deleteContact(contact.id) }
        }
    }
    @Test fun utcOrderingIncludesFractionalSeconds() {
        val base = Contact(call = "EA1ABC", utc = Instant.parse("2026-10-25T16:00:00Z"),
            frequencyMHz = "145.500", mode = "FM", sent = "59", received = "59", notes = "")
        RadioStore(context).use { store ->
            store.save(base)
            store.save(base.copy(id = "later", utc = base.utc.plusMillis(1)))
            assertEquals(listOf("later", base.id), store.contacts().map { it.id })
        }
    }

    @Test fun ardfStatisticsReadPersistedObservationsAndShowSelectedSessionOnly() {
        val first = RadioStore(context).use { store ->
            val session = store.session("Estadisticas")
            store.observe(session, 1, "Sin GPS", null)
            store.observe(session, 2, "Punto conocido", Fix(40.0, -3.0, 8.0, Instant.now()))
            val other = store.session("Otra")
            store.observe(other, 3, "No debe aparecer", null)
            session
        }
        RadioStore(context).use { store ->
            val observations = store.observations(first)
            assertEquals(2, observations.size)
            assertEquals(setOf(1, 2), observations.map { it.fox }.toSet())
            assertEquals("Punto conocido", observations.single { it.fox == 2 }.notes)
            assertEquals(40.0, observations.single { it.fox == 2 }.fix!!.latitude, 0.0)
            assertEquals(1, ArdfStatistics.calculate(observations).located)
            assertThrows(IllegalArgumentException::class.java) { store.observations("missing") }
        }
        val controller = Robolectric.buildActivity(MainActivity::class.java).setup()
        try {
            val activity = controller.get()
            ReflectionHelpers.setField(activity, "sessionId", first)
            fun all(view: View): List<View> = listOf(view) +
                if (view is ViewGroup) (0 until view.childCount).flatMap { all(view.getChildAt(it)) } else emptyList()
            all(activity.window.decorView).filterIsInstance<Button>().single { it.text == "ARDF" }.performClick()
            all(activity.window.decorView).filterIsInstance<Button>()
                .single { it.text == "Estadisticas y observaciones de la sesion" }.performClick()
            val dialog = ShadowAlertDialog.getLatestAlertDialog()
            val report = all(dialog.window!!.decorView).filterIsInstance<android.widget.TextView>()
                .joinToString("\n") { it.text.toString() }
            assertTrue(report.contains("Observaciones: 2; con coordenadas: 1"))
            assertTrue(report.contains("SIN coordenadas"))
            assertTrue(report.contains("No es recorrido completo"))
            assertFalse(report.contains("No debe aparecer"))
            dialog.dismiss()
        } finally { controller.pause().stop().destroy() }
    }

    @Test fun snapshotRoundTripIsIdempotentAndConflictsRollback() {
        val contact = Contact(call = "EA1ABC", utc = Instant.parse("2026-10-25T16:00:00Z"),
            frequencyMHz = "145.500", mode = "FM", sent = "59", received = "59", notes = "Espa\u00f1a")
        val snapshot = RadioStore(context).use { store ->
            store.save(contact)
            val session = store.session("Campo")
            store.observe(session, 2, "Sample", Fix(40.416775, -3.70379, 8.5, contact.utc))
            store.export()
        }
        context.deleteDatabase("bricohams.db")
        RadioStore(context).use { store ->
            assertEquals(3, store.importSnapshot(snapshot))
            assertEquals(contact, store.contacts().single())
            assertEquals(0, store.importSnapshot(snapshot))
            val conflicting = JSONObject(snapshot)
            val copy = JSONObject(conflicting.getJSONArray("contacts").getJSONObject(0).toString()).put("id", "new-entry")
            conflicting.getJSONArray("contacts").put(0, copy)
            conflicting.getJSONArray("sessions").getJSONObject(0).put("name", "Changed session")
            assertThrows(IllegalArgumentException::class.java) { store.importSnapshot(conflicting.toString()) }
            assertEquals(listOf(contact), store.contacts())
            assertEquals(1, store.sessions().size)
            val invalidGps = JSONObject(snapshot)
            invalidGps.getJSONArray("observations").getJSONObject(0).put("latitude", 91)
            assertThrows(IllegalArgumentException::class.java) { store.importSnapshot(invalidGps.toString()) }
            assertEquals(1, JSONObject(store.export()).getJSONArray("observations").length())
        }
    }

    @Test fun adifImportIsAtomicAndDeduplicatesConservedFieldsNotOnlyCall() {
        val contact = Contact(call = "EA1ABC", utc = Instant.parse("2026-10-25T16:00:00Z"),
            frequencyMHz = "145.500", mode = "FM", sent = "59", received = "59", notes = "Original")
        RadioStore(context).use { store ->
            store.save(contact)
            val duplicate = contact.copy(id = "different-id", frequencyMHz = "145.5")
            val changed = contact.copy(notes = "Another report")
            assertEquals(1 to 2, store.importAdif(listOf(duplicate, changed, changed)))
            assertEquals(2, store.contacts().size)
            assertTrue(store.contacts().contains(contact))
            assertEquals(0 to 2, store.importAdif(listOf(duplicate, changed)))
            assertThrows(IllegalArgumentException::class.java) {
                store.importAdif(listOf(contact.copy(call = "EA2ABC"), contact.copy(call = "INVALID")))
            }
            assertEquals(2, store.contacts().size)
            // Force an insertion error after the first new row to verify rollback, not just prevalidation.
            store.writableDatabase.execSQL("""CREATE TRIGGER fail_import BEFORE INSERT ON contacts
                WHEN NEW.call = 'EA3ABC' BEGIN SELECT RAISE(ABORT, 'test failure'); END""")
            assertThrows(android.database.sqlite.SQLiteException::class.java) {
                store.importAdif(listOf(contact.copy(call = "EA2ABC"), contact.copy(call = "EA3ABC")))
            }
            assertEquals(2, store.contacts().size)
        }
    }

    @Test fun logSearchIsCaseInsensitiveAndSurvivesRecreation() {
        RadioStore(context).use { store ->
            store.save(Contact(call = "EA1ABC", utc = Instant.parse("2026-10-25T16:00:00Z"),
                frequencyMHz = "145.500", mode = "FM", sent = "59", received = "59", notes = "Montana"))
            store.save(Contact(call = "EA2XYZ", utc = Instant.parse("2026-10-24T16:00:00Z"),
                frequencyMHz = "436.500", mode = "SSB", sent = "59", received = "59", notes = "Campo"))
        }
        val controller = Robolectric.buildActivity(MainActivity::class.java).setup()
        try {
            var activity = controller.get()
            click(activity, "Guardia")
            activity.findViewById<EditText>(R.id.contact_search).setText("montana")
            click(activity, "Buscar contactos")
            fun edits() = views(controller.get().window.decorView).filterIsInstance<Button>()
                .map { it.text.toString() }.filter { it.startsWith("Editar ") }
            assertEquals(1, edits().size)
            assertTrue(edits().single().contains("EA1ABC"))
            controller.recreate()
            activity = controller.get()
            assertEquals("montana", activity.findViewById<EditText>(R.id.contact_search).text.toString())
            assertEquals(1, edits().size)
            click(activity, "Mostrar todos los contactos")
            assertEquals(2, edits().size)
        } finally { controller.pause().stop().destroy() }
    }

    @Test fun adifPreviewWarnsBeforeSavingAndCancelLeavesDatabaseUntouched() {
        val contact = Contact(call = "EA1ABC", utc = Instant.parse("2026-10-25T16:00:00Z"),
            frequencyMHz = "145.500", mode = "FM", sent = "59", received = "59", notes = "")
        val file = Adif.export(listOf(contact)).replace("<EOR>", "<BAND:2>2M<EOR>")
        val uri = Uri.parse("content://test/bricohams.adi")
        val controller = Robolectric.buildActivity(MainActivity::class.java).setup()
        try {
            val activity = controller.get()
            click(activity, "Guardia")
            fun await(condition: () -> Boolean) {
                val deadline = System.nanoTime() + 10_000_000_000L
                while (!condition() && System.nanoTime() < deadline) {
                    Thread.sleep(10)
                    shadowOf(Looper.getMainLooper()).idle()
                }
                assertTrue("Asynchronous ADIF operation timed out", condition())
            }
            fun selectFile() {
                shadowOf(activity.contentResolver).registerInputStream(uri, ByteArrayInputStream(file.toByteArray()))
                ReflectionHelpers.callInstanceMethod<Unit>(activity, "onActivityResult",
                    from(Int::class.javaPrimitiveType, 41), from(Int::class.javaPrimitiveType, Activity.RESULT_OK),
                    from(Intent::class.java, Intent().setData(uri)))
            }
            selectFile()
            await { ShadowAlertDialog.getLatestAlertDialog()?.isShowing == true }
            var dialog = ShadowAlertDialog.getLatestAlertDialog()
            val dialogText = views(dialog.window!!.decorView).filterIsInstance<android.widget.TextView>()
                .joinToString("\n") { it.text }
            assertTrue(dialogText.contains("Campos NO conservados: BAND"))
            RadioStore(context).use { assertTrue(it.contacts().isEmpty()) }
            dialog.getButton(AlertDialog.BUTTON_NEGATIVE).performClick()
            RadioStore(context).use { assertTrue(it.contacts().isEmpty()) }
            selectFile()
            await { ShadowAlertDialog.getLatestAlertDialog()?.isShowing == true }
            dialog = ShadowAlertDialog.getLatestAlertDialog()
            dialog.getButton(AlertDialog.BUTTON_POSITIVE).performClick()
            await {
                views(activity.window.decorView).filterIsInstance<android.widget.TextView>()
                    .any { it.text.contains("ADIF importado: 1 contactos nuevos") }
            }
            RadioStore(context).use { assertEquals(contact.copy(id = it.contacts().single().id), it.contacts().single()) }
        } finally { controller.pause().stop().destroy() }
    }

    private fun views(view: View): List<View> = listOf(view) +
        if (view is ViewGroup) (0 until view.childCount).flatMap { views(view.getChildAt(it)) } else emptyList()
    private fun click(activity: Activity, title: String) {
        val button = views(activity.window.decorView).filterIsInstance<Button>().first { it.text.toString() == title }
        assertTrue(button.performClick())
    }
    @Test fun activitySavesContactAndRestoresFormsAfterRecreation() {
        val controller = Robolectric.buildActivity(MainActivity::class.java).setup()
        try {
            var activity = controller.get()
            click(activity, "Guardia")
            activity.findViewById<EditText>(R.id.contact_call).setText("EA1ABC")
            activity.findViewById<EditText>(R.id.contact_frequency).setText("145.500")
            controller.recreate()
            activity = controller.get()
            assertEquals("EA1ABC", activity.findViewById<EditText>(R.id.contact_call).text.toString())
            click(activity, "Guardar nuevo contacto")
            RadioStore(context).use { assertEquals("EA1ABC", it.contacts().single().call) }
            click(activity, "ARDF")
            activity.findViewById<EditText>(R.id.session_name).setText("Prueba")
            click(activity, "Crear sesion ARDF")
            click(activity, "Guardar observacion manual")
            RadioStore(context).use {
                val observation = JSONObject(it.export()).getJSONArray("observations").getJSONObject(0)
                assertTrue(observation.isNull("latitude"))
                assertEquals(1, observation.getInt("fox"))
            }
            click(activity, "Morse")
            click(activity, "Interpretar texto Morse")
        } finally {
            controller.pause().stop().destroy()
        }
    }
}
