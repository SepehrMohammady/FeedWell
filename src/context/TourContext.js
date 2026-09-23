import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

// The app tour walks through FeedWell's controls one at a time. Screens mark a
// control as a tour target with useTourTarget('some.id'); the tour overlay then
// measures that view on screen and spotlights it. Targets that are not mounted
// (no feeds yet, a hidden button) simply fall back to a centred card.

const TourContext = createContext(null);

export function TourProvider({ children }) {
  const targetsRef = useRef(new Map());
  const onEndRef = useRef(null);
  const [active, setActive] = useState(false);
  // Changes on every start, so the overlay restarts from step one even if a tour
  // is started again straight after the previous one ended.
  const [runId, setRunId] = useState(0);

  const registerTarget = useCallback((id, node) => {
    targetsRef.current.set(id, node);
  }, []);

  // Only forget the node this caller registered, so an unmounting screen can't
  // remove a newer screen's target that reused the same id.
  const unregisterTarget = useCallback((id, node) => {
    if (targetsRef.current.get(id) === node) targetsRef.current.delete(id);
  }, []);

  const getTarget = useCallback((id) => targetsRef.current.get(id) || null, []);

  const startTour = useCallback((onEnd) => {
    onEndRef.current = typeof onEnd === 'function' ? onEnd : null;
    setRunId((n) => n + 1);
    setActive(true);
  }, []);

  const endTour = useCallback(() => {
    setActive(false);
    const onEnd = onEndRef.current;
    onEndRef.current = null;
    if (onEnd) onEnd();
  }, []);

  const value = useMemo(
    () => ({ active, runId, startTour, endTour, registerTarget, unregisterTarget, getTarget }),
    [active, runId, startTour, endTour, registerTarget, unregisterTarget, getTarget]
  );

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
}

export function useTour() {
  return useContext(TourContext);
}

// Returns a ref callback: <TouchableOpacity ref={useTourTarget('feeds.sort')} ...>
// Plain Views need collapsable={false}, or Android may flatten them away and
// leave nothing to measure.
export function useTourTarget(id) {
  const ctx = useContext(TourContext);
  const register = ctx?.registerTarget;
  const unregister = ctx?.unregisterTarget;
  const nodeRef = useRef(null);
  return useCallback((node) => {
    if (!register) return;
    if (node) {
      nodeRef.current = node;
      register(id, node);
    } else if (nodeRef.current) {
      unregister(id, nodeRef.current);
      nodeRef.current = null;
    }
  }, [register, unregister, id]);
}
