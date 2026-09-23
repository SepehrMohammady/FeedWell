package com.feedwell.app

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.res.Configuration
import android.net.Uri
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.Gravity
import android.view.View
import android.widget.RemoteViews
import org.json.JSONArray
import org.json.JSONObject

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
        const val KEY_SHOW_IMAGES = "widget_show_images"

        // Layout thresholds in dp, compared against the widget's real size for the
        // current orientation (see widgetSize).
        const val HEIGHT_STRIP = 90        // below: one row, title beside the controls
        const val HEIGHT_TALL_CARD = 190   // at/above: preview image above the text
        const val HEIGHT_LIST = 300        // at/above: scrolling list of articles
        const val WIDTH_SIDE_IMAGE = 200   // room for a thumbnail beside the text
        const val WIDTH_APP_NAME = 190     // narrower: drop the "FeedWell" label
        const val WIDTH_PREV_BUTTON = 140  // narrower: keep only next + refresh
        const val WIDTH_STRIP_REFRESH = 150

        // Must match widget_background_dark / widget_background_light.
        private const val BG_DARK = 0xFF1C1C1E.toInt()
        private const val BG_LIGHT = 0xFFFFF8F4.toInt()

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

        fun showImages(context: Context): Boolean {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            return prefs.getBoolean(KEY_SHOW_IMAGES, true)
        }

        fun widgetBackground(context: Context): Int = if (isWidgetDark(context)) BG_DARK else BG_LIGHT

        fun hasWidgets(context: Context): Boolean {
            val manager = AppWidgetManager.getInstance(context)
            return manager.getAppWidgetIds(ComponentName(context, LatestArticlesWidget::class.java)).isNotEmpty()
        }

        fun imageUrlsOf(articles: JSONArray): List<String> {
            val urls = ArrayList<String>(articles.length())
            for (i in 0 until articles.length()) {
                val url = articles.optJSONObject(i)?.optString("imageUrl", "").orEmpty()
                if (WidgetImageLoader.isUsable(url)) urls.add(url)
            }
            return urls
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
                // Reload the list data and re-run the normal update so the whole widget refreshes
                val appWidgetManager = AppWidgetManager.getInstance(context)
                val thisWidget = ComponentName(context, LatestArticlesWidget::class.java)
                val appWidgetIds = appWidgetManager.getAppWidgetIds(thisWidget)

                // Swap the refresh button for a spinner (partial update keeps the rest of the widget intact)
                for (appWidgetId in appWidgetIds) {
                    val progressViews = RemoteViews(context.packageName, R.layout.widget_latest_articles)
                    progressViews.setViewVisibility(R.id.widget_refresh_button, View.GONE)
                    progressViews.setViewVisibility(R.id.widget_refresh_progress, View.VISIBLE)
                    appWidgetManager.partiallyUpdateAppWidget(appWidgetId, progressViews)
                }

                appWidgetManager.notifyAppWidgetViewDataChanged(appWidgetIds, R.id.widget_article_list)

                // Re-run the normal update (which restores the refresh button) after a short
                // delay so the spinner is visible even when the refresh is instant
                val pendingResult = goAsync()
                Handler(Looper.getMainLooper()).postDelayed({
                    refreshAllWidgets(context)
                    pendingResult.finish()
                }, 800)
            }
            AppWidgetManager.ACTION_APPWIDGET_UPDATE -> {
                val appWidgetManager = AppWidgetManager.getInstance(context)
                val thisWidget = ComponentName(context, LatestArticlesWidget::class.java)
                val appWidgetIds = appWidgetManager.getAppWidgetIds(thisWidget)
                onUpdate(context, appWidgetManager, appWidgetIds)
            }
        }
    }

    private fun refreshAllWidgets(context: Context) {
        val appWidgetManager = AppWidgetManager.getInstance(context)
        val thisWidget = ComponentName(context, LatestArticlesWidget::class.java)
        val appWidgetIds = appWidgetManager.getAppWidgetIds(thisWidget)
        for (appWidgetId in appWidgetIds) {
            updateWidget(context, appWidgetManager, appWidgetId)
        }
    }

    /**
     * The widget's real size in dp. It is minWidth × maxHeight in portrait and
     * maxWidth × minHeight in landscape; reading minHeight in portrait (as this
     * used to) underestimates the height, which is what left a tall widget showing
     * one short article surrounded by empty space.
     */
    private fun widgetSize(context: Context, options: Bundle): Pair<Int, Int> {
        val landscape = context.resources.configuration.orientation == Configuration.ORIENTATION_LANDSCAPE
        val minW = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 0)
        val maxW = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_WIDTH, 0)
        val minH = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 0)
        val maxH = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT, 0)
        val width = (if (landscape) maxW else minW).takeIf { it > 0 }
            ?: maxOf(minW, maxW).takeIf { it > 0 } ?: 180
        val height = (if (landscape) minH else maxH).takeIf { it > 0 }
            ?: maxOf(minH, maxH).takeIf { it > 0 } ?: 110
        return width to height
    }

    private fun updateWidget(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
        val views = RemoteViews(context.packageName, R.layout.widget_latest_articles)

        val options = appWidgetManager.getAppWidgetOptions(appWidgetId)
        val (widthDp, heightDp) = widgetSize(context, options)
        val density = context.resources.displayMetrics.density
        fun px(dp: Int) = (dp * density).toInt()

        val articles = getArticles(context)

        // The launcher keeps the widget's views and replays each update on top of
        // them, so whatever an earlier update switched on stays on unless this one
        // switches it off. Start every update from the layout's defaults; without
        // this a resized widget showed the old top image next to the new side one,
        // and paging could leave the previous article's image or snippet behind.
        views.setViewVisibility(R.id.widget_image_top, View.GONE)
        views.setViewVisibility(R.id.widget_image_side, View.GONE)
        views.setViewVisibility(R.id.widget_article_description, View.GONE)
        views.setViewVisibility(R.id.widget_app_name, View.VISIBLE)
        views.setViewVisibility(R.id.widget_strip_title, View.GONE)
        views.setViewVisibility(R.id.widget_next_button, View.VISIBLE)
        views.setViewPadding(R.id.widget_container, px(12), px(12), px(12), px(12))
        views.setViewPadding(R.id.widget_header, 0, 0, 0, px(6))
        views.setInt(R.id.widget_container, "setGravity", Gravity.TOP or Gravity.START)

        // ── Apply theme colors programmatically ──
        val dark = isWidgetDark(context)
        val titleColor = if (dark) 0xFFF0E6DE.toInt() else 0xFF3C2A1E.toInt()
        val headerColor = if (dark) 0xFFCDADA0.toInt() else 0xFFA17F66.toInt()
        val feedColor = if (dark) 0xFFB09A85.toInt() else 0xFF8B7355.toInt()
        val dateColor = if (dark) 0xFF8B7355.toInt() else 0xFFB09A85.toInt()
        val indicatorColor = if (dark) 0xFF6B5B4F.toInt() else 0xFFC4AA94.toInt()

        val bgRes = if (dark) R.drawable.widget_background_dark else R.drawable.widget_background_light
        views.setInt(R.id.widget_container, "setBackgroundResource", bgRes)

        // Apply opacity (0-255 → 0.0f-1.0f)
        val opacity = getWidgetOpacity(context)
        views.setFloat(R.id.widget_container, "setAlpha", opacity / 255f)

        views.setTextColor(R.id.widget_app_name, headerColor)
        views.setTextColor(R.id.widget_strip_title, titleColor)
        views.setTextColor(R.id.widget_article_title, titleColor)
        views.setTextColor(R.id.widget_article_feed, feedColor)
        views.setTextColor(R.id.widget_article_date, dateColor)
        views.setTextColor(R.id.widget_article_description, feedColor)
        views.setTextColor(R.id.widget_page_indicator, indicatorColor)

        // Header controls shrink with the width. The app name keeps its weight even
        // when blanked, so the buttons stay pinned to the end of the row.
        views.setTextViewText(R.id.widget_app_name, if (widthDp >= WIDTH_APP_NAME) "FeedWell" else "")
        views.setViewVisibility(R.id.widget_prev_button, if (widthDp >= WIDTH_PREV_BUTTON) View.VISIBLE else View.GONE)
        var showRefresh = true

        when {
            // ── LIST: tall widget → scrollable list ──
            heightDp >= HEIGHT_LIST -> {
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
            // ── STRIP: one row → the title sits in the header next to the controls ──
            heightDp < HEIGHT_STRIP -> {
                views.setViewVisibility(R.id.widget_article_container, View.GONE)
                views.setViewVisibility(R.id.widget_article_list, View.GONE)
                views.setViewVisibility(R.id.widget_page_indicator, View.GONE)
                views.setViewVisibility(R.id.widget_app_name, View.GONE)
                views.setViewVisibility(R.id.widget_strip_title, View.VISIBLE)
                views.setViewPadding(R.id.widget_container, px(12), px(6), px(8), px(6))
                views.setViewPadding(R.id.widget_header, 0, 0, 0, 0)
                views.setInt(R.id.widget_container, "setGravity", Gravity.CENTER_VERTICAL)
                views.setInt(R.id.widget_strip_title, "setMaxLines", if (heightDp >= 64) 2 else 1)
                views.setViewVisibility(R.id.widget_prev_button, if (widthDp >= 220) View.VISIBLE else View.GONE)
                showRefresh = widthDp >= WIDTH_STRIP_REFRESH

                setupStrip(context, views, articles)
            }
            // ── CARD: one article, with a preview image when there is room for one ──
            else -> {
                views.setViewVisibility(R.id.widget_article_container, View.VISIBLE)
                views.setViewVisibility(R.id.widget_article_list, View.GONE)
                views.setViewVisibility(R.id.widget_page_indicator, if (heightDp >= 110) View.VISIBLE else View.GONE)
                views.setViewVisibility(R.id.widget_next_button, View.VISIBLE)
                views.setViewVisibility(R.id.widget_article_feed, View.VISIBLE)
                views.setViewVisibility(R.id.widget_article_date, View.VISIBLE)
                views.setViewVisibility(R.id.widget_article_title, View.VISIBLE)
                views.setFloat(R.id.widget_article_title, "setTextSize", 14f)

                setupCard(context, views, articles, widthDp, heightDp)
            }
        }

        // Next/Prev buttons (always wired, visible only in the single-article modes)
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

        // Always restore the refresh button so widgets never get stuck showing the spinner
        views.setViewVisibility(R.id.widget_refresh_button, if (showRefresh) View.VISIBLE else View.GONE)
        views.setViewVisibility(R.id.widget_refresh_progress, View.GONE)

        appWidgetManager.updateAppWidget(appWidgetId, views)
    }

    /** The article the pager is on, with its index clamped to the current list. */
    private fun currentArticle(context: Context, articles: JSONArray): Pair<Int, JSONObject>? {
        if (articles.length() == 0) return null
        val index = getCurrentIndex(context).coerceIn(0, articles.length() - 1)
        val article = articles.optJSONObject(index) ?: return null
        return index to article
    }

    private fun openArticlePendingIntent(context: Context, article: JSONObject): PendingIntent {
        val openIntent = Intent(context, LatestArticlesWidget::class.java).apply {
            action = ACTION_OPEN
            putExtra("article_url", article.optString("link", ""))
            putExtra("article_title", article.optString("title", "Untitled"))
            putExtra("article_feed", article.optString("feedName", ""))
            putExtra("article_date", article.optString("pubDate", ""))
        }
        return PendingIntent.getBroadcast(
            context, 3, openIntent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }

    private fun setupStrip(context: Context, views: RemoteViews, articles: JSONArray) {
        val current = currentArticle(context, articles)
        if (current == null) {
            views.setTextViewText(R.id.widget_strip_title, "No articles yet")
            return
        }
        val (_, article) = current
        views.setTextViewText(R.id.widget_strip_title, article.optString("title", "Untitled"))
        views.setOnClickPendingIntent(R.id.widget_strip_title, openArticlePendingIntent(context, article))
    }

    private fun setupCard(context: Context, views: RemoteViews, articles: JSONArray, widthDp: Int, heightDp: Int) {
        val current = currentArticle(context, articles)
        if (current == null) {
            views.setTextViewText(R.id.widget_article_title, "No articles yet")
            views.setTextViewText(R.id.widget_article_feed, "Open FeedWell to load feeds")
            views.setTextViewText(R.id.widget_article_date, "")
            views.setTextViewText(R.id.widget_page_indicator, "")
            return
        }
        val (index, article) = current

        val title = article.optString("title", "Untitled")
        views.setTextViewText(R.id.widget_article_title, title)
        views.setTextViewText(R.id.widget_article_feed, article.optString("feedName", ""))
        views.setTextViewText(R.id.widget_article_date, formatDate(article.optString("pubDate", "")))
        views.setTextViewText(R.id.widget_page_indicator, "${index + 1} / ${articles.length()}")
        views.setOnClickPendingIntent(R.id.widget_article_container, openArticlePendingIntent(context, article))

        // Preview image: above the text when the widget is tall, beside it when it
        // is short but wide. Only a cached image is shown; a missing one is fetched
        // in the background and the widget refreshes itself when it lands.
        val tall = heightDp >= HEIGHT_TALL_CARD
        val imagesOn = showImages(context)
        var imageShown = false
        if (imagesOn && (tall || widthDp >= WIDTH_SIDE_IMAGE)) {
            val url = article.optString("imageUrl", "")
            val bitmap = WidgetImageLoader.getCached(context, url, if (tall) 480 else 240, widgetBackground(context))
            if (bitmap != null) {
                val imageId = if (tall) R.id.widget_image_top else R.id.widget_image_side
                views.setImageViewBitmap(imageId, bitmap)
                views.setViewVisibility(imageId, View.VISIBLE)
                imageShown = true
            }
        }
        if (imagesOn) {
            // This article plus the next two, so paging forward shows images at once.
            val n = articles.length()
            val upcoming = (0..2).mapNotNull { offset ->
                articles.optJSONObject((index + offset) % n)?.optString("imageUrl", "")
            }
            WidgetImageLoader.prefetch(context, upcoming)
        }

        val titleLines = if (imageShown && tall) 2 else 3
        views.setInt(R.id.widget_article_title, "setMaxLines", titleLines)

        // Without an image, let the article's snippet use the spare height rather
        // than leaving the card mostly empty.
        if (!imageShown) {
            val spare = heightDp - 24 - 32 - 16 - titleLines * 19 - 34
            val lines = (spare / 16).coerceIn(0, 6)
            val description = article.optString("description", "").replace(Regex("\\s+"), " ").trim()
            if (lines > 0 && description.isNotEmpty() && description != title) {
                views.setTextViewText(R.id.widget_article_description, description)
                views.setInt(R.id.widget_article_description, "setMaxLines", lines)
                views.setViewVisibility(R.id.widget_article_description, View.VISIBLE)
            }
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
