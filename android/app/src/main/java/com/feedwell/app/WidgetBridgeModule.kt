package com.feedwell.app

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
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

        // Notify all widgets to update
        val appWidgetManager = AppWidgetManager.getInstance(context)
        val thisWidget = ComponentName(context, LatestArticlesWidget::class.java)
        val appWidgetIds = appWidgetManager.getAppWidgetIds(thisWidget)
        if (appWidgetIds.isNotEmpty()) {
            val widget = LatestArticlesWidget()
            widget.onUpdate(context, appWidgetManager, appWidgetIds)
        }
    }
}
