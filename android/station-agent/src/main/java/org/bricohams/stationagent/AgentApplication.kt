package org.bricohams.stationagent

import android.app.Activity
import android.app.Application
import android.hardware.usb.UsbDevice
import android.content.Intent
import android.os.Build
import android.os.Bundle
import org.bricohams.radio.AnonymousDiagnostics
import org.bricohams.radio.RemoteStationUrl

class AgentConfig(origin: String, val token: String, val deviceName: String, val port: Int, val baud: Int) {
    val origin = RemoteStationUrl.parse(origin)
    init {
        validateToken(token)
        require(deviceName.isNotEmpty() && port == 0 && baud == 38400) { "Invalid USB selection" }
    }
    companion object {
        fun validateToken(value: String) {
            require(value.length in 32..256 && value.all { it.code in 33..126 }) { "Invalid secret" }
        }
    }
}

fun Intent.usbDevice(): UsbDevice? = if (Build.VERSION.SDK_INT >= 33) {
    getParcelableExtra(android.hardware.usb.UsbManager.EXTRA_DEVICE, UsbDevice::class.java)
} else {
    @Suppress("DEPRECATION")
    getParcelableExtra(android.hardware.usb.UsbManager.EXTRA_DEVICE)
}

class AgentApplication : Application() {
    @Volatile var pending: AgentConfig? = null
    @Volatile var status = R.string.disconnected
    @Volatile var running = false
        set(value) {
            field = value
            AnonymousDiagnostics.foreground = visible || value
        }
    private var visible = false

    override fun onCreate() {
        super.onCreate()
        AnonymousDiagnostics.initialize(this, "station-agent", BuildConfig.VERSION_NAME)
        val previous = Thread.getDefaultUncaughtExceptionHandler()
        Thread.setDefaultUncaughtExceptionHandler { thread, error ->
            try { AnonymousDiagnostics.record("uncaught_error", "native", "error", error) }
            finally { previous?.uncaughtException(thread, error) }
        }
        registerActivityLifecycleCallbacks(object : ActivityLifecycleCallbacks {
            override fun onActivityResumed(activity: Activity) {
                visible = true
                AnonymousDiagnostics.foreground = true
            }
            override fun onActivityPaused(activity: Activity) {
                visible = false
                AnonymousDiagnostics.foreground = running
            }
            override fun onActivityCreated(activity: Activity, state: Bundle?) {}
            override fun onActivityStarted(activity: Activity) {}
            override fun onActivityStopped(activity: Activity) {}
            override fun onActivitySaveInstanceState(activity: Activity, state: Bundle) {}
            override fun onActivityDestroyed(activity: Activity) {}
        })
    }
}
