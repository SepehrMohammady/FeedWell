import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AppSettingsContext = createContext();

export function AppSettingsProvider({ children }) {
  const [showImages, setShowImages] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [articleFilter, setArticleFilter] = useState('all'); // 'all', 'unread', 'read'
  const [sortOrder, setSortOrder] = useState('newest'); // 'newest', 'oldest'
  const [maxArticleAge, setMaxArticleAge] = useState(6); // months: 0 = no limit, 1, 3, 6, 12
  const [showBookmarkIndicators, setShowBookmarkIndicators] = useState(true);
  const [skipArticleView, setSkipArticleView] = useState(false);
  const [showReadingPositionInFeeds, setShowReadingPositionInFeeds] = useState(true);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);
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
      const savedMaxArticleAge = await AsyncStorage.getItem('maxArticleAge');
      const savedShowBookmarkIndicators = await AsyncStorage.getItem('showBookmarkIndicators');
      const savedSkipArticleView = await AsyncStorage.getItem('skipArticleView');
      const savedShowReadingPositionInFeeds = await AsyncStorage.getItem('showReadingPositionInFeeds');
      const savedHasSeenOnboarding = await AsyncStorage.getItem('hasSeenOnboarding');
      
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

      if (savedMaxArticleAge !== null) {
        setMaxArticleAge(JSON.parse(savedMaxArticleAge));
      }

      if (savedShowBookmarkIndicators !== null) {
        setShowBookmarkIndicators(JSON.parse(savedShowBookmarkIndicators));
      }

      if (savedSkipArticleView !== null) {
        setSkipArticleView(JSON.parse(savedSkipArticleView));
      }

      if (savedShowReadingPositionInFeeds !== null) {
        setShowReadingPositionInFeeds(JSON.parse(savedShowReadingPositionInFeeds));
      }

      if (savedHasSeenOnboarding !== null) {
        setHasSeenOnboarding(JSON.parse(savedHasSeenOnboarding));
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

  const updateMaxArticleAge = async (value) => {
    try {
      setMaxArticleAge(value);
      await AsyncStorage.setItem('maxArticleAge', JSON.stringify(value));
    } catch (error) {
      console.error('Error saving maxArticleAge setting:', error);
    }
  };

  const updateShowBookmarkIndicators = async (value) => {
    try {
      setShowBookmarkIndicators(value);
      await AsyncStorage.setItem('showBookmarkIndicators', JSON.stringify(value));
    } catch (error) {
      console.error('Error saving showBookmarkIndicators setting:', error);
    }
  };

  const updateSkipArticleView = async (value) => {
    try {
      setSkipArticleView(value);
      await AsyncStorage.setItem('skipArticleView', JSON.stringify(value));
    } catch (error) {
      console.error('Error saving skipArticleView setting:', error);
    }
  };

  const updateShowReadingPositionInFeeds = async (value) => {
    try {
      setShowReadingPositionInFeeds(value);
      await AsyncStorage.setItem('showReadingPositionInFeeds', JSON.stringify(value));
    } catch (error) {
      console.error('Error saving showReadingPositionInFeeds setting:', error);
    }
  };

  const completeOnboarding = async () => {
    try {
      setHasSeenOnboarding(true);
      await AsyncStorage.setItem('hasSeenOnboarding', JSON.stringify(true));
    } catch (error) {
      console.error('Error saving onboarding status:', error);
    }
  };

  const resetOnboarding = async () => {
    try {
      setHasSeenOnboarding(false);
      await AsyncStorage.setItem('hasSeenOnboarding', JSON.stringify(false));
    } catch (error) {
      console.error('Error resetting onboarding status:', error);
    }
  };

  const value = {
    showImages,
    autoRefresh,
    articleFilter,
    sortOrder,
    maxArticleAge,
    showBookmarkIndicators,
    skipArticleView,
    showReadingPositionInFeeds,
    hasSeenOnboarding,
    isLoading,
    updateShowImages,
    updateAutoRefresh,
    updateArticleFilter,
    updateSortOrder,
    updateMaxArticleAge,
    updateShowBookmarkIndicators,
    updateSkipArticleView,
    updateShowReadingPositionInFeeds,
    completeOnboarding,
    resetOnboarding,
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
