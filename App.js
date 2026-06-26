import 'react-native-gesture-handler';
import React, { useState, useEffect, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { AppState, Linking, I18nManager } from 'react-native';
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
import OnboardingTutorial from './src/components/OnboardingTutorial';
import WhatsNewModal from './src/components/WhatsNewModal';
import KinetosisOverlay from './src/components/KinetosisOverlay';
import { APP_VERSION } from './src/config/version';
import { setupNotificationChannel, scheduleReminderNotification, cancelReminderNotification } from './src/utils/notificationService';

// Keep the native layer LTR so our per-component RTL (for Farsi) is the only
// RTL source — prevents a Farsi/Arabic *system* locale from auto-mirroring the
// native shell and double-flipping our manual row-reverse layouts.
try { I18nManager.allowRTL(false); } catch (e) { /* no-op */ }

const NAV_STATE_KEY = 'feedwell_nav_state';
const navigationRef = createNavigationContainerRef();
let pendingDeepLinkUrl = null;

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
  const { theme, isDarkMode } = useTheme();
  const { langLoading, language } = useTranslation();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showWhatsNew, setShowWhatsNew] = useState(false);
  const [navStateReady, setNavStateReady] = useState(false);
  const [initialNavState, setInitialNavState] = useState(undefined);

  // Restore navigation state on mount
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(NAV_STATE_KEY);
        if (saved) {
          setInitialNavState(JSON.parse(saved));
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

  // Handle deep links from widget
  useEffect(() => {
    // Handle initial URL (app was launched from widget)
    Linking.getInitialURL().then(handleDeepLink);
    // Handle URLs when app is already open
    const linkSub = Linking.addEventListener('url', ({ url }) => handleDeepLink(url));
    return () => linkSub.remove();
  }, []);

  useEffect(() => {
    if (!isLoading && !hasSeenOnboarding) {
      setShowOnboarding(true);
    }
  }, [isLoading, hasSeenOnboarding]);

  // Show the "What's New" popup once after updating to a new version. Never on a
  // fresh install (those see onboarding, which stamps lastSeenVersion on finish).
  useEffect(() => {
    if (!isLoading && hasSeenOnboarding && lastSeenVersion !== APP_VERSION.version) {
      setShowWhatsNew(true);
    }
  }, [isLoading, hasSeenOnboarding, lastSeenVersion]);

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    completeOnboarding();
  };

  const handleWhatsNewClose = () => {
    setShowWhatsNew(false);
    updateLastSeenVersion(APP_VERSION.version);
  };

  const handleOpenLanguageSettings = () => {
    handleWhatsNewClose();
    if (navigationRef.isReady()) {
      navigationRef.navigate('Settings');
    }
  };

  if (isLoading || langLoading || !navStateReady) {
    return null; // Wait for settings + language so the first paint is correct (no flash)
  }

  return (
    <>
      <NavigationContainer
        ref={navigationRef}
        initialState={initialNavState}
        onStateChange={onNavStateChange}
        theme={isDarkMode
          ? { ...DarkTheme, colors: { ...DarkTheme.colors, background: theme.colors.background } }
          : { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: theme.colors.background } }
        }
        onReady={() => {
          if (pendingDeepLinkUrl) {
            handleDeepLink(pendingDeepLinkUrl);
          }
        }}
      >
        <AppNavigator />
        <KinetosisOverlay />
        <StatusBar style={isDarkMode ? "light" : "dark"} />
      </NavigationContainer>
      <OnboardingTutorial
        visible={showOnboarding}
        onComplete={handleOnboardingComplete}
      />
      <WhatsNewModal
        visible={showWhatsNew && !showOnboarding}
        onClose={handleWhatsNewClose}
        onOpenLanguageSettings={handleOpenLanguageSettings}
      />
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <ThemeProvider>
          <LanguageProvider>
            <AppSettingsProvider>
              <ReadLaterProvider>
                <NotesProvider>
                  <AmbientSoundProvider>
                    <FeedProvider>
                      <AppContent />
                    </FeedProvider>
                  </AmbientSoundProvider>
                </NotesProvider>
              </ReadLaterProvider>
            </AppSettingsProvider>
          </LanguageProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
