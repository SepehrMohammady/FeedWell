import React, { createContext, useContext, useState, useEffect } from 'react';
import { Appearance, NativeModules, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { WidgetBridge } = NativeModules;

const ThemeContext = createContext();

// Five palettes for light mode — varies primary, accent, warning, error
export const LIGHT_PALETTES = [
  { name: 'Warm Beige', primary: '#A17F66', accent: '#5F758E', warning: '#CB936A', error: '#CD9C8B' },
  { name: 'Sage',       primary: '#5A8A6A', accent: '#4A7060', warning: '#7AAB7E', error: '#90B09A' },
  { name: 'Sky',        primary: '#4A7BA7', accent: '#365E80', warning: '#6699CC', error: '#88A8C0' },
  { name: 'Lavender',   primary: '#7B6BA8', accent: '#5B4E8A', warning: '#9D8CC4', error: '#B0A4C8' },
  { name: 'Rose',       primary: '#A8606A', accent: '#7D4E58', warning: '#C48070', error: '#CFA0A0' },
];

// Five palettes for dark mode
export const DARK_PALETTES = [
  { name: 'Warm Beige', primary: '#CDADA0', accent: '#758793', warning: '#CD9E7A', error: '#D6AD9D' },
  { name: 'Sage',       primary: '#8AC4A0', accent: '#6A9E80', warning: '#9ABBA4', error: '#A4C4AE' },
  { name: 'Sky',        primary: '#80AECE', accent: '#6090B8', warning: '#8AB6CE', error: '#A0BED6' },
  { name: 'Lavender',   primary: '#A898C8', accent: '#8A7AB8', warning: '#B8A8D8', error: '#C4B8D0' },
  { name: 'Rose',       primary: '#D6A0A8', accent: '#B88090', warning: '#D4A080', error: '#D8B4B4' },
];

const baseLightColors = {
  background: '#F0F0F0',
  surface: '#ffffff',
  text: '#333333',
  textSecondary: '#666666',
  textTertiary: '#999999',
  border: '#E7E7E7',
  card: '#ffffff',
  success: '#A2A9A3',
  disabled: '#C2C9CD',
};

const baseDarkColors = {
  background: '#000000',
  surface: '#1C1C1E',
  text: '#FFFFFF',
  textSecondary: '#DACCBD',
  textTertiary: '#B6BCBE',
  border: '#38383A',
  card: '#1C1C1E',
  success: '#A6B4B2',
  disabled: '#5E6D74',
};

const lightShadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardWeb: { boxShadow: '0 2px 8px rgba(0,0,0,0.1)' },
};

const darkShadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
  cardWeb: { boxShadow: '0 2px 8px rgba(0,0,0,0.3)' },
};

const buildTheme = (baseColors, shadows, palette) => ({
  colors: { ...baseColors, primary: palette.primary, accent: palette.accent, warning: palette.warning, error: palette.error },
  shadows,
});

// Default exports for legacy imports
export const lightTheme = buildTheme(baseLightColors, lightShadows, LIGHT_PALETTES[0]);
export const darkTheme  = buildTheme(baseDarkColors,  darkShadows,  DARK_PALETTES[0]);

export function ThemeProvider({ children }) {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [paletteIndex, setPaletteIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadThemePreference();
  }, []);

  const syncWidgetTheme = (dark) => {
    if (Platform.OS === 'android' && WidgetBridge) {
      try { WidgetBridge.setAppTheme(dark ? 'dark' : 'light'); } catch (e) {}
    }
  };

  const loadThemePreference = async () => {
    try {
      const [savedTheme, savedPalette] = await Promise.all([
        AsyncStorage.getItem('theme'),
        AsyncStorage.getItem('paletteIndex'),
      ]);
      if (savedTheme !== null) {
        setIsDarkMode(savedTheme === 'dark');
        syncWidgetTheme(savedTheme === 'dark');
      } else {
        const colorScheme = Appearance.getColorScheme();
        setIsDarkMode(colorScheme === 'dark');
        syncWidgetTheme(colorScheme === 'dark');
      }
      if (savedPalette !== null) setPaletteIndex(parseInt(savedPalette, 10));
    } catch (error) {
      console.error('Error loading theme preference:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTheme = async () => {
    try {
      const newTheme = !isDarkMode;
      setIsDarkMode(newTheme);
      await AsyncStorage.setItem('theme', newTheme ? 'dark' : 'light');
      syncWidgetTheme(newTheme);
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  };

  const setPalette = async (index) => {
    try {
      setPaletteIndex(index);
      await AsyncStorage.setItem('paletteIndex', String(index));
    } catch (error) {
      console.error('Error saving palette:', error);
    }
  };

  const theme = isDarkMode
    ? buildTheme(baseDarkColors,  darkShadows,  DARK_PALETTES[paletteIndex])
    : buildTheme(baseLightColors, lightShadows, LIGHT_PALETTES[paletteIndex]);

  const value = {
    theme,
    isDarkMode,
    toggleTheme,
    isLoading,
    paletteIndex,
    setPalette,
    LIGHT_PALETTES,
    DARK_PALETTES,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
