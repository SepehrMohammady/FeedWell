package com.feedwell.app

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Path
import android.graphics.PixelFormat
import android.graphics.PorterDuff
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.Build
import android.os.SystemClock
import android.view.Choreographer
import android.view.Surface
import android.view.SurfaceHolder
import android.view.SurfaceView
import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.atan2
import kotlin.math.max
import kotlin.math.min
import kotlin.math.sign
import kotlin.math.sqrt
import kotlin.math.tan
import kotlin.math.tanh

/**
 * Motion cues against motion sickness, drawn over the app: dots in two columns
 * along each side of the screen that move with the vehicle and, as the second
 * style, a horizon too, a tinted band whose surface stays level with what the
 * body feels as down.
 *
 * The dots behave as if they had weight: they slide the way the body is pushed
 * (up the screen when the vehicle brakes, down when it speeds up, to the
 * outside of a turn) and spring back when the push ends, so the eyes see what
 * the inner ear feels. The push is the vehicle's acceleration from Android's
 * fused sensors, gravity taken out, made horizontal and split into across the
 * screen and forward, however the phone is held.
 *
 * It draws on a surface of its own above the app, at the screen's frame rate
 * while something moves and not at all while nothing does. Moving dots never
 * make the app below draw again, and nothing waits for JavaScript.
 */
class MotionCuesView(context: Context) : SurfaceView(context), SurfaceHolder.Callback,
  Choreographer.FrameCallback, SensorEventListener {

  // ---- Set from JavaScript
  var cueStyle = "dots"
    set(value) {
      if (value == "horizon" && field != "horizon") {
        // The horizon starts where the body's down is now
        across = feltAcross; up = feltUp; vAcross = 0f; vUp = 0f
      }
      field = value
      requestFrame()
    }
  var dotColor = 0x66808080
    set(value) { field = value; requestFrame() }
  var horizonColor = 0x1F808080
    set(value) { field = value; requestFrame() }

  private val density = resources.displayMetrics.density
  private val sensors = context.getSystemService(Context.SENSOR_SERVICE) as SensorManager
  private val linearSensor: Sensor? = sensors.getDefaultSensor(Sensor.TYPE_LINEAR_ACCELERATION)
  private val gravitySensor: Sensor? = sensors.getDefaultSensor(Sensor.TYPE_GRAVITY)
  private val accelerometer: Sensor? = sensors.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)
  // Without the fused sensors (no gyroscope), gravity is the accelerometer's slow average
  private val fused = linearSensor != null && gravitySensor != null
  private var listening = false
  private var surfaceReady = false
  private var frameRequested = false

  // The latest readings in the phone's coordinates, m/s²: gravity as the
  // accelerometer feels it (pointing up), and the acceleration without it
  private val gravity = floatArrayOf(0f, SensorManager.GRAVITY_EARTH, 0f)
  private val linear = FloatArray(3)
  private var lastSensorNanos = 0L

  // A sensor's slow drift, taken out
  private var biasAcross = 0f
  private var biasForward = 0f
  // How much the vehicle moved lately: the cues dim while it doesn't
  private var motion = 0f
  private var lastMovedAt = 0L

  // The dots: where the push puts them and where they are (px), and their speed
  private var targetX = 0f
  private var targetY = 0f
  private var x = 0f
  private var y = 0f
  private var vx = 0f
  private var vy = 0f
  // The horizon: what the body feels as up, across the screen and toward its
  // top (m/s², smoothed against the sensors' noise), as felt and as drawn
  private var feltAcross = 0f
  private var feltUp = SensorManager.GRAVITY_EARTH
  private var across = 0f
  private var up = SensorManager.GRAVITY_EARTH
  private var vAcross = 0f
  private var vUp = 0f
  // Full while the vehicle moves, dimmer when it doesn't
  private var strength = 1f
  private var lastFrameNanos = 0L

  private val dotPaint = Paint(Paint.ANTI_ALIAS_FLAG)
  private val bandPaint = Paint(Paint.ANTI_ALIAS_FLAG)
  private val linePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
    style = Paint.Style.STROKE
    strokeWidth = 1.5f * density
  }
  private val band = Path()

  init {
    // A clear surface above the app's window, which never takes a touch or
    // the reader's focus
    setZOrderOnTop(true)
    holder.setFormat(PixelFormat.TRANSLUCENT)
    holder.addCallback(this)
    isClickable = false
    isFocusable = false
    importantForAccessibility = IMPORTANT_FOR_ACCESSIBILITY_NO
  }

  // ---- The sensors run only while the app is on screen

  override fun onAttachedToWindow() {
    super.onAttachedToWindow()
    updateListening()
  }

  override fun onDetachedFromWindow() {
    stopListening()
    super.onDetachedFromWindow()
  }

  override fun onWindowVisibilityChanged(visibility: Int) {
    super.onWindowVisibilityChanged(visibility)
    updateListening()
  }

  private fun updateListening() {
    if (isAttachedToWindow && windowVisibility == VISIBLE) startListening() else stopListening()
  }

  private fun startListening() {
    if (listening) return
    listening = true
    lastSensorNanos = 0L
    // Full strength to begin with
    lastMovedAt = SystemClock.elapsedRealtime()
    if (fused) {
      sensors.registerListener(this, gravitySensor, SAMPLING_US)
      sensors.registerListener(this, linearSensor, SAMPLING_US)
    } else if (accelerometer != null) {
      sensors.registerListener(this, accelerometer, SAMPLING_US)
    }
    requestFrame()
  }

  fun stopListening() {
    if (!listening) return
    listening = false
    sensors.unregisterListener(this)
  }

  // ---- The surface

  override fun surfaceCreated(holder: SurfaceHolder) {
    surfaceReady = true
    lastFrameNanos = 0L
    requestFrame()
  }

  override fun surfaceChanged(holder: SurfaceHolder, format: Int, width: Int, height: Int) {
    requestFrame()
  }

  override fun surfaceDestroyed(holder: SurfaceHolder) {
    surfaceReady = false
    if (frameRequested) {
      Choreographer.getInstance().removeFrameCallback(this)
      frameRequested = false
    }
  }

  private fun requestFrame() {
    if (frameRequested || !surfaceReady) return
    frameRequested = true
    Choreographer.getInstance().postFrameCallback(this)
  }

  // ---- Sensors

  override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {}

  override fun onSensorChanged(event: SensorEvent) {
    val v = event.values
    if (event.sensor.type == Sensor.TYPE_GRAVITY) {
      gravity[0] = v[0]; gravity[1] = v[1]; gravity[2] = v[2]
      return
    }
    val dt = if (lastSensorNanos == 0L) 0f else ((event.timestamp - lastSensorNanos) / 1e9f).coerceIn(0f, 0.1f)
    lastSensorNanos = event.timestamp
    when (event.sensor.type) {
      Sensor.TYPE_LINEAR_ACCELERATION -> {
        linear[0] = v[0]; linear[1] = v[1]; linear[2] = v[2]
      }
      Sensor.TYPE_ACCELEROMETER -> {
        // Gravity as the readings' average over about a second
        val k = min(1f, dt / FALLBACK_GRAVITY_SECONDS)
        for (i in 0..2) {
          gravity[i] += (v[i] - gravity[i]) * k
          linear[i] = v[i] - gravity[i]
        }
      }
      else -> return
    }
    update(dt)
  }

  private fun update(dt: Float) {
    // The screen's right and top in the phone's coordinates: they turn with the screen
    val rx: Float
    val ry: Float
    when (display?.rotation ?: Surface.ROTATION_0) {
      Surface.ROTATION_90 -> { rx = 0f; ry = -1f }
      Surface.ROTATION_180 -> { rx = -1f; ry = 0f }
      Surface.ROTATION_270 -> { rx = 0f; ry = 1f }
      else -> { rx = 1f; ry = 0f }
    }
    val ux = -ry
    val uy = rx

    // Up in the world, and the horizontal part of a direction
    val gn = sqrt(gravity[0] * gravity[0] + gravity[1] * gravity[1] + gravity[2] * gravity[2])
    if (gn < 1f) return
    val wx = gravity[0] / gn
    val wy = gravity[1] / gn
    val wz = gravity[2] / gn

    // Across: the screen's right, made horizontal
    var dr = rx * wx + ry * wy
    var lx = rx - dr * wx
    var ly = ry - dr * wy
    var lz = -dr * wz
    val ln = sqrt(lx * lx + ly * ly + lz * lz)
    // Forward: toward the screen's top and away from the viewer, made
    // horizontal; for a phone held up it's the second, lying flat the first
    val du = ux * wx + uy * wy
    val db = -wz
    var fx = (ux - du * wx) + (0f - db * wx)
    var fy = (uy - du * wy) + (0f - db * wy)
    var fz = (0f - du * wz) + (-1f - db * wz)
    val fn = sqrt(fx * fx + fy * fy + fz * fz)
    if (ln > 0.2f) { lx /= ln; ly /= ln; lz /= ln } else { lx = 0f; ly = 0f; lz = 0f }
    if (fn > 0.2f) { fx /= fn; fy /= fn; fz /= fn } else { fx = 0f; fy = 0f; fz = 0f }

    // The vehicle's push: the acceleration without its up and down part
    dr = linear[0] * wx + linear[1] * wy + linear[2] * wz
    val hx = linear[0] - dr * wx
    val hy = linear[1] - dr * wy
    val hz = linear[2] - dr * wz
    val k = min(1f, dt / BIAS_SECONDS)
    biasAcross += (hx * lx + hy * ly + hz * lz - biasAcross) * k
    biasForward += (hx * fx + hy * fy + hz * fz - biasForward) * k
    val aAcross = hx * lx + hy * ly + hz * lz - biasAcross
    val aForward = hx * fx + hy * fy + hz * fz - biasForward

    motion += (sqrt(aAcross * aAcross + aForward * aForward) - motion) * min(1f, dt / 0.7f)
    if (motion > MOVING) lastMovedAt = SystemClock.elapsedRealtime()

    // The dots go the way the body is pushed: against the push, down the
    // screen when speeding up; a soft limit keeps them near the edges
    val gain = GAIN_DP * density
    val maxX = MAX_ACROSS_DP * density
    val maxY = MAX_FORWARD_DP * density
    targetX = maxX * tanh(-gain * deadZone(aAcross) / maxX)
    targetY = maxY * tanh(gain * deadZone(aForward) / maxY)

    // The horizon is level with gravity and the push together, as water is
    val s = min(1f, dt / FELT_SECONDS)
    feltAcross += ((gravity[0] + linear[0]) * rx + (gravity[1] + linear[1]) * ry - feltAcross) * s
    feltUp += ((gravity[0] + linear[0]) * ux + (gravity[1] + linear[1]) * uy - feltUp) * s

    if (abs(targetX - x) > 0.5f || abs(targetY - y) > 0.5f || strengthAim() != strength ||
        (cueStyle == "horizon" && (abs(feltAcross - across) > 0.05f || abs(feltUp - up) > 0.05f))) {
      requestFrame()
    }
  }

  private fun deadZone(a: Float) = sign(a) * max(0f, abs(a) - DEAD_ZONE)

  // Full while the vehicle moved in the last seconds, dimmer when it's still
  private fun strengthAim() =
    if (SystemClock.elapsedRealtime() - lastMovedAt < STILL_MS) 1f else STILL_STRENGTH

  // ---- Drawing, one frame at a time while something moves

  override fun doFrame(frameTimeNanos: Long) {
    frameRequested = false
    if (!surfaceReady) return
    val dt = if (lastFrameNanos == 0L) 1f / 60f else ((frameTimeNanos - lastFrameNanos) / 1e9f).coerceIn(0f, 0.05f)
    lastFrameNanos = frameTimeNanos

    // Springs: the dots lively, the horizon sloshing a little, like water
    val w = 2f * PI.toFloat() * DOT_HZ
    var ax = -w * w * (x - targetX) - 2f * DOT_DAMPING * w * vx
    var ay = -w * w * (y - targetY) - 2f * DOT_DAMPING * w * vy
    vx += ax * dt; vy += ay * dt
    x += vx * dt; y += vy * dt
    val horizon = cueStyle == "horizon"
    if (horizon) {
      val wh = 2f * PI.toFloat() * HORIZON_HZ
      ax = -wh * wh * (across - feltAcross) - 2f * HORIZON_DAMPING * wh * vAcross
      ay = -wh * wh * (up - feltUp) - 2f * HORIZON_DAMPING * wh * vUp
      vAcross += ax * dt; vUp += ay * dt
      across += vAcross * dt; up += vUp * dt
    }
    val aim = strengthAim()
    strength += (aim - strength) * min(1f, dt / 0.6f)
    if (abs(aim - strength) < 0.005f) strength = aim

    val canvas = try {
      if (Build.VERSION.SDK_INT >= 26) holder.lockHardwareCanvas() else holder.lockCanvas()
    } catch (e: Exception) {
      null
    } ?: return
    try {
      canvas.drawColor(Color.TRANSPARENT, PorterDuff.Mode.CLEAR)
      if (horizon) drawHorizon(canvas)
      drawDots(canvas)
    } finally {
      holder.unlockCanvasAndPost(canvas)
    }

    val moving = abs(x - targetX) > 0.2f || abs(y - targetY) > 0.2f || abs(vx) > 2f || abs(vy) > 2f ||
      strength != aim ||
      (horizon && (abs(across - feltAcross) > 0.03f || abs(up - feltUp) > 0.03f || abs(vAcross) > 0.05f || abs(vUp) > 0.05f))
    if (moving && listening) requestFrame() else lastFrameNanos = 0L
  }

  private fun withAlpha(color: Int, alpha: Float): Int =
    (color and 0x00FFFFFF) or (((color ushr 24) * alpha).toInt().coerceIn(0, 255) shl 24)

  private fun drawDots(canvas: Canvas) {
    dotPaint.color = withAlpha(dotColor, strength)
    val radius = DOT_RADIUS_DP * density
    val spacing = ROW_SPACING_DP * density
    val w = canvas.width.toFloat()
    val h = canvas.height.toFloat()
    for (column in 0 until 4) {
      // Two columns a side; the inner ones move a little less, as if farther away
      val inner = column % 2 == 1
      val depth = if (inner) 0.75f else 1f
      val inset = (if (inner) INNER_INSET_DP else OUTER_INSET_DP) * density
      val cx = (if (column < 2) inset else w - inset) + x * depth
      // The inner column sits half a row lower, so the dots make a lattice
      var cy = (y * depth + if (inner) spacing / 2 else 0f).mod(spacing) - spacing
      while (cy < h + spacing) {
        canvas.drawCircle(cx, cy, radius, dotPaint)
        cy += spacing
      }
    }
  }

  private fun drawHorizon(canvas: Canvas) {
    // A phone lying flat has no down on its screen: the horizon fades out
    val inPlane = sqrt(across * across + up * up) / SensorManager.GRAVITY_EARTH
    val fade = ((inPlane - 0.35f) / 0.2f).coerceIn(0f, 1f)
    if (fade <= 0f) return
    val slope = tan(atan2(across, up).coerceIn(-MAX_TILT, MAX_TILT))
    val w = canvas.width.toFloat()
    val h = canvas.height.toFloat()
    // It rises when the vehicle brakes and sinks when it speeds up, with the dots
    val level = h * HORIZON_LEVEL + y * 0.8f
    val left = level - slope * w / 2f
    val right = level + slope * w / 2f
    band.reset()
    band.moveTo(0f, left)
    band.lineTo(w, right)
    band.lineTo(w, h)
    band.lineTo(0f, h)
    band.close()
    val shown = fade * (0.6f + 0.4f * strength)
    bandPaint.color = withAlpha(horizonColor, shown)
    canvas.drawPath(band, bandPaint)
    linePaint.color = withAlpha(horizonColor or (0xFF shl 24), min(1f, (horizonColor ushr 24) * 3f / 255f) * shown)
    canvas.drawLine(0f, left, w, right, linePaint)
  }

  companion object {
    private const val SAMPLING_US = 10_000 // 100 a second
    private const val FALLBACK_GRAVITY_SECONDS = 1f
    private const val BIAS_SECONDS = 20f
    private const val FELT_SECONDS = 0.12f // smoothing of the horizon's readings
    private const val DEAD_ZONE = 0.12f // m/s², under the vehicle's gentlest push
    private const val MOVING = 0.3f // m/s², the vehicle counts as moving
    private const val STILL_MS = 8_000L
    private const val STILL_STRENGTH = 0.35f
    private const val GAIN_DP = 16f // per m/s²
    private const val MAX_ACROSS_DP = 30f
    private const val MAX_FORWARD_DP = 44f
    private const val DOT_HZ = 1.6f
    private const val DOT_DAMPING = 0.75f
    private const val HORIZON_HZ = 1.2f
    private const val HORIZON_DAMPING = 0.45f
    private const val DOT_RADIUS_DP = 3.5f
    private const val ROW_SPACING_DP = 44f
    private const val OUTER_INSET_DP = 8f
    private const val INNER_INSET_DP = 22f
    private const val HORIZON_LEVEL = 0.58f // of the height, from the top
    private const val MAX_TILT = 0.5f // radians, about 29 degrees
  }
}
