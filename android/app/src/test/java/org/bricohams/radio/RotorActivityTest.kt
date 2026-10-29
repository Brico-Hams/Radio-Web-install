package org.bricohams.radio

import android.app.Activity
import android.content.Intent
import android.os.Looper
import android.view.View
import android.view.ViewGroup
import android.widget.EditText
import android.widget.TextView
import org.json.JSONObject
import org.junit.After
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.Shadows.shadowOf
import org.robolectric.annotation.Config
import org.robolectric.util.ReflectionHelpers
import java.io.File
import java.time.LocalDate
import java.time.ZoneOffset
import java.util.Collections
import java.util.concurrent.ExecutorService
import java.util.concurrent.TimeUnit

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [28], qualifiers = "es")
class RotorActivityTest {
    private class Rotor : RotorTransport {
        val calls: MutableList<Pair<String, JSONObject?>> = Collections.synchronizedList(ArrayList())
        @Volatile var status = JSONObject("""{"apiVersion":2,"firmwareVersion":"0.3.0-prototype","mode":"IDLE","homed":true,
            "calibrated":true,"level":true,"utcValid":true,"timeSource":"gnss","siteValid":true,"northOffset":0,
            "azMechanical":-180,"el":0,"maxDegPerSecond":5.94,"microsteps":8}""")
        var closed = false
        override fun exchange(method: String, path: String, body: JSONObject?): RotorResponse {
            if (path == "/api/status") return RotorResponse(200, JSONObject(status.toString()))
            calls.add(path to body)
            return RotorResponse(if (path == "/api/move" || path == "/api/home") 202 else 200, JSONObject().put("ok", true))
        }
        override fun close() { closed = true }
        fun paths() = synchronized(calls) { calls.map { it.first } }
    }

    private fun views(view: View): List<View> = listOf(view) +
        if (view is ViewGroup) (0 until view.childCount).flatMap { views(view.getChildAt(it)) } else emptyList()
    private fun all(activity: Activity) = views(activity.window.decorView)
    private fun text(activity: Activity) = all(activity).filterIsInstance<TextView>().joinToString("\n") { it.text }
    private fun click(activity: Activity, label: String) {
        val target = all(activity).filterIsInstance<TextView>().first { it.text.toString() == label && it.isShown }
        assertTrue(label, target.performClick())
    }
    private fun idle(activity: Activity) = repeat(3) {
        ReflectionHelpers.getField<ExecutorService>(activity, "worker").submit {}.get(60, TimeUnit.SECONDS)
        shadowOf(Looper.getMainLooper()).idle()
    }
    private fun freshTle(): Tle {
        val today = LocalDate.now(ZoneOffset.UTC)
        val epoch = "%02d%03d.00000000".format(java.util.Locale.ROOT, today.year % 100, today.dayOfYear)
        val base = SatellitesTest.tle.line1.substring(0, 18) + epoch + SatellitesTest.tle.line1.substring(32, 68)
        val checksum = base.sumOf { if (it in '0'..'9') it - '0' else if (it == '-') 1 else 0 } % 10
        return Tle("ISS (ZARYA)", base + checksum, SatellitesTest.tle.line2)
    }
    private fun upcomingPlan(): SatellitePlan {
        val tle = freshTle()
        val pass = SatelliteOrbit(tle, SatellitesTest.observer, File("src/main/assets/satellite-6.0.1.js").readText(),
            File("src/main/assets/orbital-engine.js").readText()).use { orbit ->
            orbit.predict(System.currentTimeMillis() + 120_000).first { !it.partialStart }
        }
        return SatellitePlan(tle, SatellitesTest.observer, 145800000, pass)
    }

    @After fun restoreTransport() { RotorActivity.transportFactory = null }

    @Test fun connectsPreparesPassAndStopsThroughInjectedTransport() {
        val rotor = Rotor()
        var opened: Pair<Boolean, String>? = null
        RotorActivity.transportFactory = { _, ble, token -> opened = ble to token; rotor }
        val plan = upcomingPlan()
        val intent = Intent(RuntimeEnvironment.getApplication(), RotorActivity::class.java)
            .putExtra(RotorActivity.EXTRA_PLAN, SatellitePlanJson.encode(plan))
        val controller = Robolectric.buildActivity(RotorActivity::class.java, intent).setup()
        try {
            val activity = controller.get()
            idle(activity)
            assertTrue(text(activity), text(activity).contains("ISS (ZARYA): AOS"))

            activity.findViewById<EditText>(R.id.rotor_token).setText("short")
            click(activity, "Conectar")
            assertTrue(text(activity).contains("El token debe tener 24-128 caracteres ASCII."))
            assertNull(opened)

            val token = "bricohams-token-0123456789"
            activity.findViewById<EditText>(R.id.rotor_token).setText(token)
            click(activity, "Conectar")
            idle(activity)
            assertEquals(false to token, opened)
            assertTrue(text(activity), text(activity).contains("Modo IDLE · firmware 0.3.0-prototype (API 2) · Wi-Fi del rotor"))
            assertTrue(text(activity), text(activity).contains("Pre-posición: AZ mecánico"))

            click(activity, "Preparar pase: cargar TLE y apuntar a AOS")
            idle(activity)
            assertEquals(listOf("/api/time", "/api/site", "/api/tle", "/api/select", "/api/move"), rotor.paths())
            val move = requireNotNull(rotor.calls.last().second)
            val aos = RotorPlanner.mechanical(plan.pass.aos.azimuth, 0.0)
            assertEquals(aos, move.getDouble("az"), 2.0)
            assertTrue(text(activity), text(activity).contains("Pase preparado: TLE cargado"))
            assertTrue(requireNotNull(rotor.calls[2].second).getString("text").contains(plan.tle.line1))

            click(activity, "Seguir automáticamente desde AOS")
            assertTrue(text(activity).contains("Cancelar seguimiento automático"))
            click(activity, "PARAR motores")
            idle(activity)
            assertEquals("/api/stop", rotor.paths().last())
            assertTrue(text(activity).contains("Motores parados."))
            assertTrue(text(activity).contains("Seguir automáticamente desde AOS"))

            rotor.status = JSONObject(rotor.status.toString()).put("homed", false)
            click(activity, "Preparar pase: cargar TLE y apuntar a AOS")
            idle(activity)
            assertTrue(text(activity).contains("Haz primero el homing."))
            assertEquals("/api/stop", rotor.paths().last())

            click(activity, "Desconectar")
            idle(activity)
            assertTrue(rotor.closed)
        } finally {
            controller.pause().stop().destroy()
        }
    }

    @Test fun withoutPlanOrConnectionExplainsWhatIsMissing() {
        val controller = Robolectric.buildActivity(RotorActivity::class.java).setup()
        try {
            val activity = controller.get()
            assertTrue(text(activity).contains("Abre el rotor desde el detalle de un pase"))
            click(activity, "Homing (buscar finales de carrera)")
            idle(activity)
            assertTrue(text(activity).contains("Conecta primero con el rotor."))
            click(activity, "Seguir automáticamente desde AOS")
            assertTrue(text(activity).contains("No hay pase seleccionado."))
        } finally {
            controller.pause().stop().destroy()
        }
    }
}
