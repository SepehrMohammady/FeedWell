package com.feedwell.app

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
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

    /** How a widget lays itself out at its size */
    enum class Kind { LIST, STRIP, CARD }

    /**
     * What a widget shows at its size. The still widget and the slideshow's
     * slides both read it, so their controls sit in the same places.
     */
    class Shape(
        val kind: Kind,
        val widthDp: Int,
        val heightDp: Int,
        val showAppName: Boolean,
        val showPrev: Boolean,
        val showPlay: Boolean,
        val showRefresh: Boolean,
    ) {
        val tall: Boolean get() = heightDp >= HEIGHT_TALL_CARD
        val sideImage: Boolean get() = !tall && widthDp >= WIDTH_SIDE_IMAGE
        val showIndicator: Boolean get() = heightDp >= 110
        val stripLines: Int get() = if (heightDp >= 64) 2 else 1
    }

    /** The widget's colors in its theme. The controls take the header's color. */
    class Colors(
        val title: Int,
        val header: Int,
        val feed: Int,
        val date: Int,
        val indicator: Int,
        val background: Int,
    ) {
        val icon: Int get() = header
    }

    companion object {
        const val ACTION_NEXT = "com.feedwell.app.WIDGET_NEXT"
        const val ACTION_PREV = "com.feedwell.app.WIDGET_PREV"
        const val ACTION_OPEN = "com.feedwell.app.WIDGET_OPEN"
        const val ACTION_REFRESH = "com.feedwell.app.WIDGET_REFRESH"
        const val ACTION_PLAY = "com.feedwell.app.WIDGET_PLAY"
        const val ACTION_PAUSE = "com.feedwell.app.WIDGET_PAUSE"
        // A slide's controls say which article they were on
        const val EXTRA_SLIDE_INDEX = "slide_index"

        const val PREFS_NAME = "FeedWellWidgetPrefs"
        const val KEY_ARTICLES = "widget_articles"
        const val KEY_CURRENT_INDEX = "widget_current_index"
        const val KEY_WIDGET_THEME = "widget_theme"
        const val KEY_WIDGET_OPACITY = "widget_opacity"
        const val KEY_APP_THEME = "app_theme"
        const val KEY_SHOW_IMAGES = "widget_show_images"
        // The slideshow: whether it plays, seconds per article, the article it
        // started from, and what a tall widget shows ("list" or "article")
        const val KEY_PLAYING = "widget_playing"
        const val KEY_SLIDE_SECONDS = "widget_slide_seconds"
        const val KEY_SLIDE_START = "widget_slide_start"
        const val KEY_TALL_LAYOUT = "widget_tall_layout"
        // Which of the two identical copies of the playing layout is in use
        const val KEY_SLIDE_COPY = "widget_slide_copy"

        // Layout thresholds in dp, compared against the widget's real size for the
        // current orientation (see sizeOf).
        const val HEIGHT_STRIP = 90        // below: one row, title beside the controls
        const val HEIGHT_TALL_CARD = 190   // at/above: preview image above the text
        const val HEIGHT_LIST = 300        // at/above: scrolling list of articles
        const val WIDTH_SIDE_IMAGE = 200   // room for a thumbnail beside the text
        const val WIDTH_APP_NAME = 200     // narrower: drop the "FeedWell" label
        const val WIDTH_PREV_BUTTON = 140  // narrower: play, next and refresh only
        // The one-row size keeps the title readable: next always, then play,
        // refresh and previous as the row widens
        const val WIDTH_STRIP_PLAY = 150
        const val WIDTH_STRIP_REFRESH = 200
        const val WIDTH_STRIP_PREV = 260

        val SLIDE_SECONDS = intArrayOf(5, 10, 20, 30)
        private const val DEFAULT_SLIDE_SECONDS = 10

        // Must match widget_background_dark / widget_background_light.
        private const val BG_DARK = 0xFF1C1C1E.toInt()
        private const val BG_LIGHT = 0xFFFFF8F4.toInt()

        fun prefs(context: Context): SharedPreferences =
            context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

        fun getArticles(context: Context): JSONArray {
            val articlesJson = prefs(context).getString(KEY_ARTICLES, "[]") ?: "[]"
            return try {
                JSONArray(articlesJson)
            } catch (e: Exception) {
                JSONArray()
            }
        }

        fun getCurrentIndex(context: Context): Int = prefs(context).getInt(KEY_CURRENT_INDEX, 0)

        fun setCurrentIndex(context: Context, index: Int) {
            prefs(context).edit().putInt(KEY_CURRENT_INDEX, index).apply()
        }

        fun isPlaying(context: Context): Boolean = prefs(context).getBoolean(KEY_PLAYING, false)

        fun slideSeconds(context: Context): Int {
            val seconds = prefs(context).getInt(KEY_SLIDE_SECONDS, DEFAULT_SLIDE_SECONDS)
            return if (seconds in SLIDE_SECONDS) seconds else DEFAULT_SLIDE_SECONDS
        }

        fun slideStart(context: Context): Int = prefs(context).getInt(KEY_SLIDE_START, 0)

        fun tallAsList(context: Context): Boolean = prefs(context).getString(KEY_TALL_LAYOUT, "list") != "article"

        /**
         * The playing layout: one per speed, as only a layout can set a flipper's
         * interval, and two identical copies of each. Android drops showNext and
         * showPrevious from widget updates, and nothing else restarts a flipper's
         * timer, so a step while playing swaps to the other copy: the launcher then
         * builds a new flipper, which starts on the new article with a full interval.
         */
        fun slideshowLayout(context: Context): Int {
            val other = prefs(context).getBoolean(KEY_SLIDE_COPY, false)
            return when (slideSeconds(context)) {
                5 -> if (other) R.layout.widget_slideshow_5b else R.layout.widget_slideshow_5
                20 -> if (other) R.layout.widget_slideshow_20b else R.layout.widget_slideshow_20
                30 -> if (other) R.layout.widget_slideshow_30b else R.layout.widget_slideshow_30
                else -> if (other) R.layout.widget_slideshow_10b else R.layout.widget_slideshow_10
            }
        }

        fun updateAllWidgets(context: Context) {
            val intent = Intent(context, LatestArticlesWidget::class.java).apply {
                action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
            }
            context.sendBroadcast(intent)
        }

        /** Returns true if widget should use dark colors */
        fun isWidgetDark(context: Context): Boolean {
            val prefs = prefs(context)
            return when (prefs.getString(KEY_WIDGET_THEME, "app") ?: "app") {
                "light" -> false
                "dark" -> true
                else -> { // "app": follow the app's theme
                    val appTheme = prefs.getString(KEY_APP_THEME, "light") ?: "light"
                    appTheme == "dark"
                }
            }
        }

        fun getWidgetOpacity(context: Context): Int = prefs(context).getInt(KEY_WIDGET_OPACITY, 255) // 0-255

        fun showImages(context: Context): Boolean = prefs(context).getBoolean(KEY_SHOW_IMAGES, true)

        fun widgetBackground(context: Context): Int = if (isWidgetDark(context)) BG_DARK else BG_LIGHT

        fun colors(context: Context): Colors = if (isWidgetDark(context)) {
            Colors(
                title = 0xFFF0E6DE.toInt(),
                header = 0xFFCDADA0.toInt(),
                feed = 0xFFB09A85.toInt(),
                date = 0xFF8B7355.toInt(),
                indicator = 0xFF6B5B4F.toInt(),
                background = BG_DARK,
            )
        } else {
            Colors(
                title = 0xFF3C2A1E.toInt(),
                header = 0xFFA17F66.toInt(),
                feed = 0xFF8B7355.toInt(),
                date = 0xFFB09A85.toInt(),
                indicator = 0xFFC4AA94.toInt(),
                background = BG_LIGHT,
            )
        }

        fun hasWidgets(context: Context): Boolean = widgetIds(context).isNotEmpty()

        fun widgetIds(context: Context): IntArray =
            AppWidgetManager.getInstance(context).getAppWidgetIds(ComponentName(context, LatestArticlesWidget::class.java))

        fun imageUrlsOf(articles: JSONArray): List<String> {
            val urls = ArrayList<String>(articles.length())
            for (i in 0 until articles.length()) {
                val url = articles.optJSONObject(i)?.optString("imageUrl", "").orEmpty()
                if (WidgetImageLoader.isUsable(url)) urls.add(url)
            }
            return urls
        }

        /**
         * The widget's real size in dp. It is minWidth × maxHeight in portrait and
         * maxWidth × minHeight in landscape; reading minHeight in portrait (as this
         * used to) underestimates the height, which is what left a tall widget showing
         * one short article surrounded by empty space.
         */
        fun sizeOf(context: Context, options: Bundle): Pair<Int, Int> {
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

        fun shapeOf(context: Context, appWidgetId: Int): Shape {
            val options = AppWidgetManager.getInstance(context).getAppWidgetOptions(appWidgetId)
            val (w, h) = sizeOf(context, options)
            return when {
                h >= HEIGHT_LIST && tallAsList(context) -> Shape(
                    Kind.LIST, w, h,
                    showAppName = w >= WIDTH_APP_NAME,
                    showPrev = false,
                    showPlay = false,
                    showRefresh = true,
                )
                h < HEIGHT_STRIP -> Shape(
                    Kind.STRIP, w, h,
                    showAppName = false,
                    showPrev = w >= WIDTH_STRIP_PREV,
                    showPlay = w >= WIDTH_STRIP_PLAY,
                    showRefresh = w >= WIDTH_STRIP_REFRESH,
                )
                else -> Shape(
                    Kind.CARD, w, h,
                    showAppName = w >= WIDTH_APP_NAME,
                    showPrev = w >= WIDTH_PREV_BUTTON,
                    showPlay = true,
                    showRefresh = true,
                )
            }
        }

        /** Whether this widget shows the playing slideshow: it plays, there is a
         *  play button at this size, and more than one article to go through */
        fun isSlideshow(context: Context, shape: Shape, count: Int): Boolean =
            isPlaying(context) && shape.showPlay && count > 1

        /** A control's glyph in the widget's icon color, with its name for TalkBack */
        fun styleControl(context: Context, views: RemoteViews, viewId: Int, color: Int, labelKey: String, fallback: String) {
            views.setInt(viewId, "setColorFilter", color)
            views.setContentDescription(viewId, WidgetText.label(context, labelKey, fallback))
        }

        fun wrapIndex(index: Int, count: Int): Int = if (count <= 0) 0 else ((index % count) + count) % count
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
            ACTION_NEXT, ACTION_PREV -> {
                val forward = intent.action == ACTION_NEXT
                val count = getArticles(context).length()
                if (count == 0) return
                if (intent.hasExtra(EXTRA_SLIDE_INDEX) && isPlaying(context)) {
                    // From a playing slide: the slideshow starts again from the
                    // next (or previous) article, on the other copy of its layout,
                    // so that article gets its full time
                    val index = intent.getIntExtra(EXTRA_SLIDE_INDEX, 0)
                    val target = wrapIndex(index + if (forward) 1 else -1, count)
                    val prefs = prefs(context)
                    prefs.edit()
                        .putInt(KEY_CURRENT_INDEX, target)
                        .putInt(KEY_SLIDE_START, target)
                        .putBoolean(KEY_SLIDE_COPY, !prefs.getBoolean(KEY_SLIDE_COPY, false))
                        .apply()
                    refreshAllWidgets(context)
                } else {
                    val current = getCurrentIndex(context)
                    setCurrentIndex(context, wrapIndex(current + if (forward) 1 else -1, count))
                    refreshAllWidgets(context)
                }
            }
            ACTION_PLAY -> {
                val count = getArticles(context).length()
                if (count > 1) {
                    // The slideshow starts from the article on show: its first slide
                    prefs(context).edit()
                        .putInt(KEY_SLIDE_START, wrapIndex(getCurrentIndex(context), count))
                        .putBoolean(KEY_PLAYING, true)
                        .apply()
                    refreshAllWidgets(context)
                }
            }
            ACTION_PAUSE -> {
                // A slide's pause button says which article it was on
                val count = getArticles(context).length()
                val index = intent.getIntExtra(EXTRA_SLIDE_INDEX, getCurrentIndex(context))
                prefs(context).edit()
                    .putInt(KEY_CURRENT_INDEX, wrapIndex(index, count))
                    .putBoolean(KEY_PLAYING, false)
                    .apply()
                refreshAllWidgets(context)
            }
            ACTION_OPEN -> {
                if (intent.hasExtra(EXTRA_SLIDE_INDEX)) {
                    setCurrentIndex(context, intent.getIntExtra(EXTRA_SLIDE_INDEX, 0))
                }
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
                    // No URL: just open the app
                    val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)?.apply {
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    }
                    if (launchIntent != null) context.startActivity(launchIntent)
                }
            }
            ACTION_REFRESH -> {
                // Reload the list data and re-run the normal update so the whole widget refreshes
                val appWidgetManager = AppWidgetManager.getInstance(context)
                val appWidgetIds = widgetIds(context)
                val count = getArticles(context).length()

                // Swap the refresh button for a spinner (a partial update, on the
                // layout the widget shows now, keeps the rest of the widget intact)
                for (appWidgetId in appWidgetIds) {
                    val slideshow = isSlideshow(context, shapeOf(context, appWidgetId), count)
                    val layout = if (slideshow) slideshowLayout(context) else R.layout.widget_latest_articles
                    val progressViews = RemoteViews(context.packageName, layout)
                    progressViews.setViewVisibility(R.id.widget_refresh_button, View.GONE)
                    progressViews.setViewVisibility(R.id.widget_refresh_progress, View.VISIBLE)
                    appWidgetManager.partiallyUpdateAppWidget(appWidgetId, progressViews)
                    appWidgetManager.notifyAppWidgetViewDataChanged(
                        appWidgetId,
                        if (slideshow) R.id.widget_flipper else R.id.widget_article_list,
                    )
                }

                // Re-run the normal update (which restores the refresh button) after a short
                // delay so the spinner is visible even when the refresh is instant
                val pendingResult = goAsync()
                Handler(Looper.getMainLooper()).postDelayed({
                    refreshAllWidgets(context)
                    pendingResult.finish()
                }, 800)
            }
            AppWidgetManager.ACTION_APPWIDGET_UPDATE -> {
                onUpdate(context, AppWidgetManager.getInstance(context), widgetIds(context))
            }
        }
    }

    private fun refreshAllWidgets(context: Context) {
        val appWidgetManager = AppWidgetManager.getInstance(context)
        for (appWidgetId in widgetIds(context)) {
            updateWidget(context, appWidgetManager, appWidgetId)
        }
    }

    private fun updateWidget(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
        val articles = getArticles(context)
        val shape = shapeOf(context, appWidgetId)
        if (isSlideshow(context, shape, articles.length())) {
            appWidgetManager.updateAppWidget(appWidgetId, slideshowViews(context, appWidgetId, shape, articles))
            // The slides read the size, the colors and the articles again
            appWidgetManager.notifyAppWidgetViewDataChanged(appWidgetId, R.id.widget_flipper)
        } else {
            appWidgetManager.updateAppWidget(appWidgetId, stillViews(context, appWidgetId, shape, articles))
            if (shape.kind == Kind.LIST && articles.length() > 0) {
                appWidgetManager.notifyAppWidgetViewDataChanged(appWidgetId, R.id.widget_article_list)
            }
        }
    }

    private fun refreshPendingIntent(context: Context): PendingIntent {
        val refreshIntent = Intent(context, LatestArticlesWidget::class.java).apply { action = ACTION_REFRESH }
        return PendingIntent.getBroadcast(context, 4, refreshIntent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    }

    /**
     * The playing slideshow. The launcher's flipper turns the slides (built by
     * WidgetSlideService); this only sets the frame, the refresh button over the
     * slides and where a tap on a slide goes.
     */
    private fun slideshowViews(context: Context, appWidgetId: Int, shape: Shape, articles: JSONArray): RemoteViews {
        val views = RemoteViews(context.packageName, slideshowLayout(context))
        val density = context.resources.displayMetrics.density
        fun px(dp: Int) = (dp * density).toInt()
        val colors = colors(context)

        views.setInt(R.id.widget_container, "setBackgroundResource",
            if (isWidgetDark(context)) R.drawable.widget_background_dark else R.drawable.widget_background_light)
        views.setFloat(R.id.widget_container, "setAlpha", getWidgetOpacity(context) / 255f)
        if (shape.kind == Kind.STRIP) {
            views.setViewPadding(R.id.widget_container, px(12), px(6), px(8), px(6))
            views.setInt(R.id.widget_overlay, "setGravity", Gravity.CENTER_VERTICAL or Gravity.END)
        } else {
            views.setViewPadding(R.id.widget_container, px(12), px(12), px(12), px(12))
            views.setInt(R.id.widget_overlay, "setGravity", Gravity.TOP or Gravity.END)
        }

        styleControl(context, views, R.id.widget_refresh_button, colors.icon, "refresh", "Refresh")
        views.setViewVisibility(R.id.widget_refresh_button, if (shape.showRefresh) View.VISIBLE else View.GONE)
        views.setViewVisibility(R.id.widget_refresh_progress, View.GONE)
        views.setOnClickPendingIntent(R.id.widget_refresh_button, refreshPendingIntent(context))

        // Under the flipper, the first slide as a still picture: it is there the
        // moment the launcher shows this layout, while the flipper loads
        views.removeAllViews(R.id.widget_underlay)
        views.addView(
            R.id.widget_underlay,
            WidgetSlides.build(context, shape, articles, wrapIndex(slideStart(context), articles.length()), live = false),
        )

        val serviceIntent = Intent(context, WidgetSlideService::class.java).apply {
            putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
            data = Uri.parse(toUri(Intent.URI_INTENT_SCHEME))
        }
        views.setRemoteAdapter(R.id.widget_flipper, serviceIntent)

        // No action of its own: each control on a slide fills in what it does
        val template = Intent(context, LatestArticlesWidget::class.java)
        val templatePending = PendingIntent.getBroadcast(
            context, 1000 + appWidgetId, template,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE
        )
        views.setPendingIntentTemplate(R.id.widget_flipper, templatePending)
        return views
    }

    /** The widget when its slideshow isn't playing: one article, a row, or a list */
    private fun stillViews(context: Context, appWidgetId: Int, shape: Shape, articles: JSONArray): RemoteViews {
        val views = RemoteViews(context.packageName, R.layout.widget_latest_articles)
        val density = context.resources.displayMetrics.density
        fun px(dp: Int) = (dp * density).toInt()
        val count = articles.length()

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
        views.setViewPadding(R.id.widget_container, px(12), px(12), px(12), px(12))
        views.setViewPadding(R.id.widget_header, 0, 0, 0, px(6))
        views.setInt(R.id.widget_container, "setGravity", Gravity.TOP or Gravity.START)

        // ── Theme colors ──
        val colors = colors(context)
        val bgRes = if (isWidgetDark(context)) R.drawable.widget_background_dark else R.drawable.widget_background_light
        views.setInt(R.id.widget_container, "setBackgroundResource", bgRes)

        // Apply opacity (0-255 → 0.0f-1.0f)
        views.setFloat(R.id.widget_container, "setAlpha", getWidgetOpacity(context) / 255f)

        views.setTextColor(R.id.widget_app_name, colors.header)
        views.setTextColor(R.id.widget_strip_title, colors.title)
        views.setTextColor(R.id.widget_article_title, colors.title)
        views.setTextColor(R.id.widget_article_feed, colors.feed)
        views.setTextColor(R.id.widget_article_date, colors.date)
        views.setTextColor(R.id.widget_article_description, colors.feed)
        views.setTextColor(R.id.widget_page_indicator, colors.indicator)

        // The controls in the header's color, with their names for TalkBack
        styleControl(context, views, R.id.widget_prev_button, colors.icon, "previous", "Previous article")
        styleControl(context, views, R.id.widget_play_button, colors.icon, "play", "Play slideshow")
        styleControl(context, views, R.id.widget_next_button, colors.icon, "next", "Next article")
        styleControl(context, views, R.id.widget_refresh_button, colors.icon, "refresh", "Refresh")

        // Header controls shrink with the width. The app name keeps its weight even
        // when blanked, so the buttons stay pinned to the end of the row.
        views.setTextViewText(R.id.widget_app_name, if (shape.showAppName) "FeedWell" else "")
        val single = shape.kind != Kind.LIST || count == 0
        views.setViewVisibility(R.id.widget_prev_button, if (single && shape.showPrev && count > 1) View.VISIBLE else View.GONE)
        views.setViewVisibility(R.id.widget_play_button, if (single && shape.showPlay && count > 1) View.VISIBLE else View.GONE)
        views.setViewVisibility(R.id.widget_next_button, if (single && count > 1) View.VISIBLE else View.GONE)

        when {
            // ── LIST: tall widget → scrollable list ──
            shape.kind == Kind.LIST && count > 0 -> {
                views.setViewVisibility(R.id.widget_article_container, View.GONE)
                views.setViewVisibility(R.id.widget_page_indicator, View.GONE)
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
            }
            // ── STRIP: one row → the title sits in the header next to the controls ──
            shape.kind == Kind.STRIP -> {
                views.setViewVisibility(R.id.widget_article_container, View.GONE)
                views.setViewVisibility(R.id.widget_article_list, View.GONE)
                views.setViewVisibility(R.id.widget_page_indicator, View.GONE)
                views.setViewVisibility(R.id.widget_app_name, View.GONE)
                views.setViewVisibility(R.id.widget_strip_title, View.VISIBLE)
                views.setViewPadding(R.id.widget_container, px(12), px(6), px(8), px(6))
                views.setViewPadding(R.id.widget_header, 0, 0, 0, 0)
                views.setInt(R.id.widget_container, "setGravity", Gravity.CENTER_VERTICAL)
                views.setInt(R.id.widget_strip_title, "setMaxLines", shape.stripLines)

                setupStrip(context, views, articles)
            }
            // ── CARD: one article, with a preview image when there is room for one ──
            else -> {
                views.setViewVisibility(R.id.widget_article_container, View.VISIBLE)
                views.setViewVisibility(R.id.widget_article_list, View.GONE)
                views.setViewVisibility(R.id.widget_page_indicator, if (shape.showIndicator) View.VISIBLE else View.GONE)
                views.setViewVisibility(R.id.widget_article_feed, View.VISIBLE)
                views.setViewVisibility(R.id.widget_article_date, View.VISIBLE)
                views.setViewVisibility(R.id.widget_article_title, View.VISIBLE)
                views.setFloat(R.id.widget_article_title, "setTextSize", 14f)

                setupCard(context, views, articles, shape)
            }
        }

        // Next, previous and play (always wired, shown only in the single-article modes)
        val nextIntent = Intent(context, LatestArticlesWidget::class.java).apply { action = ACTION_NEXT }
        val nextPending = PendingIntent.getBroadcast(context, 1, nextIntent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        views.setOnClickPendingIntent(R.id.widget_next_button, nextPending)

        val prevIntent = Intent(context, LatestArticlesWidget::class.java).apply { action = ACTION_PREV }
        val prevPending = PendingIntent.getBroadcast(context, 2, prevIntent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        views.setOnClickPendingIntent(R.id.widget_prev_button, prevPending)

        val playIntent = Intent(context, LatestArticlesWidget::class.java).apply { action = ACTION_PLAY }
        val playPending = PendingIntent.getBroadcast(context, 5, playIntent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        views.setOnClickPendingIntent(R.id.widget_play_button, playPending)

        views.setOnClickPendingIntent(R.id.widget_refresh_button, refreshPendingIntent(context))

        // Always restore the refresh button so widgets never get stuck showing the spinner
        views.setViewVisibility(R.id.widget_refresh_button, if (shape.showRefresh) View.VISIBLE else View.GONE)
        views.setViewVisibility(R.id.widget_refresh_progress, View.GONE)
        return views
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
            views.setTextViewText(R.id.widget_strip_title, WidgetText.label(context, "emptyTitle", "No articles yet"))
            views.setOnClickPendingIntent(R.id.widget_strip_title, openArticlePendingIntent(context, JSONObject()))
            return
        }
        val (_, article) = current
        views.setTextViewText(R.id.widget_strip_title, article.optString("title", "Untitled"))
        views.setOnClickPendingIntent(R.id.widget_strip_title, openArticlePendingIntent(context, article))
    }

    private fun setupCard(context: Context, views: RemoteViews, articles: JSONArray, shape: Shape) {
        val current = currentArticle(context, articles)
        if (current == null) {
            views.setTextViewText(R.id.widget_article_title, WidgetText.label(context, "emptyTitle", "No articles yet"))
            views.setTextViewText(R.id.widget_article_feed, WidgetText.label(context, "emptyBody", "Open FeedWell to load your feeds"))
            views.setTextViewText(R.id.widget_article_date, "")
            views.setTextViewText(R.id.widget_page_indicator, "")
            // A tap opens the app
            views.setOnClickPendingIntent(R.id.widget_article_container, openArticlePendingIntent(context, JSONObject()))
            return
        }
        val (index, article) = current

        val title = article.optString("title", "Untitled")
        views.setTextViewText(R.id.widget_article_title, title)
        views.setTextViewText(R.id.widget_article_feed, article.optString("feedName", ""))
        views.setTextViewText(R.id.widget_article_date, WidgetText.date(context, article.optString("pubDate", "")))
        views.setTextViewText(R.id.widget_page_indicator, WidgetText.number(context, "${index + 1} / ${articles.length()}"))
        views.setOnClickPendingIntent(R.id.widget_article_container, openArticlePendingIntent(context, article))

        // Preview image: above the text when the widget is tall, beside it when it
        // is short but wide. Only a cached image is shown; a missing one is fetched
        // in the background and the widget refreshes itself when it lands.
        val tall = shape.tall
        val imagesOn = showImages(context)
        var imageShown = false
        if (imagesOn && (tall || shape.sideImage)) {
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
            val lines = snippetLines(shape.heightDp, titleLines)
            val description = article.optString("description", "").replace(Regex("\\s+"), " ").trim()
            if (lines > 0 && description.isNotEmpty() && description != title) {
                views.setTextViewText(R.id.widget_article_description, description)
                views.setInt(R.id.widget_article_description, "setMaxLines", lines)
                views.setViewVisibility(R.id.widget_article_description, View.VISIBLE)
            }
        }
    }
}

/** How many lines of an article's snippet fit under its title in a card of this height */
fun snippetLines(heightDp: Int, titleLines: Int): Int {
    val spare = heightDp - 24 - 32 - 16 - titleLines * 19 - 34
    return (spare / 16).coerceIn(0, 6)
}
