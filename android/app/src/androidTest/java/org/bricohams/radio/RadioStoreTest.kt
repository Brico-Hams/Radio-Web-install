package org.bricohams.radio

import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import org.json.JSONObject
import java.time.Instant

@RunWith(AndroidJUnit4::class)
class RadioStoreTest {
    @Test fun persistenceAndExports() {
        val context = InstrumentationRegistry.getInstrumentation().targetContext
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
        store = RadioStore(context)
        try {
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
        } finally {
            store.writableDatabase.delete("observations", "session = ?", arrayOf(session))
            store.writableDatabase.delete("sessions", "id = ?", arrayOf(session))
            store.deleteContact(contact.id)
            store.close()
        }
    }
}
