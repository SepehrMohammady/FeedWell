import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { APP_VERSION } from '../config/version';

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
  const [allowRotation, setAllowRotation] = useState(false);
  const [speechRate, setSpeechRate] = useState(1.0);
  const [readerHeaderActions, setReaderHeaderActions] = useState(['bookmark', 'translate', 'readAloud']);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [readingReminder, setReadingReminder] = useState(true);
  // Local-feeds region for Popular Categories ('global' = English). When the user
  // hasn't explicitly chosen one, screens derive it from the app language.
  const [feedRegion, setFeedRegion] = useState('global');
  const [feedRegionUserSet, setFeedRegionUserSet] = useState(false);
  // Whether the user explicitly picked an article-translation language (so a
  // later app-language change only *suggests*, never silently overrides it).
  const [translationTargetUserSet, setTranslationTargetUserSet] = useState(false);
  // Last app version for which the "What's New" popup was shown.
  const [lastSeenVersion, setLastSeenVersion] = useState(null);
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
      const savedAllowRotation = await AsyncStorage.getItem('allowRotation');
      const savedSpeechRate = await AsyncStorage.getItem('speechRate');
      const savedReaderHeaderActions = await AsyncStorage.getItem('readerHeaderActions');
      const savedHasSeenOnboarding = await AsyncStorage.getItem('hasSeenOnboarding');
      const savedReduceMotion = await AsyncStorage.getItem('reduceMotion');
      const savedReadingReminder = await AsyncStorage.getItem('readingReminder');
      const savedFeedRegion = await AsyncStorage.getItem('feedRegion');
      const savedFeedRegionUserSet = await AsyncStorage.getItem('feedRegionUserSet');
      const savedTranslationTargetUserSet = await AsyncStorage.getItem('translationTargetUserSet');
      const savedLastSeenVersion = await AsyncStorage.getItem('lastSeenVersion');

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

      if (savedAllowRotation !== null) {
        setAllowRotation(JSON.parse(savedAllowRotation));
      }

      if (savedSpeechRate !== null) {
        setSpeechRate(JSON.parse(savedSpeechRate));
      }

      if (savedReaderHeaderActions !== null) {
        setReaderHeaderActions(JSON.parse(savedReaderHeaderActions));
      }

      if (savedHasSeenOnboarding !== null) {
        setHasSeenOnboarding(JSON.parse(savedHasSeenOnboarding));
      }

      if (savedReduceMotion !== null) {
        setReduceMotion(JSON.parse(savedReduceMotion));
      }

      if (savedReadingReminder !== null) {
        setReadingReminder(JSON.parse(savedReadingReminder));
      }

      if (savedFeedRegion !== null) {
        setFeedRegion(JSON.parse(savedFeedRegion));
      }

      if (savedFeedRegionUserSet !== null) {
        setFeedRegionUserSet(JSON.parse(savedFeedRegionUserSet));
      }

      if (savedTranslationTargetUserSet !== null) {
        setTranslationTargetUserSet(JSON.parse(savedTranslationTargetUserSet));
      }

      if (savedLastSeenVersion !== null) {
        setLastSeenVersion(JSON.parse(savedLastSeenVersion));
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

  const updateAllowRotation = async (value) => {
    try {
      setAllowRotation(value);
      await AsyncStorage.setItem('allowRotation', JSON.stringify(value));
    } catch (error) {
      console.error('Error saving allowRotation setting:', error);
    }
  };

  const updateSpeechRate = async (value) => {
    try {
      setSpeechRate(value);
      await AsyncStorage.setItem('speechRate', JSON.stringify(value));
    } catch (error) {
      console.error('Error saving speechRate setting:', error);
    }
  };

  const updateReaderHeaderActions = async (value) => {
    try {
      setReaderHeaderActions(value);
      await AsyncStorage.setItem('readerHeaderActions', JSON.stringify(value));
    } catch (error) {
      console.error('Error saving readerHeaderActions setting:', error);
    }
  };

  // Explicit user choice of feed region (marks it user-set so a later app-language
  // change won't auto-follow). Pass userSet=false to only update the value.
  const updateFeedRegion = async (value, userSet = true) => {
    try {
      setFeedRegion(value);
      await AsyncStorage.setItem('feedRegion', JSON.stringify(value));
      if (userSet) {
        setFeedRegionUserSet(true);
        await AsyncStorage.setItem('feedRegionUserSet', JSON.stringify(true));
      }
    } catch (error) {
      console.error('Error saving feedRegion setting:', error);
    }
  };

  const markTranslationTargetUserSet = async (value = true) => {
    try {
      setTranslationTargetUserSet(value);
      await AsyncStorage.setItem('translationTargetUserSet', JSON.stringify(value));
    } catch (error) {
      console.error('Error saving translationTargetUserSet flag:', error);
    }
  };

  const updateLastSeenVersion = async (value) => {
    try {
      setLastSeenVersion(value);
      await AsyncStorage.setItem('lastSeenVersion', JSON.stringify(value));
    } catch (error) {
      console.error('Error saving lastSeenVersion:', error);
    }
  };

  const completeOnboarding = async () => {
    try {
      setHasSeenOnboarding(true);
      await AsyncStorage.setItem('hasSeenOnboarding', JSON.stringify(true));
      // Stamp the current version so a fresh install never sees the What's New popup.
      setLastSeenVersion(APP_VERSION.version);
      await AsyncStorage.setItem('lastSeenVersion', JSON.stringify(APP_VERSION.version));
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

  const updateReduceMotion = async (value) => {
    try {
      setReduceMotion(value);
      await AsyncStorage.setItem('reduceMotion', JSON.stringify(value));
    } catch (error) {
      console.error('Error saving reduceMotion setting:', error);
    }
  };

  const updateReadingReminder = async (value) => {
    try {
      setReadingReminder(value);
      await AsyncStorage.setItem('readingReminder', JSON.stringify(value));
    } catch (error) {
      console.error('Error saving readingReminder setting:', error);
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
    allowRotation,
    speechRate,
    readerHeaderActions,
    hasSeenOnboarding,
    reduceMotion,
    readingReminder,
    feedRegion,
    feedRegionUserSet,
    translationTargetUserSet,
    lastSeenVersion,
    isLoading,
    updateFeedRegion,
    markTranslationTargetUserSet,
    updateLastSeenVersion,
    updateShowImages,
    updateAutoRefresh,
    updateArticleFilter,
    updateSortOrder,
    updateMaxArticleAge,
    updateShowBookmarkIndicators,
    updateSkipArticleView,
    updateShowReadingPositionInFeeds,
    updateAllowRotation,
    updateSpeechRate,
    updateReaderHeaderActions,
    completeOnboarding,
    resetOnboarding,
    updateReduceMotion,
    updateReadingReminder,
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
