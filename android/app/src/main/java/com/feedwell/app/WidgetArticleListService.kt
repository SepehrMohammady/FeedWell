package com.feedwell.app

import android.content.Context
import android.content.Intent
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

        if (position < articles.length()) {
            val article = articles.getJSONObject(position)
            val title = article.optString("title", "Untitled")
            val feedName = article.optString("feedName", "")
            val pubDate = article.optString("pubDate", "")
            val link = article.optString("link", "")

            views.setTextViewText(R.id.widget_item_title, title)
            views.setTextViewText(R.id.widget_item_feed, feedName)
            views.setTextViewText(R.id.widget_item_date, formatDate(pubDate))

            // Set fill-in intent for item click (deep link)
            val fillIntent = Intent().apply {
                putExtra("article_url", link)
                putExtra("article_title", title)
                putExtra("article_feed", feedName)
                putExtra("article_date", pubDate)
            }
            views.setOnClickFillInIntent(R.id.widget_list_item, fillIntent)
        }

        return views
    }

    override fun getLoadingView(): RemoteViews? = null

    override fun getViewTypeCount(): Int = 1

    override fun getItemId(position: Int): Long = position.toLong()

    override fun hasStableIds(): Boolean = false

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
