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

export default function FeedListScreen({ navigation, route }) {
  const { feeds, articles, loading, addArticles, setLoading, setError, markAllRead, markAllUnread, markArticlesRead, markArticlesUnread, markArticleRead, markArticleUnread, removeArticles, getUnreadCount, getReadCount, readingPosition, setReadingPosition, clearReadingPosition } = useFeed();
  const { theme } = useTheme();
  const { t, isRTL, formatNumber, language } = useTranslation();
  const { showImages, articleFilter, sortOrder, updateArticleFilter, updateSortOrder, maxArticleAge, skipArticleView, showReadingPositionInFeeds, autoScrollEnabled, autoScrollDelay, autoScrollSpeed, keepAwakeEnabled } = useAppSettings();
  const { setShowPlaylist: openSoundPlaylist } = useAmbientSound();
  const [refreshing, setRefreshing] = useState(false);
  const [forceRender, setForceRender] = useState(0);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedArticles, setSelectedArticles] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  // One source only, picked in Your Feeds on Home; null shows every feed.
  const [sourceFeedUrl, setSourceFeedUrl] = useState(null);
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

  // Home sets the source (or clears it, with null). sourceAt changes on every
  // tap, so picking the same feed again after closing its chip still applies.
  useEffect(() => {
    if (route?.params?.sourceAt) {
      setSourceFeedUrl(route.params.sourceFeedUrl || null);
    }
  }, [route?.params?.sourceAt]);

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
    // With one source picked, only its articles; otherwise all of them.
    const unreadIds = sourceFeedUrl ? scopedArticles.filter(a => !a.isRead).map(a => a.id) : null;
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
    const readIds = sourceFeedUrl ? scopedArticles.filter(a => a.isRead).map(a => a.id) : null;
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

  // Removes the selected articles from the list for good (a refresh won't bring
  // them back). If the reading position line sat under one of them, it moves up
  // to the nearest article that stays, or goes away when none is left above it.
  const removeSelectedArticles = async () => {
    const ids = new Set(selectedArticles);
    if (ids.size === 0) return;
    if (readingPosition?.afterArticleId && ids.has(readingPosition.afterArticleId)) {
      const anchorIndex = filteredAndSortedArticles.findIndex(a => a.id === readingPosition.afterArticleId);
      const above = filteredAndSortedArticles.slice(0, Math.max(anchorIndex, 0)).reverse().find(a => !ids.has(a.id));
      if (above) {
        await setReadingPosition(readingPosition.positionId, above.id);
      } else {
        await clearReadingPosition();
      }
    }
    await removeArticles(Array.from(ids));
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

    return (
      <View style={[styles.item, isFirst && styles.itemFirst, isLast && styles.itemLast]}>
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
                <Text style={styles.feedTitle} numberOfLines={1}>
                  {item.feedTitle}
                </Text>
              </View>
              <View style={styles.articleMeta}>
                <Text style={styles.articleDate}>
                  {formatDate(item.publishedDate)}
                </Text>
              </View>
            </View>
            
            <Text style={styles.articleTitle} numberOfLines={3}>
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

  // Filter articles based on read status and search query
  // The articles the counts and the mark-all actions work on: one source when
  // one is picked, otherwise all of them.
  const scopedArticles = sourceFeedUrl ? articles.filter(a => a.feedUrl === sourceFeedUrl) : articles;
  const sourceFeed = sourceFeedUrl ? (feeds.find(f => f.url === sourceFeedUrl) || { url: sourceFeedUrl }) : null;

  const getFilteredArticles = () => {
    if (!articles || !Array.isArray(articles)) {
      return [];
    }
    
    // Age filter first; the read-status filter then narrows THAT list.
    // (Before v1.13.0 every branch below overwrote the age-filtered list from
    // `articles`, so the Article Age Filter never applied to the visible list.)
    // Hidden feeds (eye toggle on the Add Feed screen) stay subscribed but
    // their articles are kept out of this list.
    const hiddenFeedUrls = new Set(feeds.filter(f => f.isHidden).map(f => f.url));
    const visible = hiddenFeedUrls.size > 0
      ? articles.filter(a => !hiddenFeedUrls.has(a.feedUrl))
      : articles;
    // A source picked on Home shows only its articles, even a hidden feed's.
    const ageFiltered = filterByAge(sourceFeedUrl ? scopedArticles : visible);

    // Apply read status filter
    let filtered;
    switch (articleFilter) {
      case 'unread':
        filtered = ageFiltered.filter(article => !article.isRead);
        break;
      case 'read':
        filtered = ageFiltered.filter(article => article.isRead);
        break;
      default:
        // Copy: the sort below must never mutate the articles state array.
        filtered = [...ageFiltered];
    }

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
    const timeOf = (article) => {
      const t = new Date(article.publishedDate || 0).getTime();
      return Number.isNaN(t) ? 0 : t;
    };
    const direction = sortOrder === 'newest' ? -1 : 1;
    const sortedArticles = filtered.sort((a, b) => {
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

  const filteredAndSortedArticles = getFilteredArticles();
  // Stable identity so FlatList only re-renders cells when something real changes.
  const listExtraData = React.useMemo(
    () => [articles, articleFilter, sortOrder, readingPosition?.afterArticleId],
    [articles, articleFilter, sortOrder, readingPosition?.afterArticleId]
  );

  const openFilterMenu = () => {
    setAlertConfig({
      visible: true,
      title: t('feedList.filterArticlesTitle'),
      message: t('feedList.filterArticlesMessage'),
      icon: 'filter-outline',
      buttons: [
        { text: articleFilter === 'all' ? t('feedList.filterAllCurrent') : t('feedList.filterAll'), onPress: () => updateArticleFilter('all') },
        { text: articleFilter === 'unread' ? t('feedList.filterUnreadCurrent', { count: formatNumber(getAgeFilteredUnreadCount()) }) : t('feedList.filterUnread', { count: formatNumber(getAgeFilteredUnreadCount()) }), onPress: () => updateArticleFilter('unread') },
        { text: articleFilter === 'read' ? t('feedList.filterReadCurrent', { count: formatNumber(getAgeFilteredReadCount()) }) : t('feedList.filterRead', { count: formatNumber(getAgeFilteredReadCount()) }), onPress: () => updateArticleFilter('read') },
        { text: t('common.cancel'), style: 'cancel' },
      ],
    });
  };

  const toggleSort = () => {
    updateSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest');
  };

  // v1.1.5: Age-aware counts for the header button
  const getAgeFilteredUnreadCount = () => {
    return filterByAge(scopedArticles).filter(a => !a.isRead).length;
  };
  const getAgeFilteredReadCount = () => {
    return filterByAge(scopedArticles).filter(a => a.isRead).length;
  };

  const getFilterButtonText = () => {
    switch (articleFilter) {
      case 'unread':
        return t('feedList.filterUnread', { count: formatNumber(getAgeFilteredUnreadCount()) });
      case 'read':
        return t('feedList.filterRead', { count: formatNumber(getAgeFilteredReadCount()) });
      default:
        return t('feedList.filterAllCount', { count: formatNumber(filterByAge(scopedArticles).length) });
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
              style={[styles.filterPill, styles.filterButton]}
              onPress={openFilterMenu}
            >
              <Text style={styles.filterButtonText}>{getFilterButtonText()}</Text>
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

      {/* One source only, picked in Your Feeds on Home. Closing the chip shows every feed again. */}
      {sourceFeed && (
        <View style={styles.sourceBar}>
          <Ionicons name="newspaper-outline" size={16} color={theme.colors.accentInk} />
          <Text style={styles.sourceBarText} numberOfLines={1}>{sourceFeed.title || sourceFeed.url}</Text>
          <TouchableOpacity
            onPress={() => setSourceFeedUrl(null)}
            accessibilityLabel={t('feedList.showAllFeeds')}
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
          !loading && (
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
          )
        }
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
  );
}

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
      flex: 1,
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
      width: 8,
      height: 8,
      borderRadius: 4,
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
