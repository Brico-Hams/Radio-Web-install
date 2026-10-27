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
import android.database.sqlite.SQLiteDatabase
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
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
@Config(sdk = [28], qualifiers = "es")
class RadioStoreHostTest {
    private val context get() = RuntimeEnvironment.getApplication()
    @Before fun cleanDatabase() { removeFixture() }
    @After fun removeFixture() {
        context.deleteDatabase("bricohams.db")
        context.getDatabasePath("bricohams-v1-backup.db").delete()
    }

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
            assertEquals(2, exported.getInt("version"))
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
        val file = Adif.export(listOf(contact)).replace("<EOR>", "<STATE:2>MD<EOR>")
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
            assertTrue(dialogText.contains("Campos NO conservados: STATE."))
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

    private fun createV1Database(extraSql: String? = null) {
        SQLiteDatabase.openOrCreateDatabase(context.getDatabasePath("bricohams.db").apply { parentFile!!.mkdirs() }, null).use { db ->
            db.execSQL("""CREATE TABLE contacts (id TEXT PRIMARY KEY, call TEXT NOT NULL, utc TEXT NOT NULL,
                frequency TEXT NOT NULL, mode TEXT NOT NULL, sent TEXT NOT NULL, received TEXT NOT NULL, notes TEXT NOT NULL)""")
            db.execSQL("CREATE TABLE sessions (id TEXT PRIMARY KEY, name TEXT NOT NULL, started TEXT NOT NULL)")
            db.execSQL("""CREATE TABLE observations (id TEXT PRIMARY KEY, session TEXT NOT NULL REFERENCES sessions(id),
                fox INTEGER NOT NULL, utc TEXT NOT NULL, notes TEXT NOT NULL, latitude REAL, longitude REAL,
                accuracy REAL, fix_utc TEXT)""")
            db.execSQL("""INSERT INTO contacts VALUES ('old-1', 'EA1ABC', '2026-10-25T16:00:00.000000000Z', '145.500', 'FM',
                '59', '57', 'Antiguo')""")
            extraSql?.let(db::execSQL)
            db.version = 1
        }
    }
    private fun v1Contacts(file: File) = SQLiteDatabase.openDatabase(file.path, null, SQLiteDatabase.OPEN_READONLY).use { db ->
        assertEquals(1, db.version)
        db.rawQuery("SELECT id, notes FROM contacts", null).use { buildList { while (it.moveToNext()) add(it.getString(0) to it.getString(1)) } }
    }

    @Test fun v1MigrationBacksUpFirstAndMovesContactsToGeneralLogbook() {
        createV1Database()
        RadioStore(context).use { store ->
            assertEquals(listOf(Contact("old-1", "EA1ABC", Instant.parse("2026-10-25T16:00:00Z"), "145.500", "FM", "59", "57",
                "Antiguo", Logbook.GENERAL)), store.contacts())
            assertEquals(listOf(Logbook.GENERAL), store.logbooks().map { it.id })
            assertEquals(2, store.readableDatabase.version)
            store.save(store.contacts().single().copy(notes = "Migrado"), replaceExisting = true)
        }
        assertEquals(listOf("old-1" to "Antiguo"), v1Contacts(context.getDatabasePath("bricohams-v1-backup.db")))
    }

    @Test fun failedV1MigrationRollsBackAndKeepsBackup() {
        createV1Database("CREATE TABLE logbooks (blocking TEXT)")
        assertThrows(android.database.sqlite.SQLiteException::class.java) { RadioStore(context).use { it.contacts() } }
        assertEquals(listOf("old-1" to "Antiguo"), v1Contacts(context.getDatabasePath("bricohams.db")))
        assertEquals(listOf("old-1" to "Antiguo"), v1Contacts(context.getDatabasePath("bricohams-v1-backup.db")))
    }

    @Test fun logbooksSeparateContactsAndJsonCopiesKeepThem() {
        val contact = Contact(call = "EA1ABC", utc = Instant.parse("2026-10-25T16:00:00Z"),
            frequencyMHz = "14.285", mode = "SSB", sent = "59", received = "59", notes = "")
        val (pota, snapshot) = RadioStore(context).use { store ->
            val pota = store.createLogbook(Logbook(name = "Parque", kind = "POTA", reference = "EA-0123", stationCall = "EA1ABC"))
            store.save(contact)
            store.save(contact.copy(id = "in-park", logbook = pota.id, notes = "Parque"))
            assertEquals(listOf("in-park"), store.contacts(pota.id).map { it.id })
            assertEquals(2, store.contacts().size)
            assertThrows(android.database.sqlite.SQLiteException::class.java) { store.save(contact.copy(id = "x", logbook = "missing")) }
            // The same QSO in another logbook is a different activation record, not a duplicate.
            assertEquals(1 to 0, store.importAdif(listOf(contact.copy(logbook = pota.id))))
            assertTrue(Adif.export(store.contacts(pota.id), pota).contains("<MY_POTA_REF:7>EA-0123"))
            pota to store.export()
        }
        context.deleteDatabase("bricohams.db")
        RadioStore(context).use { store ->
            assertEquals(4, store.importSnapshot(snapshot))
            assertEquals(listOf("General", "Parque"), store.logbooks().map { it.name })
            assertEquals(2, store.contacts(pota.id).size)
            assertEquals(0, store.importSnapshot(snapshot))
            val v1 = JSONObject().put("format", "bricohams-android-field-data").put("version", 1)
                .put("contacts", JSONArray().put(JSONObject().put("id", "v1-contact").put("call", "EA2XYZ")
                    .put("utc", "2026-10-20T10:00:00Z").put("frequency", "7.100").put("mode", "SSB")
                    .put("sent", "59").put("received", "59").put("notes", "")))
                .put("sessions", JSONArray()).put("observations", JSONArray()).toString()
            assertEquals(1, store.importSnapshot(v1))
            assertEquals(Logbook.GENERAL, store.contacts().single { it.id == "v1-contact" }.logbook)
            assertEquals(0, store.importSnapshot(v1))
            val badLogbook = JSONObject(snapshot)
            badLogbook.getJSONArray("logbooks").getJSONObject(1).put("reference", "nope")
            assertThrows(IllegalArgumentException::class.java) { store.importSnapshot(badLogbook.toString()) }
        }
    }

    @Test fun quickEntryFillsUtcKeepsFrequencyAndSavesToSelectedPotaLogbook() {
        val controller = Robolectric.buildActivity(MainActivity::class.java).setup()
        try {
            var activity = controller.get()
            click(activity, "Guardia")
            activity.findViewById<EditText>(R.id.logbook_name).setText("Parque")
            activity.findViewById<android.widget.Spinner>(R.id.logbook_kind).setSelection(1)
            activity.findViewById<EditText>(R.id.logbook_reference).setText("ea-0123")
            activity.findViewById<EditText>(R.id.logbook_station).setText("ea1abc")
            click(activity, "Crear libro")
            activity.findViewById<EditText>(R.id.contact_call).setText("ea2xyz")
            activity.findViewById<EditText>(R.id.contact_frequency).setText("14.285")
            activity.findViewById<android.widget.Spinner>(R.id.contact_mode).setSelection(2)
            shadowOf(Looper.getMainLooper()).idle()
            assertEquals("599", activity.findViewById<EditText>(R.id.contact_sent).text.toString())
            val before = Instant.now().minusSeconds(1)
            click(activity, "Guardar nuevo contacto")
            val after = Instant.now()
            RadioStore(context).use { store ->
                val pota = store.logbooks().single { it.kind == "POTA" }
                assertEquals(Logbook(pota.id, "Parque", "POTA", "EA-0123", "EA1ABC"), pota)
                val saved = store.contacts(pota.id).single()
                assertEquals("EA2XYZ", saved.call)
                assertEquals("CW", saved.mode)
                assertTrue(saved.utc in before..after)
                assertTrue(store.contacts(Logbook.GENERAL).isEmpty())
            }
            assertEquals("", activity.findViewById<EditText>(R.id.contact_call).text.toString())
            assertEquals("14.285", activity.findViewById<EditText>(R.id.contact_frequency).text.toString())
            fun logAgain(): AlertDialog {
                activity.findViewById<EditText>(R.id.contact_call).setText("EA2XYZ")
                activity.findViewById<EditText>(R.id.contact_frequency).setText("14.300")
                click(activity, "Guardar nuevo contacto")
                return ShadowAlertDialog.getLatestAlertDialog().also { assertTrue(it.isShowing) }
            }
            fun count() = RadioStore(context).use { it.contacts().size }
            logAgain().getButton(AlertDialog.BUTTON_NEGATIVE).performClick()
            shadowOf(Looper.getMainLooper()).idle()
            assertEquals(1, count())
            assertEquals("EA2XYZ", activity.findViewById<EditText>(R.id.contact_call).text.toString())
            logAgain().getButton(AlertDialog.BUTTON_POSITIVE).performClick()
            shadowOf(Looper.getMainLooper()).idle()
            assertEquals(2, count())
            controller.recreate()
            activity = controller.get()
            assertTrue(views(activity.window.decorView).filterIsInstance<android.widget.TextView>()
                .any { it.text.startsWith("Libro: Parque (POTA EA-0123, EA1ABC) - 2 contactos") })
            assertEquals("CW", activity.findViewById<android.widget.Spinner>(R.id.contact_mode).selectedItem)
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
