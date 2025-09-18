import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useFeed } from '../context/FeedContext';
import { useReadLater } from '../context/ReadLaterContext';

export default function HomeScreen({ navigation }) {
  const { theme } = useTheme();
  const { feeds, articles, getUnreadCount } = useFeed();
  const { articles: readLaterArticles } = useReadLater();

  // Calculate stats
  const totalFeeds = feeds.length;
  const totalArticles = articles.length;
  const unreadCount = getUnreadCount();
  const readLaterCount = readLaterArticles.length;
  const recentArticles = articles.slice(0, 5); // Get 5 most recent articles

  const renderOverviewCard = (title, value, icon, color) => (
    <View style={[styles.overviewCard, { backgroundColor: theme.colors.surface }]}>
      <View style={[styles.overviewIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <View style={styles.overviewContent}>
        <Text style={[styles.overviewValue, { color: theme.colors.text }]}>
          {value}
        </Text>
        <Text style={[styles.overviewTitle, { color: theme.colors.textSecondary }]}>
          {title}
        </Text>
      </View>
    </View>
  );

  const renderRecentArticle = (article) => (
    <TouchableOpacity
      key={article.id}
      style={[styles.recentArticle, { backgroundColor: theme.colors.surface }]}
      onPress={() => navigation.navigate('Feeds', { 
        screen: 'ArticleReader', 
        params: { article } 
      })}
      activeOpacity={0.7}
    >
      <View style={styles.recentArticleContent}>
        <Text 
          style={[styles.recentArticleTitle, { color: theme.colors.text }]}
          numberOfLines={2}
        >
          {article.title}
        </Text>
        <Text style={[styles.recentArticleFeed, { color: theme.colors.textSecondary }]}>
          {article.feedTitle} • {formatTimeAgo(article.pubDate)}
        </Text>
      </View>
      <Ionicons 
        name="chevron-forward" 
        size={16} 
        color={theme.colors.textSecondary} 
      />
    </TouchableOpacity>
  );

  const formatTimeAgo = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
      
      if (diffInHours < 1) return 'Just now';
      if (diffInHours < 24) return `${diffInHours}h ago`;
      const diffInDays = Math.floor(diffInHours / 24);
      if (diffInDays < 7) return `${diffInDays}d ago`;
      return date.toLocaleDateString();
    } catch (error) {
      return '';
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.welcomeText, { color: theme.colors.text }]}>
            Welcome to FeedWell
          </Text>
          <Text style={[styles.subtitleText, { color: theme.colors.textSecondary }]}>
            Your RSS reading dashboard
          </Text>
        </View>

        {/* Overview Cards */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Overview
          </Text>
          <View style={styles.overviewGrid}>
            {renderOverviewCard('Feeds', totalFeeds, 'newspaper', theme.colors.primary)}
            {renderOverviewCard('Unread', unreadCount, 'mail-unread', theme.colors.primary)}
            {renderOverviewCard('Saved', readLaterCount, 'save', theme.colors.primary)}
          </View>
        </View>

        {/* Recent Articles */}
        {recentArticles.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Recent Articles
            </Text>
            <View style={styles.recentArticlesContainer}>
              {recentArticles.map(renderRecentArticle)}
            </View>
          </View>
        )}

        {/* Empty State for New Users */}
        {totalFeeds === 0 && (
          <View style={styles.emptyState}>
            <Ionicons 
              name="library-outline" 
              size={64} 
              color={theme.colors.textSecondary} 
            />
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
              Get Started
            </Text>
            <Text style={[styles.emptyMessage, { color: theme.colors.textSecondary }]}>
              Add your first RSS feed to start reading
            </Text>
            <TouchableOpacity
              style={[styles.addFeedButton, { backgroundColor: theme.colors.primary }]}
              onPress={() => navigation.navigate('Feeds', { screen: 'AddFeed' })}
            >
              <Text style={styles.addFeedButtonText}>Add Your First Feed</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitleText: {
    fontSize: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
  },
  overviewGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  overviewCard: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  overviewIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  overviewContent: {
    alignItems: 'center',
  },
  overviewValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  overviewTitle: {
    fontSize: 12,
    marginTop: 2,
    textAlign: 'center',
  },
  recentArticlesContainer: {
    gap: 8,
  },
  recentArticle: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  recentArticleContent: {
    flex: 1,
  },
  recentArticleTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  recentArticleFeed: {
    fontSize: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  addFeedButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addFeedButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
