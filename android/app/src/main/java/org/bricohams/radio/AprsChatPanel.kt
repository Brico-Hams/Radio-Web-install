package org.bricohams.radio

import android.app.Activity
import android.app.AlertDialog
import android.content.SharedPreferences
import android.text.InputType
import android.view.View
import android.widget.CheckBox
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.TextView
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale
import java.util.concurrent.Executor

/**
 * APRS message UI shared by the RT-950 Pro screen and the generic chat screen. It talks to whatever [KissLink] the host
 * currently holds; every transmission is confirmed by the user and needs a valid callsign. [worker] runs the link writes.
 */
class AprsChatPanel(
    private val activity: Activity,
    private val preferences: SharedPreferences,
    private val colors: Brand.Palette,
    private val worker: Executor,
    private val linkProvider: () -> KissLink?,
    private val notice: (String) -> Unit
) {
    private companion object { const val MAX_LOG = 30 }

    private val clock = DateTimeFormatter.ofPattern("HH:mm:ss", Locale.ROOT).withZone(ZoneId.systemDefault())
    private val variants = java.util.concurrent.ConcurrentHashMap<String, String>()
    private val messenger: AprsMessenger = AprsMessenger("", true) { frame ->
        worker.execute {
            try {
                val link = linkProvider() ?: throw LocalizedStateException(UiText(R.string.err_aprs_no_link))
                val via = link.variant
                val packet = AprsText.parse(frame.info)
                if (via != null && packet is AprsPacket.Message && packet.id != null) variants[packet.id] = via
                link.send(link.limits.check(frame))
            } catch (error: Exception) {
                messenger.abortPending()
                activity.runOnUiThread { notice(activity.errorText(error)) }
            }
        }
    }
    private val safety = activity.getSharedPreferences(Rt950Safety.PREFERENCES, Activity.MODE_PRIVATE)
    private lateinit var myCall: EditText
    private lateinit var autoAck: CheckBox
    private lateinit var toEdit: EditText
    private lateinit var textEdit: EditText
    private lateinit var conversation: TextView
    private lateinit var packetLog: TextView
    private lateinit var linkNotice: TextView
    private lateinit var powerCycleBox: LinearLayout

    private val callType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_FLAG_CAP_CHARACTERS

    private fun note(parent: LinearLayout, text: Int) =
        parent.addView(Brand.text(activity, 13f, colors.muted).apply { setText(text) })

    private fun field(parent: LinearLayout, label: Int, initial: String, type: Int): EditText {
        note(parent, label)
        return EditText(activity).apply {
            setTextColor(colors.text); setHintTextColor(colors.muted)
            inputType = type
            setText(initial)
            contentDescription = activity.getString(label)
            layoutParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT)
            parent.addView(this)
        }
    }

    /** Adds the message controls to [card]; [help] is the string resource shown above them. */
    fun build(card: LinearLayout, help: Int) {
        note(card, help)
        linkNotice = Brand.text(activity, 13f, colors.accent, true).apply { visibility = View.GONE; setText(R.string.aprs_chat_rx_only) }
        card.addView(linkNotice)
        powerCycleBox = LinearLayout(activity).apply { orientation = LinearLayout.VERTICAL; visibility = View.GONE }
        powerCycleBox.addView(Brand.text(activity, 15f, colors.accent, true).apply { setText(R.string.aprs_chat_power_cycle_banner) })
        powerCycleBox.addView(Brand.button(activity, activity.getString(R.string.aprs_chat_power_cycle_confirm), false) {
            Rt950Safety.recordPowerCycle(safety)
            render()
        })
        card.addView(powerCycleBox)
        myCall = field(card, R.string.rt950_msg_callsign, preferences.getString("callsign", "") ?: "", callType)
        autoAck = CheckBox(activity).apply {
            setText(R.string.rt950_msg_auto_ack)
            setTextColor(colors.text)
            isChecked = preferences.getBoolean("auto-ack", true)
            minHeight = Brand.dp(activity, 48)
            card.addView(this)
        }
        toEdit = field(card, R.string.rt950_msg_to, "", callType)
        textEdit = field(card, R.string.rt950_msg_text, "", InputType.TYPE_CLASS_TEXT)
        card.addView(Brand.button(activity, activity.getString(R.string.rt950_msg_send), true) { requestSend() })
        card.addView(Brand.text(activity, 15f, colors.accent, true).apply { setText(R.string.rt950_msg_conversations) })
        conversation = Brand.text(activity, 14f).apply { accessibilityLiveRegion = View.ACCESSIBILITY_LIVE_REGION_POLITE }
        card.addView(conversation)
        card.addView(Brand.text(activity, 15f, colors.accent, true).apply { setText(R.string.rt950_msg_packets) })
        packetLog = Brand.text(activity, 12f, colors.muted)
        card.addView(packetLog)
    }

    fun suggestCallsign(call: String) {
        if (myCall.text.isNullOrBlank()) myCall.setText(call)
    }

    /** Fills the draft only; nothing is sent until the user confirms as usual. */
    fun prefill(to: String, text: String) {
        toEdit.setText(to)
        textEdit.setText(text)
    }

    /** An automatic ack is also an RF transmission, so it needs a valid callsign too. */
    private fun sync() {
        messenger.callsign = myCall.text.toString().trim().uppercase()
        val allowed = linkProvider()?.txAllowed != false
        messenger.autoAck = autoAck.isChecked && allowed && Ax25Address.isValid(messenger.callsign)
    }

    /** Call once per second on the UI thread: retries pending messages and refreshes the screen. */
    fun tick() {
        sync()
        val link = linkProvider()
        worker.execute {
            if (link == null || !link.txAllowed) messenger.abortPending()
            else try { messenger.tick(System.currentTimeMillis()) } catch (_: Exception) {}
        }
        render()
    }

    /** AX.25 payload of a received KISS data frame (any thread). */
    fun onFrame(ax25: ByteArray) {
        messenger.receive(ax25, System.currentTimeMillis())
        activity.runOnUiThread { render() }
    }

    private fun requestSend() {
        try {
            sync()
            val link = linkProvider() ?: throw LocalizedStateException(UiText(R.string.err_aprs_no_link))
            if (!link.txAllowed) throw LocalizedStateException(UiText(R.string.err_aprs_rt950_tx_off))
            val call = messenger.callsign
            requireUi(call.isNotEmpty() && Ax25Address.isValid(call)) { UiText(R.string.err_aprs_no_callsign) }
            val to = Ax25Address.parse(toEdit.text.toString()).toString()
            val text = textEdit.text.toString().trim()
            link.limits.check(messenger.draft(to, text))
            AlertDialog.Builder(activity).setTitle(R.string.aprs_tx_title)
                .setMessage(activity.getString(R.string.aprs_tx_body, call, to, text, activity.getString(link.txNote)))
                .setNegativeButton(R.string.action_cancel, null)
                .setPositiveButton(R.string.aprs_tx_confirm) { _, _ -> transmit(to, text) }.show()
        } catch (error: IllegalArgumentException) {
            notice(activity.errorText(error))
        } catch (error: IllegalStateException) {
            notice(activity.errorText(error))
        }
    }

    private fun transmit(to: String, text: String) {
        try {
            sync()
            messenger.send(to, text, System.currentTimeMillis())
            preferences.edit().putString("callsign", messenger.callsign).putBoolean("auto-ack", autoAck.isChecked).apply()
            textEdit.setText("")
            render()
        } catch (error: IllegalArgumentException) {
            notice(activity.errorText(error))
        }
    }

    private fun stateText(state: AprsMessenger.State) = activity.getString(when (state) {
        AprsMessenger.State.RECEIVED -> R.string.rt950_state_received
        AprsMessenger.State.PENDING -> R.string.rt950_state_pending
        AprsMessenger.State.ACKED -> R.string.rt950_state_acked
        AprsMessenger.State.REJECTED -> R.string.rt950_state_rejected
        AprsMessenger.State.FAILED -> R.string.rt950_state_failed
    })

    fun render() {
        val rt950 = linkProvider() as? Rt950BleKissLink
        linkNotice.visibility = if (rt950 != null && !rt950.txAllowed) View.VISIBLE else View.GONE
        powerCycleBox.visibility = if (Rt950Safety.needsPowerCycle(safety)) View.VISIBLE else View.GONE
        val lines: List<String>
        val packets: List<String>
        synchronized(messenger) {
            lines = messenger.entries.takeLast(MAX_LOG).map {
                if (it.outgoing) activity.getString(R.string.rt950_msg_out, it.peer, it.text, stateText(it.state), it.attempts) +
                    (it.id?.let { id -> variants[id] }?.let { via -> activity.getString(R.string.aprs_chat_variant, via) } ?: "")
                else activity.getString(R.string.rt950_msg_in, it.peer, it.text)
            }
            packets = messenger.log.takeLast(MAX_LOG).map { "${clock.format(Instant.ofEpochMilli(it.time))} ${it.source}>${it.path}: ${it.text}" }
        }
        conversation.text = if (lines.isEmpty()) activity.getString(R.string.rt950_msg_none) else lines.joinToString("\n")
        packetLog.text = packets.joinToString("\n")
    }
}
