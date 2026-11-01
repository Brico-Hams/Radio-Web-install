package org.bricohams.radio

import java.io.IOException

/** Records every write and queues whatever [respond] returns for it; reads fail at once when too little is queued. */
internal class ScriptedRadio(private val respond: (ByteArray) -> ByteArray = { ByteArray(0) }) : RadioBytes {
    val writes = ArrayList<ByteArray>()
    private val buffer = ArrayDeque<Byte>()
    override fun write(bytes: ByteArray, timeoutMs: Int) {
        writes.add(bytes)
        respond(bytes).forEach(buffer::add)
    }
    override fun read(length: Int, timeoutMs: Int): ByteArray {
        if (buffer.size < length) throw IOException("Mock timeout")
        return ByteArray(length) { buffer.removeFirst() }
    }
    override fun close() = Unit
}

internal fun bytes(vararg values: Int) = ByteArray(values.size) { values[it].toByte() }
internal fun ascii(text: String) = text.toByteArray(Charsets.US_ASCII)
