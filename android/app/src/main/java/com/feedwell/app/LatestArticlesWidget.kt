package com.feedwell.app

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import org.json.JSONArray
import org.json.JSONObject

class LatestArticlesWidget : AppWidgetProvider() {

    companion object {
        const val ACTION_NEXT = "com.feedwell.app.WIDGET_NEXT"
        const val ACTION_PREV = "com.feedwell.app.WIDGET_PREV"
        const val ACTION_OPEN = "com.feedwell.app.WIDGET_OPEN"
        const val PREFS_NAME = "FeedWellWidgetPrefs"
        const val KEY_ARTICLES = "widget_articles"
        const val KEY_CURRENT_INDEX = "widget_current_index"

        fun getArticles(context: Context): JSONArray {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val articlesJson = prefs.getString(KEY_ARTICLES, "[]") ?: "[]"
            return try {
                JSONArray(articlesJson)
            } catch (e: Exception) {
                JSONArray()
            }
        }

        fun getCurrentIndex(context: Context): Int {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            return prefs.getInt(KEY_CURRENT_INDEX, 0)
        }

        fun setCurrentIndex(context: Context, index: Int) {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            prefs.edit().putInt(KEY_CURRENT_INDEX, index).apply()
        }

        fun updateAllWidgets(context: Context) {
            val intent = Intent(context, LatestArticlesWidget::class.java).apply {
                action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
            }
            context.sendBroadcast(intent)
        }
    }

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (appWidgetId in appWidgetIds) {
            updateWidget(context, appWidgetManager, appWidgetId)
        }
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)

        when (intent.action) {
            ACTION_NEXT -> {
                val articles = getArticles(context)
                val currentIndex = getCurrentIndex(context)
                if (articles.length() > 0) {
                    val newIndex = (currentIndex + 1) % articles.length()
                    setCurrentIndex(context, newIndex)
                    refreshAllWidgets(context)
                }
            }
            ACTION_PREV -> {
                val articles = getArticles(context)
                val currentIndex = getCurrentIndex(context)
                if (articles.length() > 0) {
                    val newIndex = if (currentIndex > 0) currentIndex - 1 else articles.length() - 1
                    setCurrentIndex(context, newIndex)
                    refreshAllWidgets(context)
                }
            }
            ACTION_OPEN -> {
                val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)
                launchIntent?.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                if (launchIntent != null) {
                    context.startActivity(launchIntent)
                }
            }
            AppWidgetManager.ACTION_APPWIDGET_UPDATE -> {
                val appWidgetManager = AppWidgetManager.getInstance(context)
                val thisWidget = android.content.ComponentName(context, LatestArticlesWidget::class.java)
                val appWidgetIds = appWidgetManager.getAppWidgetIds(thisWidget)
                onUpdate(context, appWidgetManager, appWidgetIds)
            }
        }
    }

    private fun refreshAllWidgets(context: Context) {
        val appWidgetManager = AppWidgetManager.getInstance(context)
        val thisWidget = android.content.ComponentName(context, LatestArticlesWidget::class.java)
        val appWidgetIds = appWidgetManager.getAppWidgetIds(thisWidget)
        for (appWidgetId in appWidgetIds) {
            updateWidget(context, appWidgetManager, appWidgetId)
        }
    }

    private fun updateWidget(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
        val views = RemoteViews(context.packageName, R.layout.widget_latest_articles)

        val articles = getArticles(context)
        val currentIndex = getCurrentIndex(context)

        if (articles.length() > 0) {
            val safeIndex = currentIndex.coerceIn(0, articles.length() - 1)
            val article = articles.getJSONObject(safeIndex)

            val title = article.optString("title", "Untitled")
            val feedName = article.optString("feedName", "")
            val pubDate = article.optString("pubDate", "")

            views.setTextViewText(R.id.widget_article_title, title)
            views.setTextViewText(R.id.widget_article_feed, feedName)
            views.setTextViewText(R.id.widget_article_date, formatDate(pubDate))
            views.setTextViewText(R.id.widget_page_indicator, "${safeIndex + 1} / ${articles.length()}")
        } else {
            views.setTextViewText(R.id.widget_article_title, "No articles yet")
            views.setTextViewText(R.id.widget_article_feed, "Open FeedWell to load feeds")
            views.setTextViewText(R.id.widget_article_date, "")
            views.setTextViewText(R.id.widget_page_indicator, "")
        }

        // Next button
        val nextIntent = Intent(context, LatestArticlesWidget::class.java).apply {
            action = ACTION_NEXT
        }
        val nextPending = PendingIntent.getBroadcast(
            context, 1, nextIntent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        views.setOnClickPendingIntent(R.id.widget_next_button, nextPending)

        // Previous button
        val prevIntent = Intent(context, LatestArticlesWidget::class.java).apply {
            action = ACTION_PREV
        }
        val prevPending = PendingIntent.getBroadcast(
            context, 2, prevIntent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        views.setOnClickPendingIntent(R.id.widget_prev_button, prevPending)

        // Open app on article tap
        val openIntent = Intent(context, LatestArticlesWidget::class.java).apply {
            action = ACTION_OPEN
        }
        val openPending = PendingIntent.getBroadcast(
            context, 3, openIntent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        views.setOnClickPendingIntent(R.id.widget_article_container, openPending)

        appWidgetManager.updateAppWidget(appWidgetId, views)
    }

    private fun formatDate(dateString: String): String {
        if (dateString.isEmpty()) return ""
        return try {
            val formats = arrayOf(
                java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", java.util.Locale.US),
                java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", java.util.Locale.US),
                java.text.SimpleDateFormat("EEE, dd MMM yyyy HH:mm:ss Z", java.util.Locale.US),
                java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.US)
            )
            var date: java.util.Date? = null
            for (fmt in formats) {
                fmt.timeZone = java.util.TimeZone.getTimeZone("UTC")
                try {
                    date = fmt.parse(dateString)
                    if (date != null) break
                } catch (e: Exception) { /* try next */ }
            }
            if (date == null) return dateString

            val now = System.currentTimeMillis()
            val diffMs = now - date.time
            val diffMin = diffMs / 60000
            val diffHr = diffMin / 60
            val diffDay = diffHr / 24

            when {
                diffMin < 1 -> "Just now"
                diffMin < 60 -> "${diffMin}m ago"
                diffHr < 24 -> "${diffHr}h ago"
                diffDay < 7 -> "${diffDay}d ago"
                else -> java.text.SimpleDateFormat("MMM d", java.util.Locale.US).format(date)
            }
        } catch (e: Exception) {
            dateString
        }
    }
}
