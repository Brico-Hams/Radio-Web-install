package org.bricohams.radio

import android.content.Context
import java.io.IOException
import java.io.InterruptedIOException
import java.util.concurrent.CancellationException
import kotlin.contracts.ExperimentalContracts
import kotlin.contracts.InvocationKind
import kotlin.contracts.contract

/**
 * User-visible text identified by a string resource and resolved only at the UI boundary, so validators and
 * parsers stay free of Context. Arguments that are themselves [UiText] or [Throwable] are resolved recursively.
 */
class UiText(val id: Int, vararg args: Any?) {
    val args: List<Any?> = args.toList()

    fun resolve(context: Context): String = context.getString(id, *args.map { arg ->
        when (arg) {
            is UiText -> arg.resolve(context)
            is Throwable -> context.errorText(arg)
            else -> arg
        }
    }.toTypedArray())

    override fun equals(other: Any?) = other is UiText && other.id == id && other.args == args
    override fun hashCode() = 31 * id + args.hashCode()
    /** Context-free technical form used as exception message (logs, non-UI tests); never shown to users. */
    override fun toString() = "UiText(0x${Integer.toHexString(id)}" + args.joinToString("") { ", $it" } + ")"
}

/** Errors whose user-visible message is a localized resource. */
interface LocalizedError { val text: UiText }

class LocalizedArgumentException(override val text: UiText, cause: Throwable? = null) :
    IllegalArgumentException(text.toString(), cause), LocalizedError
class LocalizedStateException(override val text: UiText, cause: Throwable? = null) :
    IllegalStateException(text.toString(), cause), LocalizedError
class LocalizedIOException(override val text: UiText, cause: Throwable? = null) :
    IOException(text.toString(), cause), LocalizedError
class LocalizedInterruptedIOException(override val text: UiText) :
    InterruptedIOException(text.toString()), LocalizedError
class LocalizedCancellationException(override val text: UiText) :
    CancellationException(text.toString()), LocalizedError

@OptIn(ExperimentalContracts::class)
inline fun requireUi(value: Boolean, text: () -> UiText) {
    contract { returns() implies value; callsInPlace(text, InvocationKind.AT_MOST_ONCE) }
    if (!value) throw LocalizedArgumentException(text())
}

@OptIn(ExperimentalContracts::class)
inline fun checkUi(value: Boolean, text: () -> UiText) {
    contract { returns() implies value; callsInPlace(text, InvocationKind.AT_MOST_ONCE) }
    if (!value) throw LocalizedStateException(text())
}

@OptIn(ExperimentalContracts::class)
inline fun <T : Any> requireNotNullUi(value: T?, text: () -> UiText): T {
    contract { returns() implies (value != null); callsInPlace(text, InvocationKind.AT_MOST_ONCE) }
    return value ?: throw LocalizedArgumentException(text())
}

/** Localized text for an error: resource-backed for [LocalizedError], raw diagnostic otherwise. */
fun Context.errorText(error: Throwable?, fallback: Int = R.string.error_unknown): String =
    if (error is LocalizedError) error.text.resolve(this) else error?.message ?: getString(fallback)