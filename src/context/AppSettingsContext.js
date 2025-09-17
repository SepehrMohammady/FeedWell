import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AppSettingsContext = createContext();

export function AppSettingsProvider({ children }) {
  const [showImages, setShowImages] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [articleFilter, setArticleFilter] = useState('all'); // 'all', 'unread', 'read'
  const [sortOrder, setSortOrder] = useState('newest'); // 'newest', 'oldest'
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const savedShowImages = await AsyncStorage.getItem('showImages');
      const savedAutoRefresh = await AsyncStorage.getItem('autoRefresh');
      const savedArticleFilter = await AsyncStorage.getItem('articleFilter');
      const savedSortOrder = await AsyncStorage.getItem('sortOrder');
      
      if (savedShowImages !== null) {
        setShowImages(JSON.parse(savedShowImages));
      }
      
      if (savedAutoRefresh !== null) {
        setAutoRefresh(JSON.parse(savedAutoRefresh));
      }

      if (savedArticleFilter !== null) {
        setArticleFilter(JSON.parse(savedArticleFilter));
      }

      if (savedSortOrder !== null) {
        setSortOrder(JSON.parse(savedSortOrder));
      }
    } catch (error) {
      console.error('Error loading app settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateShowImages = async (value) => {
    try {
      setShowImages(value);
      await AsyncStorage.setItem('showImages', JSON.stringify(value));
    } catch (error) {
      console.error('Error saving showImages setting:', error);
    }
  };

  const updateAutoRefresh = async (value) => {
    try {
      setAutoRefresh(value);
      await AsyncStorage.setItem('autoRefresh', JSON.stringify(value));
    } catch (error) {
      console.error('Error saving autoRefresh setting:', error);
    }
  };

  const updateArticleFilter = async (value) => {
    try {
      setArticleFilter(value);
      await AsyncStorage.setItem('articleFilter', JSON.stringify(value));
    } catch (error) {
      console.error('Error saving articleFilter setting:', error);
    }
  };

  const updateSortOrder = async (value) => {
    try {
      setSortOrder(value);
      await AsyncStorage.setItem('sortOrder', JSON.stringify(value));
    } catch (error) {
      console.error('Error saving sortOrder setting:', error);
    }
  };

  const value = {
    showImages,
    autoRefresh,
    articleFilter,
    sortOrder,
    isLoading,
    updateShowImages,
    updateAutoRefresh,
    updateArticleFilter,
    updateSortOrder,
  };

  return (
    <AppSettingsContext.Provider value={value}>
      {children}
    </AppSettingsContext.Provider>
  );
}

export function useAppSettings() {
  const context = useContext(AppSettingsContext);
  if (!context) {
    throw new Error('useAppSettings must be used within an AppSettingsProvider');
  }
  return context;
}
