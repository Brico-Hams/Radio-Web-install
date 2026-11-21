package org.bricohams.stationagent

import android.app.Application

import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import java.net.ProtocolException
import java.net.SocketTimeoutException
import java.nio.ByteBuffer
import org.java_websocket.WebSocket
import org.java_websocket.WebSocketImpl
import org.java_websocket.client.WebSocketClient
import org.java_websocket.enums.Role
import org.java_websocket.exceptions.InvalidDataException
import org.java_websocket.exceptions.InvalidHandshakeException
import org.java_websocket.exceptions.LimitExceededException
import org.java_websocket.framing.ContinuousFrame
import org.java_websocket.framing.PingFrame
import org.java_websocket.framing.TextFrame
import org.java_websocket.handshake.ServerHandshake
import java.net.URI

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [35], application = Application::class)
class ReadonlyAgentTest {
    private class Bytes(vararg replies: String) : CatBytes {
        val written = mutableListOf<String>()
        val replies = ArrayDeque(replies.toList())
        override fun write(bytes: ByteArray, timeout: Int) { written.add(bytes.toString(Charsets.US_ASCII)) }
        override fun read(bytes: ByteArray, timeout: Int): Int {
            val reply = replies.removeFirstOrNull() ?: throw SocketTimeoutException()
            val data = reply.toByteArray(Charsets.US_ASCII)
            data.copyInto(bytes)
            return data.size
        }
    }

    @Test fun readsFragmentedFramesAfterIdentityWithoutControlWrites() {
        val bytes = Bytes("ID", "0840;", "FA014", "200000;")
        assertEquals("FA014200000;", ReadonlyCat(bytes).read("FA"))
        assertEquals(listOf("ID;", "FA;"), bytes.written)
    }

    @Test fun unsolicitedFramesAreDiscardedAndOnlyTheAskedReplyIsAccepted() {
        val bytes = Bytes("ID0840;", "FB014200000;FA014200000;")
        assertEquals("FA014200000;", ReadonlyCat(bytes).read("FA"))
        assertThrows(SocketTimeoutException::class.java) { ReadonlyCat(Bytes("FB014200000;")).identify() }
    }

    @Test fun disallowedWellFormedQueryIsRejectedWithItsIdSoTheLinkStaysUp() {
        val id = "a".repeat(32)
        val rejected = assertThrows(RejectedQueryException::class.java) {
            AgentProtocol.parse("""{"type":"query","id":"$id","command":"TX1"}""")
        }
        assertEquals(id, rejected.queryId)
    }

    @Test fun wrongIdentityAndSettersNeverSendRequestedCommand() {
        val bytes = Bytes("ID0670;")
        assertThrows(ProtocolException::class.java) { ReadonlyCat(bytes).read("FA") }
        assertEquals(listOf("ID;"), bytes.written)
        for (command in listOf("TX1", "KYTEST", "FA014200000", "ID;TX1", "fa", "")) {
            val rejected = Bytes()
            assertThrows(IllegalArgumentException::class.java) { ReadonlyCat(rejected).read(command) }
            assertTrue(rejected.written.isEmpty())
        }
    }

    @Test fun malformedFramesAndTimeoutAreNotSuccessfulReads() {
        for (frame in listOf("ID0840;FA014200000;", "ID0840;\n", "ID\u00010840;")) {
            assertThrows(ProtocolException::class.java) { ReadonlyCat(Bytes(frame)).identify() }
        }
        assertThrows(SocketTimeoutException::class.java) { ReadonlyCat(Bytes()).identify() }
    }

    @Test fun remoteProtocolRejectsActuatorsInvalidIdsExtraFieldsAndOversize() {
        val id = "a".repeat(32)
        assertEquals("FA", AgentProtocol.parse("""{"type":"query","id":"$id","command":"FA"}""").getString("command"))
        for (message in listOf(
            """{"type":"query","id":"$id","command":"TX1"}""",
            """{"type":"query","id":"short","command":"FA"}""",
            """{"type":"query","id":"$id","command":"FA","extra":true}""",
            """{"type":"ready","api_version":"v1","read_only":false}""",
            """{"type":"ping"}{"type":"ping"}""",
            " ".repeat(4097)
        )) assertThrows(ProtocolException::class.java) { AgentProtocol.parse(message) }
    }

    @Test fun configurationRejectsPlaintextCredentialsInUrlAndImplicitPort() {
        for (url in listOf("http://host", "https://user:password@host", "https://host/path", "https://host?token=secret")) {
            assertThrows(IllegalArgumentException::class.java) { AgentConfig(url, "a".repeat(32), "usb", 0, 38400) }
        }
        assertThrows(IllegalArgumentException::class.java) { AgentConfig("https://host", "a".repeat(32), "usb", 1, 38400) }
        assertThrows(IllegalArgumentException::class.java) { AgentConfig("https://host", "a".repeat(31), "usb", 0, 38400) }
    }

    @Test fun websocketLimitsPayloadBeforeAllocationAndOversizedHandshake() {
        val draft = AgentDraft()
        draft.setParseMode(Role.CLIENT)
        val payload = ByteArray(4100)
        payload[0] = 0x82.toByte()
        payload[1] = 126
        payload[2] = 16
        assertEquals(4096, draft.translateFrame(ByteBuffer.wrap(payload)).single().payloadData.remaining())
        val oversized = AgentDraft()
        oversized.setParseMode(Role.CLIENT)
        assertThrows(LimitExceededException::class.java) {
            oversized.translateFrame(ByteBuffer.wrap(byteArrayOf(0x82.toByte(), 126, 16, 1)))
        }
        assertThrows(InvalidHandshakeException::class.java) {
            AgentDraft().translateHandshake(ByteBuffer.wrap(ByteArray(8193)))
        }
    }

    @Test fun clonedDraftBoundsEmptyFragmentsAndControlFloods() {
        val listener = object : WebSocketClient(URI("wss://localhost"), AgentDraft()) {
            override fun onOpen(handshake: ServerHandshake) {}
            override fun onClose(code: Int, reason: String, remote: Boolean) {}
            override fun onError(error: Exception) {}
            override fun onMessage(message: String) {}
            override fun onWebsocketPing(socket: WebSocket, frame: org.java_websocket.framing.Framedata) {}
        }
        val draft = AgentDraft().copyInstance()
        val socket = WebSocketImpl(listener, draft)
        draft.processFrame(socket, TextFrame().apply { setFin(false) })
        repeat(31) { draft.processFrame(socket, ContinuousFrame().apply { setFin(false) }) }
        assertThrows(InvalidDataException::class.java) {
            draft.processFrame(socket, ContinuousFrame().apply { setFin(false) })
        }
        val controls = AgentDraft().copyInstance()
        repeat(16) { controls.processFrame(socket, PingFrame()) }
        assertThrows(InvalidDataException::class.java) { controls.processFrame(socket, PingFrame()) }
    }
}
