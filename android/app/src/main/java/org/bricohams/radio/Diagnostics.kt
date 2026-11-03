package org.bricohams.radio

import java.io.IOException
import java.net.InetAddress
import java.net.ServerSocket
import java.net.Socket
import java.net.SocketException
import java.util.Locale

/** Radios the app knows how to talk to, recognised from the USB ids alone (nothing is opened or sent). */
enum class RadioKind(val label: String, val model: RigModel?) {
    QUANSHENG("Quansheng UV-K5 (BricoHams Satellite)", null),
    FTX1("Yaesu FTX-1", RigModel.FTX1),
    TRUSDX("(tr)uSDX", RigModel.TRUSDX),
    QMX("QRP Labs QMX / QMX+", RigModel.QMX),
    UNKNOWN("?", null)
}

object RadioIdentifier {
    const val QUANSHENG_VID = 0x36B7
    const val QRP_LABS_VID = 0x26AA
    const val SILABS_VID = 0x10C4
    const val CP2105_PID = 0xEA70
    const val CH340_VID = 0x1A86
    const val CH340_PID = 0x7523

    fun identify(vendorId: Int, productId: Int): RadioKind = when {
        vendorId == QUANSHENG_VID -> RadioKind.QUANSHENG
        vendorId == QRP_LABS_VID -> RadioKind.QMX
        vendorId == SILABS_VID && productId == CP2105_PID -> RadioKind.FTX1
        vendorId == CH340_VID && productId == CH340_PID -> RadioKind.TRUSDX
        else -> RadioKind.UNKNOWN
    }
}

data class DiagStep(val name: String, val ok: Boolean, val detail: String, val skipped: Boolean = false)

data class DiagResult(val module: String, val steps: List<DiagStep>) {
    /** Steps that could not run on this radio/firmware ("pendiente") do not fail the module. */
    val passed get() = steps.isNotEmpty() && steps.all { it.ok || it.skipped }
}

/** Quansheng modules of the functional test; every one is read-only (the CAT tune restores the radio by itself). */
enum class QuanshengModule(val title: Int) {
    LINK(R.string.diag_mod_link), CHANNELS(R.string.diag_mod_channels), FLASH(R.string.diag_mod_flash),
    SLOTS(R.string.diag_mod_slots), PRESETS(R.string.diag_mod_presets), ARDF(R.string.diag_mod_ardf),
    PASSES(R.string.diag_mod_passes), CAT_TUNE(R.string.diag_mod_cat_tune)
}

/**
 * Functional self-test, one module at a time. It only reads and retunes the receive frequency and restores it afterwards;
 * it never keys the transmitter and never writes persistent memory. [label] resolves string resources so the logic stays
 * free of Android classes; [describe] turns an exception into text.
 */
class DiagnosticsRunner(
    private val label: (Int) -> String,
    private val describe: (Throwable) -> String = { it.message ?: it.javaClass.simpleName },
    private val clock: () -> Long = { System.nanoTime() / 1_000_000 },
    private val sleep: (Long) -> Unit = Thread::sleep
) {
    companion object {
        /** Receive-only test frequencies: inside every supported range, away from any beacon or repeater input. */
        fun testFrequency(model: RigModel): Long = when (model) {
            RigModel.FTX1 -> 145_800_000L
            else -> 7_100_000L
        }
        const val QUANSHENG_TEST_10HZ = 14_580_000L
        const val LEASE_CHECKS = 2
    }

    private class Steps(val describe: (Throwable) -> String) {
        val list = ArrayList<DiagStep>()
        /** Runs one step; a failure is recorded and returns null so later dependent steps can be skipped. */
        fun <T> run(name: String, block: () -> Pair<T, String>): T? = try {
            val (value, detail) = block()
            list.add(DiagStep(name, true, detail)); value
        } catch (error: Exception) {
            list.add(DiagStep(name, false, describe(error))); null
        }
        fun skip(name: String, reason: String) { list.add(DiagStep(name, false, reason)) }
        /** Like [run], but a radio/firmware that does not support the command is reported as pending, not as a failure. */
        fun <T> runOptional(name: String, block: () -> Pair<T, String>): T? = try {
            val (value, detail) = block()
            list.add(DiagStep(name, true, detail)); value
        } catch (error: IOException) {
            list.add(DiagStep(name, false, describe(error), skipped = true)); null
        } catch (error: CatNotArmedException) {
            list.add(DiagStep(name, false, describe(error), skipped = true)); null
        } catch (error: Exception) {
            list.add(DiagStep(name, false, describe(error))); null
        }
        fun pending(name: String, reason: String) { list.add(DiagStep(name, false, reason, skipped = true)) }
    }

    fun runRig(rig: Rig, kind: String = rig.model.label): DiagResult {
        val steps = Steps(describe)
        val model = rig.model
        steps.run(label(R.string.diag_step_identify)) { Unit to rig.identify() }
        val original = steps.run(label(R.string.diag_step_read)) {
            val hz = rig.frequency(Vfo.A); hz to mhzText(hz) + " MHz"
        }
        if (original == null) {
            steps.skip(label(R.string.diag_step_set), label(R.string.diag_skipped))
            steps.skip(label(R.string.diag_step_readback), label(R.string.diag_skipped))
            steps.skip(label(R.string.diag_step_restore), label(R.string.diag_skipped))
            return DiagResult(kind, steps.list)
        }
        val test = testFrequency(model).let { if (it == original) it + 1000 else it }
        val set = steps.run(label(R.string.diag_step_set)) { rig.setFrequency(Vfo.A, test); true to mhzText(test) + " MHz" }
        if (set != null) {
            steps.run(label(R.string.diag_step_readback)) {
                val hz = rig.frequency(Vfo.A)
                checkUi(hz == test) { UiText(R.string.err_rig_unconfirmed) }
                Unit to mhzText(hz) + " MHz"
            }
        } else steps.skip(label(R.string.diag_step_readback), label(R.string.diag_skipped))
        // The original frequency is restored even when the test frequency was refused or not confirmed.
        steps.run(label(R.string.diag_step_restore)) {
            rig.setFrequency(Vfo.A, original); Unit to mhzText(original) + " MHz"
        }
        return DiagResult(kind, steps.list)
    }

    fun runQuansheng(cat: CatProtocol, kind: String = RadioKind.QUANSHENG.label): DiagResult {
        val steps = Steps(describe)
        val hello = steps.run(label(R.string.diag_step_hello)) { Unit to cat.identify() }
        if (hello == null) {
            steps.skip(label(R.string.diag_step_tune), label(R.string.diag_skipped))
            steps.skip(label(R.string.diag_step_lease), label(R.string.diag_skipped))
            return DiagResult(kind, steps.list)
        }
        val tuned = steps.run(label(R.string.diag_step_tune)) {
            val state = cat.tune(QUANSHENG_TEST_10HZ)
            Unit to mhzText(state.frequency10Hz * 10) + " MHz"
        }
        if (tuned != null) {
            steps.run(label(R.string.diag_step_lease)) {
                val lease = CatLease(cat, QUANSHENG_TEST_10HZ, clock)
                repeat(LEASE_CHECKS) {
                    sleep(CatLease.RENEW_MS)
                    val result = lease.renewIfDue()
                    checkUi(result == CatLease.Result.RENEWED) { UiText(R.string.err_diag_lease, result.name) }
                }
                Unit to "$LEASE_CHECKS x " + CatLease.RENEW_MS + " ms"
            }
        } else steps.skip(label(R.string.diag_step_lease), label(R.string.diag_skipped))
        // Releasing the manual tune returns the radio to its nominal RX; it changes no stored setting.
        steps.run(label(R.string.diag_step_release)) { cat.stop(); Unit to "OK" }
        return DiagResult(kind, steps.list)
    }

    private fun ensureIdentified(memory: QuanshengMemory) { if (memory.firmware.isEmpty()) memory.identify() }

    /**
     * One read-only Quansheng module. Only these commands can be sent: hello, CAT query (op 0), PTT query (op 0, never key),
     * config/calibration reads, flash read + CRC, slot info, presets export, ARDF stats, pass-table reads (host_time 0).
     */
    fun runQuanshengModule(module: QuanshengModule, memory: QuanshengMemory, cat: CatProtocol): DiagResult {
        val steps = Steps(describe)
        val title = label(module.title)
        when (module) {
            QuanshengModule.LINK -> {
                val hello = steps.run(label(R.string.diag_step_hello)) { val name = memory.identify(); Unit to name }
                if (hello == null) return DiagResult(title, steps.list)
                steps.runOptional(label(R.string.diag_step_cat_hello)) { Unit to cat.identify() }
                steps.runOptional(label(R.string.diag_step_cat_status)) {
                    val state = cat.query()
                    Unit to "active=${state.active} remote=${state.remote} f=${mhzText(state.frequency10Hz * 10)} MHz"
                }
                steps.runOptional(label(R.string.diag_step_ptt_status)) {
                    val state = cat.pttQuery()
                    checkUi(!state.keyed) { UiText(R.string.err_diag_ptt_keyed) }
                    Unit to "armed=${state.armed} keyed=${state.keyed}"
                }
            }
            QuanshengModule.CHANNELS -> {
                steps.run(label(R.string.diag_step_channels)) {
                    ensureIdentified(memory)
                    val count = QuanshengChannels.read(memory.readConfiguration()).size
                    Unit to "$count canales"
                }
            }
            QuanshengModule.FLASH -> {
                steps.run(label(R.string.diag_step_calibration)) {
                    ensureIdentified(memory)
                    Unit to "${memory.readCalibration().size} bytes"
                }
                if (memory.legacyReadOnly) steps.pending(label(R.string.diag_step_flash_probe), label(R.string.diag_legacy_no_flash))
                else steps.run(label(R.string.diag_step_flash_probe)) {
                    val block = memory.readFlashBlock(0, 128)
                    checkUi(memory.flashRangeCrc(0, 128) == QuanshengMemory.crc32(block)) { UiText(R.string.err_flash_crc, "0") }
                    Unit to "CRC OK"
                }
            }
            QuanshengModule.SLOTS -> steps.runOptional(label(R.string.diag_step_slots)) {
                ensureIdentified(memory)
                val slots = QuanshengReadOnly(memory).slots()
                Unit to slots.joinToString(" ") { "${it.slot}:${it.name.ifEmpty { "-" }}" }
            }
            QuanshengModule.PRESETS -> steps.runOptional(label(R.string.diag_step_presets)) {
                ensureIdentified(memory)
                Unit to "BHSP ${QuanshengReadOnly(memory).spectrumPresets().size} bytes"
            }
            QuanshengModule.ARDF -> steps.runOptional(label(R.string.diag_step_ardf)) {
                ensureIdentified(memory)
                val stats = QuanshengReadOnly(memory).ardfStats()
                Unit to (stats?.let { "zorros=${it.foxCount} observados=${it.observedFoxes}" } ?: label(R.string.diag_ardf_no_session))
            }
            QuanshengModule.PASSES -> steps.runOptional(label(R.string.diag_step_passes)) {
                ensureIdentified(memory)
                val table = QuanshengReadOnly(memory).passTable()
                Unit to "${table.count} pases"
            }
            QuanshengModule.CAT_TUNE -> {
                val armed = steps.runOptional(label(R.string.diag_step_cat_status)) {
                    cat.identify()
                    val active = cat.query().active
                    active to active.toString()
                }
                if (armed == true) return runQuansheng(cat, title)
                steps.pending(label(R.string.diag_step_tune), label(R.string.diag_not_armed))
            }
        }
        return DiagResult(title, steps.list)
    }

    /** "Probar todo": every module in order; when the link itself fails the rest is reported as pending, not tried. */
    fun runQuanshengAll(memory: QuanshengMemory, cat: CatProtocol, onResult: (DiagResult) -> Unit = {}): List<DiagResult> {
        val results = ArrayList<DiagResult>()
        for (module in QuanshengModule.values()) {
            val linkOk = results.firstOrNull()?.steps?.firstOrNull()?.ok ?: true
            val result = if (module != QuanshengModule.LINK && !linkOk)
                DiagResult(label(module.title), listOf(DiagStep(label(R.string.diag_skipped), false, "", skipped = true)))
            else runQuanshengModule(module, memory, cat)
            results.add(result)
            onResult(result)
        }
        return results
    }
}

data class UsbEntry(val name: String, val vendorId: Int, val productId: Int, val driver: String?, val ports: Int, val kind: RadioKind)

object DiagnosticsReport {
    private fun hex(value: Int) = String.format(Locale.ROOT, "%04X", value)

    fun build(appVersion: String, device: String, whenText: String, devices: List<UsbEntry>, results: List<DiagResult>): String =
        buildString {
            appendLine("RadiCodex by BricoHams - Puente / Diagnostico")
            appendLine("App: $appVersion")
            appendLine("Telefono: $device")
            appendLine("Fecha: $whenText")
            appendLine()
            appendLine("Dispositivos USB serie: ${devices.size}")
            for (entry in devices) {
                appendLine("- ${entry.name} ${hex(entry.vendorId)}:${hex(entry.productId)} driver=${entry.driver ?: "-"} " +
                    "puertos=${entry.ports} -> ${entry.kind.label}")
            }
            for (result in results) {
                appendLine()
                appendLine("== ${result.module}: ${if (result.passed) "OK" else "FALLO"} ==")
                for (step in result.steps) {
                    val tag = if (step.ok) "OK" else if (step.skipped) "PENDIENTE" else "FALLO"
                    appendLine("  [$tag] ${step.name}: ${step.detail}")
                }
            }
        }
}

/**
 * Optional raw TCP bridge: whatever a LAN client sends goes to the radio and whatever the radio answers goes back, one client
 * at a time. It has no authentication, so it is off by default and the UI warns about it. [bindAddress] null = all interfaces.
 */
class TcpBridge(
    private val radio: RadioBytes,
    private val port: Int = DEFAULT_PORT,
    private val bindAddress: InetAddress? = null,
    private val onClient: (String?) -> Unit = {}
) {
    companion object {
        const val DEFAULT_PORT = 4532
        private const val SOCKET_POLL_MS = 100
        private const val RADIO_POLL_MS = 20
    }

    @Volatile private var server: ServerSocket? = null
    @Volatile private var running = false
    private var thread: Thread? = null

    val localPort get() = server?.localPort ?: -1

    @Synchronized fun start() {
        check(!running)
        val socket = ServerSocket(port, 1, bindAddress)
        server = socket
        running = true
        thread = Thread({ accept(socket) }, "tcp-bridge").apply { isDaemon = true; start() }
    }

    @Synchronized fun stop() {
        running = false
        try { server?.close() } catch (_: IOException) { }
        server = null
    }

    private fun accept(socket: ServerSocket) {
        while (running) {
            val client = try { socket.accept() } catch (_: IOException) { break }
            onClient(client.inetAddress?.hostAddress)
            try { serve(client) } catch (_: IOException) { } finally {
                try { client.close() } catch (_: IOException) { }
                onClient(null)
            }
        }
    }

    private fun serve(client: Socket) {
        client.soTimeout = SOCKET_POLL_MS
        val input = client.getInputStream()
        val output = client.getOutputStream()
        val buffer = ByteArray(512)
        while (running && !client.isClosed) {
            val count = try { input.read(buffer) } catch (_: java.net.SocketTimeoutException) { 0 }
            if (count < 0) return
            if (count > 0) radio.write(buffer.copyOf(count), 500)
            try {
                while (running) {
                    val bytes = radio.read(1, RADIO_POLL_MS)
                    output.write(bytes)
                }
            } catch (_: SocketException) {
                return
            } catch (_: IOException) {
                // No more bytes from the radio for now.
            }
            output.flush()
        }
    }
}
