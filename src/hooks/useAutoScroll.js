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
  // Float accumulator: the tick advances this, not the (quantized) offsets
  // echoed back through onScroll, so sub-pixel steps aren't lost.
  const offsetFloatRef = useRef(0);
  // Settings and callbacks live in a ref so running timers always see the
  // values from the latest render.
  const stateRef = useRef({});
  stateRef.current = { enabled, delaySeconds, speedPercent, getOffset, getMaxOffset, scrollTo, isBlocked };

  const clearIdleTimer = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
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
    if (s.isBlocked && s.isBlocked()) return;
    const pxPerSec = AUTO_SCROLL_BASE_PX_PER_SEC * (normalizeAutoScrollSpeed(s.speedPercent) / 100);
    offsetFloatRef.current = Math.max(0, s.getOffset ? s.getOffset() : 0);
    tickRef.current = setInterval(() => {
      const cur = stateRef.current;
      if (cur.isBlocked && cur.isBlocked()) {
        stopTick();
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

  // Pause without re-arming: finger down, drag in progress, or screen blurred.
  const pause = useCallback(() => {
    stopTick();
    clearIdleTimer();
  }, [stopTick, clearIdleTimer]);

  // (Re)arm the idle timer: on focus, on settings change, on finger release.
  const arm = useCallback(() => {
    clearIdleTimer();
    if (!stateRef.current.enabled) return;
    idleTimerRef.current = setTimeout(startTick, (stateRef.current.delaySeconds || 5) * 1000);
  }, [clearIdleTimer, startTick]);

  // Clear all timers on unmount.
  useEffect(() => pause, [pause]);

  return {
    arm,
    pause,
    // Stay paused while the finger is down; the delay starts on release.
    onTouchStart: pause,
    onTouchEnd: arm,
    onTouchCancel: arm,
    onScrollBeginDrag: pause,
  };
}
