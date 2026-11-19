package org.bricohams.radio

import android.content.Context
import java.net.URLDecoder
import java.security.MessageDigest
import java.security.cert.X509Certificate

/** Pairing with the desktop RadiCodex remote agent. The token is a credential: never log or show it. */
data class RemotePairing(val host: String, val port: Int, val token: String, val fingerprint: String) {
    val consoleUrl: String get() = "https://$host:$port/#token=$token"
    val origin: String get() = "https://$host:$port"

    override fun toString() = "RemotePairing(host=$host, port=$port, token=***, fingerprint=$fingerprint)"
}

object RemoteShack {
    private val TOKEN = Regex("^[A-Za-z0-9_-]{43}$")
    private val FINGERPRINT = Regex("^([0-9A-F]{2}:){31}[0-9A-F]{2}$")
    private val HOSTNAME = Regex("^([a-z0-9]([a-z0-9-]*[a-z0-9])?\\.)+(ts\\.net|local)$")

    /** Parses a radicodex-remote://pair link or a pasted https console URL; null when anything is invalid. */
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

    fun load(context: Context): RemotePairing? {
        val prefs = context.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE)
        val pairing = RemotePairing(prefs.getString("host", "") ?: "", prefs.getInt("port", 0),
            prefs.getString("token", "") ?: "", prefs.getString("fp", "") ?: "")
        return pairing.takeIf { RemoteShack.valid(it) }
    }

    fun save(context: Context, pairing: RemotePairing): Boolean {
        require(RemoteShack.valid(pairing))
        return context.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE).edit()
            .putString("host", pairing.host).putInt("port", pairing.port)
            .putString("token", pairing.token).putString("fp", pairing.fingerprint).commit()
    }

    fun clear(context: Context) {
        context.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE).edit().clear().commit()
    }
}
