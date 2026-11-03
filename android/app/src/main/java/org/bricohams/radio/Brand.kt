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
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.TextView
import android.view.ViewGroup

/** Column that stops growing past [maxWidthDp] so forms stay readable on DeX / tablets; centre it in a FrameLayout parent. */
class MaxWidthLinearLayout(context: Context, private val maxWidthDp: Int = 720) : LinearLayout(context) {
    override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
        val max = (maxWidthDp * resources.displayMetrics.density).toInt()
        val width = View.MeasureSpec.getSize(widthMeasureSpec)
        val spec = if (width > max) View.MeasureSpec.makeMeasureSpec(max, View.MeasureSpec.EXACTLY) else widthMeasureSpec
        super.onMeasure(spec, heightMeasureSpec)
    }
}

/** Shared native components. Fixed colours (BricoHams manual v1.1, dark tokens) remain available to the orbital graphics. */
object Brand {
    val ORANGE = Color.rgb(242, 107, 29)
    val BACKGROUND = Color.rgb(17, 21, 24)
    val SURFACE = Color.rgb(28, 35, 41)
    val SURFACE_HIGH = Color.rgb(56, 67, 76)
    val TEXT = Color.rgb(246, 248, 250)
    val MUTED = Color.rgb(186, 196, 204)
    val ORBIT_LIGHT = Color.rgb(255, 193, 143)
    val GREEN = Color.rgb(76, 175, 80)

    class Palette(context: Context) {
        val background = context.getColor(R.color.brand_background)
        val surface = context.getColor(R.color.brand_surface)
        val surfaceHigh = context.getColor(R.color.brand_surface_high)
        val text = context.getColor(R.color.brand_text)
        val muted = context.getColor(R.color.brand_muted)
        val accent = context.getColor(R.color.brand_accent)
        val orange = context.getColor(R.color.brand_orange)
        val onAccent = context.getColor(R.color.brand_on_accent)
        val outline = context.getColor(R.color.brand_outline)
        val focus = context.getColor(R.color.brand_focus)
        val ripple = context.getColor(R.color.brand_ripple)
        val positive = context.getColor(R.color.brand_positive)
    }

    /** Original logo PNG, untinted; in dark mode it sits on a discreet white rounded plate. */
    fun logoPlate(view: android.widget.ImageView) {
        val context = view.context
        val pad = dp(context, 6)
        view.setPadding(pad, pad, pad, pad)
        val night = (context.resources.configuration.uiMode and
            android.content.res.Configuration.UI_MODE_NIGHT_MASK) == android.content.res.Configuration.UI_MODE_NIGHT_YES
        view.background = if (night) rounded(context, Color.WHITE, 12) else null
    }

    fun dp(context: Context, value: Int) = (value * context.resources.displayMetrics.density).toInt()
    fun rounded(context: Context, color: Int, radius: Int = 16, stroke: Int? = null) = GradientDrawable().apply {
        setColor(color); cornerRadius = dp(context, radius).toFloat()
        if (stroke != null) setStroke(dp(context, 2), stroke)
    }
    fun card(context: Context, selected: Boolean = false): LinearLayout = LinearLayout(context).apply {
        val colors = Palette(context)
        orientation = LinearLayout.VERTICAL
        val padding = dp(context, 18)
        setPadding(padding, padding, padding, padding)
        background = RippleDrawable(ColorStateList.valueOf(colors.ripple),
            rounded(context, colors.surface, 20, if (selected) colors.accent else colors.outline), null)
        layoutParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT)
            .apply { bottomMargin = dp(context, 12) }
    }
    fun text(context: Context, size: Float = 16f, color: Int = Palette(context).text, bold: Boolean = false) = TextView(context).apply {
        textSize = size; setTextColor(color)
        setLineSpacing(dp(context, 3).toFloat(), 1f)
        if (bold) typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
    }
    fun button(context: Context, label: CharSequence, primary: Boolean = false, action: () -> Unit) = Button(context).apply {
        val colors = Palette(context)
        text = label
        isAllCaps = false
        textSize = 15f
        minHeight = dp(context, 52)
        setPadding(dp(context, 16), dp(context, 12), dp(context, 16), dp(context, 12))
        setTextColor(ColorStateList(arrayOf(intArrayOf(-android.R.attr.state_enabled), intArrayOf()),
            intArrayOf(colors.muted, if (primary) colors.onAccent else colors.accent)))
        background = RippleDrawable(ColorStateList.valueOf(colors.ripple),
            rounded(context, if (primary) colors.orange else colors.surfaceHigh, 16), null)
        stateListAnimator = null
        setOnClickListener { action() }
        layoutParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT)
            .apply { topMargin = dp(context, 6); bottomMargin = dp(context, 6) }
    }
    fun chip(context: Context, label: CharSequence, active: Boolean, action: () -> Unit) = TextView(context).apply {
        val colors = Palette(context)
        text = label
        gravity = Gravity.CENTER
        textSize = 14f
        minHeight = dp(context, 48)
        setPadding(dp(context, 8), dp(context, 10), dp(context, 8), dp(context, 10))
        setTextColor(if (active) colors.onAccent else colors.text)
        background = RippleDrawable(ColorStateList.valueOf(colors.ripple),
            rounded(context, if (active) colors.orange else colors.surfaceHigh, 16), null)
        isSelected = active
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

    fun heading(context: Context, label: CharSequence) = text(context, 23f, bold = true).apply {
        text = label
        accessibilityHeadingCompat()
        setPadding(0, dp(context, 12), 0, dp(context, 12))
    }

    private fun View.accessibilityHeadingCompat() {
        if (android.os.Build.VERSION.SDK_INT >= 28) isAccessibilityHeading = true
    }

    /** Add rhythm and accessible field labels without changing controls or their listeners. */
    fun styleForm(body: LinearLayout) {
        val context = body.context
        val colors = Palette(context)
        body.setPadding(dp(context, 18), dp(context, 12), dp(context, 18), dp(context, 24))
        for (index in 0 until body.childCount) {
            val view = body.getChildAt(index)
            if (view is Button) {
                val touchHeight = dp(context, 48)
                view.minHeight = maxOf(view.minHeight, touchHeight)
                view.minimumHeight = maxOf(view.minimumHeight, touchHeight)
            }
            (view.layoutParams as? ViewGroup.MarginLayoutParams)?.let {
                it.topMargin = dp(context, 6)
                it.bottomMargin = dp(context, 6)
                view.layoutParams = it
            }
            if (view is TextView && view !is Button && view !is EditText) {
                view.setTextColor(colors.muted)
                view.setLineSpacing(dp(context, 3).toFloat(), 1f)
                view.setPadding(0, dp(context, 6), 0, dp(context, 6))
                val next = body.getChildAt(index + 1)
                if (next is EditText) {
                    if (next.id == View.NO_ID) next.id = View.generateViewId()
                    view.labelFor = next.id
                }
            }
        }
        (body.getChildAt(0) as? TextView)?.apply {
            setTextColor(colors.text)
            background = rounded(context, colors.surface, 20, colors.outline)
            val padding = dp(context, 18)
            setPadding(padding, padding, padding, padding)
            accessibilityLiveRegion = View.ACCESSIBILITY_LIVE_REGION_POLITE
        }
    }
}
