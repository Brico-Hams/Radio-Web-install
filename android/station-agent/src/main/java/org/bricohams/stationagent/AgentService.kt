package org.bricohams.stationagent

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.ServiceInfo
import android.hardware.usb.UsbManager
import android.os.Build
import android.os.IBinder
import android.util.Log
import org.bricohams.radio.AnonymousDiagnostics
import org.java_websocket.client.WebSocketClient
import org.java_websocket.exceptions.WebsocketNotConnectedException
import org.java_websocket.handshake.ServerHandshake
import org.json.JSONException
import org.json.JSONObject
import java.io.IOException
import java.net.URI
import java.nio.ByteBuffer
import java.util.concurrent.ArrayBlockingQueue
import java.util.concurrent.RejectedExecutionException
import java.util.concurrent.ThreadPoolExecutor
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean
import javax.net.ssl.SSLParameters
import javax.net.ssl.SSLSocketFactory

class AgentService : Service() {
    private val worker = ThreadPoolExecutor(1, 1, 0, TimeUnit.SECONDS, ArrayBlockingQueue(1))
    private val stopping = AtomicBoolean()
    @Volatile private var usb: UsbCat? = null
    @Volatile private var socket: WebSocketClient? = null
    private var registered = false
    private val app get() = application as AgentApplication
    private var deviceName: String? = null
    private val detached = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            if (intent.action == UsbManager.ACTION_USB_DEVICE_DETACHED &&
                intent.usbDevice()?.deviceName == deviceName) fail(R.string.usb_failed, "usb")
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (app.running) return START_NOT_STICKY
        val config = app.pending
        app.pending = null
        if (config == null) {
            fail(R.string.connection_failed, "native")
            return START_NOT_STICKY
        }
        val notifications = getSystemService(NotificationManager::class.java)
        notifications.createNotificationChannel(NotificationChannel(
            "usb-agent", getString(R.string.app_name), NotificationManager.IMPORTANCE_LOW
        ))
        val launch = PendingIntent.getActivity(
            this, 0, Intent(this, AgentActivity::class.java), PendingIntent.FLAG_IMMUTABLE
        )
        val notification = Notification.Builder(this, "usb-agent")
            .setSmallIcon(android.R.drawable.stat_notify_sync)
            .setContentTitle(getString(R.string.app_name))
            .setContentText(getString(R.string.readonly_notice))
            .setContentIntent(launch).setOngoing(true).setVisibility(Notification.VISIBILITY_PRIVATE).build()
        try {
            if (Build.VERSION.SDK_INT >= 29) {
                startForeground(1, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_CONNECTED_DEVICE)
            } else {
                startForeground(1, notification)
            }
        } catch (error: SecurityException) {
            fail(R.string.permission_failed, "native", error)
            return START_NOT_STICKY
        }
        app.running = true
        app.status = R.string.connecting
        deviceName = config.deviceName
        if (Build.VERSION.SDK_INT >= 33) {
            registerReceiver(detached, IntentFilter(UsbManager.ACTION_USB_DEVICE_DETACHED), RECEIVER_NOT_EXPORTED)
        } else {
            registerReceiver(detached, IntentFilter(UsbManager.ACTION_USB_DEVICE_DETACHED))
        }
        registered = true
        worker.execute {
            try {
                val manager = getSystemService(UsbManager::class.java)
                val device = manager.deviceList[config.deviceName] ?: throw IOException("USB disconnected")
                val opened = UsbCat(manager, device, config)
                usb = opened
                if (stopping.get()) {
                    opened.close()
                    usb = null
                    return@execute
                }
                openLink(config)
            } catch (error: IOException) {
                fail(R.string.usb_failed, "usb", error)
            } catch (error: SecurityException) {
                fail(R.string.permission_failed, "usb", error)
            } catch (error: IllegalArgumentException) {
                fail(R.string.input_failed, "usb", error)
            }
        }
        return START_NOT_STICKY
    }

    private fun openLink(config: AgentConfig) {
        val uri = URI(config.origin.replaceFirst("https://", "wss://") + AgentProtocol.PATH.drop(1))
        val client = object : WebSocketClient(uri, AgentDraft(), null, 5000) {
            override fun onSetSSLParameters(parameters: SSLParameters) {
                parameters.endpointIdentificationAlgorithm = "HTTPS"
                parameters.protocols = parameters.protocols.filter { it == "TLSv1.2" || it == "TLSv1.3" }.toTypedArray()
            }
            override fun onOpen(handshake: ServerHandshake) {
                send(JSONObject().put("token", config.token).toString())
                send(JSONObject().put("type", "hello").put("identity", "ID0840;")
                    .put("vid", 0x10c4).put("pid", 0xea70).put("port", 0).toString())
            }
            override fun onMessage(message: ByteBuffer) = fail(R.string.connection_failed, "api")
            override fun onMessage(message: String) {
                try {
                    val request = AgentProtocol.parse(message)
                    when (request.getString("type")) {
                        "ready" -> app.status = R.string.connected
                        "ping" -> send(JSONObject().put("type", "pong").toString())
                        "query" -> {
                            if (app.status != R.string.connected) throw IOException("Link not ready")
                            worker.execute {
                                try {
                                    val cat = usb?.cat ?: throw IOException("USB disconnected")
                                    val reply = cat.read(request.getString("command"))
                                    if (!stopping.get()) send(JSONObject()
                                        .put("type", "reply").put("id", request.getString("id"))
                                        .put("identity", "ID0840;").put("reply", reply).toString())
                                } catch (error: IOException) {
                                    fail(R.string.usb_failed, "cat", error)
                                } catch (error: IllegalArgumentException) {
                                    fail(R.string.input_failed, "cat", error)
                                } catch (error: WebsocketNotConnectedException) {
                                    fail(R.string.connection_failed, "api", error)
                                }
                            }
                        }
                    }
                } catch (error: IOException) {
                    fail(R.string.connection_failed, "api", error)
                } catch (error: JSONException) {
                    fail(R.string.connection_failed, "api", error)
                } catch (error: RejectedExecutionException) {
                    fail(R.string.connection_failed, "api", error)
                } catch (error: WebsocketNotConnectedException) {
                    fail(R.string.connection_failed, "api", error)
                }
            }
            override fun onClose(code: Int, reason: String, remote: Boolean) {
                if (!stopping.get()) fail(R.string.connection_failed, "api")
            }
            override fun onError(error: Exception) = fail(R.string.connection_failed, "api", error)
        }
        client.setSocketFactory(SSLSocketFactory.getDefault())
        client.connectionLostTimeout = 5
        socket = client
        if (!stopping.get()) client.connect()
    }

    private fun fail(status: Int, source: String, error: Throwable? = null) {
        if (stopping.compareAndSet(false, true)) {
            app.status = status
            Log.w("BricoHamsAgent", "Agent operation failed (${error?.javaClass?.simpleName ?: "closed"})")
            AnonymousDiagnostics.record("connection_failed", source, "error", error)
            stopSelf()
        }
    }

    override fun onDestroy() {
        stopping.set(true)
        socket?.closeConnection(1000, "Stopped")
        worker.shutdownNow()
        try { usb?.close() }
        catch (error: IOException) {
            Log.w("BricoHamsAgent", "USB close failed")
            AnonymousDiagnostics.record("usb_failed", "usb", "warning", error)
        }
        usb = null
        if (registered) unregisterReceiver(detached)
        app.running = false
        if (app.status == R.string.connected || app.status == R.string.connecting) {
            app.status = R.string.disconnected
        }
        stopForeground(STOP_FOREGROUND_REMOVE)
        super.onDestroy()
    }
}
