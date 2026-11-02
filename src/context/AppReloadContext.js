import { createContext, useContext } from 'react';

// Reloads every provider from storage, as a fresh start would: after a restore,
// Reset Settings or Clear All Data the app shows the new state at once, the
// widget gets its settings and the reading reminder is scheduled or cancelled,
// without anyone closing and reopening the app. App keys its provider tree on
// a number this bumps.
const AppReloadContext = createContext(() => {});

export const AppReloadProvider = AppReloadContext.Provider;

export function useAppReload() {
  return useContext(AppReloadContext);
}
