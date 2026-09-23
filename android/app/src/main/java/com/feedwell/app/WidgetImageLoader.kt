package com.feedwell.app

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Paint
import android.os.Handler
import android.os.Looper
import java.io.File
import java.io.FileOutputStream
import java.net.HttpURLConnection
import java.net.URL
import java.security.MessageDigest
import java.util.Collections
import java.util.concurrent.Executors

/**
 * Small disk cache for the widget's preview images.
 *
 * A widget can only show a bitmap it already has, so images are downloaded ahead
 * of time (when the app pushes new articles) and on demand in the background.
 * The only work on the main thread is the widget refresh once a download lands.
 */
object WidgetImageLoader {
    private const val DIR = "widget_images"
    private const val MAX_DOWNLOAD_BYTES = 4 * 1024 * 1024
    private const val TIMEOUT_MS = 8000
    private const val MAX_REDIRECTS = 3

    private val executor = Executors.newSingleThreadExecutor()
    private val inFlight: MutableSet<String> = Collections.synchronizedSet(HashSet())
    // URLs that failed this process lifetime — never retried in a loop.
    private val failed: MutableSet<String> = Collections.synchronizedSet(HashSet())

    fun isUsable(url: String?): Boolean =
        !url.isNullOrBlank() && (url.startsWith("https://") || url.startsWith("http://"))

    private fun dir(context: Context): File = File(context.cacheDir, DIR).apply { mkdirs() }

    private fun fileFor(context: Context, url: String): File {
        val digest = MessageDigest.getInstance("SHA-1").digest(url.toByteArray())
        return File(dir(context), digest.joinToString("") { "%02x".format(it) } + ".img")
    }

    /**
     * The cached image scaled to fit [maxPx] and flattened onto [background], or
     * null when it has not been downloaded yet. Flattening keeps transparent logos
     * from turning into black boxes in the RGB_565 bitmap the widget receives.
     */
    fun getCached(context: Context, url: String?, maxPx: Int, background: Int): Bitmap? {
        if (!isUsable(url)) return null
        val file = fileFor(context, url!!)
        return if (file.exists()) decode(file, maxPx, background) else null
    }

    /** Download if needed, then decode. Blocking — only call off the main thread. */
    fun getBlocking(context: Context, url: String?, maxPx: Int, background: Int): Bitmap? {
        if (!isUsable(url)) return null
        getCached(context, url, maxPx, background)?.let { return it }
        if (failed.contains(url)) return null
        return if (download(context, url!!)) getCached(context, url, maxPx, background) else null
    }

    /** Download in the background and refresh the widgets once anything new is cached. */
    fun prefetch(context: Context, urls: List<String>) {
        val app = context.applicationContext
        val todo = urls.distinct().filter {
            isUsable(it) && !failed.contains(it) && !fileFor(app, it).exists() && inFlight.add(it)
        }
        if (todo.isEmpty()) return
        executor.execute {
            var fetchedAny = false
            for (url in todo) {
                try {
                    if (download(app, url)) fetchedAny = true
                } finally {
                    inFlight.remove(url)
                }
            }
            if (fetchedAny) {
                Handler(Looper.getMainLooper()).post { LatestArticlesWidget.updateAllWidgets(app) }
            }
        }
    }

    /** Delete cached images that no current article refers to. */
    fun prune(context: Context, keepUrls: Collection<String>) {
        executor.execute {
            val keep = keepUrls.filter { isUsable(it) }.map { fileFor(context, it).name }.toHashSet()
            dir(context).listFiles()?.forEach { if (it.name !in keep) it.delete() }
        }
    }

    fun clear(context: Context) {
        executor.execute { dir(context).listFiles()?.forEach { it.delete() } }
    }

    private fun download(context: Context, url: String): Boolean {
        val target = fileFor(context, url)
        val part = File(target.path + ".part")
        var conn: HttpURLConnection? = null
        try {
            var current = URL(url)
            var hops = 0
            while (true) {
                val c = (current.openConnection() as HttpURLConnection).apply {
                    connectTimeout = TIMEOUT_MS
                    readTimeout = TIMEOUT_MS
                    // Followed by hand so an https page can't bounce us to another scheme.
                    instanceFollowRedirects = false
                    setRequestProperty("User-Agent", "Mozilla/5.0 (Linux; Android) FeedWell")
                    setRequestProperty("Accept", "image/*")
                }
                conn = c
                val code = c.responseCode
                if (code in 300..399 && hops < MAX_REDIRECTS) {
                    val location = c.getHeaderField("Location") ?: break
                    val next = URL(current, location)
                    if (next.protocol != "https" && next.protocol != "http") break
                    c.disconnect()
                    current = next
                    hops++
                    continue
                }
                break
            }
            val c = conn ?: return false
            if (c.responseCode !in 200..299) { failed.add(url); return false }
            val type = c.contentType.orEmpty()
            if (type.isNotEmpty() && !type.startsWith("image/")) { failed.add(url); return false }

            c.inputStream.use { input ->
                FileOutputStream(part).use { out ->
                    val buffer = ByteArray(16 * 1024)
                    var total = 0
                    while (true) {
                        val read = input.read(buffer)
                        if (read < 0) break
                        total += read
                        if (total > MAX_DOWNLOAD_BYTES) { failed.add(url); return false }
                        out.write(buffer, 0, read)
                    }
                }
            }

            // Keep it only if it really is an image we can decode.
            val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
            BitmapFactory.decodeFile(part.path, bounds)
            if (bounds.outWidth <= 0 || bounds.outHeight <= 0) { failed.add(url); return false }
            return part.renameTo(target)
        } catch (e: Exception) {
            failed.add(url)
            return false
        } finally {
            conn?.disconnect()
            if (part.exists()) part.delete()
        }
    }

    private fun decode(file: File, maxPx: Int, background: Int): Bitmap? {
        return try {
            val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
            BitmapFactory.decodeFile(file.path, bounds)
            if (bounds.outWidth <= 0 || bounds.outHeight <= 0) return null

            // Halve while the longest side would still cover maxPx, so a 4000px
            // photo is never fully decoded just to be shown at 480px.
            val longestSource = maxOf(bounds.outWidth, bounds.outHeight)
            var sample = 1
            while (longestSource / (sample * 2) >= maxPx) sample *= 2
            val decoded = BitmapFactory.decodeFile(file.path, BitmapFactory.Options().apply {
                inSampleSize = sample
            }) ?: return null

            val longest = maxOf(decoded.width, decoded.height)
            val scale = if (longest > maxPx) maxPx.toFloat() / longest else 1f
            val width = (decoded.width * scale).toInt().coerceAtLeast(1)
            val height = (decoded.height * scale).toInt().coerceAtLeast(1)

            // RGB_565 halves the size of the bitmap we hand to the launcher, which
            // keeps the widget update well under the binder transaction limit.
            val out = Bitmap.createBitmap(width, height, Bitmap.Config.RGB_565)
            Canvas(out).apply {
                drawColor(background)
                val paint = Paint(Paint.FILTER_BITMAP_FLAG or Paint.ANTI_ALIAS_FLAG)
                drawBitmap(decoded, null, android.graphics.Rect(0, 0, width, height), paint)
            }
            decoded.recycle()
            out
        } catch (e: Throwable) {
            null
        }
    }
}
