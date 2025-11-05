import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useFeed } from '../context/FeedContext';
import ArticleCard from '../components/ArticleCard';

export default function UnreadScreen({ navigation }) {
  const { theme } = useTheme();
  const { getUnreadArticles, markArticleRead, markAllRead } = useFeed();
  
  const unreadArticles = getUnreadArticles();

  const handleArticlePress = (article) => {
    // Mark as read when opening (always in unread filter context)
    markArticleRead(article.id, 'unread', 'newest');
    navigation.navigate('Feeds', { 
      screen: 'ArticleReader', 
      params: { article } 
    });
  };

  const handleMarkAsRead = (articleId) => {
    markArticleRead(articleId, 'unread', 'newest');
  };

  const handleMarkAllRead = () => {
    if (unreadArticles.length === 0) return;
    
    // Use browser-compatible confirm dialog for web, Alert for mobile
    if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
      // Web environment - use native confirm
      const confirmed = window.confirm('Mark all articles as read?');
      if (confirmed) {
        markAllRead();
      }
    } else {
      // Mobile environment - use Alert
      Alert.alert(
        'Mark All Read',
        'Mark all articles as read?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Mark All Read', 
            style: 'default',
            onPress: markAllRead
          },
        ]
      );
    }
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons 
        name="checkmark-circle-outline" 
        size={64} 
        color={theme.colors.success} 
      />
      <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
        All Caught Up!
      </Text>
      <Text style={[styles.emptyMessage, { color: theme.colors.textSecondary }]}>
        You have no unread articles. Great job staying on top of your feeds!
      </Text>
    </View>
  );

  const renderArticleItem = ({ item }) => (
    <View style={styles.articleContainer}>
      <ArticleCard
        article={item}
        onPress={() => handleArticlePress(item)}
        showFeedTitle={true}
      />
      <TouchableOpacity
        style={[styles.readButton, { backgroundColor: theme.colors.success }]}
        onPress={() => handleMarkAsRead(item.id)}
        activeOpacity={0.7}
      >
        <Ionicons name="checkmark" size={16} color="#fff" />
      </TouchableOpacity>
      {/* Unread indicator */}
      <View style={[styles.unreadIndicator, { backgroundColor: theme.colors.primary }]} />
    </View>
  );

  const renderHeader = () => (
    <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.headerContent}>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          Unread Articles
        </Text>
        <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
          {unreadArticles.length} {unreadArticles.length === 1 ? 'article' : 'articles'} to read
        </Text>
      </View>
      {unreadArticles.length > 0 && (
        <TouchableOpacity
          style={[styles.markAllButton, { backgroundColor: theme.colors.success }]}
          onPress={handleMarkAllRead}
          activeOpacity={0.7}
        >
          <Ionicons name="checkmark-done" size={16} color="#fff" />
          <Text style={styles.markAllButtonText}>Mark All Read</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {renderHeader()}
      <FlatList
        data={unreadArticles}
        keyExtractor={(item) => item.id}
        renderItem={renderArticleItem}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={unreadArticles.length === 0 ? styles.emptyList : styles.list}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 14,
  },
  markAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 4,
  },
  markAllButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  list: {
    padding: 16,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyContainer: {
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  articleContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  readButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  unreadIndicator: {
    position: 'absolute',
    top: 6,
    left: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
