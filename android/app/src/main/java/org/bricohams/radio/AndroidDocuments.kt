package org.bricohams.radio

import android.content.ContentResolver
import android.net.Uri
import java.io.ByteArrayOutputStream

internal fun ContentResolver.readDocument(uri: Uri, limit: Int): ByteArray {
    require(limit > 0)
    val stream = openInputStream(uri) ?: throw LocalizedIOException(UiText(R.string.err_provider_no_read_stream))
    return stream.use { input ->
        val buffer = ByteArray(8192)
        val output = ByteArrayOutputStream()
        while (true) {
            val count = input.read(buffer)
            if (count < 0) break
            requireUi(output.size() + count <= limit) { UiText(R.string.err_file_too_large, limit / (1024 * 1024)) }
            output.write(buffer, 0, count)
        }
        output.toByteArray()
    }
}
