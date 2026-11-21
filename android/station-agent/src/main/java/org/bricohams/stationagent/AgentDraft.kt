package org.bricohams.stationagent

import org.java_websocket.WebSocketImpl
import org.java_websocket.drafts.Draft
import org.java_websocket.drafts.Draft_6455
import org.java_websocket.enums.Opcode
import org.java_websocket.exceptions.InvalidDataException
import org.java_websocket.exceptions.InvalidHandshakeException
import org.java_websocket.framing.Framedata
import org.java_websocket.handshake.Handshakedata
import org.java_websocket.protocols.Protocol
import java.nio.ByteBuffer

class AgentDraft : Draft_6455(emptyList(), listOf(Protocol(AgentProtocol.PROTOCOL)), 4096) {
    private var fragments = 0
    private var controls = 0

    override fun copyInstance(): Draft = AgentDraft()

    override fun translateHandshake(buffer: ByteBuffer): Handshakedata {
        if (buffer.remaining() > 8192) throw InvalidHandshakeException("Handshake too large")
        return super.translateHandshake(buffer)
    }

    override fun processFrame(socket: WebSocketImpl, frame: Framedata) {
        if (frame.opcode in setOf(Opcode.TEXT, Opcode.BINARY, Opcode.CONTINUOUS)) {
            fragments++
            if (fragments > 32) throw InvalidDataException(1008, "Message fragment limit")
            super.processFrame(socket, frame)
            if (frame.isFin) {
                fragments = 0
                controls = 0
            }
        } else {
            controls++
            if (controls > 16) throw InvalidDataException(1008, "Message control limit")
            super.processFrame(socket, frame)
        }
    }
}
