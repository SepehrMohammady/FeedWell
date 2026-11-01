import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { Appearance, NativeModules, Platform, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLOR_THEMES, DEFAULT_MAIN_COLOR, accentFor, buildColors, isColorIndex } from '../theme/palette';
import { CARD_SHADOW } from '../theme/type';

const { WidgetBridge } = NativeModules;

const ThemeContext = createContext();

export { COLOR_THEMES };

// One theme object per colors object (see theme/palette), so a theme keeps its
// identity between renders and styles cached against it stay valid. Shadows
// are light mode only: faint under cards, none in dark and AMOLED.
const themes = new WeakMap();
const themeFor = (colors) => {
  let theme = themes.get(colors);
  if (!theme) {
    theme = {
      colors,
      shadows: colors.hasShadows
        ? { card: CARD_SHADOW, cardWeb: { boxShadow: '0 2px 6px rgba(40, 30, 50, 0.07)' } }
        : { card: {}, cardWeb: {} },
    };
    themes.set(colors, theme);
  }
  return theme;
};

const parseIndex = (value) => {
  const n = value === null ? NaN : parseInt(value, 10);
  return isColorIndex(n) ? n : null;
};

export function ThemeProvider({ children }) {
  const [isDarkMode, setIsDarkMode] = useState(false);
  // The main color: what you tap. Stored under `paletteIndex`, the key the
  // single Theme Color picker always used, so saved choices still load.
  const [paletteIndex, setPaletteIndex] = useState(DEFAULT_MAIN_COLOR);
  // Only an accent someone picked; until then it follows the main color.
  const [pickedAccent, setPickedAccent] = useState(null);
  const [amoledBlack, setAmoledBlack] = useState(false);
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
      const [savedTheme, savedPalette, savedAccent, savedAmoled] = await Promise.all([
        AsyncStorage.getItem('theme'),
        AsyncStorage.getItem('paletteIndex'),
        AsyncStorage.getItem('accentIndex'),
        AsyncStorage.getItem('amoledBlack'),
      ]);
      if (savedAmoled !== null) setAmoledBlack(savedAmoled === 'true');
      if (savedTheme !== null) {
        setIsDarkMode(savedTheme === 'dark');
        syncWidgetTheme(savedTheme === 'dark');
      } else {
        const colorScheme = Appearance.getColorScheme();
        setIsDarkMode(colorScheme === 'dark');
        syncWidgetTheme(colorScheme === 'dark');
      }
      // Defaults are never written back: someone who never picked a color
      // follows the shared default (Warm Beige with a Lavender accent).
      const main = parseIndex(savedPalette);
      if (main !== null) setPaletteIndex(main);
      setPickedAccent(parseIndex(savedAccent));
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

  const toggleAmoledBlack = async (value) => {
    try {
      setAmoledBlack(value);
      await AsyncStorage.setItem('amoledBlack', value ? 'true' : 'false');
    } catch (error) {
      console.error('Error saving AMOLED preference:', error);
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

  const setAccent = async (index) => {
    try {
      setPickedAccent(index);
      await AsyncStorage.setItem('accentIndex', String(index));
    } catch (error) {
      console.error('Error saving accent color:', error);
    }
  };

  const theme = useMemo(
    () => themeFor(buildColors(isDarkMode, paletteIndex, pickedAccent, amoledBlack)),
    [isDarkMode, paletteIndex, pickedAccent, amoledBlack]
  );

  const value = {
    theme,
    isDarkMode,
    toggleTheme,
    amoledBlack,
    toggleAmoledBlack,
    isLoading,
    paletteIndex,
    setPalette,
    // The accent in use: the one picked, or the one following the main color
    accentIndex: pickedAccent ?? accentFor(paletteIndex),
    setAccent,
    COLOR_THEMES,
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

// A screen's styles, built once per theme and reading direction rather than on
// every render. Define the factory at module level and call the hook in the
// component:
//   const useStyles = makeStyles((theme, isRTL) => ({ ... }));
//   const styles = useStyles(isRTL);
export function makeStyles(factory) {
  const cache = new WeakMap();
  return (isRTL = false) => {
    const { theme } = useContext(ThemeContext);
    let entry = cache.get(theme);
    if (!entry) {
      entry = {};
      cache.set(theme, entry);
    }
    const key = isRTL ? 'rtl' : 'ltr';
    if (!entry[key]) entry[key] = StyleSheet.create(factory(theme, isRTL));
    return entry[key];
  };
}
