package org.bricohams.radio

import org.json.JSONObject
import org.junit.After
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [28], qualifiers = "es")
class AnonymousDiagnosticsTest {
    @After fun releaseDiagnostics() = AnonymousDiagnostics.reset()

    @Test fun repeatedErrorRenderingIsRecordedOncePerClassPerMinute() {
        ErrorRecordDedupe.clear()
        val error = IllegalStateException("x")
        assertTrue(ErrorRecordDedupe.shouldRecord("operation_failed", error, 1_000))
        assertFalse(ErrorRecordDedupe.shouldRecord("operation_failed", error, 30_000))
        assertTrue(ErrorRecordDedupe.shouldRecord("operation_failed", java.io.IOException(), 30_000))
        assertTrue(ErrorRecordDedupe.shouldRecord("operation_failed", error, 61_001))
    }

    private fun inspect(): String {
        val done = CountDownLatch(1)
        var result: Result<String?>? = null
        AnonymousDiagnostics.inspect { result = it; done.countDown() }
        assertTrue(done.await(5, TimeUnit.SECONDS))
        return result!!.getOrThrow() ?: ""
    }

    @Test fun reportsDoNotContainExceptionTextAndRejectPrivateFields() {
        val controller = Robolectric.buildActivity(AnonymousDiagnosticsActivity::class.java).setup()
        try {
            AnonymousDiagnostics.disable()
            AnonymousDiagnostics.record("operation_failed", "usb", "error",
                IllegalArgumentException("TOKEN EA5XYZ C:\\Users\\private"))
            val text = inspect()
            for (secret in listOf("TOKEN", "EA5XYZ", "private", "Users")) assertFalse(text.contains(secret))
            val report = JSONObject(text)
            assertEquals("radicodex", report.getString("component"))
            assertEquals(BuildConfig.VERSION_NAME, report.getString("version"))
            assertTrue(AnonymousDiagnostics.validReport(report))
            report.put("callsign", "EA5XYZ")
            assertFalse(AnonymousDiagnostics.validReport(report))
        } finally { controller.pause().stop().destroy() }
    }

    @Test fun sendingIsDisabledByDefaultAndUnsafeConfigurationIsRejected() {
        val controller = Robolectric.buildActivity(AnonymousDiagnosticsActivity::class.java).setup()
        try {
            assertFalse(AnonymousDiagnostics.enabled())
            for (url in listOf("http://radio", "https://token@radio", "https://radio/path")) {
                assertThrows(IllegalArgumentException::class.java) { AnonymousDiagnostics.enable(url, "d".repeat(32)) }
            }
            assertThrows(IllegalArgumentException::class.java) { AnonymousDiagnostics.enable("https://radio", "short") }
            assertFalse(AnonymousDiagnostics.enabled())
        } finally { controller.pause().stop().destroy() }
    }

    @Test fun clearConfirmsDeletionAndDisablesSending() {
        val controller = Robolectric.buildActivity(AnonymousDiagnosticsActivity::class.java).setup()
        try {
            assertTrue(inspect().isNotEmpty())
            val done = CountDownLatch(1)
            var result: Result<Unit>? = null
            AnonymousDiagnostics.clear { result = it; done.countDown() }
            assertTrue(done.await(5, TimeUnit.SECONDS))
            result!!.getOrThrow()
            assertEquals("", inspect())
            assertFalse(AnonymousDiagnostics.enabled())
        } finally { controller.pause().stop().destroy() }
    }
}
