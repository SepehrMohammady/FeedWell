import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_HOME_SECTIONS, normalizeHomeSections } from '../config/homeSections';
import { APP_VERSION } from '../config/version';
import { normalizeAutoScrollSpeed } from '../hooks/useAutoScroll';
import { DEFAULT_READING_FONT, getReadingFont } from '../config/readingFonts';
import { SWIPE_ACTIONS, DEFAULT_SWIPE_RIGHT, DEFAULT_SWIPE_LEFT } from '../config/swipeActions';
import { EMPTY_FEED_FILTER, normalizeFeedFilter } from '../config/feedFilter';

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
  // What the motion cues show while Reduce Motion is on: 'dots', or 'horizon' (dots and a horizon)
  const [motionCuesStyle, setMotionCuesStyle] = useState('dots');
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
  // Saved (Read Later) list sort order — persisted so it survives navigation.
  const [readLaterSortOrder, setReadLaterSortOrder] = useState('newest'); // 'newest' | 'oldest'
  // Font used for article body text in the reader (Settings > Reading Font).
  const [readingFont, setReadingFont] = useState(DEFAULT_READING_FONT);
  // Feed-list auto-scroll: off by default; starts after `delay` seconds of
  // inactivity and scrolls at the chosen speed.
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(false);
  const [autoScrollDelay, setAutoScrollDelay] = useState(5); // seconds: 3|5|10|15
  // Percent of the base speed (25–250, step 25). Legacy 'slow'|'normal'|'fast'
  // values from pre-1.12 installs are migrated on load.
  const [autoScrollSpeed, setAutoScrollSpeed] = useState(100);
  // Sub-option of auto-scroll: hold the screen on while reading the feed list
  // or an article, so it never dims mid-scroll.
  const [keepAwakeEnabled, setKeepAwakeEnabled] = useState(false);
  // Translate articles into the default translation language as they open.
  // Off by default: in online mode it sends each opened article to Google.
  const [autoTranslate, setAutoTranslate] = useState(false);
  // Which Home sections show, and in what order (Customize Home).
  const [homeSections, setHomeSections] = useState(DEFAULT_HOME_SECTIONS);
  // The home screen widget: which articles it shows ('all', 'unread' or
  // 'saved') and from which feed (null: every feed).
  const [widgetSource, setWidgetSource] = useState('all');
  const [widgetFeedUrl, setWidgetFeedUrl] = useState(null);
  // Articles already read look quieter in the Feeds list: a black and white
  // picture, lighter text and a dimmer row.
  const [dimReadArticles, setDimReadArticles] = useState(true);
  // What swiping an article in the Feeds list does (config/swipeActions).
  const [swipeRightAction, setSwipeRightAction] = useState(DEFAULT_SWIPE_RIGHT);
  const [swipeLeftAction, setSwipeLeftAction] = useState(DEFAULT_SWIPE_LEFT);
  // The Feeds list's filter beyond read and unread (config/feedFilter).
  const [feedFilter, setFeedFilter] = useState(EMPTY_FEED_FILTER);
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
      const savedMotionCuesStyle = await AsyncStorage.getItem('motionCuesStyle');
      const savedReadingReminder = await AsyncStorage.getItem('readingReminder');
      const savedFeedRegion = await AsyncStorage.getItem('feedRegion');
      const savedFeedRegionUserSet = await AsyncStorage.getItem('feedRegionUserSet');
      const savedTranslationTargetUserSet = await AsyncStorage.getItem('translationTargetUserSet');
      const savedLastSeenVersion = await AsyncStorage.getItem('lastSeenVersion');
      const savedReadLaterSortOrder = await AsyncStorage.getItem('readLaterSortOrder');
      const savedReadingFont = await AsyncStorage.getItem('readingFont');
      const savedAutoScrollEnabled = await AsyncStorage.getItem('autoScrollEnabled');
      const savedAutoScrollDelay = await AsyncStorage.getItem('autoScrollDelay');
      const savedAutoScrollSpeed = await AsyncStorage.getItem('autoScrollSpeed');
      const savedKeepAwakeEnabled = await AsyncStorage.getItem('keepAwakeEnabled');
      const savedAutoTranslate = await AsyncStorage.getItem('autoTranslate');
      const savedHomeSections = await AsyncStorage.getItem('homeSections');
      const savedWidgetSource = await AsyncStorage.getItem('widgetSource');
      const savedWidgetFeedUrl = await AsyncStorage.getItem('widgetFeedUrl');
      const savedDimReadArticles = await AsyncStorage.getItem('dimReadArticles');
      const savedSwipeRight = await AsyncStorage.getItem('swipeRightAction');
      const savedSwipeLeft = await AsyncStorage.getItem('swipeLeftAction');
      const savedFeedFilter = await AsyncStorage.getItem('feedFilter');

      if (savedWidgetSource !== null) {
        const value = JSON.parse(savedWidgetSource);
        if (['all', 'unread', 'saved'].includes(value)) setWidgetSource(value);
      }
      if (savedWidgetFeedUrl !== null) {
        setWidgetFeedUrl(JSON.parse(savedWidgetFeedUrl) || null);
      }
      if (savedDimReadArticles !== null) {
        setDimReadArticles(JSON.parse(savedDimReadArticles));
      }
      if (savedSwipeRight !== null) {
        const value = JSON.parse(savedSwipeRight);
        if (SWIPE_ACTIONS.includes(value)) setSwipeRightAction(value);
      }
      if (savedSwipeLeft !== null) {
        const value = JSON.parse(savedSwipeLeft);
        if (SWIPE_ACTIONS.includes(value)) setSwipeLeftAction(value);
      }
      if (savedFeedFilter !== null) {
        setFeedFilter(normalizeFeedFilter(JSON.parse(savedFeedFilter)));
      }

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

      if (savedMotionCuesStyle === 'dots' || savedMotionCuesStyle === 'horizon') {
        setMotionCuesStyle(savedMotionCuesStyle);
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

      if (savedReadLaterSortOrder !== null) {
        setReadLaterSortOrder(JSON.parse(savedReadLaterSortOrder));
      }

      if (savedReadingFont !== null) {
        // getReadingFont falls back to the default for an unknown key.
        setReadingFont(getReadingFont(JSON.parse(savedReadingFont)).key);
      }

      if (savedAutoScrollEnabled !== null) {
        setAutoScrollEnabled(JSON.parse(savedAutoScrollEnabled));
      }

      if (savedAutoScrollDelay !== null) {
        setAutoScrollDelay(JSON.parse(savedAutoScrollDelay));
      }

      if (savedKeepAwakeEnabled !== null) {
        setKeepAwakeEnabled(JSON.parse(savedKeepAwakeEnabled));
      }

      if (savedAutoTranslate !== null) {
        setAutoTranslate(JSON.parse(savedAutoTranslate));
      }

      if (savedHomeSections !== null) {
        setHomeSections(normalizeHomeSections(JSON.parse(savedHomeSections)));
      }

      if (savedAutoScrollSpeed !== null) {
        setAutoScrollSpeed(normalizeAutoScrollSpeed(JSON.parse(savedAutoScrollSpeed)));
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

  const updateReadLaterSortOrder = async (value) => {
    try {
      setReadLaterSortOrder(value);
      await AsyncStorage.setItem('readLaterSortOrder', JSON.stringify(value));
    } catch (error) {
      console.error('Error saving readLaterSortOrder setting:', error);
    }
  };

  const updateReadingFont = async (value) => {
    try {
      setReadingFont(value);
      await AsyncStorage.setItem('readingFont', JSON.stringify(value));
    } catch (error) {
      console.error('Error saving readingFont setting:', error);
    }
  };

  const updateAutoScrollEnabled = async (value) => {
    try {
      setAutoScrollEnabled(value);
      await AsyncStorage.setItem('autoScrollEnabled', JSON.stringify(value));
    } catch (error) {
      console.error('Error saving autoScrollEnabled setting:', error);
    }
  };

  const updateAutoScrollDelay = async (value) => {
    try {
      setAutoScrollDelay(value);
      await AsyncStorage.setItem('autoScrollDelay', JSON.stringify(value));
    } catch (error) {
      console.error('Error saving autoScrollDelay setting:', error);
    }
  };

  const updateAutoScrollSpeed = async (value) => {
    try {
      setAutoScrollSpeed(value);
      await AsyncStorage.setItem('autoScrollSpeed', JSON.stringify(value));
    } catch (error) {
      console.error('Error saving autoScrollSpeed setting:', error);
    }
  };

  const updateKeepAwakeEnabled = async (value) => {
    try {
      setKeepAwakeEnabled(value);
      await AsyncStorage.setItem('keepAwakeEnabled', JSON.stringify(value));
    } catch (error) {
      console.error('Error saving keepAwakeEnabled setting:', error);
    }
  };

  const updateAutoTranslate = async (value) => {
    try {
      setAutoTranslate(value);
      await AsyncStorage.setItem('autoTranslate', JSON.stringify(value));
    } catch (error) {
      console.error('Error saving autoTranslate setting:', error);
    }
  };

  const updateHomeSections = async (sections) => {
    try {
      setHomeSections(sections);
      await AsyncStorage.setItem('homeSections', JSON.stringify(sections));
    } catch (error) {
      console.error('Error saving homeSections setting:', error);
    }
  };

  // Back to the default layout. The key is removed rather than saved, so a
  // later version's new defaults still reach people who never customized.
  const resetHomeSections = async () => {
    try {
      setHomeSections(DEFAULT_HOME_SECTIONS);
      await AsyncStorage.removeItem('homeSections');
    } catch (error) {
      console.error('Error resetting homeSections setting:', error);
    }
  };

  const saveSetting = async (key, value, set) => {
    try {
      set(value);
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Error saving ${key} setting:`, error);
    }
  };
  const updateWidgetSource = (value) => saveSetting('widgetSource', value, setWidgetSource);
  const updateWidgetFeedUrl = (value) => saveSetting('widgetFeedUrl', value || null, setWidgetFeedUrl);
  const updateDimReadArticles = (value) => saveSetting('dimReadArticles', value, setDimReadArticles);
  const updateSwipeRightAction = (value) => saveSetting('swipeRightAction', value, setSwipeRightAction);
  const updateSwipeLeftAction = (value) => saveSetting('swipeLeftAction', value, setSwipeLeftAction);
  const updateFeedFilter = (value) => saveSetting('feedFilter', normalizeFeedFilter(value), setFeedFilter);
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
      // Stamp the current version with the flag, in the same render, so a fresh
      // install never sees the What's New popup. (With a write in between, the
      // flag rendered first and opened What's New right after the tour.)
      setLastSeenVersion(APP_VERSION.version);
      setHasSeenOnboarding(true);
      await AsyncStorage.multiSet([
        ['hasSeenOnboarding', JSON.stringify(true)],
        ['lastSeenVersion', JSON.stringify(APP_VERSION.version)],
      ]);
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

  const updateMotionCuesStyle = async (value) => {
    try {
      setMotionCuesStyle(value);
      await AsyncStorage.setItem('motionCuesStyle', value);
    } catch (error) {
      console.error('Error saving motionCuesStyle setting:', error);
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
    motionCuesStyle,
    readingReminder,
    feedRegion,
    feedRegionUserSet,
    translationTargetUserSet,
    lastSeenVersion,
    readLaterSortOrder,
    readingFont,
    autoScrollEnabled,
    autoScrollDelay,
    autoScrollSpeed,
    keepAwakeEnabled,
    autoTranslate,
    homeSections,
    widgetSource,
    widgetFeedUrl,
    dimReadArticles,
    swipeRightAction,
    swipeLeftAction,
    feedFilter,
    isLoading,
    updateWidgetSource,
    updateWidgetFeedUrl,
    updateDimReadArticles,
    updateSwipeRightAction,
    updateSwipeLeftAction,
    updateFeedFilter,
    updateFeedRegion,
    markTranslationTargetUserSet,
    updateLastSeenVersion,
    updateReadLaterSortOrder,
    updateReadingFont,
    updateAutoScrollEnabled,
    updateAutoScrollDelay,
    updateAutoScrollSpeed,
    updateKeepAwakeEnabled,
    updateAutoTranslate,
    updateHomeSections,
    resetHomeSections,
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
    updateMotionCuesStyle,
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
