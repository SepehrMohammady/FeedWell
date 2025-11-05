import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ThemeContext = createContext();

export const lightTheme = {
  colors: {
    primary: '#A17F66',      // Neutral brown from palette
    background: '#F0F0F0',    // Light neutral gray
    surface: '#ffffff',
    text: '#333333',
    textSecondary: '#666666',
    textTertiary: '#999999',
    border: '#E7E7E7',        // Very light neutral gray from palette
    card: '#ffffff',
    success: '#A2A9A3',       // Muted sage green from palette
    warning: '#CB936A',       // Warm neutral brown from palette
    error: '#CD9C8B',         // Muted rose from palette
    accent: '#5F758E',        // Muted blue-gray from palette
    disabled: '#C2C9CD',      // Light gray-blue from palette
  },
  shadows: {
    card: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    cardWeb: {
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    },
  },
};

export const darkTheme = {
  colors: {
    primary: '#CDADA0',       // Light neutral beige from palette
    background: '#000000',
    surface: '#1C1C1E',
    text: '#FFFFFF',
    textSecondary: '#DACCBD',  // Warm light neutral from palette
    textTertiary: '#B6BCBE',   // Cool light neutral from palette
    border: '#38383A',
    card: '#1C1C1E',
    success: '#A6B4B2',        // Muted sage from palette
    warning: '#CD9E7A',        // Warm neutral from palette
    error: '#D6AD9D',          // Muted rose from palette
    accent: '#758793',         // Muted blue-gray from palette
    disabled: '#5E6D74',       // Dark gray-blue from palette
  },
  shadows: {
    card: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 8,
    },
    cardWeb: {
      boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
    },
  },
};

export function ThemeProvider({ children }) {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadThemePreference();
  }, []);

  const loadThemePreference = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('theme');
      if (savedTheme !== null) {
        setIsDarkMode(savedTheme === 'dark');
      }
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
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  };

  const theme = isDarkMode ? darkTheme : lightTheme;

  const value = {
    theme,
    isDarkMode,
    toggleTheme,
    isLoading,
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
