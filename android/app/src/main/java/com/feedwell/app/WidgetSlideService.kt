package com.feedwell.app

import android.appwidget.AppWidgetManager
import android.content.Context
import android.content.Intent
import android.view.View
import android.widget.RemoteViews
import android.widget.RemoteViewsService
import org.json.JSONArray
import org.json.JSONObject

/**
 * The slides of a playing widget slideshow, one per article. They start at the
 * article that was showing when play was tapped (slide 0), and each slide's
 * controls carry the article's own number, so pausing stops on the article the
 * widget was showing and opening one remembers where the widget was.
 */
class WidgetSlideService : RemoteViewsService() {
    override fun onGetViewFactory(intent: Intent): RemoteViewsFactory {
        return WidgetSlideFactory(
            applicationContext,
            intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID),
        )
    }
}

/**
 * How a slide looks: a card, or a row in the one-row size. The slideshow's
 * slides are built here, and so is the still copy of the first slide that lies
 * under the flipper while the launcher loads it (LatestArticlesWidget).
 */
object WidgetSlides {

    /**
     * The slide for the article at [index]. [live] slides belong to the
     * flipper: their controls work, and a missing picture is fetched (they are
     * built on a binder thread). The still copy only shows a cached picture.
     */
    fun build(
        context: Context,
        shape: LatestArticlesWidget.Shape,
        articles: JSONArray,
        index: Int,
        live: Boolean,
    ): RemoteViews {
        val article = articles.optJSONObject(index) ?: JSONObject()
        return if (shape.kind == LatestArticlesWidget.Kind.STRIP) {
            strip(context, shape, index, article, live)
        } else {
            card(context, shape, index, article, articles.length(), live)
        }
    }

    /** The controls' colors and names, and which of them fit at this size */
    private fun styleControls(context: Context, views: RemoteViews, shape: LatestArticlesWidget.Shape, colors: LatestArticlesWidget.Colors) {
        LatestArticlesWidget.styleControl(context, views, R.id.slide_prev, colors.icon, "previous", "Previous article")
        LatestArticlesWidget.styleControl(context, views, R.id.slide_pause, colors.icon, "pause", "Pause slideshow")
        LatestArticlesWidget.styleControl(context, views, R.id.slide_next, colors.icon, "next", "Next article")
        views.setViewVisibility(R.id.slide_prev, if (shape.showPrev) View.VISIBLE else View.GONE)
        views.setViewVisibility(R.id.slide_refresh_space, if (shape.showRefresh) View.VISIBLE else View.GONE)
    }

    /** What the slide's buttons and a tap on its article do, for the article at [index] */
    private fun wireControls(views: RemoteViews, index: Int, article: JSONObject, openViewId: Int) {
        fun fill(action: String) = Intent().apply {
            this.action = action
            putExtra(LatestArticlesWidget.EXTRA_SLIDE_INDEX, index)
        }
        views.setOnClickFillInIntent(R.id.slide_prev, fill(LatestArticlesWidget.ACTION_PREV))
        views.setOnClickFillInIntent(R.id.slide_pause, fill(LatestArticlesWidget.ACTION_PAUSE))
        views.setOnClickFillInIntent(R.id.slide_next, fill(LatestArticlesWidget.ACTION_NEXT))
        views.setOnClickFillInIntent(openViewId, fill(LatestArticlesWidget.ACTION_OPEN).apply {
            putExtra("article_url", article.optString("link", ""))
            putExtra("article_title", article.optString("title", "Untitled"))
            putExtra("article_feed", article.optString("feedName", ""))
            putExtra("article_date", article.optString("pubDate", ""))
        })
    }

    private fun strip(context: Context, shape: LatestArticlesWidget.Shape, index: Int, article: JSONObject, live: Boolean): RemoteViews {
        val views = RemoteViews(context.packageName, R.layout.widget_slide_strip)
        val colors = LatestArticlesWidget.colors(context)
        views.setInt(R.id.slide_root, "setBackgroundColor", colors.background)
        styleControls(context, views, shape, colors)
        views.setTextColor(R.id.slide_strip_title, colors.title)
        views.setInt(R.id.slide_strip_title, "setMaxLines", shape.stripLines)
        views.setTextViewText(R.id.slide_strip_title, article.optString("title", "Untitled"))
        if (live) wireControls(views, index, article, R.id.slide_strip_title)
        return views
    }

    private fun card(context: Context, shape: LatestArticlesWidget.Shape, index: Int, article: JSONObject, count: Int, live: Boolean): RemoteViews {
        val views = RemoteViews(context.packageName, R.layout.widget_slide_card)
        val colors = LatestArticlesWidget.colors(context)
        views.setInt(R.id.slide_root, "setBackgroundColor", colors.background)
        styleControls(context, views, shape, colors)

        views.setTextViewText(R.id.slide_app_name, if (shape.showAppName) "FeedWell" else "")
        views.setTextColor(R.id.slide_app_name, colors.header)
        views.setTextColor(R.id.slide_title, colors.title)
        views.setTextColor(R.id.slide_description, colors.feed)
        views.setTextColor(R.id.slide_feed, colors.feed)
        views.setTextColor(R.id.slide_date, colors.date)
        views.setTextColor(R.id.slide_indicator, colors.indicator)

        val title = article.optString("title", "Untitled")
        views.setTextViewText(R.id.slide_title, title)
        views.setTextViewText(R.id.slide_feed, article.optString("feedName", ""))
        views.setTextViewText(R.id.slide_date, WidgetText.date(context, article.optString("pubDate", "")))
        if (shape.showIndicator) {
            views.setTextViewText(R.id.slide_indicator, WidgetText.number(context, "${index + 1} / $count"))
            views.setViewVisibility(R.id.slide_indicator, View.VISIBLE)
        } else {
            views.setViewVisibility(R.id.slide_indicator, View.GONE)
        }

        // The launcher reuses a slide's views for the next one, so every part
        // that comes and goes is set each time
        views.setViewVisibility(R.id.slide_image_top, View.GONE)
        views.setViewVisibility(R.id.slide_image_side, View.GONE)
        views.setViewVisibility(R.id.slide_description, View.GONE)

        var imageShown = false
        if (LatestArticlesWidget.showImages(context) && (shape.tall || shape.sideImage)) {
            val url = article.optString("imageUrl", "")
            val maxPx = if (shape.tall) 480 else 240
            val background = LatestArticlesWidget.widgetBackground(context)
            val bitmap = if (live) {
                WidgetImageLoader.getBlocking(context, url, maxPx, background)
            } else {
                WidgetImageLoader.getCached(context, url, maxPx, background)
            }
            if (bitmap != null) {
                val imageId = if (shape.tall) R.id.slide_image_top else R.id.slide_image_side
                views.setImageViewBitmap(imageId, bitmap)
                views.setViewVisibility(imageId, View.VISIBLE)
                imageShown = true
            }
        }

        val titleLines = if (imageShown && shape.tall) 2 else 3
        views.setInt(R.id.slide_title, "setMaxLines", titleLines)
        if (!imageShown) {
            val lines = snippetLines(shape.heightDp, titleLines)
            val description = article.optString("description", "").replace(Regex("\\s+"), " ").trim()
            if (lines > 0 && description.isNotEmpty() && description != title) {
                views.setTextViewText(R.id.slide_description, description)
                views.setInt(R.id.slide_description, "setMaxLines", lines)
                views.setViewVisibility(R.id.slide_description, View.VISIBLE)
            }
        }

        if (live) wireControls(views, index, article, R.id.slide_article)
        return views
    }
}

class WidgetSlideFactory(private val context: Context, private val appWidgetId: Int) : RemoteViewsService.RemoteViewsFactory {

    private var articles = JSONArray()
    private var articlesJson: String? = null
    private var start = 0
    private var shape: LatestArticlesWidget.Shape? = null

    override fun onCreate() {}

    override fun onDataSetChanged() {
        articlesJson = null
        refreshIfChanged()
        shape = LatestArticlesWidget.shapeOf(context, appWidgetId)
    }

    /**
     * The articles and the slide the show starts from, read again whenever they
     * have changed. The launcher keeps this factory between plays, and the
     * "data changed" call sent with a new play can arrive while it is still
     * swapping the layouts, when it is lost: so the slides never trust what
     * they read before.
     */
    private fun refreshIfChanged() {
        val json = LatestArticlesWidget.prefs(context).getString(LatestArticlesWidget.KEY_ARTICLES, "[]") ?: "[]"
        val newStart = LatestArticlesWidget.slideStart(context)
        if (json != articlesJson || newStart != start) {
            articles = try { JSONArray(json) } catch (e: Exception) { JSONArray() }
            articlesJson = json
            start = newStart
            shape = null
        }
    }

    override fun onDestroy() {}

    override fun getCount(): Int {
        refreshIfChanged()
        return articles.length()
    }

    private fun currentShape(): LatestArticlesWidget.Shape =
        shape ?: LatestArticlesWidget.shapeOf(context, appWidgetId).also { shape = it }

    override fun getViewAt(position: Int): RemoteViews {
        refreshIfChanged()
        val count = articles.length()
        val shape = currentShape()
        val index = LatestArticlesWidget.wrapIndex(start + position, count)
        val views = WidgetSlides.build(context, shape, articles, index, live = true)
        // The next slide's picture, decoded ahead, so that flip is quick too
        if (LatestArticlesWidget.showImages(context) && (shape.tall || shape.sideImage) && count > 1) {
            val next = articles.optJSONObject(LatestArticlesWidget.wrapIndex(index + 1, count))
            WidgetImageLoader.warm(
                context,
                next?.optString("imageUrl", "").orEmpty(),
                if (shape.tall) 480 else 240,
                LatestArticlesWidget.widgetBackground(context),
            )
        }
        return views
    }

    // While a slide loads: nothing, so the slide before it (or the still copy
    // under the flipper) stays in sight instead of an empty card
    override fun getLoadingView(): RemoteViews = RemoteViews(context.packageName, R.layout.widget_slide_loading)

    // A slide is a card or a row
    override fun getViewTypeCount(): Int = 2

    override fun getItemId(position: Int): Long = position.toLong()

    override fun hasStableIds(): Boolean = false
}
