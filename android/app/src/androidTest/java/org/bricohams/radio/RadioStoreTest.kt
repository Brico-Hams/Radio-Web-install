package org.bricohams.radio

import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.ext.junit.runners.AndroidJUnit4
import android.content.Context
import android.content.ContextWrapper
import android.database.DatabaseErrorHandler
import android.database.sqlite.SQLiteDatabase
import org.junit.Assert.*
import org.junit.After
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.json.JSONObject
import java.time.Instant
import java.io.File
import java.util.UUID

@RunWith(AndroidJUnit4::class)
class RadioStoreTest {
    private lateinit var context: Context
    private lateinit var databaseName: String
    private val target get() = InstrumentationRegistry.getInstrumentation().targetContext

    @Before fun isolatedDatabase() {
        databaseName = "instrumentation-${UUID.randomUUID()}.db"
        context = object : ContextWrapper(target) {
            private fun isolated(name: String): String {
                require(name == "bricohams.db") { "Unexpected database in persistence test: $name" }
                return databaseName
            }
            override fun getDatabasePath(name: String): File = target.getDatabasePath(isolated(name))
            override fun openOrCreateDatabase(name: String, mode: Int, factory: SQLiteDatabase.CursorFactory?): SQLiteDatabase =
                target.openOrCreateDatabase(isolated(name), mode, factory)
            override fun openOrCreateDatabase(name: String, mode: Int, factory: SQLiteDatabase.CursorFactory?,
                errorHandler: DatabaseErrorHandler?): SQLiteDatabase =
                target.openOrCreateDatabase(isolated(name), mode, factory, errorHandler)
            override fun deleteDatabase(name: String): Boolean = target.deleteDatabase(isolated(name))
        }
    }

    @After fun removeOnlyFixtureDatabase() {
        if (::databaseName.isInitialized) target.deleteDatabase(databaseName)
    }

    @Test fun persistenceAndExports() {
        val call = "EA1TEST"
        val sessionName = "Test ${System.nanoTime()}"
        var store = RadioStore(context)
        val contact = Contact(call = call, utc = Instant.parse("2026-10-25T16:00:00Z"),
            frequencyMHz = "145.500", mode = "FM", sent = "59", received = "59", notes = "Field")
        store.save(contact)
        val session = store.session(sessionName)
        store.observe(session, 1, "No GPS", null)
        store.observe(session, 2, "With GPS", Fix(40.0, -3.0, 8.0, Instant.parse("2026-10-25T16:00:00Z")))
        store.close()
        RadioStore(context).use { reopened ->
            store = reopened
            assertTrue(store.contacts().any { it.id == contact.id })
            store.save(contact.copy(notes = "Updated"), replaceExisting = true)
            assertEquals("Updated", store.contacts().first { it.id == contact.id }.notes)
            assertTrue(store.sessions().contains(session to sessionName))
            assertEquals("Baliza 1: 1 observaciones\nBaliza 2: 1 observaciones", store.observationCounts(session))
            val exported = JSONObject(store.export())
            assertEquals("bricohams-android-field-data", exported.getString("format"))
            val observations = exported.getJSONArray("observations")
            val own = (0 until observations.length()).map { observations.getJSONObject(it) }
                .filter { it.getString("session") == session }
            assertEquals(2, own.size)
            assertTrue(own.first { it.getInt("fox") == 1 }.isNull("latitude"))
            val located = own.first { it.getInt("fox") == 2 }
            assertEquals(40.0, located.getDouble("latitude"), 0.0)
            assertEquals(-3.0, located.getDouble("longitude"), 0.0)
            assertEquals(8.0, located.getDouble("accuracy"), 0.0)
            assertEquals("2026-10-25T16:00:00Z", located.getString("fix_utc"))
            assertTrue(Adif.export(store.contacts()).contains("<CALL:7>EA1TEST"))
        }
    }

    @Test fun editDeleteAndJsonRestoreSurviveDatabaseReopen() {
        val first = Contact(call = "EA5KAO", utc = Instant.parse("2026-10-26T12:00:00Z"),
            frequencyMHz = "145.500", mode = "FM", sent = "59", received = "57", notes = "Murcia \u00f1")
        val second = first.copy(id = UUID.randomUUID().toString(), call = "EA5JEF", notes = "Keep")
        RadioStore(context).use { store ->
            store.save(first); store.save(second)
        }
        val snapshot = RadioStore(context).use { store ->
            assertEquals(2, store.contacts().size)
            store.save(first.copy(notes = "Edited \u00f1"), replaceExisting = true)
            assertEquals(2, store.contacts().size)
            assertEquals("Edited \u00f1", store.contacts().single { it.id == first.id }.notes)
            store.export()
        }
        RadioStore(context).use { store ->
            store.deleteContact(first.id)
            assertEquals(listOf(second), store.contacts())
        }
        RadioStore(context).use { store ->
            assertEquals(listOf(second), store.contacts())
            assertThrows(IllegalStateException::class.java) { store.deleteContact(first.id) }
            assertEquals(1, store.importSnapshot(snapshot))
            assertEquals(0, store.importSnapshot(snapshot))
        }
        RadioStore(context).use { store ->
            assertEquals(setOf(first.id, second.id), store.contacts().map { it.id }.toSet())
            assertEquals("Edited \u00f1", store.contacts().single { it.id == first.id }.notes)
        }
    }

    @Test fun invalidImportDoesNotPersistEarlierValidContact() {
        val existing = Contact(call = "EA5KAO", utc = Instant.parse("2026-10-26T12:00:00Z"),
            frequencyMHz = "145.500", mode = "FM", sent = "59", received = "59", notes = "Existing")
        RadioStore(context).use { store -> store.save(existing) }
        RadioStore(context).use { store ->
            val valid = existing.copy(id = UUID.randomUUID().toString(), call = "EA5JEF")
            val invalid = valid.copy(id = UUID.randomUUID().toString(), call = "")
            assertThrows(IllegalArgumentException::class.java) { store.importAdif(listOf(valid, invalid)) }
        }
        RadioStore(context).use { store -> assertEquals(listOf(existing), store.contacts()) }
    }
}
