package org.bricohams.stationagent

import org.json.JSONObject
import org.json.JSONTokener
import java.net.ProtocolException

/** A well-formed query whose command is outside the allowlist: answered with an error, link stays up. */
class RejectedQueryException(val queryId: String) : ProtocolException("Query command not allowed")

object AgentProtocol {
    const val PATH = "/api/v1/android-agent/connect"
    const val PROTOCOL = "bricoham.android-agent.readonly.v1"
    fun parse(text: String): JSONObject {
        if (text.toByteArray(Charsets.UTF_8).size > 4096) throw ProtocolException("Message too large")
        val tokenizer = JSONTokener(text)
        val value = tokenizer.nextValue() as? JSONObject ?: throw ProtocolException("Invalid message")
        if (tokenizer.nextClean() != '\u0000') throw ProtocolException("Trailing message data")
        val keys = value.keys().asSequence().toSet()
        when (value.opt("type")) {
            "ping" -> if (keys != setOf("type")) throw ProtocolException("Invalid ping")
            "ready" -> if (keys != setOf("type", "api_version", "read_only") ||
                value.opt("api_version") != "v1" || value.opt("read_only") != true) {
                throw ProtocolException("Invalid ready message")
            }
            "query" -> {
                if (keys != setOf("type", "id", "command") ||
                    (value.opt("id") as? String)?.matches(Regex("[a-f0-9]{32}")) != true) {
                    throw ProtocolException("Invalid read-only query")
                }
                if (value.opt("command") !in ReadonlyCat.commands) {
                    throw RejectedQueryException(value.getString("id"))
                }
            }
            else -> throw ProtocolException("Unexpected message")
        }
        return value
    }
}
