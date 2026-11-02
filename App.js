import 'react-native-gesture-handler';
import React, { useState, useEffect, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { AppState, Linking, I18nManager, StyleSheet, View } from 'react-native';
import { NavigationContainer, createNavigationContainerRef, CommonActions, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as ScreenOrientation from 'expo-screen-orientation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FeedProvider } from './src/context/FeedContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { LanguageProvider, useTranslation } from './src/context/LanguageContext';
import { AppSettingsProvider, useAppSettings } from './src/context/AppSettingsContext';
import { ReadLaterProvider } from './src/context/ReadLaterContext';
import { NotesProvider } from './src/context/NotesContext';
import { AmbientSoundProvider } from './src/context/AmbientSoundContext';
import ErrorBoundary from './src/components/ErrorBoundary';
import AppNavigator from './src/navigation/AppNavigator';
import AppTour from './src/components/AppTour';
import { TourProvider, useTour } from './src/context/TourContext';
import WhatsNewModal from './src/components/WhatsNewModal';
import KinetosisOverlay from './src/components/KinetosisOverlay';
import ScreenWash from './src/components/ScreenWash';
import { FONT } from './src/theme/type';
import * as Font from 'expo-font';
import { BUNDLED_FONT_ASSETS } from './src/config/readingFonts';
import { INTERFACE_FONT_ASSETS } from './src/theme/webFonts';
import { APP_VERSION } from './src/config/version';
import { setupNotificationChannel, scheduleReminderNotification, cancelReminderNotification } from './src/utils/notificationService';
import { AppReloadProvider } from './src/context/AppReloadContext';
import { runAutomaticBackup } from './src/services/BackupService';

// Keep the native layer LTR so our per-component RTL (for Farsi) is the only
// RTL source — prevents a Farsi/Arabic *system* locale from auto-mirroring the
// native shell and double-flipping our manual row-reverse layouts.
try { I18nManager.allowRTL(false); } catch (e) { /* no-op */ }

const NAV_STATE_KEY = 'feedwell_nav_state';

// React Navigation draws some text itself (its labels and titles): Inter too,
// through the family of each weight and never a bold fontWeight, which would
// fall back to Roboto.
const NAV_FONTS = {
  regular: { fontFamily: FONT.regular, fontWeight: '400' },
  medium: { fontFamily: FONT.medium, fontWeight: '400' },
  bold: { fontFamily: FONT.semiBold, fontWeight: '400' },
  heavy: { fontFamily: FONT.bold, fontWeight: '400' },
};

// React Navigation's own colors, built once per colors object. The screens are
// transparent: the wash behind the navigator shows through.
const navigationThemes = new WeakMap();
const navigationThemeFor = (colors) => {
  let navTheme = navigationThemes.get(colors);
  if (!navTheme) {
    const base = colors.isDark ? DarkTheme : DefaultTheme;
    navTheme = {
      ...base,
      fonts: NAV_FONTS,
      colors: {
        ...base.colors,
        primary: colors.mainInk,
        background: 'transparent',
        card: colors.surface,
        text: colors.text,
        border: colors.border,
        notification: colors.accentFill,
      },
    };
    navigationThemes.set(colors, navTheme);
  }
  return navTheme;
};
const navigationRef = createNavigationContainerRef();
let pendingDeepLinkUrl = null;

// Cleans the saved navigation state before restoring it. Up to 1.18.1, Back
// from an article stacked a second list on top of it (List > Article > List),
// and this saved state carried that across restarts, so Back on the list kept
// reopening an old article. Only the open tab keeps its stack, trimmed to start
// at its last list screen; the other tabs start fresh at their list. Their
// leftover nested-navigation params are dropped too, or the first visit to the
// tab would replay them and reopen the article they pointed at.
const TAB_LIST_SCREENS = { Feeds: 'FeedList', ReadLater: 'ReadLaterList' };
function cleanRestoredNavState(state) {
  if (!Array.isArray(state?.routes)) return state;
  const focusedTab = state.routes[state.index ?? 0]?.name;
  return {
    ...state,
    routes: state.routes.map((tab) => {
      const listScreen = TAB_LIST_SCREENS[tab.name];
      if (!listScreen) return tab;
      const { params: _staleParams, state: stack, ...rest } = tab;
      if (tab.name !== focusedTab || !Array.isArray(stack?.routes)) return rest;
      const lastList = stack.routes.map((route) => route.name).lastIndexOf(listScreen);
      const routes = lastList > 0 ? stack.routes.slice(lastList) : stack.routes;
      return { ...rest, state: { ...stack, routes, index: routes.length - 1 } };
    }),
  };
}

function handleDeepLink(url) {
  if (!url) return;
  if (!navigationRef.isReady()) {
    pendingDeepLinkUrl = url;
    return;
  }
  pendingDeepLinkUrl = null;
  try {
    if (url.startsWith('feedwell://article')) {
      try {
        const parsed = new URL(url);
        const articleUrl = parsed.searchParams.get('url') || '';
        const articleTitle = parsed.searchParams.get('title') || 'Loading…';
        const articleFeed = parsed.searchParams.get('feed') || '';
        const articleDate = parsed.searchParams.get('date') || '';
        
        if (articleUrl) {
          // Send these as params so ArticleReaderScreen can use them even if article not found
          navigationRef.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{
                name: 'Feeds',
                state: {
                  routes: [
                    { name: 'FeedList' },
                    { 
                      name: 'ArticleReader', 
                      params: { 
                        articleLink: articleUrl,
                        articleTitle,
                        articleFeedName: articleFeed,
                        articlePubDate: articleDate
                      } 
                    }
                  ],
                },
              }],
            })
          );
        }
      } catch (e) {
        // Fallback for tricky URLs
        const parts = url.split('?url=');
        const urlPart = parts.length > 1 ? parts[1].split('&')[0] : '';
        const articleUrl = decodeURIComponent(urlPart);
        if (articleUrl) {
          navigationRef.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{
                name: 'Feeds',
                state: {
                  routes: [
                    { name: 'FeedList' },
                    { 
                      name: 'ArticleReader', 
                      params: { 
                        articleLink: articleUrl, 
                        articleTitle: 'Loading…', 
                        articleFeedName: '', 
                        articlePubDate: '' 
                      } 
                    }
                  ],
                },
              }],
            })
          );
        }
      }
    }
  } catch (e) {
    // Ignore malformed URLs
  }
}

function AppContent() {
  const { hasSeenOnboarding, completeOnboarding, isLoading, allowRotation, readingReminder, lastSeenVersion, updateLastSeenVersion } = useAppSettings();
  const { theme } = useTheme();
  const { langLoading, language } = useTranslation();
  const tour = useTour();
  const [showWhatsNew, setShowWhatsNew] = useState(false);
  const [navStateReady, setNavStateReady] = useState(false);
  const [initialNavState, setInitialNavState] = useState(undefined);

  // Restore navigation state on mount
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(NAV_STATE_KEY);
        if (saved) {
          setInitialNavState(cleanRestoredNavState(JSON.parse(saved)));
        }
      } catch (e) {
        // Ignore restore errors
      } finally {
        setNavStateReady(true);
      }
    })();
  }, []);

  const onNavStateChange = useCallback((state) => {
    AsyncStorage.setItem(NAV_STATE_KEY, JSON.stringify(state));
  }, []);

  // Lock/unlock screen orientation based on setting
  useEffect(() => {
    if (isLoading) return;
    if (allowRotation) {
      ScreenOrientation.unlockAsync();
    } else {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    }
  }, [allowRotation, isLoading]);

  // Set up notification channel and schedule reminder on app open/foreground
  useEffect(() => {
    setupNotificationChannel();
    if (readingReminder) {
      scheduleReminderNotification();
    } else {
      cancelReminderNotification();
    }

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        if (readingReminder) {
          scheduleReminderNotification();
        }
      }
    });

    return () => subscription.remove();
  }, [readingReminder, language]);

  // The automatic backup, if it's on, runs as the app goes to the background:
  // at most once a day, and only if something changed (BackupService)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'background') runAutomaticBackup('background');
    });
    return () => subscription.remove();
  }, []);

  // Load the bundled reading fonts (and on the web, Inter). Deliberately not
  // gated behind a splash screen: a failure here must never block the app, it
  // just means the reader falls back to the system font.
  useEffect(() => {
    Font.loadAsync({ ...BUNDLED_FONT_ASSETS, ...INTERFACE_FONT_ASSETS }).catch((e) => {
      console.warn('Reading fonts failed to load:', e?.message);
    });
  }, []);

  // Handle deep links from widget
  useEffect(() => {
    // Handle initial URL (app was launched from widget)
    Linking.getInitialURL().then(handleDeepLink);
    // Handle URLs when app is already open
    const linkSub = Linking.addEventListener('url', ({ url }) => handleDeepLink(url));
    return () => linkSub.remove();
  }, []);

  // First launch: walk the new user through the app. Finishing or skipping the
  // tour marks onboarding done (and stamps the version, so no What's New popup).
  useEffect(() => {
    if (!isLoading && !hasSeenOnboarding && tour && !tour.active) {
      tour.startTour(completeOnboarding);
    }
  }, [isLoading, hasSeenOnboarding]); // eslint-disable-line react-hooks/exhaustive-deps

  // Show the "What's New" popup once after updating to a new version. Never on a
  // fresh install (those see onboarding, which stamps lastSeenVersion on finish).
  useEffect(() => {
    if (!isLoading && hasSeenOnboarding && lastSeenVersion !== APP_VERSION.version) {
      setShowWhatsNew(true);
    }
  }, [isLoading, hasSeenOnboarding, lastSeenVersion]);

  // Shown once after an update, or opened from Settings
  const handleWhatsNewClose = () => {
    setShowWhatsNew(false);
    tour?.setWhatsNewOpen(false);
    updateLastSeenVersion(APP_VERSION.version);
  };

  const handleWhatsNewTour = () => {
    handleWhatsNewClose();
    tour?.startTour();
  };

  if (isLoading || langLoading || !navStateReady) {
    return null; // Wait for settings + language so the first paint is correct (no flash)
  }

  return (
    <View style={styles.fill}>
      {/* The wash sits behind every screen; the pages are transparent over it */}
      <ScreenWash />
      <NavigationContainer
        ref={navigationRef}
        initialState={initialNavState}
        onStateChange={onNavStateChange}
        theme={navigationThemeFor(theme.colors)}
        onReady={() => {
          if (pendingDeepLinkUrl) {
            handleDeepLink(pendingDeepLinkUrl);
          }
        }}
      >
        <AppNavigator />
        <KinetosisOverlay />
        <StatusBar style={theme.colors.statusBarStyle} />
      </NavigationContainer>
      <AppTour navigationRef={navigationRef} />
      <WhatsNewModal
        visible={(showWhatsNew || !!tour?.whatsNewOpen) && !tour?.active}
        onClose={handleWhatsNewClose}
        onTakeTour={handleWhatsNewTour}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});

export default function App() {
  // A new number remounts every provider, so each loads again from storage
  const [generation, setGeneration] = useState(0);
  const reloadApp = useCallback(() => setGeneration((n) => n + 1), []);
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <AppReloadProvider value={reloadApp}>
        <ThemeProvider key={generation}>
          <LanguageProvider>
            <AppSettingsProvider>
              <ReadLaterProvider>
                <NotesProvider>
                  <AmbientSoundProvider>
                    <FeedProvider>
                      <TourProvider>
                        <AppContent />
                      </TourProvider>
                    </FeedProvider>
                  </AmbientSoundProvider>
                </NotesProvider>
              </ReadLaterProvider>
            </AppSettingsProvider>
          </LanguageProvider>
        </ThemeProvider>
        </AppReloadProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
