package com.feedwell.app

import android.content.Context
import android.icu.text.DateFormat
import android.icu.util.ULocale
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

/**
 * The widget's dates and numbers in the app's language. The app sends the
 * language, its digits and its own "just now", "{count}h ago" and "{count}d ago"
 * (WidgetBridge.setWidgetLanguage), so the widget says what the article list
 * says; older dates Android's ICU writes in the language, Farsi in the Persian
 * calendar as the app does. Persian digits in Farsi, Arabic-Indic in Arabic.
 */
object WidgetText {
    const val KEY_LANGUAGE = "widget_language"

    private class Words(
        val language: String,
        val digits: String?,
        val justNow: String,
        val hoursAgo: String,
        val daysAgo: String,
    )

    // Until the app has sent its language: English, as the widget always wrote
    private val ENGLISH = Words("en", null, "Just now", "{count}h ago", "{count}d ago")

    private fun words(context: Context): Words {
        val json = context.getSharedPreferences(LatestArticlesWidget.PREFS_NAME, Context.MODE_PRIVATE)
            .getString(KEY_LANGUAGE, null) ?: return ENGLISH
        return try {
            val o = JSONObject(json)
            Words(
                o.optString("language", "en"),
                o.optString("digits", "").takeIf { it.length == 10 },
                o.optString("justNow", ENGLISH.justNow),
                o.optString("hoursAgo", ENGLISH.hoursAgo),
                o.optString("daysAgo", ENGLISH.daysAgo),
            )
        } catch (e: Exception) {
            ENGLISH
        }
    }

    private fun localDigits(text: String, digits: String?): String {
        if (digits == null) return text
        val out = StringBuilder(text.length)
        for (c in text) out.append(if (c in '0'..'9') digits[c - '0'] else c)
        return out.toString()
    }

    /** A number the widget writes (the page counter), in the language's digits */
    fun number(context: Context, text: String): String = localDigits(text, words(context).digits)

    private fun parse(dateString: String): Date? {
        val formats = arrayOf(
            "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",
            "yyyy-MM-dd'T'HH:mm:ss'Z'",
            "EEE, dd MMM yyyy HH:mm:ss Z",
            "yyyy-MM-dd",
        )
        for (pattern in formats) {
            try {
                val format = SimpleDateFormat(pattern, Locale.US)
                format.timeZone = TimeZone.getTimeZone("UTC")
                format.parse(dateString)?.let { return it }
            } catch (e: Exception) { /* the next one */ }
        }
        return null
    }

    /** An article's date: just now, hours or days ago within the week, then its day and month */
    fun date(context: Context, dateString: String): String {
        if (dateString.isEmpty()) return ""
        val date = parse(dateString) ?: return dateString
        val w = words(context)
        val hours = (System.currentTimeMillis() - date.time) / 3_600_000
        val days = hours / 24
        return when {
            hours < 1 -> w.justNow
            hours < 24 -> w.hoursAgo.replace("{count}", localDigits(hours.toString(), w.digits))
            days < 7 -> w.daysAgo.replace("{count}", localDigits(days.toString(), w.digits))
            else -> try {
                val locale = if (w.language == "fa") {
                    ULocale("fa@calendar=persian;numbers=latn")
                } else {
                    ULocale.forLanguageTag("${w.language}-u-nu-latn")
                }
                localDigits(DateFormat.getInstanceForSkeleton("MMMd", locale).format(date), w.digits)
            } catch (e: Exception) {
                SimpleDateFormat("MMM d", Locale.US).format(date)
            }
        }
    }
}
