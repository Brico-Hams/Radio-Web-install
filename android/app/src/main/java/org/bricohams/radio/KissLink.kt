package org.bricohams.radio

import java.io.IOException
import java.net.InetSocketAddress
import java.net.Socket
import java.net.SocketTimeoutException

/** AX.25 size limits a link enforces before anything is sent. */
data class Ax25Limits(val maxFrameBytes: Int, val maxDigipeaters: Int, val maxInfoBytes: Int) {
    fun check(frame: Ax25Frame): ByteArray {
        val bytes = frame.encode()
        requireUi(bytes.size <= maxFrameBytes && frame.digipeaters.size <= maxDigipeaters && frame.info.size <= maxInfoBytes) {
            UiText(R.string.err_aprs_limits, maxFrameBytes, maxDigipeaters, maxInfoBytes)
        }
        return bytes
    }

    companion object {
        /** Aprs.kt already caps the path at 8 digipeaters; no other limit is recorded in the repo for a generic TNC. */
        val GENERIC = Ax25Limits(Int.MAX_VALUE, 8, Int.MAX_VALUE)
        /** erkanz/radtel-RT950PRO@51c84d4 README: 182 bytes AX.25, 6 digipeaters, 127 bytes of info. */
        val RT950 = Ax25Limits(182, 6, 127)
    }
}

/**
 * A KISS TNC reachable from the phone. [send] takes one AX.25 frame and writes it KISS-framed; [onFrame] receives the AX.25
 * payload of every KISS data frame (port/type byte stripped). Callbacks may arrive on any thread.
 */
interface KissLink {
    var onFrame: ((ByteArray) -> Unit)?
    /** Called once when the link drops without [close] having been requested. */
    var onClosed: (() -> Unit)?
    val limits: Ax25Limits
    /** Extra transmission warning for this link (string resource), shown before every send. */
    val txNote: Int
    fun send(ax25: ByteArray)
    fun close()
}

/** RT-950 Pro BLE KISS (ffe1): the writer and the notification feed come from [BleRt950Transport]. */
class Rt950BleKissLink(private val write: (ByteArray) -> Unit, private val closeLink: () -> Unit) : KissLink {
    private val decoder = KissDecoder()
    @Volatile override var onFrame: ((ByteArray) -> Unit)? = null
    @Volatile override var onClosed: (() -> Unit)? = null
    override val limits = Ax25Limits.RT950
    override val txNote = R.string.aprs_tx_note_rt950

    /** Feed raw ffe1 notification chunks. */
    fun onChunk(bytes: ByteArray) {
        decoder.feed(bytes).filter { it.type == 0 }.forEach { onFrame?.invoke(it.payload) }
    }

    /** A clone session may leave a half frame behind. */
    fun resetDecoder() = decoder.reset()

    override fun send(ax25: ByteArray) = write(Kiss.data(ax25))

    override fun close() {
        onFrame = null
        closeLink()
    }

    companion object {
        fun over(transport: BleRt950Transport) = Rt950BleKissLink({ transport.write(it, 5000) }, { transport.close() }).also {
            transport.kissListener = it::onChunk
        }
    }
}

/** KISS over a plain TCP socket to an external TNC (Direwolf, a TNC bridge). The TNC, not RadiCodex, owns the radio. */
class TcpKissLink private constructor(private val socket: Socket) : KissLink {
    private val decoder = KissDecoder()
    private val out = socket.getOutputStream()
    @Volatile private var closing = false
    @Volatile override var onFrame: ((ByteArray) -> Unit)? = null
    @Volatile override var onClosed: (() -> Unit)? = null
    override val limits = Ax25Limits.GENERIC
    override val txNote = R.string.aprs_tx_note_tcp

    private fun startReader() {
        Thread({
            val buffer = ByteArray(1024)
            try {
                val input = socket.getInputStream()
                while (!closing) {
                    val count = try { input.read(buffer) } catch (_: SocketTimeoutException) { continue }
                    if (count < 0) break
                    decoder.feed(buffer.copyOf(count)).filter { it.type == 0 }.forEach { onFrame?.invoke(it.payload) }
                }
            } catch (_: IOException) {
            } finally {
                val notify = !closing
                closing = true
                try { socket.close() } catch (_: IOException) {}
                if (notify) onClosed?.invoke()
            }
        }, "kiss-tcp").apply { isDaemon = true; start() }
    }

    @Synchronized
    override fun send(ax25: ByteArray) {
        if (closing) throw LocalizedIOException(UiText(R.string.err_aprs_tcp_closed))
        try {
            out.write(Kiss.data(ax25))
            out.flush()
        } catch (error: IOException) {
            throw LocalizedIOException(UiText(R.string.err_aprs_tcp_closed), error)
        }
    }

    override fun close() {
        closing = true
        onFrame = null
        try { socket.close() } catch (_: IOException) {}
    }

    companion object {
        const val CONNECT_TIMEOUT_MS = 5000
        const val READ_TIMEOUT_MS = 500

        fun parsePort(text: String): Int {
            val port = text.trim().toIntOrNull()
            requireUi(port != null && port in 1..65535) { UiText(R.string.err_aprs_tcp_port) }
            return port
        }

        /** Blocks up to [CONNECT_TIMEOUT_MS]; call from a worker thread. */
        fun connect(host: String, port: Int): TcpKissLink {
            val name = host.trim()
            requireUi(name.isNotEmpty() && name.none { it.isWhitespace() }) { UiText(R.string.err_aprs_tcp_host) }
            requireUi(port in 1..65535) { UiText(R.string.err_aprs_tcp_port) }
            val socket = Socket()
            try {
                socket.tcpNoDelay = true
                socket.soTimeout = READ_TIMEOUT_MS
                socket.connect(InetSocketAddress(name, port), CONNECT_TIMEOUT_MS)
            } catch (error: IOException) {
                try { socket.close() } catch (_: IOException) {}
                throw LocalizedIOException(UiText(R.string.err_aprs_tcp_connect, "$name:$port"), error)
            }
            return TcpKissLink(socket).also { it.startReader() }
        }
    }
}
