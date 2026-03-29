import 'react-native-gesture-handler';
import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as ScreenOrientation from 'expo-screen-orientation';
import { FeedProvider } from './src/context/FeedContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { AppSettingsProvider, useAppSettings } from './src/context/AppSettingsContext';
import { ReadLaterProvider } from './src/context/ReadLaterContext';
import { NotesProvider } from './src/context/NotesContext';
import { AmbientSoundProvider } from './src/context/AmbientSoundContext';
import ErrorBoundary from './src/components/ErrorBoundary';
import AppNavigator from './src/navigation/AppNavigator';
import OnboardingTutorial from './src/components/OnboardingTutorial';

function AppContent() {
  const { hasSeenOnboarding, completeOnboarding, isLoading, allowRotation } = useAppSettings();
  const { theme, isDarkMode } = useTheme();
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Lock/unlock screen orientation based on setting
  useEffect(() => {
    if (isLoading) return;
    if (allowRotation) {
      ScreenOrientation.unlockAsync();
    } else {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    }
  }, [allowRotation, isLoading]);

  useEffect(() => {
    if (!isLoading && !hasSeenOnboarding) {
      setShowOnboarding(true);
    }
  }, [isLoading, hasSeenOnboarding]);

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    completeOnboarding();
  };

  if (isLoading) {
    return null; // Or a loading screen
  }

  return (
    <>
      <NavigationContainer>
        <AppNavigator />
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
