package com.feedwell.app

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import org.json.JSONArray

class WidgetBridgeModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    companion object {
        // The first few articles are the ones a widget shows before any paging.
        private const val PREFETCH_COUNT = 6
    }

    override fun getName(): String = "WidgetBridge"

    @ReactMethod
    fun updateArticles(articlesJson: String) {
        val context = reactApplicationContext
        val prefs = context.getSharedPreferences(
            LatestArticlesWidget.PREFS_NAME,
            Context.MODE_PRIVATE
        )
        prefs.edit().putString(LatestArticlesWidget.KEY_ARTICLES, articlesJson).apply()

        // Keep the image cache in step with the article list, and warm it up while
        // the app is running — only when a widget is actually on the home screen.
        val urls = imageUrls(articlesJson)
        WidgetImageLoader.prune(context, urls)
        if (LatestArticlesWidget.showImages(context) && LatestArticlesWidget.hasWidgets(context)) {
            WidgetImageLoader.prefetch(context, urls.take(PREFETCH_COUNT))
        }

        refreshWidgets(context)
    }

    @ReactMethod
    fun setWidgetShowImages(show: Boolean) {
        val context = reactApplicationContext
        val prefs = context.getSharedPreferences(
            LatestArticlesWidget.PREFS_NAME,
            Context.MODE_PRIVATE
        )
        prefs.edit().putBoolean(LatestArticlesWidget.KEY_SHOW_IMAGES, show).apply()
        if (!show) {
            WidgetImageLoader.clear(context)
        } else if (LatestArticlesWidget.hasWidgets(context)) {
            val articlesJson = prefs.getString(LatestArticlesWidget.KEY_ARTICLES, "[]") ?: "[]"
            WidgetImageLoader.prefetch(context, imageUrls(articlesJson).take(PREFETCH_COUNT))
        }
        refreshWidgets(context)
    }

    private fun imageUrls(articlesJson: String): List<String> = try {
        LatestArticlesWidget.imageUrlsOf(JSONArray(articlesJson))
    } catch (e: Exception) {
        emptyList()
    }

    @ReactMethod
    fun setWidgetTheme(theme: String) {
        val context = reactApplicationContext
        val prefs = context.getSharedPreferences(
            LatestArticlesWidget.PREFS_NAME,
            Context.MODE_PRIVATE
        )
        prefs.edit().putString(LatestArticlesWidget.KEY_WIDGET_THEME, theme).apply()
        refreshWidgets(context)
    }

    @ReactMethod
    fun setAppTheme(theme: String) {
        val context = reactApplicationContext
        val prefs = context.getSharedPreferences(
            LatestArticlesWidget.PREFS_NAME,
            Context.MODE_PRIVATE
        )
        prefs.edit().putString(LatestArticlesWidget.KEY_APP_THEME, theme).apply()
        refreshWidgets(context)
    }

    @ReactMethod
    fun setWidgetOpacity(opacity: Int) {
        val context = reactApplicationContext
        val prefs = context.getSharedPreferences(
            LatestArticlesWidget.PREFS_NAME,
            Context.MODE_PRIVATE
        )
        prefs.edit().putInt(LatestArticlesWidget.KEY_WIDGET_OPACITY, opacity.coerceIn(0, 255)).apply()
        refreshWidgets(context)
    }

    @ReactMethod
    fun requestPinWidget(promise: Promise) {
        try {
            val context = reactApplicationContext
            val appWidgetManager = AppWidgetManager.getInstance(context)
            val widgetComponent = ComponentName(context, LatestArticlesWidget::class.java)
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                if (appWidgetManager.isRequestPinAppWidgetSupported) {
                    appWidgetManager.requestPinAppWidget(widgetComponent, null, null)
                    promise.resolve(true)
                } else {
                    promise.resolve(false)
                }
            } else {
                promise.resolve(false)
            }
        } catch (e: Exception) {
            promise.reject("PIN_ERROR", e.message)
        }
    }

    private fun refreshWidgets(context: Context) {
        val appWidgetManager = AppWidgetManager.getInstance(context)
        val thisWidget = ComponentName(context, LatestArticlesWidget::class.java)
        val appWidgetIds = appWidgetManager.getAppWidgetIds(thisWidget)
        if (appWidgetIds.isNotEmpty()) {
            val widget = LatestArticlesWidget()
            widget.onUpdate(context, appWidgetManager, appWidgetIds)
        }
    }
}
