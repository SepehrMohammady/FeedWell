package com.feedwell.app

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class WidgetBridgeModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "WidgetBridge"

    @ReactMethod
    fun updateArticles(articlesJson: String) {
        val context = reactApplicationContext
        val prefs = context.getSharedPreferences(
            LatestArticlesWidget.PREFS_NAME,
            Context.MODE_PRIVATE
        )
        prefs.edit().putString(LatestArticlesWidget.KEY_ARTICLES, articlesJson).apply()

        refreshWidgets(context)
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
