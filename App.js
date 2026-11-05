import 'react-native-gesture-handler';
import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import SaleCardModal from './src/components/SaleCardModal';
import { clearSaleCards, loadDebugToday, markCardOpened, nextSaleCard, onDebugToday, setDebugToday, shareApp } from './src/services/sales';
import { openSettingsAt } from './src/utils/settingsNavigation';

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
  // Debug builds only, to check the sale cards and tags without touching the
  // phone's clock: pretend it's another day (feedwell://debug/today/2027-04-16,
  // or .../today/clear), forget the cards that have opened
  // (feedwell://debug/cards/clear), or make What's New due at the next start
  // (feedwell://debug/whatsnew)
  if (__DEV__ && url.startsWith('feedwell://debug/')) {
    const what = url.slice('feedwell://debug/'.length);
    if (what.startsWith('today/')) setDebugToday(what.slice('today/'.length));
    else if (what === 'cards/clear') clearSaleCards();
    else if (what === 'whatsnew') AsyncStorage.removeItem('lastSeenVersion').catch(() => {});
    return;
  }
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

  // ---- A sale or thank-you card for today (services/sales.js)
  // One opens at most once a day, the first time the app opens that day, or
  // later while its sale runs. Never on a first run, where the tour starts:
  // the next open checks again. Never over the tour or What's New: the card
  // opens as soon as they close, so a card due only today isn't lost (as in
  // LedgerWell; design-handoff/sale-cards.md).
  const [saleCard, setSaleCard] = useState(null);
  const [navReady, setNavReady] = useState(false);
  const [opens, setOpens] = useState(0);
  const [debugDayLoaded, setDebugDayLoaded] = useState(!__DEV__);
  const openTaken = useRef(false);
  const whatsNewDue = !isLoading && hasSeenOnboarding && lastSeenVersion !== APP_VERSION.version;
  const whatsNewVisible = (showWhatsNew || !!tour?.whatsNewOpen) && !tour?.active;

  useEffect(() => {
    if (__DEV__) loadDebugToday().finally(() => setDebugDayLoaded(true));
    let state = AppState.currentState;
    const subscription = AppState.addEventListener('change', (next) => {
      if (state === 'background' && next === 'active') {
        openTaken.current = false;
        setOpens((n) => n + 1);
      }
      state = next;
    });
    // Debug builds: a new pretend day counts as a new open
    const removeDebug = onDebugToday(() => {
      openTaken.current = false;
      setOpens((n) => n + 1);
    });
    return () => {
      subscription.remove();
      removeDebug();
    };
  }, []);

  useEffect(() => {
    if (isLoading || langLoading || !navReady || !debugDayLoaded || !tour || saleCard) return undefined;
    // A first run: the tour starts, and no card opens until the next open
    if (!hasSeenOnboarding) {
      openTaken.current = true;
      return undefined;
    }
    // The tour or What's New is showing (or due): this runs again when they close
    if (tour.active || whatsNewDue || whatsNewVisible || openTaken.current) return undefined;
    let cancelled = false;
    nextSaleCard()
      .then(async (card) => {
        // Something opened over the app meanwhile: the next run checks again
        if (cancelled) return;
        openTaken.current = true;
        if (!card) return;
        await markCardOpened(card);
        setSaleCard(card);
      })
      .catch((error) => console.error('Failed to check the sale cards:', error));
    return () => {
      cancelled = true;
    };
  }, [isLoading, langLoading, navReady, debugDayLoaded, hasSeenOnboarding, tour?.active, whatsNewDue, whatsNewVisible, opens]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSaleShare = () => {
    shareApp().catch((error) => console.error('Share failed:', error));
  };

  const handleSaleSeeOtherApps = () => {
    setSaleCard(null);
    if (!navigationRef.isReady()) return;
    navigationRef.navigate('Settings');
    openSettingsAt('about', 'moreApps');
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
          setNavReady(true);
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
        visible={whatsNewVisible}
        onClose={handleWhatsNewClose}
        onTakeTour={handleWhatsNewTour}
      />
      <SaleCardModal
        card={saleCard}
        onShare={handleSaleShare}
        onSeeOtherApps={handleSaleSeeOtherApps}
        onClose={() => setSaleCard(null)}
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
