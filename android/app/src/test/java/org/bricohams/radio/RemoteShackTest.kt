package org.bricohams.radio

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.RuntimeEnvironment

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

    private fun relayLink(relay: String = "https%3A%2F%2Frelay.example.org", station: String = "my-shack-1", token: String = this.token) =
        "radicodex-remote://pair?relay=$relay&station=$station#token=$token"

    @Test fun parsesRelayLink() {
        val relay = RemoteShack.parseAny(relayLink()) as RemoteRelay
        assertEquals(RemoteRelay("https://relay.example.org", "my-shack-1", token), relay)
        assertEquals("https://relay.example.org/s/my-shack-1/#token=$token", relay.consoleUrl)
        assertFalse(relay.toString().contains(token))
        val port = RemoteShack.parseAny(relayLink(relay = "https%3A%2F%2FRelay.Example.org%3A8443%2F")) as RemoteRelay
        assertEquals("https://relay.example.org:8443", port.baseUrl)
        assertEquals(8443, port.port)
    }

    @Test fun parsesRelayConsoleUrl() {
        val relay = RemoteShack.parseAny(" https://relay.example.org:8443/s/abc/#token=$token ") as RemoteRelay
        assertEquals(RemoteRelay("https://relay.example.org:8443", "abc", token), relay)
        assertTrue(RemoteShack.parseAny("https://relay.example.org/s/abc/#token=$token") is RemoteRelay)
    }

    @Test fun rejectsInvalidRelays() {
        assertNull(RemoteShack.parseAny(relayLink(relay = "http%3A%2F%2Frelay.example.org")))
        assertNull(RemoteShack.parseAny("http://relay.example.org/s/abc/#token=$token"))
        for (station in listOf("ab", "a".repeat(33), "ABC", "my_shack", "a.b"))
            assertNull(station, RemoteShack.parseAny(relayLink(station = station)))
        assertNull(RemoteShack.parseAny(relayLink(relay = "https%3A%2F%2Frelay.example.org%3Fx%3D1")))
        assertNull(RemoteShack.parseAny("https://relay.example.org/s/abc/?x=1#token=$token"))
        assertNull(RemoteShack.parseAny(relayLink(relay = "https%3A%2F%2Fu%40relay.example.org")))
        assertNull(RemoteShack.parseAny(relayLink(relay = "https%3A%2F%2Frelay.example.org%2Fx")))
        assertNull(RemoteShack.parseAny(relayLink(relay = "https%3A%2F%2F10.0.0.1")))
        assertNull(RemoteShack.parseAny(relayLink(token = token.dropLast(1))))
        assertNull(RemoteShack.parseAny("${relayLink()}&fp=$fp"))
    }

    @Test fun directLinksStillParseThroughParseAny() {
        assertTrue(RemoteShack.parseAny(link()) is RemotePairing)
        assertTrue(RemoteShack.parseAny("https://10.0.0.5:9443/#token=$token&fp=$fp") is RemotePairing)
    }

    @Test fun micOriginMatchesOnlyPairedTarget() {
        val direct = RemotePairing("192.168.1.20", 8443, token, fp)
        assertTrue(RemoteShack.originMatches(direct, "https://192.168.1.20:8443"))
        assertTrue(RemoteShack.originMatches(direct, "https://192.168.1.20:8443/"))
        assertFalse(RemoteShack.originMatches(direct, "https://192.168.1.20:9443"))
        assertFalse(RemoteShack.originMatches(direct, "https://192.168.1.20"))
        assertFalse(RemoteShack.originMatches(direct, "http://192.168.1.20:8443"))
        assertFalse(RemoteShack.originMatches(direct, "https://192.168.1.21:8443"))
        assertFalse(RemoteShack.originMatches(direct, "https://user@192.168.1.20:8443"))
        assertFalse(RemoteShack.originMatches(direct, "https://192.168.1.20:8443/x"))
        assertFalse(RemoteShack.originMatches(direct, "https://192.168.1.20:8443.evil.com"))
        assertFalse(RemoteShack.originMatches(direct, null))
        assertFalse(RemoteShack.originMatches(direct, ""))
        assertFalse(RemoteShack.originMatches(direct, "not a url"))
        val relay = RemoteRelay("https://relay.example.org:8443", "abc", token)
        assertTrue(RemoteShack.originMatches(relay, "https://Relay.Example.org:8443/"))
        assertFalse(RemoteShack.originMatches(relay, "https://relay.example.org"))
        assertFalse(RemoteShack.originMatches(relay, "https://relay.example.org:8443@evil.com"))
        assertTrue(RemoteShack.originMatches(RemoteRelay("https://relay.example.org", "abc", token), "https://relay.example.org:443"))
    }

    @Test fun relayAllowsOnlyItsOriginAndStationPath() {
        val relay = RemoteRelay("https://relay.example.org:8443", "abc", token)
        assertTrue(relay.allows("https", "relay.example.org", 8443, "/s/abc/app.js", listOf("s", "abc", "app.js")))
        assertFalse(relay.allows("http", "relay.example.org", 8443, "/s/abc/", listOf("s", "abc")))
        assertFalse(relay.allows("https", "relay.example.org", -1, "/s/abc/", listOf("s", "abc")))
        assertFalse(relay.allows("https", "other.example.org", 8443, "/s/abc/", listOf("s", "abc")))
        assertFalse(relay.allows("https", "relay.example.org", 8443, "/s/abcd/", listOf("s", "abcd")))
        assertFalse(relay.allows("https", "relay.example.org", 8443, "/s/abc/../x/", listOf("s", "abc", "..", "x")))
    }
}

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [28])
class RemoteShackStoreTest {
    private val token = "AbC-_".repeat(8) + "xyz"
    private val fp = (0 until 32).joinToString(":") { "%02X".format(it * 7) }
    private val context: android.content.Context get() = RuntimeEnvironment.getApplication()

    @Test fun roundTripsDirectAndRelay() {
        RemoteShackStore.clear(context)
        assertNull(RemoteShackStore.load(context))
        val direct = RemotePairing("192.168.1.20", 8443, token, fp)
        assertTrue(RemoteShackStore.save(context, direct))
        assertEquals(direct, RemoteShackStore.load(context))
        val relay = RemoteRelay("https://relay.example.org", "abc", token)
        assertTrue(RemoteShackStore.save(context, relay))
        assertEquals(relay, RemoteShackStore.load(context))
        assertTrue(RemoteShackStore.save(context, direct))
        assertEquals(direct, RemoteShackStore.load(context))
    }

    @Test fun migratesLegacyDirectEntry() {
        context.getSharedPreferences("remote-shack", android.content.Context.MODE_PRIVATE).edit().clear()
            .putString("host", "10.0.0.5").putInt("port", 9443).putString("token", token).putString("fp", fp).commit()
        assertEquals(RemotePairing("10.0.0.5", 9443, token, fp), RemoteShackStore.load(context))
    }
}

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [28], qualifiers = "en-rUS")
class RemoteShackBarTest {
    private val token = "AbC-_".repeat(8) + "xyz"
    private val fp = (0 until 32).joinToString(":") { "%02X".format(it * 7) }
    private fun views(view: android.view.View): List<android.view.View> = listOf(view) +
        if (view is android.view.ViewGroup) (0 until view.childCount).flatMap { views(view.getChildAt(it)) } else emptyList()

    @Test fun forgetPairingIsInTheOverflowMenuAndNeedsConfirmation() {
        val context = RuntimeEnvironment.getApplication()
        assertTrue(RemoteShackStore.save(context, RemotePairing("192.168.1.20", 8443, token, fp)))
        val controller = org.robolectric.Robolectric.buildActivity(RemoteShackActivity::class.java).setup()
        try {
            val activity = controller.get()
            val all = views(activity.window.decorView)
            assertTrue(all.filterIsInstance<android.widget.Button>().isEmpty())
            val more = all.single { it.contentDescription == activity.getString(R.string.remote_more) }
            assertTrue(more.minimumHeight >= (48 * context.resources.displayMetrics.density).toInt())
            more.performClick()
            val menu = org.robolectric.shadows.ShadowAlertDialog.getLatestAlertDialog()
            val items = org.robolectric.Shadows.shadowOf(menu).items
            assertEquals(listOf(activity.getString(R.string.remote_reload), activity.getString(R.string.remote_forget)), items.toList())
            menu.listView.performItemClick(null, 1, 1)
            val confirm = org.robolectric.shadows.ShadowAlertDialog.getLatestAlertDialog()
            assertNotNull(RemoteShackStore.load(context))
            confirm.getButton(android.app.AlertDialog.BUTTON_NEGATIVE).performClick()
            assertNotNull(RemoteShackStore.load(context))
            more.performClick()
            org.robolectric.shadows.ShadowAlertDialog.getLatestAlertDialog().listView.performItemClick(null, 1, 1)
            org.robolectric.shadows.ShadowAlertDialog.getLatestAlertDialog()
                .getButton(android.app.AlertDialog.BUTTON_POSITIVE).performClick()
            assertNull(RemoteShackStore.load(context))
        } finally { controller.pause().stop().destroy() }
    }
}

