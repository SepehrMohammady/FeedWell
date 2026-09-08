import { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';

// Holds the screen awake while `active` is true and the screen is focused.
// Each caller passes its own tag so two screens can hold the lock independently
// without one releasing the other's.
export function useKeepScreenAwake(active, tag) {
  useFocusEffect(
    useCallback(() => {
      if (!active) return undefined;
      let released = false;
      activateKeepAwakeAsync(tag).catch(() => {});
      return () => {
        if (released) return;
        released = true;
        try {
          const result = deactivateKeepAwake(tag);
          if (result && typeof result.catch === 'function') result.catch(() => {});
        } catch (e) {
          // Nothing to release (never activated, or already gone) — safe to ignore.
        }
      };
    }, [active, tag])
  );
}
