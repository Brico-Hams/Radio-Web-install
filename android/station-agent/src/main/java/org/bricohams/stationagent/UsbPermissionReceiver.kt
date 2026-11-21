package org.bricohams.stationagent

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.hardware.usb.UsbManager
import android.util.Log
import org.bricohams.radio.AnonymousDiagnostics

class UsbPermissionReceiver : BroadcastReceiver() {
    companion object {
        const val ACTION = "org.bricohams.stationagent.USB_PERMISSION"
        fun begin(context: Context) {
            val app = context.applicationContext as AgentApplication
            val config = app.pending ?: return
            val manager = context.getSystemService(UsbManager::class.java)
            val device = manager.deviceList[config.deviceName]
            if (device == null || !manager.hasPermission(device)) {
                app.pending = null
                app.status = R.string.permission_failed
                Log.w("BricoHamsAgent", "USB permission unavailable")
                AnonymousDiagnostics.record("usb_failed", "usb", "warning", SecurityException())
                return
            }
            try {
                context.startForegroundService(Intent(context, AgentService::class.java))
            } catch (error: IllegalStateException) {
                failed(app, error)
            } catch (error: SecurityException) {
                failed(app, error)
            }
        }
        private fun failed(app: AgentApplication, error: Exception) {
            app.pending = null
            app.status = R.string.permission_failed
            Log.w("BricoHamsAgent", "Foreground USB service could not start")
            AnonymousDiagnostics.record("usb_failed", "native", "error", error)
        }
    }

    override fun onReceive(context: Context, intent: Intent) {
        val app = context.applicationContext as AgentApplication
        val config = app.pending ?: return
        if (intent.action != ACTION || intent.usbDevice()?.deviceName != config.deviceName) {
            Log.w("BricoHamsAgent", "Unexpected USB permission response")
            return
        }
        begin(context)
    }
}
