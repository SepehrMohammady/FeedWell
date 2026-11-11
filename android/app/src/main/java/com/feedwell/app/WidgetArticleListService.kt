package com.feedwell.app

import android.content.Context
import android.content.Intent
import android.view.View
import android.widget.RemoteViews
import android.widget.RemoteViewsService
import org.json.JSONArray

class WidgetArticleListService : RemoteViewsService() {
    override fun onGetViewFactory(intent: Intent): RemoteViewsFactory {
        return WidgetArticleListFactory(applicationContext)
    }
}

class WidgetArticleListFactory(private val context: Context) : RemoteViewsService.RemoteViewsFactory {

    private var articles = JSONArray()

    override fun onCreate() {}

    override fun onDataSetChanged() {
        articles = LatestArticlesWidget.getArticles(context)
    }

    override fun onDestroy() {}

    override fun getCount(): Int = articles.length()

    override fun getViewAt(position: Int): RemoteViews {
        val views = RemoteViews(context.packageName, R.layout.widget_article_item)

        // Apply theme colors
        val colors = LatestArticlesWidget.colors(context)
        views.setTextColor(R.id.widget_item_title, colors.title)
        views.setTextColor(R.id.widget_item_feed, colors.feed)
        views.setTextColor(R.id.widget_item_date, colors.date)

        if (position < articles.length()) {
            val article = articles.getJSONObject(position)
            val title = article.optString("title", "Untitled")
            val feedName = article.optString("feedName", "")
            val pubDate = article.optString("pubDate", "")
            val link = article.optString("link", "")

            views.setTextViewText(R.id.widget_item_title, title)
            views.setTextViewText(R.id.widget_item_feed, feedName)
            views.setTextViewText(R.id.widget_item_date, WidgetText.date(context, pubDate))

            // Set fill-in intent for item click (deep link)
            val fillIntent = Intent().apply {
                putExtra("article_url", link)
                putExtra("article_title", title)
                putExtra("article_feed", feedName)
                putExtra("article_date", pubDate)
            }
            views.setOnClickFillInIntent(R.id.widget_list_item, fillIntent)

            // getViewAt runs on a binder thread, so a missing thumbnail can be
            // downloaded right here without blocking the launcher's UI.
            val imageUrl = article.optString("imageUrl", "")
            val thumbnail = if (LatestArticlesWidget.showImages(context)) {
                WidgetImageLoader.getBlocking(context, imageUrl, 160, LatestArticlesWidget.widgetBackground(context))
            } else null
            if (thumbnail != null) {
                views.setImageViewBitmap(R.id.widget_item_image, thumbnail)
                views.setViewVisibility(R.id.widget_item_image, View.VISIBLE)
            } else {
                views.setViewVisibility(R.id.widget_item_image, View.GONE)
            }
        }

        return views
    }

    override fun getLoadingView(): RemoteViews? = null

    override fun getViewTypeCount(): Int = 1

    override fun getItemId(position: Int): Long = position.toLong()

    override fun hasStableIds(): Boolean = false
}
