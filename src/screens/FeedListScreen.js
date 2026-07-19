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
import { useTheme } from '../context/ThemeContext';
import { useAppSettings } from '../context/AppSettingsContext';
import { parseRSSFeed } from '../utils/rssParser';
import ArticleImage from '../components/ArticleImage';
import SaveButton from '../components/SaveButton';
import ReadingPositionIndicator from '../components/ReadingPositionIndicator';
import CustomAlert from '../components/CustomAlert';
import { useAmbientSound } from '../context/AmbientSoundContext';
import { useTranslation } from '../context/LanguageContext';
import { formatRelativeDate } from '../utils/formatDate';

export default function FeedListScreen({ navigation, route }) {
  const { feeds, articles, loading, addArticles, setLoading, setError, markAllRead, markAllUnread, markArticleRead, markArticleUnread, getUnreadCount, getReadCount, readingPosition, setReadingPosition, clearReadingPosition } = useFeed();
  const { theme } = useTheme();
  const { t, isRTL, formatNumber, language } = useTranslation();
  const { showImages, articleFilter, sortOrder, updateArticleFilter, updateSortOrder, maxArticleAge, skipArticleView, showReadingPositionInFeeds } = useAppSettings();
  const { setShowPlaylist: openSoundPlaylist } = useAmbientSound();
  const [refreshing, setRefreshing] = useState(false);
  const [forceRender, setForceRender] = useState(0);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedArticles, setSelectedArticles] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const flatListRef = useRef(null);
  // Last measured average item length reported by the FlatList (via
  // onScrollToIndexFailed). Used instead of a hardcoded height estimate.
  const avgItemLengthRef = useRef(null);
  const [alertConfig, setAlertConfig] = useState({ visible: false, title: '', message: '', icon: null, buttons: [] });

  // Apply filter from navigation params (e.g., when clicking Unread from Home)
  useEffect(() => {
    if (route?.params?.filter) {
      updateArticleFilter(route.params.filter);
    }
  }, [route?.params?.filter]);

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
    }, [readingPosition, filteredAndSortedArticles])
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
    const unreadCount = getUnreadCount();
    if (unreadCount === 0) {
      setAlertConfig({ visible: true, title: t('feedList.infoTitle'), message: t('feedList.noUnreadToMark'), icon: 'checkmark-circle-outline', buttons: [{ text: t('common.ok') }] });
      return;
    }

    const confirmAction = () => {
      markAllRead();
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
    const readCount = getReadCount();
    if (readCount === 0) {
      setAlertConfig({ visible: true, title: t('feedList.infoTitle'), message: t('feedList.noReadToMark'), icon: 'information-circle-outline', buttons: [{ text: t('common.ok') }] });
      return;
    }

    const confirmAction = () => {
      markAllUnread();
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

  const handleSetReadingPosition = (articleIndex) => {
    const article = filteredAndSortedArticles[articleIndex];
    if (article) {
      setReadingPosition(`after_article_${article.id}`, article.id);
      // No alert needed - the visual line indicator is sufficient
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
    
    return (
      <View>
        <TouchableOpacity
          style={[
            styles.articleItem,
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
                color={isSelected ? theme.colors.primary : theme.colors.textSecondary} 
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
                <View style={[styles.articleImage, styles.placeholderImage, { backgroundColor: theme.colors.border }]}>
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
            onClear={() => {}}
            isActive={false}
          />
        )}
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
  const getFilteredArticles = () => {
    if (!articles || !Array.isArray(articles)) {
      return [];
    }
    
    // v1.1.5: Apply age filter to existing articles
    let filtered = filterByAge(articles);
    
    // Apply read status filter
    switch (articleFilter) {
      case 'unread':
        filtered = articles.filter(article => !article.isRead);
        break;
      case 'read':
        filtered = articles.filter(article => article.isRead);
        break;
      default:
        filtered = articles;
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

    // Sort articles
    let sortedArticles;
    if (sortOrder === 'newest') {
      sortedArticles = filtered.sort((a, b) => new Date(b.publishedDate) - new Date(a.publishedDate));
    } else {
      sortedArticles = filtered.sort((a, b) => new Date(a.publishedDate) - new Date(b.publishedDate));
    }

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
    return filterByAge(articles).filter(a => !a.isRead).length;
  };
  const getAgeFilteredReadCount = () => {
    return filterByAge(articles).filter(a => a.isRead).length;
  };

  const getFilterButtonText = () => {
    switch (articleFilter) {
      case 'unread':
        return t('feedList.filterUnread', { count: formatNumber(getAgeFilteredUnreadCount()) });
      case 'read':
        return t('feedList.filterRead', { count: formatNumber(getAgeFilteredReadCount()) });
      default:
        return t('feedList.filterAllCount', { count: formatNumber(filterByAge(articles).length) });
    }
  };

  const getSortButtonIcon = () => {
    return sortOrder === 'newest' ? 'arrow-down' : 'arrow-up';
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.colors.text,
      textAlign: isRTL ? 'right' : 'left',
      writingDirection: isRTL ? 'rtl' : 'ltr',
    },
    addButton: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 6,
      paddingVertical: 4,
      minWidth: 40,
    },
    headerRightGroup: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
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
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      flexShrink: 1,
    },
    headerButton: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 6,
      paddingVertical: 4,
      minWidth: 40,
    },
    headerButtonLabel: {
      fontSize: 9,
      marginTop: 2,
      fontWeight: '500',
      color: theme.colors.textSecondary,
    },
    filterButtonText: {
      fontSize: 12,
      color: theme.colors.text,
      fontWeight: '600',
    },
    filterButton: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 6,
      backgroundColor: theme.colors.background,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.colors.text,
    },
    searchContainer: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      marginHorizontal: 16,
      marginVertical: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    searchIcon: {
      marginRight: isRTL ? 0 : 8,
      marginLeft: isRTL ? 8 : 0,
    },
    searchInput: {
      flex: 1,
      fontSize: 16,
      color: theme.colors.text,
      paddingVertical: 4,
      textAlign: isRTL ? 'right' : 'left',
      writingDirection: isRTL ? 'rtl' : 'ltr',
    },
    clearSearch: {
      padding: 4,
    },
    articleItem: {
      backgroundColor: theme.colors.surface,
      marginHorizontal: 16,
      marginVertical: 8,
      borderRadius: 12,
      padding: 16,
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'flex-start',
      ...(Platform.OS === 'web' ? theme.shadows.cardWeb : theme.shadows.card),
    },
    articleContent: {
      flex: 1,
      marginRight: isRTL ? 0 : 12,
      marginLeft: isRTL ? 12 : 0,
    },
    articleHeader: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    titleRow: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      flex: 1,
    },
    unreadBullet: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.colors.primary,
      marginRight: isRTL ? 0 : 8,
      marginLeft: isRTL ? 8 : 0,
    },
    feedTitle: {
      fontSize: 12,
      color: theme.colors.primary,
      fontWeight: '600',
      flex: 1,
      textAlign: isRTL ? 'right' : 'left',
      writingDirection: isRTL ? 'rtl' : 'ltr',
    },
    articleMeta: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      gap: 8,
    },
    articleDate: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    readPositionArticle: {
      opacity: 0.7,
      borderLeftWidth: 3,
      borderLeftColor: theme.colors.accent,
    },
    articleTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 6,
      lineHeight: 21,
      textAlign: isRTL ? 'right' : 'left',
      writingDirection: isRTL ? 'rtl' : 'ltr',
    },
    articleDescription: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      lineHeight: 20,
      textAlign: isRTL ? 'right' : 'left',
      writingDirection: isRTL ? 'rtl' : 'ltr',
    },
    imageContainer: {
      marginLeft: isRTL ? 0 : 12,
      marginRight: isRTL ? 12 : 0,
    },
    articleImage: {
      width: 80,
      height: 80,
      borderRadius: 8,
      backgroundColor: theme.colors.border,
    },
    placeholderImage: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    imageActions: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
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
      fontSize: 20,
      fontWeight: '600',
      color: theme.colors.text,
      marginTop: 16,
      marginBottom: 8,
    },
    emptyDescription: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
      marginBottom: 24,
    },
    primaryButton: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.primary,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 12,
      marginBottom: 32,
      gap: 8,
    },
    primaryButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
    featuresContainer: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      justifyContent: 'space-around',
      width: '100%',
      paddingHorizontal: 20,
    },
    featureItem: {
      alignItems: 'center',
      flex: 1,
    },
    featureText: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginTop: 8,
      textAlign: 'center',
    },
    loadingContainer: {
      padding: 20,
      alignItems: 'center',
    },
    loadingText: {
      marginTop: 10,
      color: theme.colors.textSecondary,
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
      backgroundColor: theme.colors.primary + '20',
      borderLeftWidth: 4,
      borderLeftColor: theme.colors.primary,
    },
  });

  if (feeds.length === 0) {
    return (
      <SafeAreaView edges={["top", "left", "right"]} style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>FeedWell</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('AddFeed')}
          >
            <Ionicons name="add" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>
        
        <View style={styles.emptyState}>
          <Ionicons name="newspaper-outline" size={100} color={theme.colors.border} />
          <Text style={styles.emptyTitle}>{t('feedList.welcomeTitle')}</Text>
          <Text style={styles.emptyDescription}>
            {t('feedList.welcomeDescription')}
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.navigate('AddFeed')}
          >
            <Ionicons name="add-circle-outline" size={20} color="#fff" />
            <Text style={styles.primaryButtonText}>{t('feedList.addFirstFeed')}</Text>
          </TouchableOpacity>

          <View style={styles.featuresContainer}>
            <View style={styles.featureItem}>
              <Ionicons name="shield-checkmark" size={24} color={theme.colors.success} />
              <Text style={styles.featureText}>{t('feedList.featureAdFree')}</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="reader" size={24} color={theme.colors.primary} />
              <Text style={styles.featureText}>{t('feedList.featureReaderMode')}</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="share" size={24} color={theme.colors.warning} />
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
              <Text style={styles.headerButtonLabel}>{t('feedList.selectAll')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={deselectAllArticles}
            >
              <Ionicons name="square-outline" size={20} color={theme.colors.text} />
              <Text style={styles.headerButtonLabel}>{t('feedList.selectNone')}</Text>
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
                      <Text style={[styles.headerButtonLabel, { color: selectedArticles.size === 0 || !hasUnread ? theme.colors.disabled : theme.colors.textSecondary }]}>{t('feedList.markReadLabel')}</Text>
                    </TouchableOpacity>
                  )}
                  {showMarkUnread && (
                    <TouchableOpacity
                      style={styles.headerButton}
                      onPress={markSelectedAsUnread}
                      disabled={selectedArticles.size === 0 || !hasRead}
                    >
                      <Ionicons name="mail-unread-outline" size={20} color={selectedArticles.size === 0 || !hasRead ? theme.colors.disabled : theme.colors.text} />
                      <Text style={[styles.headerButtonLabel, { color: selectedArticles.size === 0 || !hasRead ? theme.colors.disabled : theme.colors.textSecondary }]}>{t('feedList.markUnreadLabel')}</Text>
                    </TouchableOpacity>
                  )}
                </>
              );
            })()}
            <TouchableOpacity
              style={styles.headerButton}
              onPress={toggleSelectionMode}
            >
              <Ionicons name="close" size={20} color={theme.colors.text} />
              <Text style={styles.headerButtonLabel}>{t('common.cancel')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.headerRightGroup}>
            <TouchableOpacity
              style={[styles.filterPill, styles.filterButton]}
              onPress={openFilterMenu}
            >
              <Text style={styles.filterButtonText}>{getFilterButtonText()}</Text>
              <Ionicons name="chevron-down" size={14} color={theme.colors.textSecondary} />
            </TouchableOpacity>
            <View style={styles.headerButtons}>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={() => openSoundPlaylist(true)}
              >
                <Ionicons name="musical-notes-outline" size={20} color={theme.colors.text} />
                <Text style={styles.headerButtonLabel}>{t('feedList.soundsLabel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={toggleSort}
              >
                <Ionicons name={getSortButtonIcon()} size={20} color={theme.colors.text} />
                <Text style={styles.headerButtonLabel}>{t('feedList.sortLabel')}</Text>
              </TouchableOpacity>
              {articleFilter !== 'read' && (
                <TouchableOpacity
                  style={styles.headerButton}
                  onPress={handleMarkAllRead}
                >
                  <Ionicons name="checkmark-done" size={20} color={theme.colors.text} />
                  <Text style={styles.headerButtonLabel}>{t('feedList.readAllLabel')}</Text>
                </TouchableOpacity>
              )}
              {articleFilter !== 'unread' && (
                <TouchableOpacity
                  style={styles.headerButton}
                  onPress={handleMarkAllUnread}
                >
                  <Ionicons name="mail-unread-outline" size={20} color={theme.colors.text} />
                  <Text style={styles.headerButtonLabel}>{t('feedList.unreadAllLabel')}</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => navigation.navigate('AddFeed')}
              >
                <Ionicons name="add" size={20} color={theme.colors.text} />
                <Text style={styles.headerButtonLabel}>{t('common.add')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={theme.colors.textSecondary} style={styles.searchIcon} />
        <TextInput
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

      {loading && !refreshing && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>{t('feedList.loadingArticles')}</Text>
        </View>
      )}

      <FlatList
        ref={flatListRef}
        data={filteredAndSortedArticles}
        renderItem={renderArticle}
        keyExtractor={(item) => item.id}
        onScrollToIndexFailed={handleScrollToIndexFailed}
        extraData={[articles, articleFilter, sortOrder, readingPosition?.afterArticleId]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={filteredAndSortedArticles.length === 0 ? styles.emptyList : null}
        ListEmptyComponent={
          !loading && (
            <View style={styles.emptyState}>
              <Ionicons name="refresh-outline" size={60} color="#ccc" />
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
