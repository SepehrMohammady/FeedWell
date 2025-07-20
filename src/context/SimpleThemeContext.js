import React, { createContext, useContext, useState, useEffect } from 'react';
import SafeStorage from '../utils/SafeStorage';

const ThemeContext = createContext();

export const lightTheme = {
  colors: {
    primary: '#007AFF',
    background: '#f5f5f5',
    surface: '#ffffff',
    text: '#333333',
    textSecondary: '#666666',
    textTertiary: '#999999',
    border: '#e0e0e0',
    card: '#ffffff',
    success: '#34C759',
    warning: '#FF9500',
    error: '#FF3B30',
    accent: '#007AFF',
  },
  shadows: {
    card: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
  },
};

export const darkTheme = {
  colors: {
    primary: '#0A84FF',
    background: '#000000',
    surface: '#1C1C1E',
    text: '#FFFFFF',
    textSecondary: '#EBEBF5',
    textTertiary: '#8E8E93',
    border: '#38383A',
    card: '#1C1C1E',
    success: '#30D158',
    warning: '#FF9F0A',
    error: '#FF453A',
    accent: '#0A84FF',
  },
  shadows: {
    card: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 8,
    },
  },
};

export function SimpleThemeProvider({ children }) {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load theme preference on app start
  useEffect(() => {
    loadThemePreference();
  }, []);

  const loadThemePreference = async () => {
    const savedTheme = await SafeStorage.getItem('theme', 'light');
    console.log('Loaded theme preference:', savedTheme);
    setIsDarkMode(savedTheme === 'dark');
    setIsLoading(false);
  };

  const toggleTheme = async () => {
    const newTheme = !isDarkMode;
    console.log('Toggling theme from', isDarkMode ? 'dark' : 'light', 'to', newTheme ? 'dark' : 'light');
    setIsDarkMode(newTheme);
    
    // Save theme preference safely
    const saved = await SafeStorage.setItem('theme', newTheme ? 'dark' : 'light');
    if (saved) {
      console.log('Theme preference saved successfully');
    } else {
      console.log('Failed to save theme preference, but theme still changed in memory');
    }
  };

  const theme = isDarkMode ? darkTheme : lightTheme;

  const value = {
    theme,
    isDarkMode,
    toggleTheme,
    isLoading,
  };

  // Show loading state briefly
  if (isLoading) {
    return null; // or a simple loading component
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a SimpleThemeProvider');
  }
  return context;
}
