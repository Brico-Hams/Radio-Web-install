package org.bricohams.radio

import android.content.ContentValues
import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import org.json.JSONArray
import org.json.JSONObject
import org.json.JSONException
import java.time.Instant
import java.time.format.DateTimeFormatterBuilder
import java.util.UUID

class RadioStore(context: Context) : SQLiteOpenHelper(context, "bricohams.db", null, 2), java.io.Closeable {
    private val orderedUtc = DateTimeFormatterBuilder().appendInstant(9).toFormatter()
    override fun close() = super.close()
    private fun createLogbooks(db: SQLiteDatabase) {
        db.execSQL("""CREATE TABLE logbooks (id TEXT PRIMARY KEY, name TEXT NOT NULL, kind TEXT NOT NULL,
            reference TEXT NOT NULL, station_call TEXT NOT NULL, created TEXT NOT NULL)""")
        // Fixed values so the default logbook compares equal across devices when JSON copies are merged.
        db.insertOrThrow("logbooks", null, ContentValues().apply {
            put("id", Logbook.GENERAL); put("name", "General"); put("kind", "GENERAL"); put("reference", "")
            put("station_call", ""); put("created", orderedUtc.format(Instant.EPOCH))
        })
    }
    private fun createContacts(db: SQLiteDatabase, table: String) =
        db.execSQL("""CREATE TABLE $table (id TEXT PRIMARY KEY, call TEXT NOT NULL, utc TEXT NOT NULL,
            frequency TEXT NOT NULL, mode TEXT NOT NULL, sent TEXT NOT NULL, received TEXT NOT NULL, notes TEXT NOT NULL,
            logbook TEXT NOT NULL REFERENCES logbooks(id))""")
    override fun onCreate(db: SQLiteDatabase) {
        createLogbooks(db)
        createContacts(db, "contacts")
        db.execSQL("CREATE TABLE sessions (id TEXT PRIMARY KEY, name TEXT NOT NULL, started TEXT NOT NULL)")
        db.execSQL("""CREATE TABLE observations (id TEXT PRIMARY KEY, session TEXT NOT NULL REFERENCES sessions(id),
            fox INTEGER NOT NULL, utc TEXT NOT NULL, notes TEXT NOT NULL, latitude REAL, longitude REAL,
            accuracy REAL, fix_utc TEXT)""")
    }
    override fun onConfigure(db: SQLiteDatabase) {
        db.setForeignKeyConstraintsEnabled(true)
        // Runs before onUpgrade's transaction: copy the untouched v1 file so a failed or unwanted migration is recoverable.
        if (db.version == 1) {
            val busy = db.rawQuery("PRAGMA wal_checkpoint(TRUNCATE)", null).use { it.moveToFirst() && it.getInt(0) != 0 }
            check(!busy) { "Base de datos ocupada; no se pudo respaldar antes de migrar." }
            val source = java.io.File(db.path)
            val backup = source.resolveSibling("bricohams-v1-backup.db")
            // An existing backup comes from an earlier attempt whose migration rolled back: it already holds this v1 data.
            if (!backup.exists()) {
                val partial = source.resolveSibling("bricohams-v1-backup.db.tmp")
                source.copyTo(partial, overwrite = true)
                check(partial.length() == source.length() && partial.renameTo(backup)) { "Respaldo previo a la migracion incompleto." }
            }
        }
    }
    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) {
        check(oldVersion == 1 && newVersion == 2) { "Migracion de base de datos no definida: $oldVersion -> $newVersion" }
        // SQLiteOpenHelper wraps this in one transaction: any failure leaves the v1 schema and rows intact.
        createLogbooks(db)
        createContacts(db, "contacts_v2")
        db.execSQL("""INSERT INTO contacts_v2 SELECT id, call, utc, frequency, mode, sent, received, notes, '${Logbook.GENERAL}'
            FROM contacts""")
        db.execSQL("DROP TABLE contacts")
        db.execSQL("ALTER TABLE contacts_v2 RENAME TO contacts")
    }
    fun createLogbook(logbook: Logbook): Logbook {
        logbook.validated()
        writableDatabase.insertOrThrow("logbooks", null, ContentValues().apply {
            put("id", logbook.id); put("name", logbook.name); put("kind", logbook.kind); put("reference", logbook.reference)
            put("station_call", logbook.stationCall); put("created", orderedUtc.format(Instant.now()))
        })
        return logbook
    }
    fun logbooks(): List<Logbook> =
        readableDatabase.rawQuery("SELECT id, name, kind, reference, station_call FROM logbooks ORDER BY created, rowid", null).use { cursor ->
            buildList {
                while (cursor.moveToNext()) add(Logbook(cursor.getString(0), cursor.getString(1), cursor.getString(2),
                    cursor.getString(3), cursor.getString(4)))
            }
        }
    fun save(contact: Contact, replaceExisting: Boolean = false) {
        contact.validated()
        val values = ContentValues().apply {
            put("id", contact.id); put("call", contact.call); put("utc", orderedUtc.format(contact.utc))
            put("frequency", contact.frequencyMHz); put("mode", contact.mode)
            put("sent", contact.sent); put("received", contact.received); put("notes", contact.notes)
            put("logbook", contact.logbook)
        }
        if (replaceExisting) {
            check(writableDatabase.update("contacts", values, "id = ?", arrayOf(contact.id)) == 1) {
                "El contacto a editar ya no existe."
            }
        } else writableDatabase.insertOrThrow("contacts", null, values)
    }
    fun deleteContact(id: String) {
        check(writableDatabase.delete("contacts", "id = ?", arrayOf(id)) == 1) { "El contacto ya no existe." }
    }
    fun importAdif(contacts: List<Contact>): Pair<Int, Int> {
        require(contacts.size in 1..50000) { "Importacion ADIF: entre 1 y 50000 contactos." }
        fun key(contact: Contact) = listOf(contact.call, contact.utc.toString(), contact.frequencyMHz.toBigDecimal().stripTrailingZeros().toPlainString(),
            contact.mode, contact.sent, contact.received, contact.notes, contact.logbook)
        val db = writableDatabase
        db.beginTransaction()
        try {
            contacts.forEach { it.validated() }
            val existing = this.contacts().map(::key).toHashSet()
            var inserted = 0
            for (contact in contacts) {
                if (existing.add(key(contact))) {
                    save(contact.copy(id = UUID.randomUUID().toString()))
                    inserted++
                }
            }
            db.setTransactionSuccessful()
            return inserted to (contacts.size - inserted)
        } finally {
            db.endTransaction()
        }
    }
    fun contacts(logbook: String? = null): List<Contact> = readableDatabase.rawQuery(
        "SELECT id, call, utc, frequency, mode, sent, received, notes, logbook FROM contacts" +
            (if (logbook == null) "" else " WHERE logbook = ?") + " ORDER BY utc DESC", logbook?.let { arrayOf(it) }).use { cursor ->
        buildList {
            while (cursor.moveToNext()) add(Contact(
                cursor.getString(0), cursor.getString(1), Instant.parse(cursor.getString(2)), cursor.getString(3),
                cursor.getString(4), cursor.getString(5), cursor.getString(6), cursor.getString(7), cursor.getString(8)
            ))
        }
    }
    fun session(name: String): String {
        require(name.isNotBlank() && name.length <= 120) { "Nombre de sesion requerido (maximo 120 caracteres)." }
        val id = UUID.randomUUID().toString()
        writableDatabase.insertOrThrow("sessions", null, ContentValues().apply {
            put("id", id); put("name", name); put("started", orderedUtc.format(Instant.now()))
        })
        return id
    }
    fun sessions(): List<Pair<String, String>> =
        readableDatabase.rawQuery("SELECT id, name FROM sessions ORDER BY started DESC", null).use { cursor ->
            buildList { while (cursor.moveToNext()) add(cursor.getString(0) to cursor.getString(1)) }
        }
    fun observe(session: String, fox: Int, notes: String, fix: Fix?) {
        require(fox in 1..10 && notes.length <= 2000) { "Baliza 1-10; notas de hasta 2000 caracteres." }
        fix?.validated()
        writableDatabase.insertOrThrow("observations", null, ContentValues().apply {
            put("id", UUID.randomUUID().toString()); put("session", session); put("fox", fox)
            put("utc", Instant.now().toString()); put("notes", notes)
            if (fix != null) {
                put("latitude", fix.latitude); put("longitude", fix.longitude)
                put("accuracy", fix.accuracyMeters); put("fix_utc", fix.utc.toString())
            }
        })
    }
    fun observationCounts(session: String): String =
        readableDatabase.rawQuery("SELECT fox, COUNT(*) FROM observations WHERE session = ? GROUP BY fox ORDER BY fox",
            arrayOf(session)).use { cursor ->
            buildList { while (cursor.moveToNext()) add("Baliza ${cursor.getInt(0)}: ${cursor.getInt(1)} observaciones") }
                .joinToString("\n").ifEmpty { "Sin observaciones." }
        }
    fun observations(session: String): List<ArdfObservation> {
        require(sessions().any { it.first == session }) { "La sesion ARDF no existe." }
        return readableDatabase.rawQuery(
            "SELECT id, fox, utc, notes, latitude, longitude, accuracy, fix_utc FROM observations WHERE session = ?",
            arrayOf(session)).use { cursor ->
            buildList {
                while (cursor.moveToNext()) {
                    val fix = if (cursor.isNull(4)) null else Fix(cursor.getDouble(4), cursor.getDouble(5),
                        cursor.getDouble(6), Instant.parse(cursor.getString(7))).validated()
                    add(ArdfObservation(cursor.getString(0), cursor.getInt(1), Instant.parse(cursor.getString(2)),
                        cursor.getString(3), fix))
                }
            }.sortedWith(compareBy<ArdfObservation> { it.utc }.thenBy { it.id })
        }
    }
    private fun rows(table: String): JSONArray {
        require(table in setOf("logbooks", "contacts", "sessions", "observations"))
        return readableDatabase.rawQuery("SELECT * FROM $table ORDER BY rowid", null).use { cursor ->
            JSONArray().apply {
                while (cursor.moveToNext()) put(JSONObject().apply {
                    for (index in 0 until cursor.columnCount) {
                        val value: Any = when (cursor.getType(index)) {
                            android.database.Cursor.FIELD_TYPE_NULL -> JSONObject.NULL
                            android.database.Cursor.FIELD_TYPE_INTEGER -> cursor.getLong(index)
                            android.database.Cursor.FIELD_TYPE_FLOAT -> cursor.getDouble(index)
                            else -> cursor.getString(index)
                        }
                        put(cursor.getColumnName(index), value)
                    }
                })
            }
        }
    }
    fun export(): String {
        val db = readableDatabase
        db.beginTransactionNonExclusive()
        try {
            val result = JSONObject().apply {
                put("format", "bricohams-android-field-data"); put("version", 2)
                put("exportedAt", Instant.now().toString())
                put("warning", "Manual observations; phone positions are not beacon locations. Contains personal location data.")
                put("logbooks", rows("logbooks")); put("contacts", rows("contacts")); put("sessions", rows("sessions")); put("observations", rows("observations"))
            }.toString(2)
            db.setTransactionSuccessful()
            return result
        } finally {
            db.endTransaction()
        }
    }

    fun importSnapshot(text: String): Int {
        require(text.length <= 16 * 1024 * 1024) { "El JSON supera 16 MiB." }
        val snapshot = try {
            JSONObject(text)
        } catch (error: JSONException) {
            throw IllegalArgumentException("JSON invalido: ${error.message}", error)
        }
        val db = writableDatabase
        db.beginTransaction()
        try {
            val version = snapshot.get("version")
            require(snapshot.getString("format") == "bricohams-android-field-data" && (version == 1 || version == 2)) {
                "Formato de copia no admitido; usa JSON exportado por Bricohams Android version 1 o 2."
            }
            var inserted = 0
            // Version 1 copies predate logbooks: their contacts go to the default General logbook.
            for (table in listOf("logbooks", "contacts", "sessions", "observations").drop(if (version == 1) 1 else 0)) {
                val rows = snapshot.getJSONArray(table)
                require(rows.length() <= 50000) { "Demasiados registros en $table (maximo 50000)." }
                val seen = HashSet<String>()
                for (index in 0 until rows.length()) {
                    val row = rows.getJSONObject(index)
                    val id = row.getString("id")
                    require(id.matches(Regex("[A-Za-z0-9-]{1,64}")) && seen.add(id)) { "ID invalido o duplicado en $table." }
                    val columns = when (table) {
                        "logbooks" -> setOf("id", "name", "kind", "reference", "station_call", "created")
                        "contacts" -> setOf("id", "call", "utc", "frequency", "mode", "sent", "received", "notes") +
                            (if (version == 1) emptySet() else setOf("logbook"))
                        "sessions" -> setOf("id", "name", "started")
                        else -> setOf("id", "session", "fox", "utc", "notes", "latitude", "longitude", "accuracy", "fix_utc")
                    }
                    require(row.keys().asSequence().toSet() == columns) { "Campos inesperados o ausentes en $table." }
                    val values = ContentValues()
                    when (table) {
                        "logbooks" -> {
                            Logbook(id, row.getString("name"), row.getString("kind"), row.getString("reference"),
                                row.getString("station_call")).validated()
                            columns.forEach { values.put(it, row.getString(it)) }
                            values.put("created", orderedUtc.format(Instant.parse(row.getString("created"))))
                        }
                        "contacts" -> {
                            val logbook = if (version == 1) Logbook.GENERAL else row.getString("logbook")
                            Contact(id, row.getString("call"), Instant.parse(row.getString("utc")), row.getString("frequency"),
                                row.getString("mode"), row.getString("sent"), row.getString("received"), row.getString("notes"),
                                logbook).validated()
                            columns.forEach { values.put(it, row.getString(it)) }
                            values.put("utc", orderedUtc.format(Instant.parse(row.getString("utc"))))
                            values.put("logbook", logbook)
                        }
                        "sessions" -> {
                            require(row.getString("name").isNotBlank() && row.getString("name").length <= 120) { "Nombre de sesion invalido." }
                            Instant.parse(row.getString("started"))
                            columns.forEach { values.put(it, row.getString(it)) }
                            values.put("started", orderedUtc.format(Instant.parse(row.getString("started"))))
                        }
                        else -> {
                            val fox = row.get("fox")
                            require(fox is Int && fox in 1..10 && row.getString("notes").length <= 2000) { "Observacion invalida." }
                            Instant.parse(row.getString("utc"))
                            val gpsColumns = listOf("latitude", "longitude", "accuracy", "fix_utc")
                            val nullGps = gpsColumns.count(row::isNull)
                            require(nullGps == 0 || nullGps == 4) { "Coordenadas incompletas." }
                            for (column in listOf("id", "session", "utc", "notes")) values.put(column, row.getString(column))
                            values.put("fox", fox)
                            if (nullGps == 0) {
                                require(listOf("latitude", "longitude", "accuracy").all { row.get(it) is Number }) { "Coordenadas no numericas." }
                                Fix(row.getDouble("latitude"), row.getDouble("longitude"), row.getDouble("accuracy"),
                                    Instant.parse(row.getString("fix_utc"))).validated()
                                for (column in listOf("latitude", "longitude", "accuracy")) values.put(column, row.getDouble(column))
                                values.put("fix_utc", row.getString("fix_utc"))
                            } else gpsColumns.forEach(values::putNull)
                        }
                    }
                    val existing = db.query(table, null, "id = ?", arrayOf(id), null, null, null).use { cursor ->
                        if (!cursor.moveToFirst()) null
                        else values.keySet().associateWith { column ->
                            val position = cursor.getColumnIndexOrThrow(column)
                            // getString() renders REAL with %g ("40", 6 digits); compare the exact double as ContentValues does.
                            when (cursor.getType(position)) {
                                android.database.Cursor.FIELD_TYPE_NULL -> null
                                android.database.Cursor.FIELD_TYPE_FLOAT -> cursor.getDouble(position).toString()
                                else -> cursor.getString(position)
                            }
                        }
                    }
                    if (existing == null) {
                        db.insertOrThrow(table, null, values)
                        inserted++
                    } else {
                        require(values.keySet().all { existing[it] == values.getAsString(it) }) {
                            "Conflicto de ID en $table: $id. No se sobrescriben registros existentes."
                        }
                    }
                }
            }
            db.setTransactionSuccessful()
            return inserted
        } catch (error: JSONException) {
            throw IllegalArgumentException("Copia JSON incompleta o de tipo incorrecto: ${error.message}", error)
        } catch (error: java.time.format.DateTimeParseException) {
            throw IllegalArgumentException("Fecha invalida en copia: ${error.parsedString}", error)
        } finally {
            db.endTransaction()
        }
    }
}
