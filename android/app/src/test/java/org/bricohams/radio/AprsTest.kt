package org.bricohams.radio

import org.junit.Assert.*
import org.junit.Test

class AprsTest {
    private fun incoming(from: String, info: String) =
        Ax25Frame(Ax25Address("APRS"), Ax25Address.parse(from), emptyList(), info.toByteArray(Charsets.ISO_8859_1)).encode()

    @Test fun kissEscapesAndRoundTrips() {
        val payload = byteArrayOf(0x01, 0xC0.toByte(), 0x02, 0xDB.toByte(), 0x03)
        val encoded = Kiss.data(payload)
        assertArrayEquals(byteArrayOf(0xC0.toByte(), 0x00, 0x01, 0xDB.toByte(), 0xDC.toByte(), 0x02, 0xDB.toByte(), 0xDD.toByte(), 0x03, 0xC0.toByte()), encoded)
        val frame = KissDecoder().feed(encoded).single()
        assertEquals(0, frame.port)
        assertEquals(0, frame.type)
        assertArrayEquals(payload, frame.payload)
        assertEquals(0x10, Kiss.encode(1, 0, ByteArray(0))[1].toInt())
    }

    @Test fun kissDecodesChunkedNotifications() {
        val first = Kiss.data(byteArrayOf(1, 2, 0xC0.toByte(), 4))
        val second = Kiss.data(byteArrayOf(9, 8, 7))
        val stream = first + second
        val decoder = KissDecoder()
        val frames = ArrayList<KissFrame>()
        stream.toList().chunked(3).forEach { frames += decoder.feed(it.toByteArray()) }
        assertEquals(2, frames.size)
        assertArrayEquals(byteArrayOf(1, 2, 0xC0.toByte(), 4), frames[0].payload)
        assertArrayEquals(byteArrayOf(9, 8, 7), frames[1].payload)
        assertTrue(decoder.feed(byteArrayOf(0xC0.toByte(), 0xC0.toByte())).isEmpty())
    }

    @Test fun ax25AddressEncodesCallAndSsid() {
        val address = Ax25Address.parse("n0call-7")
        assertEquals(Ax25Address("N0CALL", 7), address)
        val bytes = address.encode(last = true)
        assertEquals(7, bytes.size)
        assertEquals('N'.code shl 1, bytes[0].toInt() and 255)
        assertEquals(0x60 or (7 shl 1) or 1, bytes[6].toInt() and 255)
        assertEquals(address, Ax25Address.decode(bytes, 0))
        assertEquals("W1AW", Ax25Address.decode(Ax25Address("W1AW").encode(false), 0).toString())
        assertEquals(' '.code shl 1, Ax25Address("W1AW").encode(false)[5].toInt() and 255)
        assertThrows(IllegalArgumentException::class.java) { Ax25Address.parse("N0CALL-16") }
        assertThrows(IllegalArgumentException::class.java) { Ax25Address.parse("TOOLONG") }
    }

    @Test fun ax25UiFrameRoundTrip() {
        val digis = listOf(Ax25Address("WIDE1", 1), Ax25Address("WIDE2", 1))
        val frame = Ax25Frame(Ax25Address("APZBRC"), Ax25Address("N0CALL", 7), digis, "hi".toByteArray())
        val bytes = frame.encode()
        assertEquals(7 * 4 + 2 + 2, bytes.size)
        assertEquals(0x03, bytes[28].toInt())
        assertEquals(0xF0, bytes[29].toInt() and 255)
        val decoded = Ax25Frame.decode(bytes)!!
        assertEquals(Ax25Address("N0CALL", 7), decoded.source)
        assertEquals("APZBRC", decoded.destination.call)
        assertEquals(digis, decoded.digipeaters)
        assertEquals("hi", String(decoded.info))
        val notUi = bytes.copyOf().also { it[28] = 0x01 }
        assertNull(Ax25Frame.decode(notUi))
        assertNull(Ax25Frame.decode(ByteArray(10)))
        val tooMany = Ax25Frame(Ax25Address("APZBRC"), Ax25Address("N0CALL"), List(9) { Ax25Address("WIDE1") }, ByteArray(0))
        assertThrows(IllegalArgumentException::class.java) { tooMany.encode() }
    }

    @Test fun messageFormatPaddingAndId() {
        assertEquals(":N0CALL-7 :Hello{001", AprsText.message("N0CALL-7", "Hello", "001"))
        assertEquals(":W1AW     :Hello", AprsText.message("W1AW", "Hello", null))
        assertEquals(":K1ABC    :ack123", AprsText.ack("K1ABC", "123"))
        assertEquals(AprsPacket.Message("N0CALL", "Hello", "042"), AprsText.parse(":N0CALL   :Hello{042".toByteArray()))
        assertEquals(AprsPacket.Message("N0CALL", "No id", null), AprsText.parse(":N0CALL   :No id".toByteArray()))
        assertTrue(AprsText.parse("!4903.50N/07201.75W-".toByteArray()) is AprsPacket.Other)
    }

    @Test fun acksAndRejectsParse() {
        assertEquals(AprsPacket.Ack("N0CALL", "042"), AprsText.parse(":N0CALL   :ack042".toByteArray()))
        assertEquals(AprsPacket.Reject("N0CALL", "7"), AprsText.parse(":N0CALL   :rej7".toByteArray()))
    }

    @Test fun textLimit() {
        assertEquals(67, AprsText.message("W1AW", "x".repeat(67), null).length - 11)
        assertThrows(IllegalArgumentException::class.java) { AprsText.message("W1AW", "x".repeat(68), null) }
        assertThrows(IllegalArgumentException::class.java) { AprsText.message("W1AW", "a{b", null) }
        assertThrows(IllegalArgumentException::class.java) { AprsText.message("W1AW", " ", null) }
    }

    @Test fun autoAckOnlyForMyCallsignAndWhenEnabled() {
        val sent = ArrayList<Ax25Frame>()
        val messenger = AprsMessenger("N0CALL-7", true) { sent += it }
        messenger.receive(incoming("K1ABC", ":N0CALL-7 :Hi there{123"), 1000)
        assertEquals(1, sent.size)
        assertEquals(":K1ABC    :ack123", String(sent[0].info))
        assertEquals("APZBRC", sent[0].destination.call)
        assertEquals("N0CALL-7", sent[0].source.toString())
        assertEquals("WIDE1-1,WIDE2-1", sent[0].path)
        assertEquals(1, messenger.entries.size)
        messenger.receive(incoming("K1ABC", ":N0CALL-7 :Hi there{123"), 2000)
        assertEquals(2, sent.size)
        assertEquals(1, messenger.entries.size)
        messenger.receive(incoming("K1ABC", ":W1AW     :Not for me{5"), 3000)
        assertEquals(2, sent.size)
        assertEquals(1, messenger.entries.size)
        assertEquals(3, messenger.log.size)
        messenger.autoAck = false
        messenger.receive(incoming("K1ABC", ":N0CALL-7 :Again{124"), 4000)
        assertEquals(2, sent.size)
        assertEquals(2, messenger.entries.size)
    }

    @Test fun outgoingRetriesThreeTimesThenFails() {
        val sent = ArrayList<Ax25Frame>()
        val messenger = AprsMessenger("N0CALL", true) { sent += it }
        val entry = messenger.send("K1ABC", "Hello", 0)
        assertEquals(":K1ABC    :Hello{001", String(sent[0].info))
        messenger.tick(29_000)
        assertEquals(1, sent.size)
        messenger.tick(30_000); messenger.tick(60_000); messenger.tick(90_000)
        assertEquals(4, sent.size)
        assertEquals(AprsMessenger.State.PENDING, entry.state)
        messenger.tick(120_000)
        assertEquals(4, sent.size)
        assertEquals(AprsMessenger.State.FAILED, entry.state)
    }

    @Test fun ackSettlesAndRejectIsRecorded() {
        val messenger = AprsMessenger("N0CALL", true) {}
        val first = messenger.send("K1ABC", "one", 0)
        val second = messenger.send("K1ABC", "two", 0)
        messenger.receive(incoming("K1ABC", ":N0CALL   :ack${first.id}"), 10)
        messenger.receive(incoming("K1ABC", ":N0CALL   :rej${second.id}"), 20)
        assertEquals(AprsMessenger.State.ACKED, first.state)
        assertEquals(AprsMessenger.State.REJECTED, second.state)
        messenger.tick(100_000)
        assertEquals(1, first.attempts)
    }

    @Test fun refusesToSendWithoutCallsign() {
        val messenger = AprsMessenger("", true) { fail("must not transmit") }
        assertThrows(IllegalArgumentException::class.java) { messenger.send("K1ABC", "hi", 0) }
        assertTrue(messenger.entries.isEmpty())
    }
}
