package org.bricohams.radio

import android.content.Context
import java.net.URLDecoder
import java.security.MessageDigest
import java.security.cert.X509Certificate

/** Pairing with the desktop RadiCodex remote agent. The token is a credential: never log or show it. */
sealed interface RemoteTarget {
    val token: String
    val consoleUrl: String
}

/** Direct mode: private host with a pinned certificate fingerprint. */
data class RemotePairing(val host: String, val port: Int, override val token: String, val fingerprint: String) : RemoteTarget {
    override val consoleUrl: String get() = "https://$host:$port/#token=$token"
    val origin: String get() = "https://$host:$port"

    override fun toString() = "RemotePairing(host=$host, port=$port, token=***, fingerprint=$fingerprint)"
}

/** Relay mode: self-hosted BricoHams relay reached over https with normal system CA validation. [baseUrl] has no trailing slash. */
data class RemoteRelay(val baseUrl: String, val station: String, override val token: String) : RemoteTarget {
    val hostPort: String get() = baseUrl.removePrefix("https://")
    val host: String get() = hostPort.substringBefore(':')
    val port: Int get() = hostPort.substringAfter(':', "443").toInt()
    val pathPrefix: String get() = "/s/$station/"
    override val consoleUrl: String get() = "$baseUrl/s/$station/#token=$token"

    /** True only for https URLs on the relay's scheme+host+port under /s/<station>/ without dot segments. */
    fun allows(scheme: String?, urlHost: String?, urlPort: Int, path: String?, segments: List<String>): Boolean {
        val effective = if (urlPort == -1) 443 else urlPort
        return scheme == "https" && urlHost.equals(host, ignoreCase = true) && effective == port &&
            path != null && path.startsWith(pathPrefix) && segments.none { it == ".." || it == "." }
    }

    override fun toString() = "RemoteRelay(baseUrl=$baseUrl, station=$station, token=***)"
}

object RemoteShack {
    private val TOKEN = Regex("^[A-Za-z0-9_-]{43}$")
    private val STATION = Regex("^[a-z0-9-]{3,32}$")
    private val DNS_NAME = Regex("^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\\.)+[a-z]([a-z0-9-]{0,61}[a-z0-9])?$")
    private val FINGERPRINT = Regex("^([0-9A-F]{2}:){31}[0-9A-F]{2}$")
    private val HOSTNAME = Regex("^([a-z0-9]([a-z0-9-]*[a-z0-9])?\\.)+(ts\\.net|local)$")

    /** Parses any supported link, direct or relay; null when invalid. */
    fun parseAny(input: String): RemoteTarget? = parseRelay(input) ?: parse(input)

    /** Parses a relay link (radicodex-remote://pair?relay=…&station=…#token=…) or a pasted https://host/s/<id>/#token=… console URL. */
    fun parseRelay(input: String): RemoteRelay? {
        val text = input.trim()
        val hash = text.indexOf('#')
        if (hash < 0) return null
        val head = text.substring(0, hash)
        val fragment = parameters(text.substring(hash + 1))
        val token = fragment["token"] ?: return null
        if (fragment.containsKey("fp")) return null
        val base: String?
        val station: String?
        if (head.startsWith("radicodex-remote://pair", ignoreCase = true)) {
            val rest = head.substring("radicodex-remote://pair".length)
            if (rest.isNotEmpty() && !rest.startsWith("?") && !rest.startsWith("/?")) return null
            val query = parameters(rest.substringAfter('?', ""))
            if (query.containsKey("host") || query.containsKey("port")) return null
            base = relayBase(query["relay"] ?: return null)
            station = query["station"]
        } else if (head.startsWith("https://", ignoreCase = true)) {
            if (head.contains('?')) return null
            val rest = head.substring("https://".length)
            val slash = rest.indexOf('/')
            if (slash < 0) return null
            val path = rest.substring(slash)
            if (!path.startsWith("/s/") || !path.endsWith("/")) return null
            station = path.substring(3, path.length - 1)
            base = relayBase("https://" + rest.substring(0, slash))
        } else return null
        if (base == null || station == null) return null
        val relay = RemoteRelay(base, station, token)
        return relay.takeIf { valid(it) }
    }

    /** Normalizes a relay base URL (https, DNS host, optional port, no userinfo/query/fragment/path); null when invalid. */
    fun relayBase(url: String): String? {
        val text = url.trim()
        if (!text.startsWith("https://", ignoreCase = true)) return null
        if (text.any { it == '?' || it == '#' || it == '@' || it == '[' || it == '\\' || it.isWhitespace() }) return null
        val rest = text.substring("https://".length).trimEnd('/')
        if (rest.contains('/')) return null
        val host = rest.substringBefore(':').lowercase()
        val portText = rest.substringAfter(':', "")
        if (rest.contains(':') && (portText.isEmpty() || !portText.all { it in '0'..'9' } || portText.length > 5)) return null
        val port = if (rest.contains(':')) portText.toInt() else 443
        if (port !in 1..65535 || !DNS_NAME.matches(host) || host.length > 253) return null
        return if (port == 443) "https://$host" else "https://$host:$port"
    }

    fun valid(relay: RemoteRelay) = relayBase(relay.baseUrl) == relay.baseUrl && STATION.matches(relay.station) &&
        TOKEN.matches(relay.token)

    /** Parses a radicodex-remote://pair link or a pasted https console URL (direct mode); null when anything is invalid. */
    fun parse(input: String): RemotePairing? {
        val text = input.trim()
        val hash = text.indexOf('#')
        if (hash < 0) return null
        val head = text.substring(0, hash)
        val fragment = parameters(text.substring(hash + 1))
        val token = fragment["token"] ?: return null
        val fingerprint = fragment["fp"]?.uppercase() ?: return null
        val host: String
        val port: Int
        if (head.startsWith("radicodex-remote://pair", ignoreCase = true)) {
            val rest = head.substring("radicodex-remote://pair".length)
            if (rest.isNotEmpty() && !rest.startsWith("?") && !rest.startsWith("/?")) return null
            val query = parameters(rest.substringAfter('?', ""))
            host = query["host"] ?: return null
            port = query["port"]?.toIntOrNull() ?: return null
        } else if (head.startsWith("https://", ignoreCase = true)) {
            val rest = head.substring("https://".length)
            val authority = rest.takeWhile { it != '/' && it != '?' }
            if (authority.contains('@') || authority.contains('[')) return null
            host = authority.substringBefore(':')
            val portText = authority.substringAfter(':', "443")
            if (portText.isEmpty() || !portText.all { it in '0'..'9' } || portText.length > 5) return null
            port = portText.toInt()
        } else return null
        val pairing = RemotePairing(host.lowercase(), port, token, fingerprint)
        return pairing.takeIf { valid(it) }
    }

    fun valid(pairing: RemotePairing) = allowedHost(pairing.host) && pairing.port in 1..65535 &&
        TOKEN.matches(pairing.token) && FINGERPRINT.matches(pairing.fingerprint)

    fun allowedHost(host: String): Boolean {
        val octets = ipv4(host)
        if (octets != null) {
            val (a, b) = octets
            return a == 10 || (a == 172 && b in 16..31) || (a == 192 && b == 168) || (a == 100 && b in 64..127)
        }
        return HOSTNAME.matches(host)
    }

    private fun ipv4(host: String): List<Int>? {
        val parts = host.split('.')
        if (parts.size != 4) return null
        val values = parts.map { part ->
            if (part.isEmpty() || part.length > 3 || !part.all { it in '0'..'9' } || (part.length > 1 && part[0] == '0')) return null
            part.toInt().takeIf { it <= 255 } ?: return null
        }
        return values
    }

    private fun parameters(text: String): Map<String, String> =
        text.split('&').filter { it.contains('=') }.associate {
            val key = it.substringBefore('=')
            val value = try { URLDecoder.decode(it.substringAfter('='), "UTF-8") } catch (error: IllegalArgumentException) { "" }
            key to value
        }

    /** Uppercase colon-separated SHA-256 of the DER certificate. */
    fun fingerprintOf(cert: X509Certificate): String = fingerprintOf(cert.encoded)

    fun fingerprintOf(der: ByteArray): String =
        MessageDigest.getInstance("SHA-256").digest(der).joinToString(":") { "%02X".format(it) }
}

/** Stored in the app's private preferences: EncryptedSharedPreferences is not a dependency of this project. */
object RemoteShackStore {
    private const val PREFERENCES = "remote-shack"

    /** Entries without a "mode" key are the original direct pairing and load unchanged. */
    fun load(context: Context): RemoteTarget? {
        val prefs = context.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE)
        val token = prefs.getString("token", "") ?: ""
        if (prefs.getString("mode", "direct") == "relay") {
            val relay = RemoteRelay(prefs.getString("relay", "") ?: "", prefs.getString("station", "") ?: "", token)
            return relay.takeIf { RemoteShack.valid(it) }
        }
        val pairing = RemotePairing(prefs.getString("host", "") ?: "", prefs.getInt("port", 0), token,
            prefs.getString("fp", "") ?: "")
        return pairing.takeIf { RemoteShack.valid(it) }
    }

    fun save(context: Context, target: RemoteTarget): Boolean {
        val edit = context.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE).edit().clear()
        when (target) {
            is RemotePairing -> {
                require(RemoteShack.valid(target))
                edit.putString("host", target.host).putInt("port", target.port)
                    .putString("token", target.token).putString("fp", target.fingerprint)
            }
            is RemoteRelay -> {
                require(RemoteShack.valid(target))
                edit.putString("mode", "relay").putString("relay", target.baseUrl)
                    .putString("station", target.station).putString("token", target.token)
            }
        }
        return edit.commit()
    }

    fun clear(context: Context) {
        context.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE).edit().clear().commit()
    }
}
