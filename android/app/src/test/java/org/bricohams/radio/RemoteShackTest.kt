package org.bricohams.radio

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class RemoteShackTest {
    private val token = "AbC-_".repeat(8) + "xyz"
    private val fp = (0 until 32).joinToString(":") { "%02X".format(it * 7) }

    private fun link(host: String = "192.168.1.20", port: String = "8443", token: String = this.token, fp: String = this.fp) =
        "radicodex-remote://pair?host=$host&port=$port#token=$token&fp=$fp"

    @Test fun parsesPairingLink() {
        val pairing = RemoteShack.parse(link())!!
        assertEquals(RemotePairing("192.168.1.20", 8443, token, fp), pairing)
        assertEquals("https://192.168.1.20:8443/#token=$token", pairing.consoleUrl)
        assertFalse(pairing.toString().contains(token))
    }

    @Test fun parsesEncodedFingerprintAndTailscaleHosts() {
        assertEquals("shack.tail1234.ts.net", RemoteShack.parse(link(host = "shack.tail1234.ts.net", fp = fp.replace(":", "%3A")))!!.host)
        assertEquals("100.100.1.2", RemoteShack.parse(link(host = "100.100.1.2"))!!.host)
        assertEquals("radio.local", RemoteShack.parse(link(host = "radio.local"))!!.host)
    }

    @Test fun parsesConsoleUrl() {
        val pairing = RemoteShack.parse(" https://10.0.0.5:9443/#token=$token&fp=$fp ")!!
        assertEquals(RemotePairing("10.0.0.5", 9443, token, fp), pairing)
    }

    @Test fun acceptsPrivateAndCgnatRangesOnly() {
        for (host in listOf("10.1.2.3", "172.16.0.1", "172.31.255.255", "192.168.0.1", "100.64.0.1", "100.127.255.255"))
            assertTrue(host, RemoteShack.allowedHost(host))
        for (host in listOf("8.8.8.8", "172.32.0.1", "172.15.0.1", "100.128.0.1", "100.63.0.1", "192.169.0.1", "11.0.0.1",
            "10.0.0", "10.0.0.256", "010.0.0.1", "example.com", "evil.ts.net.example.com", ".local", "ts.net", "a_b.local"))
            assertFalse(host, RemoteShack.allowedHost(host))
        assertNull(RemoteShack.parse(link(host = "8.8.8.8")))
        assertNull(RemoteShack.parse("https://example.com:8443/#token=$token&fp=$fp"))
    }

    @Test fun rejectsBadFingerprint() {
        assertNull(RemoteShack.parse(link(fp = fp.substring(3))))
        assertNull(RemoteShack.parse(link(fp = fp.replace(":", ""))))
        assertNull(RemoteShack.parse(link(fp = fp.replaceFirst("00", "ZZ"))))
        assertNull(RemoteShack.parse(link(fp = "$fp:AA")))
    }

    @Test fun rejectsBadToken() {
        assertNull(RemoteShack.parse(link(token = token.dropLast(1))))
        assertNull(RemoteShack.parse(link(token = token + "A")))
        assertNull(RemoteShack.parse(link(token = token.dropLast(1) + "+")))
        assertNull(RemoteShack.parse("radicodex-remote://pair?host=192.168.1.20&port=8443#fp=$fp"))
    }

    @Test fun rejectsPortOutOfRange() {
        for (port in listOf("0", "65536", "-1", "abc", ""))
            assertNull(port, RemoteShack.parse(link(port = port)))
        assertEquals(65535, RemoteShack.parse(link(port = "65535"))!!.port)
        assertEquals(1, RemoteShack.parse(link(port = "1"))!!.port)
    }

    @Test fun rejectsOtherSchemesAndMissingFragment() {
        assertNull(RemoteShack.parse("http://192.168.1.20:8443/#token=$token&fp=$fp"))
        assertNull(RemoteShack.parse("radicodex-remote://other?host=192.168.1.20&port=8443#token=$token&fp=$fp"))
        assertNull(RemoteShack.parse("radicodex-remote://pair?host=192.168.1.20&port=8443"))
        assertNull(RemoteShack.parse("https://user@192.168.1.20:8443/#token=$token&fp=$fp"))
        assertNull(RemoteShack.parse(""))
    }

    @Test fun fingerprintIsUppercaseColonSha256() {
        assertEquals("BA:78:16:BF:8F:01:CF:EA:41:41:40:DE:5D:AE:22:23:B0:03:61:A3:96:17:7A:9C:B4:10:FF:61:F2:00:15:AD",
            RemoteShack.fingerprintOf("abc".toByteArray()))
    }
}
