package org.bricohams.radio

import org.json.JSONArray
import org.json.JSONException
import org.json.JSONObject
import java.io.File

/** Persists a full RT-950 Pro backup (image plus manifest) and reloads it verifying the SHA-256 of the image and of every part. */
object Rt950BackupStore {
    class Saved(val manifest: File, val hash: String, val backup: Rt950Backup)

    fun write(root: File, backup: Rt950Backup, stamp: String): Saved {
        if (!root.isDirectory && !root.mkdirs()) throw LocalizedIOException(UiText(R.string.err_backup_folder))
        val image = backup.image()
        val hash = QuanshengBackups.sha256(image)
        val bin = File(root, "rt950pro-$stamp.bin")
        bin.writeBytes(image)
        val parts = JSONArray()
        for (part in backup.parts) {
            parts.put(JSONObject().put("name", part.name).put("cmd", part.cmd).put("address", part.address)
                .put("length", part.data.size).put("sha256", QuanshengBackups.sha256(part.data)))
        }
        val manifest = File(root, "rt950pro-$stamp.json")
        manifest.writeText(JSONObject().put("model", backup.model).put("createdAt", stamp)
            .put("size", image.size).put("sha256", hash).put("file", bin.name).put("parts", parts).toString(2))
        return Saved(manifest, hash, load(manifest))
    }

    class Entry(val manifest: File, val createdAt: String, val hash: String)

    /** Every saved manifest in [root], newest first; unreadable manifests are skipped (they fail on [load] anyway). */
    fun list(root: File): List<Entry> = (root.listFiles { f -> f.name.startsWith("rt950pro-") && f.name.endsWith(".json") } ?: emptyArray())
        .mapNotNull { file ->
            try {
                val json = JSONObject(file.readText())
                Entry(file, json.getString("createdAt"), json.getString("sha256"))
            } catch (_: JSONException) {
                null
            }
        }.sortedByDescending { it.createdAt }

    /** Throws [LocalizedIOException] when the image or any part does not match the manifest. */
    fun load(manifest: File): Rt950Backup {
        var name = manifest.name
        try {
            val json = JSONObject(manifest.readText())
            val bin = File(manifest.parentFile, json.getString("file"))
            name = bin.name
            val image = bin.readBytes()
            if (image.size != json.getInt("size") || QuanshengBackups.sha256(image) != json.getString("sha256")) corrupt(name)
            val list = json.getJSONArray("parts")
            var offset = 0
            val parts = (0 until list.length()).map { index ->
                val item = list.getJSONObject(index)
                val length = item.getInt("length")
                if (length < 0 || offset + length > image.size) corrupt(name)
                val data = image.copyOfRange(offset, offset + length)
                if (QuanshengBackups.sha256(data) != item.getString("sha256")) corrupt(name)
                offset += length
                Rt950Backup.Part(item.getString("name"), item.getInt("cmd"), item.getInt("address"), data)
            }
            if (offset != image.size) corrupt(name)
            return Rt950Backup(json.getString("model"), parts)
        } catch (error: JSONException) {
            throw LocalizedIOException(UiText(R.string.err_backup_copy_corrupt, name), error)
        }
    }

    private fun corrupt(name: String): Nothing = throw LocalizedIOException(UiText(R.string.err_backup_copy_corrupt, name))
}
