import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Image,
  Platform,
  Share,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useFeed } from '../context/FeedContext';
import { useTheme, makeStyles } from '../context/ThemeContext';
import { FONT, TYPE, RADIUS } from '../theme/type';
import { useAppSettings } from '../context/AppSettingsContext';
import { parseRSSFeed } from '../utils/rssParser';
import ArticleImage from '../components/ArticleImage';
import SaveButton from '../components/SaveButton';
import ReadingPositionIndicator from '../components/ReadingPositionIndicator';
import CustomAlert from '../components/CustomAlert';
import { useAmbientSound } from '../context/AmbientSoundContext';
import { useTranslation } from '../context/LanguageContext';
import { formatRelativeDate } from '../utils/formatDate';
import { useAutoScroll } from '../hooks/useAutoScroll';
import { useKeepScreenAwake } from '../hooks/useKeepScreenAwake';
import { useTour, useTourTarget } from '../context/TourContext';
import { useReadLater } from '../context/ReadLaterContext';
import { useNotes } from '../context/NotesContext';
import SwipeRow from '../components/SwipeRow';
import UndoToast from '../components/UndoToast';
import FeedFilterSheet, { publishedLabelKey, onlyLabelKey } from '../components/FeedFilterSheet';
import {
  EMPTY_FEED_FILTER,
  ONLY_CHOICES,
  PUBLISHED_RANGES,
  feedFilterCount,
  passesFeedFilter,
  passesOnly,
  publishedSince,
} from '../config/feedFilter';
import { withOfflineContent, offlineFields } from '../utils/saveForLater';
import { mix } from '../theme/palette';

// How long a swiped-away article waits before it is removed for good, while
// Undo shows
const REMOVE_UNDO_MS = 5000;

// A read article's row: a step back from the card, toward the page
const readRowColor = (c) => (c.isDark ? mix(c.surface, c.background, 0.6) : mix(c.surface, c.surface2, 0.6));

export default function FeedListScreen({ navigation, route }) {
  const { feeds, articles, loading, addArticles, setLoading, setError, markAllRead, markAllUnread, markArticlesRead, markArticlesUnread, markArticleRead, markArticleUnread, removeArticles, getUnreadCount, getReadCount, readingPosition, setReadingPosition, clearReadingPosition } = useFeed();
  const { theme } = useTheme();
  const { t, isRTL, formatNumber, language } = useTranslation();
  const { showImages, articleFilter, sortOrder, updateArticleFilter, updateSortOrder, maxArticleAge, skipArticleView, showReadingPositionInFeeds, autoScrollEnabled, autoScrollDelay, autoScrollSpeed, keepAwakeEnabled } = useAppSettings();
  const { dimReadArticles, swipeRightAction, swipeLeftAction, feedFilter, updateFeedFilter } = useAppSettings();
  const readLater = useReadLater();
  const { articles: savedArticles, isInReadLater } = readLater;
  // Undo runs later, when this render's functions may hold old state
  const readLaterRef = useRef(readLater);
  readLaterRef.current = readLater;
  const { notes } = useNotes();
  const { setShowPlaylist: openSoundPlaylist } = useAmbientSound();
  const [refreshing, setRefreshing] = useState(false);
  const [forceRender, setForceRender] = useState(0);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedArticles, setSelectedArticles] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSheetVisible, setFilterSheetVisible] = useState(false);
  // What a swipe just did, with Undo when it can be undone (UndoToast)
  const [toast, setToast] = useState(null);
  // Articles swiped away: out of the list while Undo shows, then removed for
  // good (sooner when another is swiped away, or the list goes)
  const [pendingRemovals, setPendingRemovals] = useState(() => new Set());
  const removalTimers = useRef(new Map());
  // The list as it was last shown, pending removals included, for the
  // reading position line when a removal goes through
  const fullListRef = useRef([]);
  const readingPositionRef = useRef(readingPosition);
  readingPositionRef.current = readingPosition;
  const flatListRef = useRef(null);
  const searchInputRef = useRef(null);
  // Last measured average item length reported by the FlatList (via
  // onScrollToIndexFailed). Used instead of a hardcoded height estimate.
  const avgItemLengthRef = useRef(null);
  const [alertConfig, setAlertConfig] = useState({ visible: false, title: '', message: '', icon: null, buttons: [] });

  // --- Auto-scroll (Settings > Auto-Scroll, default off) ---
  const listOffsetRef = useRef(0);
  const listContentHeightRef = useRef(0);
  const listViewportHeightRef = useRef(0);
  // App tour: the controls it points at, and a pause for auto-scroll while it runs.
  const tour = useTour();
  const tourActiveRef = useRef(false);
  tourActiveRef.current = !!tour?.active;
  const tourAddRef = useTourTarget('feeds.add');
  const tourFilterRef = useTourTarget('feeds.filter');
  const tourSoundsRef = useTourTarget('feeds.sounds');
  const tourSortRef = useTourTarget('feeds.sort');
  const tourReadAllRef = useTourTarget('feeds.readAll');
  const tourSearchRef = useTourTarget('feeds.search');
  const tourReadingPositionRef = useTourTarget('feeds.readingPosition');

  const autoScroll = useAutoScroll({
    enabled: autoScrollEnabled,
    delaySeconds: autoScrollDelay,
    speedPercent: autoScrollSpeed,
    getOffset: () => listOffsetRef.current,
    getMaxOffset: () => Math.max(0, listContentHeightRef.current - listViewportHeightRef.current),
    scrollTo: (y) => flatListRef.current?.scrollToOffset({ offset: y, animated: false }),
    isBlocked: () => tourActiveRef.current,
  });

  // The tour points at the first reading-position row, so start it at the top.
  useEffect(() => {
    if (tour?.active) flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [tour?.active]);

  // Keep the screen on while auto-scrolling the list, so it never dims mid-scroll.
  useKeepScreenAwake(autoScrollEnabled && keepAwakeEnabled, 'feedwell-feed-list');

  // Arm while the tab is focused; fully stop on blur/unmount.
  useFocusEffect(
    React.useCallback(
      () => {
        autoScroll.arm();
        return autoScroll.pause;
      },
      [autoScroll.arm, autoScroll.pause, autoScrollEnabled, autoScrollDelay, autoScrollSpeed]
    )
  );

  // Apply filter from navigation params (e.g., when clicking Unread from Home)
  useEffect(() => {
    if (route?.params?.filter) {
      updateArticleFilter(route.params.filter);
    }
  }, [route?.params?.filter]);

  // Home's Search action opens the list with the search field focused.
  useEffect(() => {
    if (!route?.params?.focusSearchAt) return;
    const timer = setTimeout(() => searchInputRef.current?.focus(), 350);
    return () => clearTimeout(timer);
  }, [route?.params?.focusSearchAt]);

  // Home picks the feed to show (or every feed, with null), and the filter
  // starts over with it. sourceAt changes on every tap, so picking the same
  // feed again after clearing the filter still applies.
  useEffect(() => {
    if (route?.params?.sourceAt) {
      const url = route.params.sourceFeedUrl;
      updateFeedFilter({ ...EMPTY_FEED_FILTER, feeds: url ? [url] : [] });
    }
  }, [route?.params?.sourceAt]);

  // A feed that has gone leaves the filter too
  useEffect(() => {
    if (feeds.length === 0 || feedFilter.feeds.length === 0) return;
    const known = feedFilter.feeds.filter((url) => feeds.some((feed) => feed.url === url));
    if (known.length !== feedFilter.feeds.length) updateFeedFilter({ ...feedFilter, feeds: known });
  }, [feeds, feedFilter]);

  // Force re-render when screen comes into focus to update read status
  useFocusEffect(
    React.useCallback(() => {
      setForceRender(prev => prev + 1);

      const timeouts = [];

      // Auto-scroll to reading position when tab becomes active
      if (readingPosition && readingPosition.afterArticleId && flatListRef.current && filteredAndSortedArticles && filteredAndSortedArticles.length > 0) {
        // Find the index of the article after which the reading position is set
        const targetIndex = filteredAndSortedArticles.findIndex(article => article.id === readingPosition.afterArticleId);
        if (targetIndex !== -1) {
          // Scroll to the article after the reading position (or the reading position line)
          const scrollIndex = Math.min(targetIndex + 1, filteredAndSortedArticles.length - 1);

          const tryScrollToIndex = () => {
            if (!flatListRef.current) return false;
            try {
              flatListRef.current.scrollToIndex({
                index: scrollIndex,
                animated: true,
                viewPosition: 0.3, // Show the target item at 30% from the top
              });
              return true;
            } catch (error) {
              console.log('Auto-scroll scrollToIndex failed:', error);
              return false;
            }
          };

          // Wait a bit for the FlatList to render
          timeouts.push(setTimeout(() => {
            if (!tryScrollToIndex()) {
              // Fallback: jump near the estimated position (unanimated) so the
              // far-away items get rendered, then retry the precise scroll.
              // Prefer the list's own measured average item length over a guess.
              const estimatedItemHeight = avgItemLengthRef.current || 180;
              if (flatListRef.current) {
                flatListRef.current.scrollToOffset({
                  offset: scrollIndex * estimatedItemHeight,
                  animated: false,
                });
              }
              timeouts.push(setTimeout(() => {
                if (!tryScrollToIndex()) {
                  // With many items one retry can still land short while items
                  // render; try once more a bit later.
                  timeouts.push(setTimeout(tryScrollToIndex, 600));
                }
              }, 400));
            }
          }, 500));
        }
      }

      return () => {
        timeouts.forEach(clearTimeout);
      };
    }, [readingPosition, articles, articleFilter, sortOrder, searchQuery])
  );

  // Standard RN pattern for scrollToIndex on a not-yet-rendered index with
  // variable item heights: jump near the target using the list's measured
  // average item length, wait for the items to render, then retry precisely.
  const handleScrollToIndexFailed = (info) => {
    if (info.averageItemLength) {
      avgItemLengthRef.current = info.averageItemLength;
    }
    if (flatListRef.current) {
      flatListRef.current.scrollToOffset({
        offset: info.averageItemLength * info.index,
        animated: false,
      });
    }
    setTimeout(() => {
      if (flatListRef.current && info.index < filteredAndSortedArticles.length) {
        try {
          flatListRef.current.scrollToIndex({
            index: info.index,
            animated: true,
            viewPosition: 0.3,
          });
        } catch (error) {
          console.log('scrollToIndex retry failed:', error);
        }
      }
    }, 400);
  };

  const refreshFeeds = async () => {
    if (feeds.length === 0) return;
    
    console.log('=== REFRESH FEEDS DEBUG START ===');
    console.log('Articles before refresh:', articles.length);
    console.log('Unread before refresh:', getUnreadCount());
    
    setLoading(true);
    try {
      const allArticles = [];
      
      for (const feed of feeds) {
        try {
          const parsedFeed = await parseRSSFeed(feed.url, maxArticleAge);
          console.log(`Feed ${feed.title} returned ${parsedFeed.articles.length} articles`);
          allArticles.push(...parsedFeed.articles);
        } catch (error) {
          console.error(`Error parsing feed ${feed.url}:`, error);
        }
      }
      
      console.log('Total articles from all feeds:', allArticles.length);
      console.log('Sample article IDs:', allArticles.slice(0, 3).map(a => ({ id: a.id, title: a.title?.substring(0, 50) })));
      
      if (allArticles.length > 0) {
        await addArticles(allArticles);
      }
      
      console.log('Articles after refresh:', articles.length);
      console.log('Unread after refresh:', getUnreadCount());
      console.log('=== REFRESH FEEDS DEBUG END ===');
    } catch (error) {
      setError('Failed to refresh feeds');
      setAlertConfig({ visible: true, title: t('common.error'), message: t('feedList.refreshFailed'), icon: 'wifi-outline', buttons: [{ text: t('common.ok') }] });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    refreshFeeds();
  };

  const handleMarkAllRead = async () => {
    // With a filter or a search on, only the articles in the list; otherwise all of them.
    const unreadIds = narrowed ? filteredAndSortedArticles.filter(a => !a.isRead).map(a => a.id) : null;
    const unreadCount = unreadIds ? unreadIds.length : getUnreadCount();
    if (unreadCount === 0) {
      setAlertConfig({ visible: true, title: t('feedList.infoTitle'), message: t('feedList.noUnreadToMark'), icon: 'checkmark-circle-outline', buttons: [{ text: t('common.ok') }] });
      return;
    }

    const confirmAction = () => {
      if (unreadIds) markArticlesRead(unreadIds); else markAllRead();
      setAlertConfig({ visible: true, title: t('common.success'), message: t('feedList.markedReadSuccess', { count: formatNumber(unreadCount) }), icon: 'checkmark-circle', buttons: [{ text: t('common.ok') }] });
    };

    setAlertConfig({
      visible: true,
      title: t('feedList.markAllReadTitle'),
      message: t('feedList.markAllReadConfirm', { count: formatNumber(unreadCount) }),
      icon: 'checkmark-done-outline',
      buttons: [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('feedList.markAllReadTitle'), onPress: confirmAction, style: 'destructive' },
      ],
    });
  };

  const handleMarkAllUnread = async () => {
    const readIds = narrowed ? filteredAndSortedArticles.filter(a => a.isRead).map(a => a.id) : null;
    const readCount = readIds ? readIds.length : getReadCount();
    if (readCount === 0) {
      setAlertConfig({ visible: true, title: t('feedList.infoTitle'), message: t('feedList.noReadToMark'), icon: 'information-circle-outline', buttons: [{ text: t('common.ok') }] });
      return;
    }

    const confirmAction = () => {
      if (readIds) markArticlesUnread(readIds); else markAllUnread();
      setAlertConfig({ visible: true, title: t('common.success'), message: t('feedList.markedUnreadSuccess', { count: formatNumber(readCount) }), icon: 'checkmark-circle', buttons: [{ text: t('common.ok') }] });
    };

    setAlertConfig({
      visible: true,
      title: t('feedList.markAllUnreadTitle'),
      message: t('feedList.markAllUnreadConfirm', { count: formatNumber(readCount) }),
      icon: 'mail-unread-outline',
      buttons: [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('feedList.markAllUnreadTitle'), onPress: confirmAction, style: 'destructive' },
      ],
    });
  };

  const handleShare = async (article) => {
    try {
      const shareOptions = {
        message: Platform.OS === 'ios' 
          ? `📰 Shared via FeedWell\n\n${article.title}` 
          : `📰 Shared via FeedWell\n\n${article.title}\n\n${article.url}`,
        url: Platform.OS === 'ios' ? article.url : undefined,
        title: article.title,
      };
      
      await Share.share(shareOptions);
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const formatDate = (dateString) => {
    return formatRelativeDate(dateString, t, formatNumber, language);
  };

  const handleArticlePress = (article) => {
    if (skipArticleView) {
      navigation.navigate('ArticleReader', {
        article,
        currentFilter: articleFilter,
        currentSortOrder: sortOrder
      });
    } else {
      navigation.navigate('ArticleActions', { 
        article,
        currentFilter: articleFilter,
        currentSortOrder: sortOrder
      });
    }
  };

  // Mark every article from the top of the list down to this point as read
  // (Feedly's "mark as read above"). Uses the list as currently displayed, so
  // "above" always means what the user actually sees above the line.
  const handleMarkAboveRead = async (articleIndex) => {
    const ids = filteredAndSortedArticles
      .slice(0, articleIndex + 1)
      .filter(a => !a.isRead)
      .map(a => a.id);
    if (ids.length === 0) {
      setAlertConfig({
        visible: true,
        title: t('feedList.infoTitle'),
        message: t('feedList.noUnreadToMark'),
        icon: 'information-circle-outline',
        buttons: [{ text: t('common.ok') }],
      });
      return;
    }
    // Where the first still-unread article sits AFTER the mark, computed from
    // the list as it looks right now:
    //  - "unread" filter: everything just marked disappears, so what followed
    //    the line collapses to the top of the list.
    //  - any other filter: the list keeps its shape, so that article stays at
    //    its own index.
    // Without this the viewport stayed at its old offset and the user had to
    // scroll back to find where they had got to.
    const nextUnreadIndex = filteredAndSortedArticles.findIndex(
      (a, i) => i > articleIndex && !a.isRead
    );

    await markArticlesRead(ids);

    if (nextUnreadIndex === -1) return; // nothing unread below — leave the view alone
    // Let the list re-render with the new read state before moving the viewport.
    requestAnimationFrame(() => {
      if (!flatListRef.current) return;
      if (articleFilter === 'unread') {
        flatListRef.current.scrollToOffset({ offset: 0, animated: true });
        return;
      }
      try {
        flatListRef.current.scrollToIndex({
          index: nextUnreadIndex,
          animated: true,
          viewPosition: 0,
        });
      } catch (e) {
        // scrollToIndex can throw for a not-yet-measured row; onScrollToIndexFailed
        // handles the retry, so a failure here is not worth surfacing.
      }
    });
  };

  const handleSetReadingPosition = (articleIndex) => {
    const article = filteredAndSortedArticles[articleIndex];
    if (article) {
      setReadingPosition(`after_article_${article.id}`, article.id);
    }
  };

  const handleGoToReadingPosition = () => {
    if (readingPosition && readingPosition.afterArticleId) {
      // Find the article in the current filtered list
      const articleIndex = filteredAndSortedArticles.findIndex(article => article.id === readingPosition.afterArticleId);
      if (articleIndex !== -1 && flatListRef.current) {
        try {
          flatListRef.current.scrollToIndex({
            index: Math.min(articleIndex + 1, filteredAndSortedArticles.length - 1),
            animated: true,
            viewPosition: 0.3,
          });
        } catch (error) {
          setAlertConfig({ visible: true, title: t('feedList.readingPositionTitle'), message: t('feedList.readingPositionMarkedBelow'), icon: 'location-outline', buttons: [{ text: t('common.ok') }] });
        }
      } else {
        setAlertConfig({ visible: true, title: t('feedList.readingPositionTitle'), message: t('feedList.readingPositionNotVisible'), icon: 'location-outline', buttons: [{ text: t('common.ok') }] });
      }
    }
  };

  const handleClearReadingPosition = () => {
    setAlertConfig({
      visible: true,
      title: t('feedList.clearReadingPositionTitle'),
      message: t('feedList.clearReadingPositionConfirm'),
      icon: 'bookmark-outline',
      buttons: [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('feedList.clearAction'), style: 'destructive', onPress: clearReadingPosition },
      ],
    });
  };

  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    setSelectedArticles(new Set());
  };

  const toggleArticleSelection = (articleId) => {
    const newSelection = new Set(selectedArticles);
    if (newSelection.has(articleId)) {
      newSelection.delete(articleId);
    } else {
      newSelection.add(articleId);
    }
    setSelectedArticles(newSelection);
  };

  const selectAllArticles = () => {
    const allIds = new Set(filteredAndSortedArticles.map(a => a.id));
    setSelectedArticles(allIds);
  };

  const deselectAllArticles = () => {
    setSelectedArticles(new Set());
  };

  const markSelectedAsRead = async () => {
    for (const articleId of selectedArticles) {
      await markArticleRead(articleId, articleFilter, sortOrder);
    }
    setSelectedArticles(new Set());
    setSelectionMode(false);
    setForceRender(prev => prev + 1);
  };

  const markSelectedAsUnread = async () => {
    for (const articleId of selectedArticles) {
      await markArticleUnread(articleId, articleFilter, sortOrder);
    }
    setSelectedArticles(new Set());
    setSelectionMode(false);
    setForceRender(prev => prev + 1);
  };

  // Removes articles from the list for good (a refresh won't bring them back).
  // If the reading position line sat under one of them, it moves up to the
  // nearest article in `list` that stays, or goes away when none is left above it.
  const removeKeepingPosition = async (ids, list) => {
    const position = readingPositionRef.current;
    if (position?.afterArticleId && ids.has(position.afterArticleId)) {
      const anchorIndex = list.findIndex(a => a.id === position.afterArticleId);
      const above = list.slice(0, Math.max(anchorIndex, 0)).reverse().find(a => !ids.has(a.id));
      if (above) {
        await setReadingPosition(position.positionId, above.id);
      } else {
        await clearReadingPosition();
      }
    }
    await removeArticles(Array.from(ids));
  };

  const removeSelectedArticles = async () => {
    const ids = new Set(selectedArticles);
    if (ids.size === 0) return;
    await removeKeepingPosition(ids, filteredAndSortedArticles);
    setSelectedArticles(new Set());
    setSelectionMode(false);
    setForceRender(prev => prev + 1);
  };

  const confirmRemoveSelected = () => {
    if (selectedArticles.size === 0) return;
    setAlertConfig({
      visible: true,
      title: t('feedList.removeConfirmTitle'),
      message: t('feedList.removeConfirmMessage', { count: formatNumber(selectedArticles.size) }),
      icon: 'trash-outline',
      buttons: [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.remove'), style: 'destructive', onPress: removeSelectedArticles },
      ],
    });
  };

  // ---- Swipes (Settings, Feeds): what each does, and Undo for what can be undone

  const showToast = (message, onUndo) => setToast({ id: Date.now() + Math.random(), message, onUndo });

  // A swiped-away article goes for good
  const commitRemoval = (id) => {
    const timer = removalTimers.current.get(id);
    if (timer === undefined) return;
    clearTimeout(timer);
    removalTimers.current.delete(id);
    removeKeepingPosition(new Set([id]), fullListRef.current).finally(() => {
      setPendingRemovals((prev) => {
        if (!prev.has(id)) return prev;
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    });
  };
  const commitRemovalRef = useRef(commitRemoval);
  commitRemovalRef.current = commitRemoval;

  const undoRemoval = (id) => {
    const timer = removalTimers.current.get(id);
    if (timer === undefined) return;
    clearTimeout(timer);
    removalTimers.current.delete(id);
    setPendingRemovals((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  // Out of the list now, gone for good once Undo has had its few seconds.
  // One waits at a time: an earlier one goes through first.
  const removeWithUndo = (article) => {
    Array.from(removalTimers.current.keys()).forEach((id) => commitRemoval(id));
    setPendingRemovals((prev) => new Set(prev).add(article.id));
    removalTimers.current.set(article.id, setTimeout(() => commitRemovalRef.current(article.id), REMOVE_UNDO_MS));
    showToast(t('swipe.removedToast'), () => undoRemoval(article.id));
  };

  // Whatever is still waiting goes through when the list goes
  useEffect(() => () => {
    Array.from(removalTimers.current.keys()).forEach((id) => commitRemovalRef.current(id));
  }, []);

  const handleSwipeAction = (action, article) => {
    switch (action) {
      case 'read': {
        const toRead = !article.isRead;
        const apply = (read) => (read
          ? markArticleRead(article.id, articleFilter, sortOrder)
          : markArticleUnread(article.id, articleFilter, sortOrder));
        apply(toRead);
        // When the row leaves the list (only unread, or only read, shown), say so, with Undo
        if ((toRead && articleFilter === 'unread') || (!toRead && articleFilter === 'read')) {
          showToast(t(toRead ? 'swipe.markedReadToast' : 'swipe.markedUnreadToast'), () => apply(!toRead));
        }
        break;
      }
      case 'save': {
        const { isInReadLater: isSaved, articles: savedNow, removeFromReadLater, addToReadLater, updateReadLaterArticle } = readLaterRef.current;
        if (isSaved(article.id)) {
          const copy = savedNow.find((a) => a.id === article.id);
          removeFromReadLater(article.id);
          showToast(t('swipe.unsavedToast'), copy ? () => readLaterRef.current.addToReadLater(copy) : undefined);
        } else {
          addToReadLater(article);
          showToast(t('swipe.savedToast'));
          // The page's text, for reading offline, follows once it arrives
          withOfflineContent(article)
            .then((full) => updateReadLaterArticle(article.id, offlineFields(full)))
            .catch(() => {});
        }
        break;
      }
      case 'share':
        handleShare(article);
        break;
      case 'remove':
        removeWithUndo(article);
        break;
      default:
        break;
    }
  };

  const renderArticle = ({ item, index }) => {
    // Check if this article is before the reading position
    const isBeforeReadingPosition = readingPosition && 
      readingPosition.afterArticleId && 
      (() => {
        const readingPositionIndex = filteredAndSortedArticles.findIndex(article => article.id === readingPosition.afterArticleId);
        return readingPositionIndex !== -1 && index <= readingPositionIndex;
      })();
    
    // Check if reading position line should appear after this article
    const showReadingPositionAfter = readingPosition && 
      readingPosition.afterArticleId === item.id;
    
    const isSelected = selectedArticles.has(item.id);
    const isFirst = index === 0;
    const isLast = index === filteredAndSortedArticles.length - 1;
    // The reading position line sits between rows and is their divider; a
    // hairline takes its place when the line is off or articles are selected.
    const showIndicator = showReadingPositionInFeeds && !selectionMode;
    // Read articles step back: a quieter row, lighter words and a black and
    // white picture (Settings, Feeds). Unread ones keep their color, with a
    // bold title and the accent dot.
    const dimmed = dimReadArticles && item.isRead;
    const rowColor = dimmed ? readRow : theme.colors.surface;

    return (
      <View style={[styles.item, dimmed && { backgroundColor: readRow }, isFirst && styles.itemFirst, isLast && styles.itemLast]}>
        <SwipeRow
          enabled={!selectionMode}
          rightAction={swipeRightAction}
          leftAction={swipeLeftAction}
          isRead={!!item.isRead}
          isSaved={isInReadLater(item.id)}
          onAction={(action) => handleSwipeAction(action, item)}
          rowColor={rowColor}
          style={[isFirst && styles.articleItemFirst, isLast && !showIndicator && styles.articleItemLast]}
        >
          <TouchableOpacity
            style={[
              styles.articleItem,
              isFirst && styles.articleItemFirst,
              isLast && !showIndicator && styles.articleItemLast,
              isBeforeReadingPosition && styles.readPositionArticle,
              isSelected && styles.selectedArticle
            ]}
            onPress={() => selectionMode ? toggleArticleSelection(item.id) : handleArticlePress(item)}
            onLongPress={() => {
              if (!selectionMode) {
                setSelectionMode(true);
                toggleArticleSelection(item.id);
              }
            }}
            delayLongPress={300}
          >
            {selectionMode && (
              <View style={styles.selectionCheckbox}>
                <Ionicons 
                  name={isSelected ? "checkmark-circle" : "ellipse-outline"} 
                  size={28} 
                  color={isSelected ? theme.colors.mainInk : theme.colors.outline} 
                />
              </View>
            )}
            <View style={styles.articleContent}>
              <View style={styles.articleHeader}>
                <View style={styles.titleRow}>
                  {!item.isRead && (
                    <View style={styles.unreadBullet} />
                  )}
                  <Text style={[styles.feedTitle, dimmed && styles.feedTitleRead]} numberOfLines={1}>
                    {item.feedTitle}
                  </Text>
                </View>
                <View style={styles.articleMeta}>
                  <Text style={styles.articleDate}>
                    {formatDate(item.publishedDate)}
                  </Text>
                </View>
              </View>
              
              <Text
                style={[styles.articleTitle, item.isRead ? dimmed && styles.articleTitleRead : styles.articleTitleUnread]}
                numberOfLines={3}
              >
                {item.title}
              </Text>
              
              {item.description && (
                <Text style={styles.articleDescription} numberOfLines={2}>
                  {item.description}
                </Text>
              )}
            </View>
            
            {showImages && !selectionMode && (
              <View style={styles.imageContainer}>
                <View style={dimmed ? styles.imageRead : null}>
                  {item.imageUrl ? (
                    <ArticleImage
                      uri={item.imageUrl}
                      style={styles.articleImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.articleImage, styles.placeholderImage]}>
                      <Ionicons name="image-outline" size={32} color={theme.colors.textSecondary} />
                    </View>
                  )}
                </View>
                <View style={styles.imageActions}>
                  <TouchableOpacity
                    style={styles.imageActionButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleShare(item);
                    }}
                  >
                    <Ionicons name="share-outline" size={20} color={theme.colors.text} />
                  </TouchableOpacity>
                  <SaveButton 
                    article={item} 
                    size={20}
                    variant="simple"
                    style={styles.imageActionButton}
                  />
                </View>
              </View>
            )}
          </TouchableOpacity>
        </SwipeRow>

        <View ref={index === 0 ? tourReadingPositionRef : undefined} collapsable={index !== 0}>
        {/* Show reading position line after this article if it matches */}
        {showReadingPositionInFeeds && showReadingPositionAfter && !selectionMode && (
          <ReadingPositionIndicator
            onPress={handleGoToReadingPosition}
            onClear={handleClearReadingPosition}
            isActive={true}
          />
        )}

        {/* Show potential reading position lines between articles */}
        {showReadingPositionInFeeds && !showReadingPositionAfter && !selectionMode && (
          <ReadingPositionIndicator
            onPress={() => handleSetReadingPosition(index)}
            onMarkAbove={() => handleMarkAboveRead(index)}
            onClear={() => {}}
            isActive={false}
            positionLabel={t('feedList.setPositionHere')}
            markAboveLabel={t('feedList.markAboveRead')}
          />
        )}
        </View>
        {!showIndicator && !isLast && <View style={styles.rowDivider} />}
      </View>
    );
  };

  // v1.1.5: Helper to filter articles by age (same logic as in rssParser)
  const filterByAge = (articleList) => {
    if (!maxArticleAge || maxArticleAge <= 0) return articleList;
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - maxArticleAge);
    return articleList.filter(article => {
      if (!article.publishedDate) return true;
      const pubDate = new Date(article.publishedDate);
      if (isNaN(pubDate.getTime())) return true;
      return pubDate >= cutoff;
    });
  };

  // ---- What the list shows: the age limit, read or unread, the filter
  // (config/feedFilter), the search, then the order

  // What the "show only" choices check against
  const filterContext = React.useMemo(() => ({
    savedIds: new Set(savedArticles.map((a) => a.id)),
    noteIds: new Set(Object.keys(notes || {}).filter((id) => notes[id]?.text?.trim())),
    starredUrls: new Set(feeds.filter((f) => f.isPriority).map((f) => f.url)),
    since: publishedSince(feedFilter.published),
  }), [savedArticles, notes, feeds, feedFilter.published]);

  const byStatus = (list, status) =>
    status === 'unread' ? list.filter((a) => !a.isRead)
      : status === 'read' ? list.filter((a) => a.isRead)
        : list;

  // Hidden feeds (eye toggle on the Add Feed screen) stay subscribed but out of
  // the list, unless the filter picks them. The age filter applies first.
  const allArticles = Array.isArray(articles) ? articles : [];
  const hiddenFeedUrls = new Set(feeds.filter((f) => f.isHidden).map((f) => f.url));
  const ageFiltered = filterByAge(
    hiddenFeedUrls.size > 0
      ? allArticles.filter((a) => !hiddenFeedUrls.has(a.feedUrl) || feedFilter.feeds.includes(a.feedUrl))
      : allArticles
  );
  // The filter without read or unread: what the counts on the button read
  const filteredAnyStatus = ageFiltered.filter((a) => passesFeedFilter(a, feedFilter, filterContext));
  // An article swiped away is already out of the counts while Undo shows
  const countable = pendingRemovals.size > 0
    ? filteredAnyStatus.filter((a) => !pendingRemovals.has(a.id))
    : filteredAnyStatus;
  const statusCounts = {
    all: countable.length,
    unread: countable.filter((a) => !a.isRead).length,
    read: countable.filter((a) => a.isRead).length,
  };
  const filterCount = feedFilterCount(feedFilter);
  // Read All and Unread All work on the list as shown once it is narrowed
  const narrowed = filterCount > 0 || searchQuery.trim().length > 0;

  const getFilteredArticles = () => {
    let filtered = byStatus(filteredAnyStatus, articleFilter);

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(article =>
        (article.title && article.title.toLowerCase().includes(query)) ||
        (article.description && article.description.toLowerCase().includes(query)) ||
        (article.feedTitle && article.feedTitle.toLowerCase().includes(query))
      );
    }

    // Sort articles. Unparseable dates fall back to 0 (as everywhere else in
    // the app) and ties break on a stable key, so the order is deterministic
    // and can't reshuffle when the list re-renders after reading an article.
    // A copy: the sort must never change the articles state array.
    const timeOf = (article) => {
      const t = new Date(article.publishedDate || 0).getTime();
      return Number.isNaN(t) ? 0 : t;
    };
    const direction = sortOrder === 'newest' ? -1 : 1;
    const sortedArticles = [...filtered].sort((a, b) => {
      const diff = timeOf(a) - timeOf(b);
      if (diff !== 0) return direction * diff;
      return String(a.id ?? '').localeCompare(String(b.id ?? ''));
    });

    // Priority feeds: articles from pinned feeds appear at the top
    const priorityFeedUrls = new Set(feeds.filter(f => f.isPriority).map(f => f.url));
    if (priorityFeedUrls.size > 0) {
      const priorityArticles = sortedArticles.filter(a => priorityFeedUrls.has(a.feedUrl));
      const regularArticles = sortedArticles.filter(a => !priorityFeedUrls.has(a.feedUrl));
      return [...priorityArticles, ...regularArticles];
    }
    return sortedArticles;
  };

  const fullList = getFilteredArticles();
  fullListRef.current = fullList;
  // Swiped-away articles leave at once; Undo brings them back
  const filteredAndSortedArticles = pendingRemovals.size > 0
    ? fullList.filter((a) => !pendingRemovals.has(a.id))
    : fullList;
  const readRow = readRowColor(theme.colors);
  // Stable identity so FlatList only re-renders cells when something real changes.
  const listExtraData = React.useMemo(
    () => [articles, articleFilter, sortOrder, readingPosition?.afterArticleId, dimReadArticles, swipeRightAction, swipeLeftAction, savedArticles, readRow],
    [articles, articleFilter, sortOrder, readingPosition?.afterArticleId, dimReadArticles, swipeRightAction, swipeLeftAction, savedArticles, readRow]
  );

  // How many articles each choice in the filter sheet would bring, with the
  // rest of the filter as it is: worked out only while the sheet is open
  const getSheetCounts = () => {
    const sinceOf = Object.fromEntries(PUBLISHED_RANGES.map((range) => [range, publishedSince(range)]));
    const withoutOnly = Object.fromEntries(ONLY_CHOICES.map((choice) => [
      choice,
      { ...feedFilter, only: feedFilter.only.filter((c) => c !== choice) },
    ]));
    const published = { today: 0, week: 0, month: 0 };
    const only = { saved: 0, notes: 0, starred: 0, images: 0 };
    const perFeed = new Map();
    // What each choice has with nothing else picked: the choices on show stay
    // the same while picking, so nothing moves under the finger
    const publishedAll = { today: 0, week: 0, month: 0 };
    const onlyAll = { saved: 0, notes: 0, starred: 0, images: 0 };
    const perFeedAll = new Map();
    // Hidden feeds can be picked here, so they count too
    const inStatus = byStatus(filterByAge(allArticles), articleFilter);
    for (const a of inStatus) {
      const hidden = hiddenFeedUrls.has(a.feedUrl);
      perFeedAll.set(a.feedUrl, (perFeedAll.get(a.feedUrl) || 0) + 1);
      if (passesFeedFilter(a, feedFilter, filterContext, 'feeds')) {
        perFeed.set(a.feedUrl, (perFeed.get(a.feedUrl) || 0) + 1);
      }
      if (hidden && !feedFilter.feeds.includes(a.feedUrl)) continue;
      const time = new Date(a.publishedDate || 0).getTime();
      const inRange = (range) => !Number.isNaN(time) && time >= sinceOf[range];
      for (const range of PUBLISHED_RANGES) if (inRange(range)) publishedAll[range] += 1;
      if (passesFeedFilter(a, feedFilter, filterContext, 'published')) {
        for (const range of PUBLISHED_RANGES) if (inRange(range)) published[range] += 1;
      }
      for (const choice of ONLY_CHOICES) {
        if (!passesOnly(a, choice, filterContext)) continue;
        onlyAll[choice] += 1;
        if (passesFeedFilter(a, withoutOnly[choice], filterContext)) only[choice] += 1;
      }
    }
    const feedList = feeds
      .map((feed) => ({
        url: feed.url,
        title: feed.title,
        isHidden: !!feed.isHidden,
        count: perFeed.get(feed.url) || 0,
        total: perFeedAll.get(feed.url) || 0,
      }))
      .sort((x, y) => (x.title || x.url).localeCompare(y.title || y.url));
    return {
      status: statusCounts,
      published,
      publishedAll,
      only,
      onlyAll,
      feeds: feedList,
      matching: filteredAndSortedArticles.length,
    };
  };

  // The filter in a few words, for the bar under the search field
  const filterSummary = () => {
    const parts = [];
    if (feedFilter.feeds.length > 0) {
      const names = feedFilter.feeds.map((url) => feeds.find((f) => f.url === url)?.title || url);
      parts.push(names.length > 2 ? `${names.slice(0, 2).join(', ')} +${formatNumber(names.length - 2)}` : names.join(', '));
    }
    if (feedFilter.published !== 'any') parts.push(t(publishedLabelKey(feedFilter.published)));
    feedFilter.only.forEach((choice) => parts.push(t(onlyLabelKey(choice))));
    return parts.join(' · ');
  };

  const toggleSort = () => {
    updateSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest');
  };

  const getFilterButtonText = () => {
    switch (articleFilter) {
      case 'unread':
        return t('feedList.filterUnread', { count: formatNumber(statusCounts.unread) });
      case 'read':
        return t('feedList.filterRead', { count: formatNumber(statusCounts.read) });
      default:
        return t('feedList.filterAllCount', { count: formatNumber(statusCounts.all) });
    }
  };

  const getSortButtonIcon = () => {
    return sortOrder === 'newest' ? 'arrow-down' : 'arrow-up';
  };

  const styles = useFeedListStyles(isRTL);

  if (feeds.length === 0) {
    return (
      <SafeAreaView edges={["top", "left", "right"]} style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>FeedWell</Text>
          <TouchableOpacity
            ref={tourAddRef}
            style={styles.addButton}
            onPress={() => navigation.navigate('AddFeed')}
          >
            <Ionicons name="add" size={24} color={theme.colors.mainInk} />
          </TouchableOpacity>
        </View>
        
        <View style={styles.emptyState}>
          <Ionicons name="newspaper-outline" size={100} color={theme.colors.outline} />
          <Text style={styles.emptyTitle}>{t('feedList.welcomeTitle')}</Text>
          <Text style={styles.emptyDescription}>
            {t('feedList.welcomeDescription')}
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.navigate('AddFeed')}
          >
            <Ionicons name="add-circle-outline" size={20} color={theme.colors.onPrimary} />
            <Text style={styles.primaryButtonText}>{t('feedList.addFirstFeed')}</Text>
          </TouchableOpacity>

          <View style={styles.featuresContainer}>
            <View style={styles.featureItem}>
              <Ionicons name="shield-checkmark-outline" size={24} color={theme.colors.accentInk} />
              <Text style={styles.featureText}>{t('feedList.featureAdFree')}</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="reader-outline" size={24} color={theme.colors.accentInk} />
              <Text style={styles.featureText}>{t('feedList.featureReaderMode')}</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="share-outline" size={24} color={theme.colors.accentInk} />
              <Text style={styles.featureText}>{t('feedList.featureSharing')}</Text>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
    <SafeAreaView edges={["top", "left", "right"]} style={styles.container}>
      <View style={styles.header}>
        {selectionMode ? (
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={selectAllArticles}
            >
              <Ionicons name="checkbox" size={20} color={theme.colors.text} />
              <Text style={styles.headerButtonLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{t('feedList.selectAll')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={deselectAllArticles}
            >
              <Ionicons name="square-outline" size={20} color={theme.colors.text} />
              <Text style={styles.headerButtonLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{t('feedList.selectNone')}</Text>
            </TouchableOpacity>
            {(() => {
              // Check if selection contains any unread articles
              const hasUnread = Array.from(selectedArticles).some(id => {
                const article = filteredAndSortedArticles.find(a => a.id === id);
                return article && !article.isRead;
              });
              // Check if selection contains any read articles
              const hasRead = Array.from(selectedArticles).some(id => {
                const article = filteredAndSortedArticles.find(a => a.id === id);
                return article && article.isRead;
              });
              
              const showMarkRead = articleFilter === 'all' || hasUnread;
              const showMarkUnread = articleFilter === 'all' || hasRead;
              
              return (
                <>
                  {showMarkRead && (
                    <TouchableOpacity
                      style={styles.headerButton}
                      onPress={markSelectedAsRead}
                      disabled={selectedArticles.size === 0 || !hasUnread}
                    >
                      <Ionicons name="mail-open-outline" size={20} color={selectedArticles.size === 0 || !hasUnread ? theme.colors.disabled : theme.colors.text} />
                      <Text style={[styles.headerButtonLabel, { color: selectedArticles.size === 0 || !hasUnread ? theme.colors.disabled : theme.colors.textSecondaryOnWash }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{t('feedList.markReadLabel')}</Text>
                    </TouchableOpacity>
                  )}
                  {showMarkUnread && (
                    <TouchableOpacity
                      style={styles.headerButton}
                      onPress={markSelectedAsUnread}
                      disabled={selectedArticles.size === 0 || !hasRead}
                    >
                      <Ionicons name="mail-unread-outline" size={20} color={selectedArticles.size === 0 || !hasRead ? theme.colors.disabled : theme.colors.text} />
                      <Text style={[styles.headerButtonLabel, { color: selectedArticles.size === 0 || !hasRead ? theme.colors.disabled : theme.colors.textSecondaryOnWash }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{t('feedList.markUnreadLabel')}</Text>
                    </TouchableOpacity>
                  )}
                </>
              );
            })()}
            <TouchableOpacity
              style={styles.headerButton}
              onPress={confirmRemoveSelected}
              disabled={selectedArticles.size === 0}
            >
              <Ionicons name="trash-outline" size={20} color={selectedArticles.size === 0 ? theme.colors.disabled : theme.colors.error} />
              <Text style={[styles.headerButtonLabel, { color: selectedArticles.size === 0 ? theme.colors.disabled : theme.colors.textSecondaryOnWash }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{t('common.remove')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={toggleSelectionMode}
            >
              <Ionicons name="close" size={20} color={theme.colors.text} />
              <Text style={styles.headerButtonLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{t('common.cancel')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.headerRightGroup}>
            <TouchableOpacity
              ref={tourFilterRef}
              style={[styles.filterPill, styles.filterButton, filterCount > 0 && styles.filterButtonOn]}
              onPress={() => setFilterSheetVisible(true)}
              accessibilityLabel={t('feedFilter.title')}
            >
              <Text style={styles.filterButtonText}>{getFilterButtonText()}</Text>
              {filterCount > 0 && (
                <View style={styles.filterBadge}>
                  <Text style={styles.filterBadgeText}>{formatNumber(filterCount)}</Text>
                </View>
              )}
              <Ionicons name="chevron-down" size={14} color={theme.colors.textSecondary} />
            </TouchableOpacity>
            <View style={styles.headerButtons}>
              <TouchableOpacity
                ref={tourSoundsRef}
                style={styles.headerButton}
                onPress={() => openSoundPlaylist(true)}
              >
                <Ionicons name="musical-notes-outline" size={20} color={theme.colors.text} />
                <Text style={styles.headerButtonLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{t('feedList.soundsLabel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                ref={tourSortRef}
                style={styles.headerButton}
                onPress={toggleSort}
              >
                <Ionicons name={getSortButtonIcon()} size={20} color={theme.colors.text} />
                <Text style={styles.headerButtonLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{t('feedList.sortLabel')}</Text>
              </TouchableOpacity>
              {articleFilter !== 'read' && (
                <TouchableOpacity
                  ref={tourReadAllRef}
                  style={styles.headerButton}
                  onPress={handleMarkAllRead}
                >
                  <Ionicons name="checkmark-done" size={20} color={theme.colors.text} />
                  <Text style={styles.headerButtonLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{t('feedList.readAllLabel')}</Text>
                </TouchableOpacity>
              )}
              {articleFilter !== 'unread' && (
                <TouchableOpacity
                  style={styles.headerButton}
                  onPress={handleMarkAllUnread}
                >
                  <Ionicons name="mail-unread-outline" size={20} color={theme.colors.text} />
                  <Text style={styles.headerButtonLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{t('feedList.unreadAllLabel')}</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                ref={tourAddRef}
                style={styles.addButton}
                onPress={() => navigation.navigate('AddFeed')}
              >
                <Ionicons name="add" size={20} color={theme.colors.text} />
                <Text style={styles.headerButtonLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{t('common.add')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Search Bar */}
      <View ref={tourSearchRef} collapsable={false} style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={theme.colors.textSecondary} style={styles.searchIcon} />
        <TextInput
          ref={searchInputRef}
          style={styles.searchInput}
          placeholder={t('feedList.searchPlaceholder')}
          placeholderTextColor={theme.colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearSearch}>
            <Ionicons name="close-circle" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* What the filter keeps (a feed picked on Home is one): a tap opens
          the filter, the X shows everything again */}
      {filterCount > 0 && (
        <View style={styles.sourceBar}>
          <Ionicons name="filter-outline" size={16} color={theme.colors.accentInk} />
          <TouchableOpacity style={styles.sourceBarTap} onPress={() => setFilterSheetVisible(true)}>
            <Text style={styles.sourceBarText} numberOfLines={1}>{filterSummary()}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => updateFeedFilter(EMPTY_FEED_FILTER)}
            accessibilityLabel={t('feedFilter.clear')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close-circle" size={20} color={theme.colors.accentInk} />
          </TouchableOpacity>
        </View>
      )}

      {loading && !refreshing && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.mainInk} />
          <Text style={styles.loadingText}>{t('feedList.loadingArticles')}</Text>
        </View>
      )}

      <FlatList
        ref={flatListRef}
        data={filteredAndSortedArticles}
        renderItem={renderArticle}
        keyExtractor={(item) => item.id}
        onScrollToIndexFailed={handleScrollToIndexFailed}
        onScroll={(e) => { listOffsetRef.current = e.nativeEvent.contentOffset.y; }}
        scrollEventThrottle={16}
        onScrollBeginDrag={autoScroll.onScrollBeginDrag}
        onTouchStart={autoScroll.onTouchStart}
        onTouchMove={autoScroll.onTouchMove}
        onTouchEnd={autoScroll.onTouchEnd}
        onScrollEndDrag={autoScroll.onScrollEndDrag}
        onMomentumScrollEnd={autoScroll.onMomentumScrollEnd}
        onTouchCancel={autoScroll.onTouchCancel}
        onContentSizeChange={(w, h) => { listContentHeightRef.current = h; }}
        onLayout={(e) => { listViewportHeightRef.current = e.nativeEvent.layout.height; }}
        extraData={listExtraData}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.mainInk}
            colors={[theme.colors.mainInk]}
            progressBackgroundColor={theme.colors.surface}
          />
        }
        contentContainerStyle={filteredAndSortedArticles.length === 0 ? styles.emptyList : styles.listContent}
        ListEmptyComponent={
          !loading && (filterCount > 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="filter-outline" size={60} color={theme.colors.outline} />
              <Text style={styles.emptyTitle}>{t('feedFilter.noMatchTitle')}</Text>
              <Text style={styles.emptyDescription}>{t('feedFilter.noMatchBody')}</Text>
              <TouchableOpacity style={styles.clearFiltersButton} onPress={() => updateFeedFilter(EMPTY_FEED_FILTER)}>
                <Text style={styles.clearFiltersText}>{t('feedFilter.clear')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="refresh-outline" size={60} color={theme.colors.outline} />
              <Text style={styles.emptyTitle}>
                {articleFilter === 'unread' ? t('feedList.emptyUnreadTitle') :
                 articleFilter === 'read' ? t('feedList.emptyReadTitle') : t('feedList.emptyAllTitle')}
              </Text>
              <Text style={styles.emptyDescription}>
                {articleFilter === 'unread' ? t('feedList.emptyUnreadDescription') :
                 articleFilter === 'read' ? t('feedList.emptyReadDescription') :
                 t('feedList.emptyAllDescription')}
              </Text>
            </View>
          ))
        }
      />

      <UndoToast toast={toast} onHide={(id) => setToast((current) => (current && current.id === id ? null : current))} />

      <FeedFilterSheet
        visible={filterSheetVisible}
        onClose={() => setFilterSheetVisible(false)}
        status={articleFilter}
        onStatusChange={updateArticleFilter}
        filter={feedFilter}
        onFilterChange={updateFeedFilter}
        counts={filterSheetVisible ? getSheetCounts() : EMPTY_SHEET_COUNTS}
      />

      {/* Custom themed alert dialog */}
      <CustomAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        icon={alertConfig.icon}
        buttons={alertConfig.buttons}
        onDismiss={() => setAlertConfig(prev => ({ ...prev, visible: false }))}
      />
    </SafeAreaView>
    </GestureHandlerRootView>
  );
}

// The filter sheet's counts while it is closed (it isn't drawn then)
const EMPTY_SHEET_COUNTS = {
  status: { all: 0, unread: 0, read: 0 },
  published: { today: 0, week: 0, month: 0 },
  publishedAll: { today: 0, week: 0, month: 0 },
  only: { saved: 0, notes: 0, starred: 0, images: 0 },
  onlyAll: { saved: 0, notes: 0, starred: 0, images: 0 },
  feeds: [],
  matching: 0,
};

// Styles built once per theme and direction (Calm Surfaces 3). The list is one
// card made of its rows: each row on the surface, the first and last with the
// card's round corners, so virtualization stays exactly as it was.
const useFeedListStyles = makeStyles(({ colors: c }, isRTL) => {
  const row = isRTL ? 'row-reverse' : 'row';
  const textAlign = isRTL ? 'right' : 'left';
  const writingDirection = isRTL ? 'rtl' : 'ltr';
  const startSide = isRTL ? 'Right' : 'Left';
  return {
    container: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    header: {
      flexDirection: row,
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 4,
    },
    headerTitle: {
      ...TYPE.screenTitle,
      color: c.text,
      textAlign,
      writingDirection,
    },
    addButton: {
      flexShrink: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 6,
      paddingVertical: 4,
      minWidth: 44,
      minHeight: 44,
    },
    headerRightGroup: {
      flexDirection: row,
      alignItems: 'center',
      flex: 1,
      justifyContent: 'space-between',
      gap: 8,
    },
    filterPill: {
      marginRight: isRTL ? 0 : 8,
      marginLeft: isRTL ? 8 : 0,
    },
    headerButtons: {
      flexDirection: row,
      alignItems: 'center',
      flexShrink: 1,
    },
    headerButton: {
      flexShrink: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 6,
      paddingVertical: 4,
      minWidth: 44,
      minHeight: 44,
    },
    // Straight on the wash, so in the tone that reads on its glows
    headerButtonLabel: {
      fontFamily: FONT.medium,
      fontSize: 10,
      marginTop: 2,
      color: c.textSecondaryOnWash,
    },
    filterButtonText: {
      ...TYPE.label,
      color: c.text,
    },
    filterButtonOn: {
      backgroundColor: c.mainTint,
      borderColor: c.mainTint,
    },
    // How many filter choices are on
    filterBadge: {
      minWidth: 18,
      height: 18,
      paddingHorizontal: 4,
      borderRadius: 9,
      backgroundColor: c.accentFill,
      alignItems: 'center',
      justifyContent: 'center',
    },
    filterBadgeText: {
      ...TYPE.count,
      fontSize: 10.5,
      lineHeight: 13,
      color: c.onAccentFill,
    },
    sourceBarTap: {
      flex: 1,
      justifyContent: 'center',
      minHeight: 40,
    },
    clearFiltersButton: {
      minHeight: 44,
      justifyContent: 'center',
      paddingHorizontal: 22,
      borderRadius: RADIUS.round,
      backgroundColor: c.mainTint,
    },
    clearFiltersText: {
      ...TYPE.button,
      color: c.mainInk,
    },
    filterButton: {
      flexDirection: row,
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 14,
      minHeight: 38,
      backgroundColor: c.surface,
      borderRadius: RADIUS.round,
      borderWidth: 1,
      borderColor: c.border,
    },
    searchContainer: {
      flexDirection: row,
      alignItems: 'center',
      backgroundColor: c.surface,
      marginHorizontal: 16,
      marginVertical: 8,
      paddingHorizontal: 16,
      minHeight: 48,
      borderRadius: RADIUS.round,
      borderWidth: 1,
      borderColor: c.border,
    },
    sourceBar: {
      flexDirection: row,
      alignItems: 'center',
      gap: 8,
      marginHorizontal: 16,
      marginBottom: 8,
      paddingHorizontal: 14,
      minHeight: 40,
      borderRadius: RADIUS.round,
      backgroundColor: c.accentTint,
    },
    sourceBarText: {
      fontFamily: FONT.semiBold,
      fontSize: 14,
      color: c.accentInk,
      textAlign,
    },
    searchIcon: {
      marginRight: isRTL ? 0 : 8,
      marginLeft: isRTL ? 8 : 0,
    },
    searchInput: {
      flex: 1,
      ...TYPE.body,
      fontSize: 15,
      color: c.text,
      paddingVertical: 8,
      textAlign,
      writingDirection,
    },
    clearSearch: {
      padding: 4,
    },
    listContent: {
      paddingTop: 4,
    },
    // A row of the list's card. Rows overlap by a pixel: FlatList places each
    // row on the pixel grid apart from its height, which can leave a one-pixel
    // gap between two rows where the page shows through.
    item: {
      backgroundColor: c.surface,
      marginHorizontal: 16,
      paddingBottom: StyleSheet.hairlineWidth,
      marginBottom: -StyleSheet.hairlineWidth,
      ...(c.amoled ? { borderLeftWidth: 1, borderRightWidth: 1, borderColor: c.cardBorder } : null),
    },
    // The first and last rows round the card's corners. Their touchable rows
    // round themselves too, so a selected row's tint keeps the corners
    // without clipping (a clipped edge shows a faint seam on Android).
    itemFirst: {
      borderTopLeftRadius: RADIUS.card,
      borderTopRightRadius: RADIUS.card,
      ...(c.amoled ? { borderTopWidth: 1 } : null),
    },
    itemLast: {
      borderBottomLeftRadius: RADIUS.card,
      borderBottomRightRadius: RADIUS.card,
      marginBottom: 16,
      ...(c.amoled ? { borderBottomWidth: 1 } : null),
    },
    articleItemFirst: {
      borderTopLeftRadius: RADIUS.card,
      borderTopRightRadius: RADIUS.card,
    },
    articleItemLast: {
      borderBottomLeftRadius: RADIUS.card,
      borderBottomRightRadius: RADIUS.card,
    },
    rowDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: c.border,
      marginHorizontal: 16,
    },
    articleItem: {
      padding: 16,
      flexDirection: row,
      alignItems: 'flex-start',
    },
    articleContent: {
      flex: 1,
      marginRight: isRTL ? 0 : 12,
      marginLeft: isRTL ? 12 : 0,
    },
    articleHeader: {
      flexDirection: row,
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 6,
    },
    titleRow: {
      flexDirection: row,
      alignItems: 'center',
      flex: 1,
    },
    // Unread is what to notice: the accent
    unreadBullet: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: c.accentFill,
      marginRight: isRTL ? 0 : 8,
      marginLeft: isRTL ? 8 : 0,
    },
    feedTitle: {
      fontFamily: FONT.semiBold,
      fontSize: 12.5,
      color: c.mainInk,
      flex: 1,
      textAlign,
      writingDirection,
    },
    articleMeta: {
      flexDirection: row,
      alignItems: 'center',
      gap: 8,
    },
    articleDate: {
      ...TYPE.secondary,
      color: c.textSecondary,
    },
    feedTitleRead: {
      color: c.textSecondary,
    },
    readPositionArticle: {
      opacity: 0.7,
      [`border${startSide}Width`]: 3,
      [`border${startSide}Color`]: c.accentInk,
    },
    articleTitle: {
      ...TYPE.rowTitle,
      color: c.text,
      marginBottom: 4,
      lineHeight: 20,
      textAlign,
      writingDirection,
    },
    articleTitleUnread: {
      fontFamily: FONT.bold,
    },
    articleTitleRead: {
      fontFamily: FONT.medium,
      color: c.textSecondary,
    },
    articleDescription: {
      ...TYPE.body,
      fontSize: 13.5,
      color: c.textSecondary,
      lineHeight: 19,
      textAlign,
      writingDirection,
    },
    imageContainer: {
      marginLeft: isRTL ? 0 : 12,
      marginRight: isRTL ? 12 : 0,
    },
    articleImage: {
      width: 80,
      height: 80,
      borderRadius: 12,
      backgroundColor: c.surface2,
    },
    // A read article's picture: black and white, a little faded
    imageRead: {
      filter: 'grayscale(1)',
      opacity: 0.8,
    },
    placeholderImage: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    imageActions: {
      flexDirection: row,
      justifyContent: 'space-around',
      alignItems: 'center',
      marginTop: 4,
      gap: 4,
    },
    imageActionButton: {
      padding: 4,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 32,
    },
    emptyList: {
      flexGrow: 1,
    },
    emptyTitle: {
      ...TYPE.title,
      fontSize: 20,
      color: c.text,
      marginTop: 16,
      marginBottom: 8,
      textAlign: 'center',
    },
    emptyDescription: {
      ...TYPE.body,
      fontSize: 15,
      color: c.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
      marginBottom: 24,
    },
    primaryButton: {
      flexDirection: row,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.primary,
      paddingHorizontal: 24,
      minHeight: 46,
      borderRadius: RADIUS.round,
      marginBottom: 32,
      gap: 8,
    },
    primaryButtonText: {
      ...TYPE.button,
      fontSize: 15,
      color: c.onPrimary,
    },
    featuresContainer: {
      flexDirection: row,
      justifyContent: 'space-around',
      width: '100%',
      paddingHorizontal: 20,
    },
    featureItem: {
      alignItems: 'center',
      flex: 1,
    },
    featureText: {
      ...TYPE.secondary,
      color: c.textSecondary,
      marginTop: 8,
      textAlign: 'center',
    },
    loadingContainer: {
      padding: 20,
      alignItems: 'center',
    },
    loadingText: {
      ...TYPE.secondary,
      marginTop: 10,
      color: c.textSecondary,
    },
    selectionCheckbox: {
      width: 28,
      height: 28,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: isRTL ? 0 : 12,
      marginLeft: isRTL ? 12 : 0,
    },
    selectedArticle: {
      backgroundColor: c.mainTint,
      [`border${startSide}Width`]: 4,
      [`border${startSide}Color`]: c.primary,
    },
  };
});
