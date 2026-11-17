package org.bricohams.radio

import android.content.Context
import java.io.IOException
import java.util.Locale

/** Step of the CAT connection that failed, shown to the user and written to the CAT log. */
enum class CatStep(val label: Int) {
    OPEN(R.string.cat_step_open),
    IDENTIFY(R.string.cat_step_identify),
    STATUS(R.string.cat_step_status)
}

/** The CAT link could not be brought up: names the transport, the USB id and the step so the report is actionable. */
class CatConnectException(val transport: CatTransport, val vendorId: Int, val productId: Int, val step: CatStep,
    cause: Throwable) : IOException("CAT $transport ${CatLink.usbId(vendorId, productId)} $step: ${cause.message}", cause), LocalizedError {
    override val text = UiText(R.string.cat_connect_failed, UiText(transport.label), CatLink.usbId(vendorId, productId),
        UiText(step.label), cause)
}

object CatLink {
    fun usbId(vendorId: Int, productId: Int) = String.format(Locale.ROOT, "%04X:%04X", vendorId, productId)

    /** BricoHams firmware over the USB-C port: USB CDC ACM. */
    const val CDC_VENDOR = 0x36B7
    const val CDC_PRODUCT = 0xFFFF

    fun isBricoHamsCdc(vendorId: Int, productId: Int) = vendorId == CDC_VENDOR && productId == CDC_PRODUCT

    /** The transport the saved profile resolves to: a stored 36B7:FFFF device is always CDC, whatever the profile stored. */
    fun transportFor(stored: CatTransport?, radio: ProfileRadio?, usb: UsbIdentity?): CatTransport? {
        if (radio == ProfileRadio.UVK5 && usb != null && isBricoHamsCdc(usb.vendorId, usb.productId)) return CatTransport.USB_CDC
        return stored?.takeIf { radio != null && it in radio.transports } ?: radio?.transports?.firstOrNull()
    }

    /**
     * Opens the link and runs the handshake (hello + first status). [publish] receives the open port and protocol as soon as
     * they exist so the owner can release them. Any failure closes the port and is reported with its [CatStep]; a radio that
     * only is not armed ([CatNotArmedException]) is not a failure: the link stays open and the exception propagates.
     */
    fun connect(transport: CatTransport, vendorId: Int, productId: Int, open: () -> RadioBytes,
        protocol: (RadioBytes) -> CatProtocol, publish: (RadioBytes, CatProtocol) -> Unit, sessionTimestamp: Int = System.currentTimeMillis().toInt()): CatState {
        fun failure(step: CatStep, cause: Exception, port: RadioBytes?): CatConnectException {
            try { port?.close() } catch (cleanup: IOException) { cause.addSuppressed(cleanup) }
            return CatConnectException(transport, vendorId, productId, step, cause)
        }
        val port = try { open() } catch (error: IOException) { throw failure(CatStep.OPEN, error, null) }
        catch (error: IllegalArgumentException) { throw failure(CatStep.OPEN, error, null) }
        catch (error: IllegalStateException) { throw failure(CatStep.OPEN, error, null) }
        catch (error: SecurityException) { throw failure(CatStep.OPEN, error, null) }
        val cat = protocol(port)
        publish(port, cat)
        try {
            cat.identify(sessionTimestamp)
        } catch (error: IOException) { throw failure(CatStep.IDENTIFY, error, port) }
        catch (error: IllegalArgumentException) { throw failure(CatStep.IDENTIFY, error, port) }
        try {
            return cat.query()
        } catch (error: CatNotArmedException) { throw error }
        catch (error: IOException) { throw failure(CatStep.STATUS, error, port) }
        catch (error: IllegalArgumentException) { throw failure(CatStep.STATUS, error, port) }
    }
}

/** Last CAT failures, kept in preferences so the diagnostics report (shareable) includes them; also sent to logcat. */
object CatLog {
    private const val PREFERENCES = "cat-log"
    private const val KEEP = 5

    fun record(context: Context, line: String, error: Throwable? = null) {
        android.util.Log.e("BricohamsCAT", line, error)
        val prefs = context.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE)
        val lines = (lines(context) + line).takeLast(KEEP)
        prefs.edit().putString("lines", lines.joinToString("\n")).apply()
    }

    fun lines(context: Context): List<String> =
        context.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE).getString("lines", null)?.lines()?.filter { it.isNotEmpty() } ?: emptyList()
}
