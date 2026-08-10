# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# react-native-reanimated
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# React Native core
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }

# AsyncStorage
-keep class com.reactnativecommunity.asyncstorage.** { *; }

# Expo modules
-keep class expo.modules.** { *; }
-keep class com.expo.** { *; }

# React Navigation
-keep class com.swmansion.gesturehandler.** { *; }
-keep class com.th3rdwave.safeareacontext.** { *; }

# Hermes JS engine
-keep class com.facebook.hermes.unicode.** { *; }
-keep class com.facebook.jni.** { *; }

# Keep native modules
-keepclassmembers class * {
    @com.facebook.react.bridge.ReactMethod *;
}

# Keep enums
-keepclassmembers enum * { *; }

# Keep Parcelables
-keepclassmembers class * implements android.os.Parcelable {
    static ** CREATOR;
}

# Prevent stripping of annotations
-keepattributes *Annotation*
-keepattributes Signature
-keepattributes Exceptions

# Add any project specific keep options here:

# FeedWell native code (widget provider/service/bridge) — keep intact under R8
# optimization; the widget classes are referenced from the manifest and via
# reflection-adjacent RemoteViews paths.
-keep class com.feedwell.app.** { *; }

# ML Kit translate (fast-mlkit-translate-text) — belt-and-braces on top of the
# library's own consumer rules.
-keep class com.google.mlkit.** { *; }
