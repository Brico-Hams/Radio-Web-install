package org.bricohams.radio

import android.app.AlertDialog
import android.content.Context
import android.content.Intent
import android.content.res.ColorStateList
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.Drawable
import android.graphics.drawable.GradientDrawable
import android.graphics.drawable.LayerDrawable
import android.graphics.drawable.RippleDrawable
import android.graphics.drawable.StateListDrawable
import android.net.Uri
import android.os.Build
import android.util.StateSet
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.ImageButton
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView

/** Shared native components for the guided, help-first interface (sections, help, status, tiles, tips). */
object BrandUi {
    enum class Status(val icon: Int) {
        OK(R.drawable.ic_check), WARN(R.drawable.ic_warning), ERROR(R.drawable.ic_error), IDLE(R.drawable.ic_idle)
    }

    private const val TIPS = "ui-tips"
    private const val HELP_BASE = "https://brico-hams.github.io/Radio-Web-install/"
    const val DEFAULT_HELP_PAGE = "ayuda-android"

    private fun dp(context: Context, value: Int) = Brand.dp(context, value)

    /** Button roles shared by every native screen: primary, secondary, danger (TX/stop/destructive) and selected. */
    enum class ButtonKind { PRIMARY, SECONDARY, DANGER, SELECTED }
    enum class ButtonState { NORMAL, HOVER, PRESSED, DISABLED, FOCUSED }

    /** Fill, label and border for one kind/state; [ring] is the 3 dp focus outline drawn outside a 2 dp gap. */
    data class ButtonLook(val fill: Int, val text: Int, val border: Int, val ring: Int? = null)

    const val MIN_TARGET_DP = 48
    const val LABEL_SP = 16f
    const val BORDER_DP = 2
    const val RING_DP = 3
    const val RING_GAP_DP = 2

    fun buttonLook(colors: Brand.Palette, kind: ButtonKind, state: ButtonState): ButtonLook {
        if (state == ButtonState.DISABLED) return ButtonLook(colors.disabledFill, colors.disabledText, colors.disabledBorder)
        val look = when (kind) {
            ButtonKind.PRIMARY -> when (state) {
                ButtonState.HOVER -> ButtonLook(colors.primaryHover, colors.onAccent, colors.primaryHover)
                ButtonState.PRESSED -> ButtonLook(colors.primaryPressed, colors.onAccent, colors.primaryPressed)
                else -> ButtonLook(colors.orange, colors.onAccent, colors.orange)
            }
            // Selected adds a graphite border here, a check mark and bold text in styleButton: never colour alone.
            ButtonKind.SELECTED -> when (state) {
                ButtonState.HOVER -> ButtonLook(colors.primaryHover, colors.onAccent, colors.onAccent)
                ButtonState.PRESSED -> ButtonLook(colors.primaryPressed, colors.onAccent, colors.onAccent)
                else -> ButtonLook(colors.orange, colors.onAccent, colors.onAccent)
            }
            ButtonKind.SECONDARY -> when (state) {
                ButtonState.HOVER -> ButtonLook(colors.secondaryHover, colors.text, colors.borderStrong)
                ButtonState.PRESSED -> ButtonLook(colors.secondaryPressed, colors.text, colors.borderStrong)
                else -> ButtonLook(colors.surface, colors.text, colors.borderStrong)
            }
            ButtonKind.DANGER -> when (state) {
                ButtonState.HOVER -> ButtonLook(colors.dangerHover, colors.onDanger, colors.dangerHover)
                ButtonState.PRESSED -> ButtonLook(colors.dangerPressed, colors.onDanger, colors.dangerPressed)
                else -> ButtonLook(colors.danger, colors.onDanger, colors.danger)
            }
        }
        return if (state == ButtonState.FOCUSED) look.copy(ring = colors.focus) else look
    }

    private fun lookShape(context: Context, look: ButtonLook, radius: Int) =
        Brand.rounded(context, look.fill, radius, look.border)

    /** Layered focus look: 3 dp focus ring, 2 dp gap, then the normal fill and border. */
    private fun focusedShape(context: Context, look: ButtonLook, radius: Int): Drawable {
        val ring = GradientDrawable().apply {
            setColor(Color.TRANSPARENT); cornerRadius = dp(context, radius + 2).toFloat()
            setStroke(dp(context, RING_DP), requireNotNull(look.ring))
        }
        val inset = dp(context, RING_DP + RING_GAP_DP)
        return LayerDrawable(arrayOf(ring, lookShape(context, look, radius))).apply { setLayerInset(1, inset, inset, inset, inset) }
    }

    fun buttonBackground(context: Context, kind: ButtonKind, radius: Int = 16): Drawable {
        val colors = Brand.Palette(context)
        fun look(state: ButtonState) = buttonLook(colors, kind, state)
        return StateListDrawable().apply {
            addState(intArrayOf(-android.R.attr.state_enabled), lookShape(context, look(ButtonState.DISABLED), radius))
            addState(intArrayOf(android.R.attr.state_focused), focusedShape(context, look(ButtonState.FOCUSED), radius))
            addState(intArrayOf(android.R.attr.state_pressed), lookShape(context, look(ButtonState.PRESSED), radius))
            addState(intArrayOf(android.R.attr.state_hovered), lookShape(context, look(ButtonState.HOVER), radius))
            addState(StateSet.WILD_CARD, lookShape(context, look(ButtonState.NORMAL), radius))
        }
    }

    fun buttonTextColors(colors: Brand.Palette, kind: ButtonKind) = ColorStateList(
        arrayOf(intArrayOf(-android.R.attr.state_enabled), StateSet.WILD_CARD),
        intArrayOf(colors.disabledText, buttonLook(colors, kind, ButtonState.NORMAL).text))

    /** Applies the shared look: 16 sp semi-bold label that wraps (never truncated), 48 dp minimum, kind-specific states. */
    fun styleButton(view: TextView, kind: ButtonKind) {
        val context = view.context
        val colors = Brand.Palette(context)
        view.isAllCaps = false
        view.textSize = LABEL_SP
        view.typeface = if (kind == ButtonKind.SELECTED) Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
            else if (Build.VERSION.SDK_INT >= 28) Typeface.create(Typeface.DEFAULT, 600, false)
            else Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
        view.minHeight = dp(context, if (view is Button) 52 else MIN_TARGET_DP)
        view.minimumHeight = view.minHeight
        view.minWidth = dp(context, MIN_TARGET_DP)
        view.minimumWidth = view.minWidth
        view.maxLines = Int.MAX_VALUE
        view.ellipsize = null
        view.setPadding(dp(context, 12), dp(context, 10), dp(context, 12), dp(context, 10))
        view.setTextColor(buttonTextColors(colors, kind))
        view.background = buttonBackground(context, kind)
        view.stateListAnimator = null
        view.isFocusable = true
        // Non-colour cue for the selected state: check mark before the label.
        if (kind == ButtonKind.SELECTED) {
            context.getDrawable(R.drawable.ic_check)?.mutate()?.let {
                it.setTint(colors.onAccent)
                it.setBounds(0, 0, dp(context, 18), dp(context, 18))
                view.setCompoundDrawablesRelative(it, null, null, null)
                view.compoundDrawablePadding = dp(context, 6)
            }
        } else view.setCompoundDrawablesRelative(null, null, null, null)
    }

    /** Solid red, white label: only for TX, stop and destructive actions. */
    fun dangerButton(context: Context, label: CharSequence, action: () -> Unit): Button =
        Brand.button(context, label, false, action).also { styleButton(it, ButtonKind.DANGER) }

    private fun statusColor(colors: Brand.Palette, status: Status) = when (status) {
        Status.OK -> colors.positive
        Status.WARN -> colors.accent
        Status.ERROR -> colors.error
        Status.IDLE -> colors.muted
    }

    /** Rounded fill with ripple and a visible focus ring (keyboard / switch access). */
    fun interactive(context: Context, fill: Int, radius: Int = 16): Drawable {
        val colors = Brand.Palette(context)
        val ripple = colorStateRipple(colors)
        return StateListDrawable().apply {
            addState(intArrayOf(android.R.attr.state_focused),
                RippleDrawable(ripple, Brand.rounded(context, fill, radius, colors.focus, RING_DP), null))
            addState(StateSet.WILD_CARD, RippleDrawable(ripple, Brand.rounded(context, fill, radius), null))
        }
    }

    private fun colorStateRipple(colors: Brand.Palette) = ColorStateList.valueOf(colors.ripple)

    /** Line icon tinted with a palette colour; decorative unless [description] is given. */
    fun icon(context: Context, res: Int, color: Int = Brand.Palette(context).accent, sizeDp: Int = 24,
        description: CharSequence? = null) = ImageView(context).apply {
        setImageResource(res)
        setColorFilter(color)
        layoutParams = LinearLayout.LayoutParams(dp(context, sizeDp), dp(context, sizeDp))
        if (description == null) importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_NO else contentDescription = description
    }

    private fun markHeading(view: View) {
        if (Build.VERSION.SDK_INT >= 28) view.isAccessibilityHeading = true
    }

    /** Language-suffixed help page on the project site, e.g. ayuda-android.en.html; Spanish has no suffix. */
    fun helpUrl(context: Context, page: String): String {
        @Suppress("DEPRECATION")
        val suffix = when (context.resources.configuration.locale.language) {
            "en" -> ".en"; "fr" -> ".fr"; "de" -> ".de"; else -> ""
        }
        return "$HELP_BASE$page$suffix.html"
    }

    private fun openHelp(context: Context, page: String) {
        runCatching {
            context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(helpUrl(context, page))).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
        }
    }

    fun showHelp(context: Context, title: CharSequence, help: CharSequence, page: String? = DEFAULT_HELP_PAGE) {
        val dialog = AlertDialog.Builder(context).setTitle(title).setMessage(help).setPositiveButton(R.string.help_close, null)
        if (page != null) dialog.setNeutralButton(R.string.help_full) { _, _ -> openHelp(context, page) }
        dialog.show()
    }

    /** 48 dp "?" button; the help text is kept in the [R.id.help_text] tag. */
    fun helpButton(context: Context, title: CharSequence, help: CharSequence, page: String? = DEFAULT_HELP_PAGE) =
        ImageButton(context).apply {
            id = R.id.help_button
            val colors = Brand.Palette(context)
            setImageResource(R.drawable.ic_help)
            setColorFilter(colors.accent)
            scaleType = ImageView.ScaleType.CENTER_INSIDE
            background = interactive(context, Color.TRANSPARENT, 24)
            setPadding(dp(context, 12), dp(context, 12), dp(context, 12), dp(context, 12))
            contentDescription = context.getString(R.string.help_about, title)
            setTag(R.id.help_text, help)
            layoutParams = LinearLayout.LayoutParams(dp(context, 48), dp(context, 48))
            setOnClickListener { showHelp(context, title, help, page) }
        }

    /** Section or screen title with a "?" button that opens the contextual help. */
    fun sectionHeader(context: Context, title: CharSequence, helpText: CharSequence, page: String? = DEFAULT_HELP_PAGE,
        large: Boolean = false): LinearLayout {
        val colors = Brand.Palette(context)
        val heading = (if (large) Brand.text(context, 23f, bold = true) else Brand.text(context, 18f, colors.accent, true)).apply {
            text = title
            markHeading(this)
            setPadding(0, dp(context, if (large) 12 else 6), dp(context, 8), dp(context, if (large) 12 else 6))
        }
        return LinearLayout(context).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            addView(heading, LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f))
            addView(helpButton(context, title, helpText, page))
        }
    }

    /** Rounded card, optionally topped by a section header with help. */
    fun card(context: Context, title: CharSequence? = null, help: CharSequence? = null, page: String? = DEFAULT_HELP_PAGE) =
        Brand.card(context).also { card ->
            if (title != null && help != null) card.addView(sectionHeader(context, title, help, page))
            else if (title != null) card.addView(Brand.text(context, 18f, Brand.Palette(context).accent, true).apply { text = title; markHeading(this) })
        }

    fun primaryButton(context: Context, label: CharSequence, action: () -> Unit): Button = Brand.button(context, label, true, action)
    fun secondaryButton(context: Context, label: CharSequence, action: () -> Unit): Button = Brand.button(context, label, false, action)

    /** Icon + text so the state never relies on colour alone. */
    fun statusChip(context: Context, status: Status, label: CharSequence) = TextView(context).apply {
        val colors = Brand.Palette(context)
        text = label
        textSize = 14f
        setTextColor(colors.text)
        gravity = Gravity.CENTER_VERTICAL
        context.getDrawable(status.icon)?.mutate()?.let {
            it.setTint(statusColor(colors, status))
            it.setBounds(0, 0, dp(context, 18), dp(context, 18))
            setCompoundDrawablesRelative(it, null, null, null)
        }
        compoundDrawablePadding = dp(context, 8)
        setPadding(dp(context, 12), dp(context, 8), dp(context, 14), dp(context, 8))
        background = Brand.rounded(context, colors.surface, 20, colors.outline)
        contentDescription = label
        tag = status
        layoutParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT)
    }

    /** Nothing here yet: say why and what to do next. */
    fun emptyState(context: Context, iconRes: Int, title: CharSequence, body: CharSequence? = null,
        actionLabel: CharSequence? = null, action: (() -> Unit)? = null): LinearLayout {
        val colors = Brand.Palette(context)
        return Brand.card(context).apply {
            gravity = Gravity.CENTER_HORIZONTAL
            addView(icon(context, iconRes, colors.accent, 40))
            addView(Brand.text(context, 17f, bold = true).apply {
                text = title; gravity = Gravity.CENTER; setPadding(0, dp(context, 10), 0, dp(context, 4))
            })
            if (body != null) addView(Brand.text(context, 14f, colors.muted).apply { text = body; gravity = Gravity.CENTER })
            if (actionLabel != null && action != null) addView(primaryButton(context, actionLabel, action))
        }
    }

    fun infoTip(context: Context, text: CharSequence): LinearLayout {
        val colors = Brand.Palette(context)
        return LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            val pad = dp(context, 14)
            setPadding(pad, pad, pad, pad)
            background = Brand.rounded(context, colors.surface, 16, colors.outline)
            layoutParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT)
                .apply { topMargin = dp(context, 6); bottomMargin = dp(context, 10) }
            addView(Brand.row(context, icon(context, R.drawable.ic_info, colors.accent).apply {
                (layoutParams as LinearLayout.LayoutParams).marginEnd = dp(context, 12)
            }, Brand.text(context, 14f, colors.text).apply {
                this.text = text
                layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
            }))
        }
    }

    /** Dismissible tip shown once per screen; null after the user has dismissed it. */
    fun firstRunTip(context: Context, key: String, text: CharSequence): View? {
        val prefs = context.getSharedPreferences(TIPS, Context.MODE_PRIVATE)
        if (prefs.getBoolean(key, false)) return null
        return infoTip(context, text).also { tip ->
            tip.tag = "first_run_tip"
            tip.addView(secondaryButton(context, context.getString(R.string.help_close)) {
                prefs.edit().putBoolean(key, true).apply()
                (tip.parent as? ViewGroup)?.removeView(tip)
            })
        }
    }

    /** Home tile: icon, title, one-line description and a "?" button. [tag] marks the tappable area. */
    fun tile(context: Context, tag: String, iconRes: Int, title: CharSequence, description: CharSequence, help: CharSequence,
        page: String? = DEFAULT_HELP_PAGE, open: () -> Unit): LinearLayout {
        val colors = Brand.Palette(context)
        val main = LinearLayout(context).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            minimumHeight = dp(context, 64)
            setPadding(dp(context, 12), dp(context, 10), dp(context, 4), dp(context, 10))
            background = interactive(context, Color.TRANSPARENT, 20)
            isClickable = true
            isFocusable = true
            this.tag = tag
            contentDescription = "$title. $description"
            setOnClickListener { open() }
            addView(LinearLayout(context).apply {
                gravity = Gravity.CENTER
                background = Brand.rounded(context, colors.background, 14, colors.outline)
                addView(icon(context, iconRes, colors.accent))
            }, LinearLayout.LayoutParams(dp(context, 48), dp(context, 48)).apply { marginEnd = dp(context, 14) })
            addView(LinearLayout(context).apply {
                orientation = LinearLayout.VERTICAL
                addView(Brand.text(context, 16f, bold = true).apply { text = title; importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_NO })
                addView(Brand.text(context, 14f, colors.muted).apply { text = description; importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_NO })
            }, LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f))
        }
        return LinearLayout(context).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            background = Brand.rounded(context, colors.surface, 20, colors.outline)
            layoutParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT)
                .apply { bottomMargin = dp(context, 10) }
            addView(main, LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f))
            addView(helpButton(context, title, help, page).apply {
                (layoutParams as LinearLayout.LayoutParams).marginEnd = dp(context, 6)
            })
        }
    }
}
