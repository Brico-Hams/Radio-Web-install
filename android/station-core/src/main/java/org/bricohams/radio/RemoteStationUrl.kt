package org.bricohams.radio

import java.net.URI
import java.net.URISyntaxException

object RemoteStationUrl {
    fun parse(value: String): String {
        require(value == value.trim() && value.length <= 2048) { "Invalid station URL" }
        val uri = try { URI(value) } catch (error: URISyntaxException) {
            throw IllegalArgumentException("Invalid station URL", error)
        }
        require(uri.scheme == "https" && uri.host != null && uri.rawUserInfo == null &&
            uri.rawPath in listOf("", "/") && uri.rawQuery == null && uri.rawFragment == null &&
            (uri.port == -1 || uri.port in 1..65535)) { "Invalid station URL" }
        return URI("https", null, uri.host, if (uri.port == 443) -1 else uri.port, "/", null, null).toASCIIString()
    }

    fun sameOrigin(value: String, origin: String): Boolean {
        val candidate = try { URI(value) } catch (_: URISyntaxException) { return false }
        val trusted = URI(origin)
        fun port(uri: URI) = if (uri.port == -1) 443 else uri.port
        return candidate.scheme == "https" && candidate.rawUserInfo == null &&
            candidate.host?.equals(trusted.host, ignoreCase = true) == true &&
            port(candidate) == port(trusted)
    }
}
