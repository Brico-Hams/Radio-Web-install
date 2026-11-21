package org.bricohams.stationcore

import org.bricohams.radio.AnonymousDiagnostics
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.annotation.Config
import java.io.IOException
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [28])
class SharedDiagnosticsTest {
    private fun inspect(): JSONObject {
        val done = CountDownLatch(1)
        var result: Result<String?>? = null
        AnonymousDiagnostics.inspect { result = it; done.countDown() }
        assertTrue(done.await(5, TimeUnit.SECONDS))
        return JSONObject(result!!.getOrThrow()!!)
    }

    @Test fun stationAgentUsesItsOwnEnvelopeWithoutExceptionOrDeviceDetails() {
        AnonymousDiagnostics.initialize(RuntimeEnvironment.getApplication(), "station-agent", "0.1.0")
        val failure = IOException("private token and USB serial number")
        failure.stackTrace = arrayOf(
            StackTraceElement("org.bricohams.stationagent.UsbCat", "read", "UsbCat.kt", 123)
        )
        AnonymousDiagnostics.record("operation_failed", "cat", "error", failure)
        val report = inspect()
        assertEquals("station-agent", report.getString("component"))
        assertEquals("0.1.0", report.getString("version"))
        assertTrue(AnonymousDiagnostics.validReport(report))
        val event = report.getJSONArray("events").getJSONObject(0)
        assertEquals(123, event.getInt("line"))
        assertEquals("io", event.getString("error_type"))
        assertFalse(report.toString().contains("private"))
        assertFalse(report.toString().contains("serial"))
        assertFalse(AnonymousDiagnostics.enabled())
    }

    @Test fun invalidIdentityCannotReplaceOrInitializeAReporter() {
        val context = RuntimeEnvironment.getApplication()
        assertThrows(IllegalArgumentException::class.java) {
            AnonymousDiagnostics.initialize(context, "unrecognized", "0.1.0")
        }
        assertThrows(IllegalArgumentException::class.java) {
            AnonymousDiagnostics.initialize(context, "station-agent", "0.1.0-private-id")
        }
        AnonymousDiagnostics.initialize(context, "station-agent", "0.1.0")
        assertThrows(IllegalArgumentException::class.java) {
            AnonymousDiagnostics.initialize(context, "radicodex", "0.1.0")
        }
        assertThrows(IllegalArgumentException::class.java) {
            AnonymousDiagnostics.initialize(context, "station-agent", "1.0.0")
        }
        AnonymousDiagnostics.initialize(context, "station-agent", "0.1.0")
        val report = inspect()
        assertEquals("station-agent", report.getString("component"))
        assertEquals("0.1.0", report.getString("version"))
        assertFalse(AnonymousDiagnostics.enabled())
    }
}
