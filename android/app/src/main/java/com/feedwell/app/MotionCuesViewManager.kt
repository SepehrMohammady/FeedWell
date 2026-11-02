package com.feedwell.app

import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp

/** <FeedWellMotionCues cueStyle dotColor horizonColor />: the motion cues (MotionCuesView) */
class MotionCuesViewManager : SimpleViewManager<MotionCuesView>() {
  override fun getName() = NAME

  override fun createViewInstance(context: ThemedReactContext) = MotionCuesView(context)

  @ReactProp(name = "cueStyle")
  fun setCueStyle(view: MotionCuesView, value: String?) {
    view.cueStyle = value ?: "dots"
  }

  @ReactProp(name = "dotColor", customType = "Color")
  fun setDotColor(view: MotionCuesView, color: Int?) {
    if (color != null) view.dotColor = color
  }

  @ReactProp(name = "horizonColor", customType = "Color")
  fun setHorizonColor(view: MotionCuesView, color: Int?) {
    if (color != null) view.horizonColor = color
  }

  override fun onDropViewInstance(view: MotionCuesView) {
    view.stopListening()
    super.onDropViewInstance(view)
  }

  companion object {
    const val NAME = "FeedWellMotionCues"
  }
}
