package org.bricohams.radio

import android.content.ContentResolver
import android.net.Uri
import java.io.ByteArrayOutputStream
import java.io.IOException

internal fun ContentResolver.readDocument(uri: Uri, limit: Int): ByteArray {
    require(limit > 0)
    val stream = openInputStream(uri) ?: throw IOException("Proveedor sin flujo de lectura.")
    return stream.use { input ->
        val buffer = ByteArray(8192)
        val output = ByteArrayOutputStream()
        while (true) {
            val count = input.read(buffer)
            if (count < 0) break
            require(output.size() + count <= limit) { "El archivo supera el limite de ${limit / (1024 * 1024)} MiB." }
            output.write(buffer, 0, count)
        }
        output.toByteArray()
    }
}
