import React, { useState, useEffect } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { useFeed } from '../context/FeedContext';
import { parseRSSFeed } from '../utils/rssParser';
import { parseRSSFeedWithProxy } from '../utils/corsRssParser';

export default function FeedListScreen({ navigation }) {
  const { feeds, articles, loading, addArticles, setLoading, setError } = useFeed();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (feeds.length > 0) {
      refreshFeeds();
    }
  }, [feeds.length]);

  const refreshFeeds = async () => {
    if (feeds.length === 0) return;
    
    setLoading(true);
    try {
      const allArticles = [];
      
      for (const feed of feeds) {
        try {
          let parsedFeed;
          
          // Try the regular parser first
          try {
            parsedFeed = await parseRSSFeed(feed.url);
          } catch (error) {
            console.log(`Regular parser failed for ${feed.url}, trying CORS proxy:`, error.message);
            try {
              parsedFeed = await parseRSSFeedWithProxy(feed.url);
            } catch (proxyError) {
              console.log(`CORS proxy also failed for ${feed.url}:`, proxyError.message);
              throw error; // Keep the original error
            }
          }
          
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

  const renderArticle = ({ item }) => (
    <TouchableOpacity
      style={styles.articleItem}
      onPress={() => navigation.navigate('Article', { article: item })}
    >
      <View style={styles.articleContent}>
        <View style={styles.articleHeader}>
          <Text style={styles.feedTitle} numberOfLines={1}>
            {item.feedTitle}
          </Text>
          <Text style={styles.articleDate}>
            {formatDate(item.publishedDate)}
          </Text>
        </View>
        
        <Text style={styles.articleTitle} numberOfLines={2}>
          {item.title}
        </Text>
        
        {item.description && (
          <Text style={styles.articleDescription} numberOfLines={3}>
            {item.description}
          </Text>
        )}
        
        {item.imageUrl && (
          <Image
            source={{ uri: item.imageUrl }}
            style={styles.articleImage}
            resizeMode="cover"
          />
        )}
      </View>
      
      <Ionicons name="chevron-forward" size={20} color="#ccc" />
    </TouchableOpacity>
  );

  const sortedArticles = articles.sort((a, b) => 
    new Date(b.publishedDate) - new Date(a.publishedDate)
  );

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
          <Ionicons name="newspaper-outline" size={80} color="#ccc" />
          <Text style={styles.emptyTitle}>No Feeds Yet</Text>
          <Text style={styles.emptyDescription}>
            Add your first RSS feed to start reading articles
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.navigate('AddFeed')}
          >
            <Text style={styles.primaryButtonText}>Add Feed</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

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

      {loading && !refreshing && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading articles...</Text>
        </View>
      )}

      <FlatList
        data={sortedArticles}
        renderItem={renderArticle}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={articles.length === 0 ? styles.emptyList : null}
        ListEmptyComponent={
          !loading && (
            <View style={styles.emptyState}>
              <Ionicons name="refresh-outline" size={60} color="#ccc" />
              <Text style={styles.emptyTitle}>No Articles</Text>
              <Text style={styles.emptyDescription}>
                Pull down to refresh your feeds
              </Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  addButton: {
    padding: 8,
  },
  articleItem: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    }),
  },
  articleContent: {
    flex: 1,
  },
  articleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  feedTitle: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '600',
    flex: 1,
  },
  articleDate: {
    fontSize: 12,
    color: '#666',
  },
  articleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    lineHeight: 22,
  },
  articleDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
  },
  articleImage: {
    width: '100%',
    height: 120,
    borderRadius: 6,
    marginTop: 8,
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
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
});
