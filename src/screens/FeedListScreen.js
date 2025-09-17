import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Image,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useFeed } from '../context/FeedContext';
import { useTheme } from '../context/ThemeContext';
import { useAppSettings } from '../context/AppSettingsContext';
import { parseRSSFeed } from '../utils/rssParser';
import ArticleImage from '../components/ArticleImage';
import BookmarkButton from '../components/BookmarkButton';
import ReadingPositionIndicator from '../components/ReadingPositionIndicator';

export default function FeedListScreen({ navigation }) {
  const { feeds, articles, loading, addArticles, setLoading, setError, markAllRead, getUnreadCount, getReadCount, readingPosition, setReadingPosition, clearReadingPosition } = useFeed();
  const { theme } = useTheme();
  const { showImages, articleFilter, sortOrder, updateArticleFilter, updateSortOrder } = useAppSettings();
  const [refreshing, setRefreshing] = useState(false);
  const [forceRender, setForceRender] = useState(0);
  const flatListRef = useRef(null);

  useEffect(() => {
    if (feeds.length > 0) {
      refreshFeeds();
    }
  }, [feeds.length]);

  // Force re-render when screen comes into focus to update read status
  useFocusEffect(
    React.useCallback(() => {
      setForceRender(prev => prev + 1);
      
      // Auto-scroll to reading position when tab becomes active
      if (readingPosition && readingPosition.position !== undefined && flatListRef.current && filteredAndSortedArticles && filteredAndSortedArticles.length > 0) {
        // Wait a bit for the FlatList to render
        setTimeout(() => {
          try {
            // Use simple offset calculation instead of scrollToIndex
            const itemHeight = 150; // Approximate height per article item
            const targetOffset = readingPosition.position * itemHeight;
            
            flatListRef.current.scrollToOffset({
              offset: targetOffset,
              animated: true,
            });
          } catch (error) {
            console.log('Auto-scroll failed:', error);
          }
        }, 500);
      }
    }, [readingPosition, filteredAndSortedArticles])
  );

  const refreshFeeds = async () => {
    if (feeds.length === 0) return;
    
    setLoading(true);
    try {
      const allArticles = [];
      
      for (const feed of feeds) {
        try {
          const parsedFeed = await parseRSSFeed(feed.url);
          allArticles.push(...parsedFeed.articles);
        } catch (error) {
          console.error(`Error parsing feed ${feed.url}:`, error);
        }
      }
      
      if (allArticles.length > 0) {
        await addArticles(allArticles);
      }
    } catch (error) {
      setError('Failed to refresh feeds');
      Alert.alert('Error', 'Failed to refresh feeds. Please check your internet connection.');
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
      Alert.alert('Info', 'No unread articles to mark as read.');
      return;
    }

    const confirmAction = () => {
      markAllRead();
      Alert.alert('Success', `Marked ${unreadCount} articles as read.`);
    };

    Alert.alert(
      'Mark All Read',
      `Mark all ${unreadCount} unread articles as read?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Mark All Read', onPress: confirmAction, style: 'destructive' },
      ]
    );
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) {
      return 'Just now';
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const handleArticlePress = (article) => {
    navigation.navigate('ArticleActions', { article });
  };

  const handleSetReadingPosition = (afterIndex) => {
    setReadingPosition(`after_article_${afterIndex}`, afterIndex);
    Alert.alert(
      'Reading Position Set',
      'You can now continue reading from this position. The line will help you remember where you left off.',
      [{ text: 'OK' }]
    );
  };

  const handleGoToReadingPosition = () => {
    if (readingPosition && readingPosition.position !== undefined) {
      // The position is already visible in the list, no need to navigate
      Alert.alert('Reading Position', 'You can see your reading position marked in the list below.');
    }
  };

  const handleClearReadingPosition = () => {
    Alert.alert(
      'Clear Reading Position',
      'Are you sure you want to remove the reading position line?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear', 
          style: 'destructive',
          onPress: clearReadingPosition
        }
      ]
    );
  };

  const renderArticle = ({ item, index }) => {
    const isBeforeReadingPosition = readingPosition && 
      readingPosition.position !== undefined && 
      index <= readingPosition.position;
    
    return (
      <View>
        <TouchableOpacity
          style={[
            styles.articleItem,
            isBeforeReadingPosition && styles.readPositionArticle
          ]}
          onPress={() => handleArticlePress(item)}
        >
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
                <BookmarkButton 
                  article={item} 
                  size={20} 
                  style={styles.bookmarkButton}
                />
              </View>
            </View>
            
            <Text style={styles.articleTitle} numberOfLines={2}>
              {item.title}
            </Text>
            
            {item.description && (
              <Text style={styles.articleDescription} numberOfLines={2}>
                {item.description}
              </Text>
            )}
          </View>
          
          {showImages && (
            <ArticleImage
              uri={item.imageUrl}
              style={styles.articleImage}
              resizeMode="cover"
            />
          )}
        </TouchableOpacity>

        {/* Show reading position line after this article if it matches */}
        {readingPosition && readingPosition.position === index && (
          <ReadingPositionIndicator
            onPress={handleGoToReadingPosition}
            onClear={handleClearReadingPosition}
            isActive={true}
          />
        )}

        {/* Show potential reading position lines between articles */}
        {(!readingPosition || readingPosition.position !== index) && (
          <ReadingPositionIndicator
            onPress={() => handleSetReadingPosition(index)}
            onClear={() => {}}
            isActive={false}
          />
        )}
      </View>
    );
  };

  // Filter articles based on read status
  const getFilteredArticles = () => {
    if (!articles || !Array.isArray(articles)) {
      return [];
    }
    
    let filtered = articles;
    
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

    // Sort articles
    if (sortOrder === 'newest') {
      return filtered.sort((a, b) => new Date(b.publishedDate) - new Date(a.publishedDate));
    } else {
      return filtered.sort((a, b) => new Date(a.publishedDate) - new Date(b.publishedDate));
    }
  };

  const filteredAndSortedArticles = getFilteredArticles();

  const toggleFilter = () => {
    if (articleFilter === 'all') {
      updateArticleFilter('unread');
    } else if (articleFilter === 'unread') {
      updateArticleFilter('read');
    } else {
      updateArticleFilter('all');
    }
  };

  const toggleSort = () => {
    updateSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest');
  };

  const getFilterButtonText = () => {
    switch (articleFilter) {
      case 'unread':
        return `Unread (${getUnreadCount()})`;
      case 'read':
        return `Read (${getReadCount()})`;
      default:
        return 'All';
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
      flexDirection: 'row',
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
    },
    addButton: {
      padding: 8,
    },
    headerButtons: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    headerButton: {
      padding: 8,
      marginRight: 8,
    },
    filterButtonText: {
      fontSize: 12,
      color: '#007AFF',
      fontWeight: '600',
      paddingHorizontal: 8,
      paddingVertical: 4,
      backgroundColor: theme.colors.background,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#007AFF',
    },
    articleItem: {
      backgroundColor: theme.colors.surface,
      marginHorizontal: 16,
      marginVertical: 8,
      borderRadius: 12,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'flex-start',
      ...(Platform.OS === 'web' ? theme.shadows.cardWeb : theme.shadows.card),
    },
    articleContent: {
      flex: 1,
      marginRight: 12,
    },
    articleHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    unreadBullet: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: '#007AFF',
      marginRight: 8,
    },
    feedTitle: {
      fontSize: 12,
      color: theme.colors.primary,
      fontWeight: '600',
      flex: 1,
    },
    articleMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    articleDate: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    bookmarkButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
    },
    readPositionArticle: {
      opacity: 0.7,
      borderLeftWidth: 3,
      borderLeftColor: theme.colors.accent,
    },
    articleTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 6,
      lineHeight: 22,
    },
    articleDescription: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      lineHeight: 20,
    },
    articleImage: {
      width: 80,
      height: 80,
      borderRadius: 8,
      backgroundColor: theme.colors.border,
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 32,
    },
    emptyList: {
      flex: 1,
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
      flexDirection: 'row',
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
      flexDirection: 'row',
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
  });

  if (feeds.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>FeedWell</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('AddFeed')}
          >
            <Ionicons name="add" size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.emptyState}>
          <Ionicons name="newspaper-outline" size={100} color="#e0e0e0" />
          <Text style={styles.emptyTitle}>Welcome to FeedWell</Text>
          <Text style={styles.emptyDescription}>
            Your ad-free RSS reader. Start by adding your first feed to get clean, distraction-free articles.
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.navigate('AddFeed')}
          >
            <Ionicons name="add-circle-outline" size={20} color="#fff" />
            <Text style={styles.primaryButtonText}>Add Your First Feed</Text>
          </TouchableOpacity>
          
          <View style={styles.featuresContainer}>
            <View style={styles.featureItem}>
              <Ionicons name="shield-checkmark" size={24} color="#34C759" />
              <Text style={styles.featureText}>Ad-free reading</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="reader" size={24} color="#007AFF" />
              <Text style={styles.featureText}>Clean reader mode</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="share" size={24} color="#FF9500" />
              <Text style={styles.featureText}>Easy sharing</Text>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>FeedWell</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={toggleFilter}
          >
            <Text style={styles.filterButtonText}>{getFilterButtonText()}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={toggleSort}
          >
            <Ionicons name={getSortButtonIcon()} size={20} color="#007AFF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleMarkAllRead}
          >
            <Ionicons name="checkmark-done" size={24} color="#007AFF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('AddFeed')}
          >
            <Ionicons name="add" size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>
      </View>

      {loading && !refreshing && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading articles...</Text>
        </View>
      )}

      <FlatList
        ref={flatListRef}
        data={filteredAndSortedArticles}
        renderItem={renderArticle}
        keyExtractor={(item) => item.id}
        extraData={[articles, articleFilter, sortOrder, readingPosition]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={filteredAndSortedArticles.length === 0 ? styles.emptyList : null}
        ListEmptyComponent={
          !loading && (
            <View style={styles.emptyState}>
              <Ionicons name="refresh-outline" size={60} color="#ccc" />
              <Text style={styles.emptyTitle}>
                {articleFilter === 'unread' ? 'No Unread Articles' : 
                 articleFilter === 'read' ? 'No Read Articles' : 'No Articles'}
              </Text>
              <Text style={styles.emptyDescription}>
                {articleFilter === 'unread' ? 'All articles have been read' :
                 articleFilter === 'read' ? 'No articles have been read yet' :
                 'Pull down to refresh your feeds'}
              </Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}
