package org.bricohams.radio

import org.junit.Assert.*
import org.junit.Test
import java.net.InetAddress
import java.net.ServerSocket
import java.util.concurrent.CountDownLatch
import java.util.concurrent.LinkedBlockingQueue
import java.util.concurrent.TimeUnit

class AprsChatTest {
    private fun ax25(info: String = ":N0CALL   :Hi{001", digis: List<Ax25Address> = listOf(Ax25Address("WIDE1", 1))) =
        Ax25Frame(Ax25Address(AprsText.TOCALL), Ax25Address.parse("K1ABC-7"), digis, info.toByteArray(Charsets.ISO_8859_1))

    @Test fun tcpLinkFramesKissBothWays() {
        ServerSocket(0, 1, InetAddress.getByName("127.0.0.1")).use { server ->
            val link = TcpKissLink.connect("127.0.0.1", server.localPort)
            val received = LinkedBlockingQueue<ByteArray>()
            link.onFrame = { received.add(it) }
            val peer = server.accept().apply { soTimeout = 3000 }
            try {
                val outgoing = byteArrayOf(1, 0xC0.toByte(), 3, 0xDB.toByte(), 5)
                link.send(outgoing)
                val expected = Kiss.data(outgoing)
                assertArrayEquals(expected, peer.getInputStream().readNBytes(expected.size))

                val incoming = byteArrayOf(9, 0xC0.toByte(), 8)
                val wire = Kiss.data(incoming)
                peer.getOutputStream().write(wire, 0, 3); peer.getOutputStream().flush()
                Thread.sleep(50)
                peer.getOutputStream().write(wire, 3, wire.size - 3); peer.getOutputStream().flush()
                assertArrayEquals(incoming, received.poll(3, TimeUnit.SECONDS))

                peer.getOutputStream().write(Kiss.encode(0, 1, byteArrayOf(7))); peer.getOutputStream().flush()
                assertNull(received.poll(300, TimeUnit.MILLISECONDS))
            } finally {
                link.close()
            }
            assertEquals(-1, peer.getInputStream().read())
            assertThrows(java.io.IOException::class.java) { link.send(byteArrayOf(1)) }
            peer.close()
        }
    }

    @Test fun tcpLinkReportsPeerClose() {
        ServerSocket(0, 1, InetAddress.getByName("127.0.0.1")).use { server ->
            val link = TcpKissLink.connect("127.0.0.1", server.localPort)
            val closed = CountDownLatch(1)
            link.onClosed = { closed.countDown() }
            server.accept().close()
            assertTrue(closed.await(3, TimeUnit.SECONDS))
            link.close()
        }
    }

    @Test fun tcpLinkRejectsBadHostAndPort() {
        assertThrows(IllegalArgumentException::class.java) { TcpKissLink.connect(" ", 1000) }
        assertThrows(IllegalArgumentException::class.java) { TcpKissLink.connect("127.0.0.1", 0) }
        assertThrows(IllegalArgumentException::class.java) { TcpKissLink.parsePort("65536") }
        assertThrows(IllegalArgumentException::class.java) { TcpKissLink.parsePort("abc") }
        assertEquals(8001, TcpKissLink.parsePort(" 8001 "))
    }

    @Test fun rt950LinkWritesTheSameKissFramesAsBefore() {
        val written = ArrayList<ByteArray>()
        val link = Rt950BleKissLink({ written += it }, {}, txEnabled = { true })
        val frame = ax25()
        link.send(link.limits.check(frame))
        assertArrayEquals(Kiss.data(frame.encode()), written.single())

        val received = ArrayList<ByteArray>()
        link.onFrame = { received += it }
        val wire = Kiss.data(frame.encode())
        link.onChunk(wire.copyOfRange(0, 10)); link.onChunk(wire.copyOfRange(10, wire.size))
        assertArrayEquals(frame.encode(), received.single())
    }

    @Test fun kissModeWritesOneFramePerWriteAndNeverTheUnlock() {
        val written = ArrayList<ByteArray>()
        val link = Rt950BleKissLink({ written += it }, {}, Rt950KissOptions(), { 244 }, { true })
        val frame = ax25(info = "x".repeat(100))
        repeat(2) { link.send(link.limits.check(frame)) }
        assertEquals(2, written.size)
        written.forEach { assertArrayEquals(Kiss.data(frame.encode()), it) }
        assertTrue(written.none { it.contentEquals(BleRt950Transport.UNLOCK_BYTES) })
        assertEquals("FF31", link.variant)
    }

    @Test fun rtx1PrefixOnlyWhenEnabled() {
        val written = ArrayList<ByteArray>()
        val kiss = Kiss.data(ax25().encode())
        Rt950BleKissLink({ written += it }, {}, Rt950KissOptions(KissWriteTarget.FFE1, false), txEnabled = { true }).send(ax25().encode())
        val prefixed = Rt950BleKissLink({ written += it }, {}, Rt950KissOptions(KissWriteTarget.FFE1, true), txEnabled = { true })
        prefixed.send(ax25().encode())
        assertArrayEquals(kiss, written[0])
        assertArrayEquals("RTX1".toByteArray() + kiss, written[1])
        assertEquals("FFE1+RTX1", prefixed.variant)
    }

    @Test fun frameLargerThanTheMtuFailsInsteadOfSplitting() {
        val written = ArrayList<ByteArray>()
        val bytes = ax25(info = "x".repeat(100)).encode()
        val need = Kiss.data(bytes).size
        val tight = Rt950BleKissLink({ written += it }, {}, Rt950KissOptions(), { need - 1 }, { true })
        assertThrows(IllegalArgumentException::class.java) { tight.send(bytes) }
        assertTrue(written.isEmpty())
        Rt950BleKissLink({ written += it }, {}, Rt950KissOptions(), { need }, { true }).send(bytes)
        assertEquals(1, written.size)
        // At the 23-byte fallback MTU (20 bytes per write) the same frame is refused as well.
        assertThrows(IllegalArgumentException::class.java) { Rt950BleKissLink({ written += it }, {}, Rt950KissOptions(), { 20 }, { true }).send(bytes) }
    }

    @Test fun rt950LinkRefusesToSendUnlessExperimentalTxIsOn() {
        val written = ArrayList<ByteArray>()
        var on = false
        val link = Rt950BleKissLink({ written += it }, {}, txEnabled = { on })
        assertFalse(link.txAllowed)
        assertThrows(IllegalStateException::class.java) { link.send(ax25().encode()) }
        assertTrue(written.isEmpty())
        assertFalse(Rt950BleKissLink({ written += it }, {}).txAllowed)
        on = true
        link.send(ax25().encode())
        assertEquals(1, written.size)
    }

    @Test fun retriesStopWhenTheLinkReportsClosed() {
        val sent = ArrayList<Ax25Frame>()
        val link = Rt950BleKissLink({}, {}, txEnabled = { true })
        var closedSignal = false
        link.onClosed = { closedSignal = true }
        val messenger = AprsMessenger("EA5KAO", false) { frame -> sent += frame; link.send(frame.encode()) }
        messenger.send("EA5KAO", "hola", 0)
        link.linkLost()
        assertTrue(closedSignal)
        assertFalse(link.txAllowed)
        assertThrows(java.io.IOException::class.java) { messenger.tick(AprsText.RETRY_MS) }
        assertEquals(AprsMessenger.State.FAILED, messenger.entries.single().state)
        val before = sent.size
        messenger.tick(AprsText.RETRY_MS * 3)
        assertEquals(before, sent.size)
    }

    @Test fun needsPowerCycleOnlyWhenCloneIsNewerThanLastPowerCycle() {
        assertFalse(Rt950Safety.needsPowerCycle(0, 0))
        assertTrue(Rt950Safety.needsPowerCycle(100, 50))
        assertFalse(Rt950Safety.needsPowerCycle(100, 150))
    }

    @Test fun rt950LimitsComeFromTheRecordedSource() {
        val limits = Rt950BleKissLink({}, {}).limits
        assertEquals(Ax25Limits(182, 6, 127), limits)
        val seven = (1..7).map { Ax25Address("DIGI$it") }
        assertThrows(IllegalArgumentException::class.java) { limits.check(ax25(digis = seven)) }
        assertThrows(IllegalArgumentException::class.java) { limits.check(ax25(info = "x".repeat(128))) }
        assertNotNull(limits.check(ax25(info = "x".repeat(127), digis = emptyList())))
        assertThrows(IllegalArgumentException::class.java) { Ax25Limits.GENERIC.check(ax25(digis = (1..9).map { Ax25Address("D$it") })) }
    }

    @Test fun statusTableHasNoVerifiedWithoutRecordedVerification() {
        assertThrows(IllegalArgumentException::class.java) {
            ChatRadio("x", ChatPath.BLE_KISS, ChatStatus.VERIFIED, "src")
        }
        for (radio in AprsChatRadios.ALL) {
            if (radio.status == ChatStatus.VERIFIED) assertFalse(radio.name, radio.verification.isNullOrBlank())
            assertTrue(radio.name, radio.source.isNotBlank())
        }
        assertEquals(emptyList<String>(), AprsChatRadios.ALL.filter { it.status == ChatStatus.VERIFIED }.map { it.name })
        assertTrue(AprsChatRadios.ALL.single { it.link == ChatLink.KISS_TCP }.status == ChatStatus.PENDING_RADIO_TEST)
    }

    @Test fun onlyRadiosWithAKissPathAreChatSources() {
        assertEquals(setOf(ChatLink.RT950_BLE, ChatLink.KISS_TCP), AprsChatRadios.chatSources.mapNotNull { it.link }.toSet())
        assertTrue(AprsChatRadios.ALL.filter { it.link == null }.all { it.status == ChatStatus.UNSUPPORTED })
    }
}
