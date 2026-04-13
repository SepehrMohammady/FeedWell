import 'react-native-gesture-handler';
import React, { useState, useEffect, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { AppState, Linking } from 'react-native';
import { NavigationContainer, createNavigationContainerRef, CommonActions } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as ScreenOrientation from 'expo-screen-orientation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FeedProvider } from './src/context/FeedContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { AppSettingsProvider, useAppSettings } from './src/context/AppSettingsContext';
import { ReadLaterProvider } from './src/context/ReadLaterContext';
import { NotesProvider } from './src/context/NotesContext';
import { AmbientSoundProvider } from './src/context/AmbientSoundContext';
import ErrorBoundary from './src/components/ErrorBoundary';
import AppNavigator from './src/navigation/AppNavigator';
import OnboardingTutorial from './src/components/OnboardingTutorial';
import KinetosisOverlay from './src/components/KinetosisOverlay';
import { setupNotificationChannel, scheduleReminderNotification, cancelReminderNotification } from './src/utils/notificationService';

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
  const { hasSeenOnboarding, completeOnboarding, isLoading, allowRotation, readingReminder } = useAppSettings();
  const { theme, isDarkMode } = useTheme();
  const [showOnboarding, setShowOnboarding] = useState(false);
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
  }, [readingReminder]);

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

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    completeOnboarding();
  };

  if (isLoading || !navStateReady) {
    return null; // Or a loading screen
  }

  return (
    <>
      <NavigationContainer
        ref={navigationRef}
        initialState={initialNavState}
        onStateChange={onNavStateChange}
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
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <ThemeProvider>
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
        </ThemeProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
