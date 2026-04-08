package com.feedwell.app

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.view.View
import android.widget.RemoteViews
import org.json.JSONArray

class LatestArticlesWidget : AppWidgetProvider() {

    companion object {
        const val ACTION_NEXT = "com.feedwell.app.WIDGET_NEXT"
        const val ACTION_PREV = "com.feedwell.app.WIDGET_PREV"
        const val ACTION_OPEN = "com.feedwell.app.WIDGET_OPEN"
        const val ACTION_REFRESH = "com.feedwell.app.WIDGET_REFRESH"
        const val PREFS_NAME = "FeedWellWidgetPrefs"
        const val KEY_ARTICLES = "widget_articles"
        const val KEY_CURRENT_INDEX = "widget_current_index"
        const val KEY_WIDGET_THEME = "widget_theme"
        const val KEY_WIDGET_OPACITY = "widget_opacity"
        const val KEY_APP_THEME = "app_theme"

        // Height thresholds in dp
        const val HEIGHT_COMPACT = 100  // 1-row: title only
        const val HEIGHT_LIST = 200     // 4+ rows: scrollable list

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

        /** Returns true if widget should use dark colors */
        fun isWidgetDark(context: Context): Boolean {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val widgetTheme = prefs.getString(KEY_WIDGET_THEME, "app") ?: "app"
            return when (widgetTheme) {
                "light" -> false
                "dark" -> true
                else -> { // "app" — follow app theme
                    val appTheme = prefs.getString(KEY_APP_THEME, "light") ?: "light"
                    appTheme == "dark"
                }
            }
        }

        fun getWidgetOpacity(context: Context): Int {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            return prefs.getInt(KEY_WIDGET_OPACITY, 255) // 0-255
        }
    }

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (appWidgetId in appWidgetIds) {
            updateWidget(context, appWidgetManager, appWidgetId)
        }
    }

    override fun onAppWidgetOptionsChanged(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int, newOptions: Bundle) {
        super.onAppWidgetOptionsChanged(context, appWidgetManager, appWidgetId, newOptions)
        updateWidget(context, appWidgetManager, appWidgetId)
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
                val articleUrl = intent.getStringExtra("article_url")
                val articleTitle = intent.getStringExtra("article_title") ?: ""
                val articleFeed = intent.getStringExtra("article_feed") ?: ""
                val articleDate = intent.getStringExtra("article_date") ?: ""
                
                if (!articleUrl.isNullOrEmpty()) {
                    // Use ACTION_VIEW with the feedwell:// scheme so Android delivers it as a
                    // deep link to MainActivity and React Native's Linking module picks it up.
                    val deepLinkIntent = Intent(Intent.ACTION_VIEW).apply {
                        val uriStr = "feedwell://article?url=${Uri.encode(articleUrl)}&title=${Uri.encode(articleTitle)}&feed=${Uri.encode(articleFeed)}&date=${Uri.encode(articleDate)}"
                        data = Uri.parse(uriStr)
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
                        setPackage(context.packageName)
                    }
                    context.startActivity(deepLinkIntent)
                } else {
                    // No URL — just open the app
                    val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)?.apply {
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    }
                    if (launchIntent != null) context.startActivity(launchIntent)
                }
            }
            ACTION_REFRESH -> {
                // Open the app so it refreshes feeds, then widget data gets updated
                val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)?.apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                if (launchIntent != null) context.startActivity(launchIntent)
                refreshAllWidgets(context)
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

        val options = appWidgetManager.getAppWidgetOptions(appWidgetId)
        val minHeight = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 110)

        val articles = getArticles(context)

        // ── Apply theme colors programmatically ──
        val dark = isWidgetDark(context)
        val titleColor = if (dark) 0xFFF0E6DE.toInt() else 0xFF3C2A1E.toInt()
        val headerColor = if (dark) 0xFFCDADA0.toInt() else 0xFFA17F66.toInt()
        val feedColor = if (dark) 0xFFB09A85.toInt() else 0xFF8B7355.toInt()
        val dateColor = if (dark) 0xFF8B7355.toInt() else 0xFFB09A85.toInt()
        val indicatorColor = if (dark) 0xFF6B5B4F.toInt() else 0xFFC4AA94.toInt()

        val bgRes = if (dark) R.drawable.widget_background_dark else R.drawable.widget_background_light
        views.setInt(R.id.widget_container, "setBackgroundResource", bgRes)
        views.setTextColor(R.id.widget_app_name, headerColor)
        views.setTextColor(R.id.widget_article_title, titleColor)
        views.setTextColor(R.id.widget_article_feed, feedColor)
        views.setTextColor(R.id.widget_article_date, dateColor)
        views.setTextColor(R.id.widget_article_description, feedColor)
        views.setTextColor(R.id.widget_page_indicator, indicatorColor)

        when {
            // ── LIST MODE: tall widget → scrollable list ──
            minHeight >= HEIGHT_LIST -> {
                views.setViewVisibility(R.id.widget_article_container, View.GONE)
                views.setViewVisibility(R.id.widget_page_indicator, View.GONE)
                views.setViewVisibility(R.id.widget_prev_button, View.GONE)
                views.setViewVisibility(R.id.widget_next_button, View.GONE)
                views.setViewVisibility(R.id.widget_article_list, View.VISIBLE)

                // Set up the ListView with RemoteViewsService
                val serviceIntent = Intent(context, WidgetArticleListService::class.java).apply {
                    putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
                    data = Uri.parse(toUri(Intent.URI_INTENT_SCHEME))
                }
                views.setRemoteAdapter(R.id.widget_article_list, serviceIntent)

                // Set up the pending intent template for list item clicks
                val openTemplate = Intent(context, LatestArticlesWidget::class.java).apply {
                    action = ACTION_OPEN
                }
                val openTemplatePending = PendingIntent.getBroadcast(
                    context, 10 + appWidgetId, openTemplate,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE
                )
                views.setPendingIntentTemplate(R.id.widget_article_list, openTemplatePending)

                // Notify data changed so the list refreshes
                appWidgetManager.notifyAppWidgetViewDataChanged(appWidgetId, R.id.widget_article_list)
            }
            // ── COMPACT MODE: very short widget → title only ──
            minHeight < HEIGHT_COMPACT -> {
                views.setViewVisibility(R.id.widget_article_container, View.VISIBLE)
                views.setViewVisibility(R.id.widget_article_list, View.GONE)
                views.setViewVisibility(R.id.widget_page_indicator, View.GONE)
                views.setViewVisibility(R.id.widget_article_description, View.GONE)
                views.setViewVisibility(R.id.widget_article_feed, View.GONE)
                views.setViewVisibility(R.id.widget_article_date, View.GONE)
                views.setViewVisibility(R.id.widget_article_title, View.VISIBLE)

                views.setFloat(R.id.widget_article_title, "setTextSize", 12f)
                views.setInt(R.id.widget_article_title, "setMaxLines", 1)

                setupSingleArticle(context, views, articles)
            }
            // ── NORMAL MODE: standard prev/next single article ──
            else -> {
                views.setViewVisibility(R.id.widget_article_container, View.VISIBLE)
                views.setViewVisibility(R.id.widget_article_list, View.GONE)
                views.setViewVisibility(R.id.widget_page_indicator, View.VISIBLE)
                views.setViewVisibility(R.id.widget_prev_button, View.VISIBLE)
                views.setViewVisibility(R.id.widget_next_button, View.VISIBLE)
                views.setViewVisibility(R.id.widget_article_feed, View.VISIBLE)
                views.setViewVisibility(R.id.widget_article_date, View.VISIBLE)
                views.setViewVisibility(R.id.widget_article_description, View.GONE)
                views.setViewVisibility(R.id.widget_article_title, View.VISIBLE)

                views.setFloat(R.id.widget_article_title, "setTextSize", 14f)
                views.setInt(R.id.widget_article_title, "setMaxLines", 3)

                setupSingleArticle(context, views, articles)
            }
        }

        // Next/Prev buttons (always wired, visible only in compact/normal)
        val nextIntent = Intent(context, LatestArticlesWidget::class.java).apply { action = ACTION_NEXT }
        val nextPending = PendingIntent.getBroadcast(context, 1, nextIntent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        views.setOnClickPendingIntent(R.id.widget_next_button, nextPending)

        val prevIntent = Intent(context, LatestArticlesWidget::class.java).apply { action = ACTION_PREV }
        val prevPending = PendingIntent.getBroadcast(context, 2, prevIntent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        views.setOnClickPendingIntent(R.id.widget_prev_button, prevPending)

        // Refresh button
        val refreshIntent = Intent(context, LatestArticlesWidget::class.java).apply { action = ACTION_REFRESH }
        val refreshPending = PendingIntent.getBroadcast(context, 4, refreshIntent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        views.setOnClickPendingIntent(R.id.widget_refresh_button, refreshPending)

        appWidgetManager.updateAppWidget(appWidgetId, views)
    }

    private fun setupSingleArticle(context: Context, views: RemoteViews, articles: JSONArray) {
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

            val link = article.optString("link", "")
            val openIntent = Intent(context, LatestArticlesWidget::class.java).apply {
                action = ACTION_OPEN
                putExtra("article_url", link)
                putExtra("article_title", title)
                putExtra("article_feed", feedName)
                putExtra("article_date", pubDate)
            }
            val openPending = PendingIntent.getBroadcast(
                context, 3, openIntent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.widget_article_container, openPending)
        } else {
            views.setTextViewText(R.id.widget_article_title, "No articles yet")
            views.setTextViewText(R.id.widget_article_feed, "Open FeedWell to load feeds")
            views.setTextViewText(R.id.widget_article_date, "")
            views.setTextViewText(R.id.widget_page_indicator, "")
        }
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
