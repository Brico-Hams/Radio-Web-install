package org.bricohams.radio

import android.content.Context
import android.database.sqlite.SQLiteException
import android.database.sqlite.SQLiteOpenHelper
import android.database.sqlite.SQLiteDatabase
import android.content.ContentValues
import android.util.Log
import org.json.JSONObject
import org.json.JSONArray
import org.json.JSONException
import java.io.IOException
import java.net.SocketTimeoutException
import java.net.URL
import java.util.concurrent.ArrayBlockingQueue
import java.util.concurrent.ThreadPoolExecutor
import java.util.concurrent.TimeUnit
import java.util.concurrent.Executors
import java.util.concurrent.RejectedExecutionException
import javax.net.ssl.HttpsURLConnection
import javax.net.ssl.SSLException

object AnonymousDiagnostics {
    private val versionFormat = Regex("\\d{1,4}\\.\\d{1,4}\\.\\d{1,4}")
    private lateinit var component: String
    private lateinit var version: String
    private lateinit var database: SQLiteOpenHelper
    private lateinit var contract: JSONObject
    private var owner: Context? = null
    @Volatile private var target: Target? = null
    @Volatile var foreground = false
    @Volatile var lastFailure = false
        private set
    private var generation = 0L
    private var sentGeneration = 0L
    private var nextUpload = 0L
    private var retryDelay = 60000L
    private data class Target(val origin: String, val token: String)
    private val worker = ThreadPoolExecutor(
        1, 1, 0, TimeUnit.SECONDS, ArrayBlockingQueue(128),
        { task -> Thread(task, "anonymous-diagnostics").apply { isDaemon = true } },
        ThreadPoolExecutor.AbortPolicy()
    )
    private val timer = Executors.newSingleThreadScheduledExecutor { task ->
        Thread(task, "diagnostic-schedule").apply { isDaemon = true }
    }
    private var scheduled = false

    private fun enqueue(onFailure: (Throwable) -> Unit = {}, task: () -> Unit) {
        try { worker.execute(task) }
        catch (error: RejectedExecutionException) {
            lastFailure = true
            Log.w("RadiCodexDiagnostics", "Diagnostic queue full; operation not retained")
            onFailure(error)
        }
    }

    @Synchronized fun initialize(context: Context, component: String, version: String) {
        val application = context.applicationContext
        if (owner === application) {
            require(this.component == component && this.version == version) {
                "Diagnostic identity cannot change within an application"
            }
            return
        }
        val definition = JSONObject(context.assets.open("diagnostic-contract.json").bufferedReader().use { it.readText() })
        require(component in values("components", definition) && version.matches(versionFormat)) {
            "Invalid diagnostic component or version"
        }
        val previous = if (::database.isInitialized) database else null
        owner = application
        this.component = component
        this.version = version
        target = null
        contract = definition
        database = object : SQLiteOpenHelper(context.applicationContext, "anonymous-diagnostics.sqlite3", null, 1) {
            override fun onCreate(db: SQLiteDatabase) {
                db.execSQL("CREATE TABLE events(created INTEGER NOT NULL, payload TEXT NOT NULL)")
            }
            override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) {
                throw SQLiteException("Unsupported diagnostic database version")
            }
            override fun onConfigure(db: SQLiteDatabase) {
                db.rawQuery("PRAGMA max_page_count=2048", null).use { it.moveToFirst() }
            }
        }
        if (previous != null) enqueue { previous.close() }
        if (!scheduled) {
            scheduled = true
            timer.scheduleAtFixedRate({
                if (foreground && target != null) enqueue {
                    if (System.currentTimeMillis() >= nextUpload) {
                        try { upload() }
                        catch (_: IOException) {
                            lastFailure = true
                            Log.e("RadiCodexDiagnostics", "Diagnostic HTTPS retry failed")
                        } catch (_: SQLiteException) {
                            lastFailure = true
                            Log.e("RadiCodexDiagnostics", "Diagnostic retry store read failed")
                        } catch (_: JSONException) {
                            lastFailure = true
                            Log.e("RadiCodexDiagnostics", "Diagnostic stored payload invalid")
                        }
                    }
                }
            }, 60, 60, TimeUnit.SECONDS)
        }
        record("started", "native", "info")
    }

    private fun values(name: String, definition: JSONObject = contract): Set<String> = definition.getJSONArray(name).let { array ->
        (0 until array.length()).map { array.getString(it) }.toSet()
    }

    fun validReport(value: JSONObject): Boolean {
        if (value.keys().asSequence().toSet() != values("report_fields") ||
            value.opt("schema_version") != 1 ||
            value.opt("component") !in values("components") ||
            value.opt("platform") !in values("platforms") ||
            (value.opt("version") as? String)?.matches(versionFormat) != true
        ) return false
        val events = value.optJSONArray("events") ?: return false
        if (events.length() !in 1..contract.getInt("max_events")) return false
        for (index in 0 until events.length()) {
            val event = events.optJSONObject(index) ?: return false
            if (event.keys().asSequence().toSet() != values("event_fields") ||
                event.opt("code") !in values("codes") || event.opt("source") !in values("sources") ||
                event.opt("severity") !in values("severities") || event.opt("error_type") !in values("error_types")
            ) return false
            val line = event.opt("line") as? Int ?: return false
            if (line !in 0..100000) return false
        }
        return value.toString().toByteArray(Charsets.UTF_8).size <= contract.getInt("max_report_bytes")
    }

    private fun envelope(events: JSONArray): JSONObject = JSONObject()
        .put("schema_version", 1).put("component", component).put("platform", "android")
        .put("version", version).put("events", events)

    private fun category(error: Throwable?): String = when (error) {
        null -> "none"
        is SSLException -> "tls"
        is SocketTimeoutException -> "timeout"
        is SecurityException -> "permission"
        is IllegalArgumentException -> "input"
        is IOException -> "io"
        else -> "exception"
    }

    fun record(code: String, source: String, severity: String, error: Throwable? = null) {
        if (!::database.isInitialized) {
            Log.w("RadiCodexDiagnostics", "Diagnostic logger not initialized")
            return
        }
        val line = error?.stackTrace?.firstOrNull { it.className.startsWith("org.bricohams.") }
            ?.lineNumber?.coerceIn(0, 100000) ?: 0
        val event = JSONObject().put("code", code).put("source", source).put("severity", severity)
            .put("error_type", category(error)).put("line", line)
        val report = envelope(JSONArray().put(event))
        require(validReport(report)) { "Invalid diagnostic event" }
        val serialized = report.toString()
        val localDatabase = database
        enqueue {
            if (localDatabase !== database) return@enqueue
            try {
                val db = database.writableDatabase
                db.insertOrThrow("events", null, ContentValues().apply {
                    put("created", System.currentTimeMillis()); put("payload", serialized)
                })
                purge(db)
                generation++
                if (foreground && target != null && System.currentTimeMillis() >= nextUpload) upload()
            } catch (_: SQLiteException) {
                lastFailure = true
                Log.e("RadiCodexDiagnostics", "Diagnostic local storage failed")
            } catch (_: IOException) {
                lastFailure = true
                Log.e("RadiCodexDiagnostics", "Diagnostic HTTPS upload failed")
            } catch (_: JSONException) {
                lastFailure = true
                Log.e("RadiCodexDiagnostics", "Diagnostic stored payload invalid")
            }
        }
    }

    private fun purge(db: SQLiteDatabase) {
        db.delete("events", "created < ?", arrayOf(
            (System.currentTimeMillis() - contract.getLong("retention_seconds") * 1000).toString()
        ))
        db.execSQL("DELETE FROM events WHERE rowid NOT IN (SELECT rowid FROM events ORDER BY rowid DESC LIMIT 500)")
    }

    private fun report(): JSONObject? {
        val db = database.writableDatabase
        purge(db)
        val events = JSONArray()
        db.rawQuery("SELECT payload FROM events ORDER BY rowid DESC LIMIT 16", null).use { rows ->
            while (rows.moveToNext()) {
                val stored = JSONObject(rows.getString(0))
                if (!validReport(stored)) throw SQLiteException("Invalid stored technical report")
                if (stored.getString("version") == version && stored.getString("component") == component) {
                    events.put(stored.getJSONArray("events").getJSONObject(0))
                }
            }
        }
        return if (events.length() == 0) null else envelope(events)
    }

    fun inspect(callback: (Result<String?>) -> Unit) {
        enqueue(onFailure = { callback(Result.failure(it)) }) {
            try { callback(Result.success(report()?.toString(2))) }
            catch (error: SQLiteException) {
                lastFailure = true
                Log.e("RadiCodexDiagnostics", "Diagnostic local read failed")
                callback(Result.failure(error))
            } catch (error: JSONException) {
                lastFailure = true
                Log.e("RadiCodexDiagnostics", "Diagnostic stored payload invalid")
                callback(Result.failure(error))
            }
        }
    }

    fun enable(origin: String, token: String) {
        val normalized = RemoteStationUrl.parse(origin)
        require(token.length >= 32 && token.all { it.code in 33..126 }) { "Invalid diagnostic secret" }
        sentGeneration = 0
        nextUpload = 0
        retryDelay = 60000
        target = Target(normalized, token)
        record("started", "native", "info")
    }

    fun disable() { target = null }
    fun enabled(): Boolean = target != null
    fun clear(callback: (Result<Unit>) -> Unit) {
        disable()
        enqueue(onFailure = { callback(Result.failure(it)) }) {
            try {
                database.writableDatabase.delete("events", null, null)
                callback(Result.success(Unit))
            } catch (error: SQLiteException) {
                lastFailure = true
                Log.e("RadiCodexDiagnostics", "Diagnostic local clear failed")
                callback(Result.failure(error))
            }
        }
    }

    private fun upload() {
        val destination = target ?: return
        if (generation == sentGeneration) return
        val payload = report() ?: return
        if (target !== destination || !foreground) return
        val connection = URL(destination.origin + "api/v1/diagnostic-reports").openConnection() as HttpsURLConnection
        connection.instanceFollowRedirects = false
        connection.connectTimeout = 5000
        connection.readTimeout = 5000
        connection.requestMethod = "POST"
        connection.setRequestProperty("Content-Type", "application/json")
        connection.setRequestProperty("Authorization", "Bearer ${destination.token}")
        val bytes = payload.toString().toByteArray(Charsets.UTF_8)
        connection.setFixedLengthStreamingMode(bytes.size)
        connection.doOutput = true
        try {
            if (target !== destination || !foreground) return
            connection.outputStream.use { it.write(bytes) }
            if (connection.responseCode != 202) throw IOException("Diagnostic report rejected")
            val buffer = ByteArray(257)
            var length = 0
            connection.inputStream.use { input ->
                while (length < buffer.size) {
                    val read = input.read(buffer, length, buffer.size - length)
                    if (read < 0) break
                    length += read
                }
            }
            if (length > 256) throw IOException("Diagnostic acknowledgement too large")
            val ack = try { JSONObject(String(buffer, 0, length, Charsets.UTF_8)) }
                catch (error: JSONException) { throw IOException("Diagnostic acknowledgement invalid", error) }
            if (ack.length() != 1 || ack.opt("accepted") != true) throw IOException("Diagnostic acknowledgement invalid")
            sentGeneration = generation
            retryDelay = 60000
            lastFailure = false
        } catch (error: IOException) {
            retryDelay = (retryDelay * 2).coerceAtMost(600000)
            throw error
        } finally {
            nextUpload = System.currentTimeMillis() + retryDelay
            connection.disconnect()
        }
    }
}
