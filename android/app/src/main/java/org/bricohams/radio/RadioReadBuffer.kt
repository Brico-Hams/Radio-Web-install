package org.bricohams.radio

import java.io.IOException
import java.util.ArrayDeque

internal class RadioReadBuffer {
    private val bytes = ArrayDeque<Byte>()
    fun clear() = bytes.clear()
    fun read(length: Int, timeoutMs: Int, packet: (Int) -> ByteArray): ByteArray {
        require(length in 1..1024 && timeoutMs > 0)
        val deadline = System.nanoTime() / 1_000_000 + timeoutMs
        while (bytes.size < length) {
            val left = deadline - System.nanoTime() / 1_000_000
            if (left <= 0) throw IOException("Tiempo agotado leyendo USB.")
            val chunk = packet(left.toInt())
            if (chunk.isEmpty()) throw IOException("USB sin datos: timeout o desconexion.")
            chunk.forEach(bytes::add)
        }
        return ByteArray(length) { bytes.removeFirst() }
    }
}
