import { useRef, useCallback, useEffect } from 'react';

// Shared auto-scroll engine (Settings > Auto-Scroll, default off) used by the
// feed list and the in-app reader. After `delaySeconds` without interaction the
// scrollable drifts down at the chosen speed. Touching pauses it for as long as
// the finger stays down; releasing re-arms the idle timer. Reaching the end
// stops it until the next interaction.

// px/s at 100% speed; the speed setting is a percentage (25–250).
export const AUTO_SCROLL_BASE_PX_PER_SEC = 45;
// ~60 fps with a fractional-pixel accumulator so the drift reads as continuous
// motion instead of visible 20 Hz steps.
const TICK_MS = 16;
// Grace period on top of the idle delay before a touch that never reported its
// end is treated as lost. See touchPause().
const LOST_TOUCH_GRACE_MS = 5000;

// The stored speed was originally 'slow' | 'normal' | 'fast'; it is now a
// percentage. Map legacy values and clamp out-of-range numbers.
export function normalizeAutoScrollSpeed(value) {
  if (value === 'slow') return 50;
  if (value === 'normal') return 100;
  if (value === 'fast') return 200;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 100;
  return Math.min(250, Math.max(25, Math.round(n)));
}

export function useAutoScroll({ enabled, delaySeconds, speedPercent, getOffset, getMaxOffset, scrollTo, isBlocked }) {
  const idleTimerRef = useRef(null);
  const tickRef = useRef(null);
  // Rescue timer for a touch whose end never arrived (see touchPause).
  const watchdogRef = useRef(null);
  // Float accumulator: the tick advances this, not the (quantized) offsets
  // echoed back through onScroll, so sub-pixel steps aren't lost.
  const offsetFloatRef = useRef(0);
  // Settings and callbacks live in a ref so running timers always see the
  // values from the latest render.
  const stateRef = useRef({});
  stateRef.current = { enabled, delaySeconds, speedPercent, getOffset, getMaxOffset, scrollTo, isBlocked };
  // Forward reference to arm(), which is defined below — lets a blocked tick
  // and the watchdog reschedule without a circular dependency.
  const armRef = useRef(null);

  const clearIdleTimer = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  }, []);

  const clearWatchdog = useCallback(() => {
    if (watchdogRef.current) {
      clearTimeout(watchdogRef.current);
      watchdogRef.current = null;
    }
  }, []);

  const stopTick = useCallback(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }, []);

  const startTick = useCallback(() => {
    stopTick();
    const s = stateRef.current;
    if (!s.enabled) return;
    if (s.isBlocked && s.isBlocked()) {
      // Blocked right now (article still loading, TTS speaking, a bookmark
      // restore pending...). Re-arm and check again after the delay instead of
      // giving up: a tick that fired while blocked used to kill auto-scroll
      // until the next touch, and since every touch re-armed into the same
      // blocked state it could never resume on its own.
      if (armRef.current) armRef.current();
      return;
    }
    const pxPerSec = AUTO_SCROLL_BASE_PX_PER_SEC * (normalizeAutoScrollSpeed(s.speedPercent) / 100);
    offsetFloatRef.current = Math.max(0, s.getOffset ? s.getOffset() : 0);
    tickRef.current = setInterval(() => {
      const cur = stateRef.current;
      if (cur.isBlocked && cur.isBlocked()) {
        // Became blocked mid-scroll (e.g. Read Aloud started) — stop, but
        // re-arm so scrolling resumes once the blocker clears.
        stopTick();
        if (armRef.current) armRef.current();
        return;
      }
      const maxOffset = cur.getMaxOffset ? cur.getMaxOffset() : 0;
      const next = offsetFloatRef.current + (pxPerSec * TICK_MS) / 1000;
      if (maxOffset <= 0 || next >= maxOffset) {
        // Reached the end — stop without re-arming (a later touch re-arms).
        stopTick();
        return;
      }
      offsetFloatRef.current = next;
      cur.scrollTo(next);
    }, TICK_MS);
  }, [stopTick]);

  // Hard pause with no rescue: screen blurred, or the component unmounting.
  const pause = useCallback(() => {
    stopTick();
    clearIdleTimer();
    clearWatchdog();
  }, [stopTick, clearIdleTimer, clearWatchdog]);

  // Pause because a finger is down. Resuming normally happens on touch end —
  // but that event is not guaranteed to arrive: if the view under the finger
  // unmounts mid-gesture (translating an article swaps the whole body), the
  // touch end is delivered to a view that no longer exists and the scrollable
  // never hears about it. Without a rescue that left auto-scroll paused
  // forever, until the screen was closed and reopened. The watchdog makes that
  // impossible: if no touch end arrives in time, we re-arm anyway.
  const touchPause = useCallback(() => {
    stopTick();
    clearIdleTimer();
    clearWatchdog();
    const delayMs = (stateRef.current.delaySeconds || 5) * 1000;
    watchdogRef.current = setTimeout(() => {
      watchdogRef.current = null;
      if (armRef.current) armRef.current();
    }, delayMs + LOST_TOUCH_GRACE_MS);
  }, [stopTick, clearIdleTimer, clearWatchdog]);

  // (Re)arm the idle timer: on focus, on settings change, on finger release.
  const arm = useCallback(() => {
    clearIdleTimer();
    clearWatchdog();
    if (!stateRef.current.enabled) return;
    idleTimerRef.current = setTimeout(startTick, (stateRef.current.delaySeconds || 5) * 1000);
  }, [clearIdleTimer, clearWatchdog, startTick]);
  armRef.current = arm;

  // Clear all timers on unmount.
  useEffect(() => pause, [pause]);

  return {
    arm,
    pause,
    // Stay paused while the finger is down; the delay starts on release. Every
    // event that can mark the end of an interaction re-arms, so a single missed
    // one can no longer strand the engine.
    onTouchStart: touchPause,
    // Each move pushes the rescue timer back, so a finger that is genuinely
    // held down and moving keeps the scroll paused as intended.
    onTouchMove: touchPause,
    onTouchEnd: arm,
    onTouchCancel: arm,
    onScrollBeginDrag: touchPause,
    onScrollEndDrag: arm,
    onMomentumScrollEnd: arm,
  };
}
