package org.bricohams.radio

import android.content.Context
import android.content.res.ColorStateList
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.graphics.drawable.RippleDrawable
import android.view.Gravity
import android.view.View
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView

/** Bricohams palette (orange on warm black, as in the app theme and logo) and small view builders. */
object Brand {
    val ORANGE = Color.rgb(255, 152, 0)
    val BACKGROUND = Color.rgb(21, 16, 11)
    val SURFACE = Color.rgb(36, 27, 19)
    val SURFACE_HIGH = Color.rgb(52, 39, 27)
    val TEXT = Color.rgb(246, 238, 228)
    val MUTED = Color.rgb(190, 175, 158)
    val GREEN = Color.rgb(76, 175, 80)

    fun dp(context: Context, value: Int) = (value * context.resources.displayMetrics.density).toInt()
    fun rounded(context: Context, color: Int, radius: Int = 16, stroke: Int? = null) = GradientDrawable().apply {
        setColor(color); cornerRadius = dp(context, radius).toFloat()
        if (stroke != null) setStroke(dp(context, 2), stroke)
    }
    fun card(context: Context, selected: Boolean = false): LinearLayout = LinearLayout(context).apply {
        orientation = LinearLayout.VERTICAL
        val padding = dp(context, 14)
        setPadding(padding, padding, padding, padding)
        background = RippleDrawable(ColorStateList.valueOf(Color.argb(60, 255, 152, 0)),
            rounded(context, SURFACE, stroke = if (selected) ORANGE else null), null)
        layoutParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT)
            .apply { bottomMargin = dp(context, 10) }
    }
    fun text(context: Context, size: Float = 15f, color: Int = TEXT, bold: Boolean = false) = TextView(context).apply {
        textSize = size; setTextColor(color)
        if (bold) typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
    }
    fun button(context: Context, label: CharSequence, primary: Boolean = false, action: () -> Unit) = Button(context).apply {
        text = label
        isAllCaps = false
        textSize = 15f
        minHeight = dp(context, 48)
        setTextColor(if (primary) BACKGROUND else TEXT)
        background = RippleDrawable(ColorStateList.valueOf(Color.argb(80, 255, 255, 255)),
            rounded(context, if (primary) ORANGE else SURFACE_HIGH, 24), null)
        stateListAnimator = null
        setOnClickListener { action() }
        layoutParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT)
            .apply { topMargin = dp(context, 6); bottomMargin = dp(context, 6) }
    }
    fun chip(context: Context, label: CharSequence, active: Boolean, action: () -> Unit) = TextView(context).apply {
        text = label
        gravity = Gravity.CENTER
        textSize = 13f
        minHeight = dp(context, 48)
        setTextColor(if (active) BACKGROUND else TEXT)
        background = rounded(context, if (active) ORANGE else SURFACE_HIGH, 24)
        isClickable = true; isFocusable = true
        setOnClickListener { action() }
        layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
            .apply { val margin = dp(context, 3); setMargins(margin, 0, margin, 0) }
    }
    fun row(context: Context, vararg views: View) = LinearLayout(context).apply {
        orientation = LinearLayout.HORIZONTAL
        gravity = Gravity.CENTER_VERTICAL
        views.forEach { addView(it) }
    }
}
