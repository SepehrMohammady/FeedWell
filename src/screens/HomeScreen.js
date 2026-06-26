import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useFeed } from '../context/FeedContext';
import { useReadLater } from '../context/ReadLaterContext';
import { useAppSettings } from '../context/AppSettingsContext';
import { parseRSSFeed } from '../utils/rssParser';
import CustomAlert from '../components/CustomAlert';
import { useTranslation } from '../context/LanguageContext';
import { formatRelativeDate } from '../utils/formatDate';

export default function HomeScreen({ navigation }) {
  const { theme, isDarkMode } = useTheme();
  const { t, isRTL, formatNumber } = useTranslation();
  const { feeds, articles, getUnreadCount, addArticles, setLoading, setError } = useFeed();
  const { articles: readLaterArticles } = useReadLater();
  const { maxArticleAge } = useAppSettings();
  const [refreshing, setRefreshing] = useState(false);
  const [alertConfig, setAlertConfig] = useState({ visible: false, title: '', message: '', buttons: [] });

  // v1.1.5: Helper to filter articles by age
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

  // Calculate stats (respecting age filter)
  const ageFilteredArticles = filterByAge(articles);
  const totalFeeds = feeds.length;
  const totalArticles = ageFilteredArticles.length;
  const unreadCount = ageFilteredArticles.filter(a => !a.isRead).length;
  const readLaterCount = readLaterArticles.length;
  
  // Get the last 5 articles sorted by publish date (most recent first)
  const recentArticles = [...ageFilteredArticles]
    .sort((a, b) => new Date(b.pubDate || b.publishedDate) - new Date(a.pubDate || a.publishedDate))
    .slice(0, 5);

  const refreshFeeds = async () => {
    if (feeds.length === 0) return;
    
    setLoading(true);
    try {
      const allArticles = [];
      
      for (const feed of feeds) {
        try {
          const parsedFeed = await parseRSSFeed(feed.url, maxArticleAge);
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
      setAlertConfig({ visible: true, title: t('common.error'), message: t('home.refreshError'), icon: 'alert-circle-outline', buttons: [{ text: t('common.ok') }] });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    refreshFeeds();
  };

  const renderOverviewCard = (title, value, icon, color, onPress) => (
    <TouchableOpacity
      style={[styles.overviewCard, { backgroundColor: theme.colors.surface }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.overviewIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <View style={styles.overviewContent}>
        <Text style={[styles.overviewValue, { color: theme.colors.text }]}>
          {formatNumber(value)}
        </Text>
        <Text style={[styles.overviewTitle, { color: theme.colors.textSecondary }]}>
          {title}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderRecentArticle = (article) => (
    <TouchableOpacity
      key={article.id}
      style={[styles.recentArticle, { backgroundColor: theme.colors.surface, flexDirection: isRTL ? 'row-reverse' : 'row' }]}
      onPress={() => navigation.navigate('Feeds', {
        screen: 'ArticleReader',
        params: { article }
      })}
      activeOpacity={0.7}
    >
      <View style={styles.recentArticleContent}>
        <Text
          style={[styles.recentArticleTitle, { color: theme.colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}
          numberOfLines={2}
        >
          {article.title}
        </Text>
        <Text style={[styles.recentArticleFeed, { color: theme.colors.textSecondary, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
          {article.feedTitle} • {formatTimeAgo(article.pubDate)}
        </Text>
      </View>
      <Ionicons
        name={isRTL ? 'chevron-back' : 'chevron-forward'}
        size={16}
        color={theme.colors.textSecondary}
      />
    </TouchableOpacity>
  );

  const formatTimeAgo = (dateString) => {
    return formatRelativeDate(dateString, t, formatNumber);
  };

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.headerContent, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Image
              source={isDarkMode ? require('../../assets/logo-invert.png') : require('../../assets/logo.png')}
              style={styles.logoIcon}
              resizeMode="contain"
            />
            <View style={styles.headerText}>
              <Text style={[styles.welcomeText, { color: theme.colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                {t('home.welcome')}
              </Text>
              <Text style={[styles.subtitleText, { color: theme.colors.textSecondary, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                {t('home.subtitle')}
              </Text>
            </View>
          </View>
        </View>

        {/* Overview Cards */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
            {t('home.overview')}
          </Text>
          <View style={[styles.overviewGrid, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            {renderOverviewCard(t('home.feeds'), totalFeeds, 'newspaper', theme.colors.primary, () => navigation.navigate('Feeds', { screen: 'AddFeed' }))}
            {renderOverviewCard(t('home.unread'), unreadCount, 'mail-unread', theme.colors.primary, () => navigation.navigate('Feeds', { screen: 'FeedList', params: { filter: 'unread' } }))}
            {renderOverviewCard(t('home.saved'), readLaterCount, 'save', theme.colors.primary, () => navigation.navigate('ReadLater'))}
          </View>
        </View>

        {/* Recent Articles */}
        {recentArticles.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
              {t('home.recentArticles')}
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
              {t('home.getStarted')}
            </Text>
            <Text style={[styles.emptyMessage, { color: theme.colors.textSecondary }]}>
              {t('home.getStartedMessage')}
            </Text>
            <TouchableOpacity
              style={[styles.addFeedButton, { backgroundColor: theme.colors.primary }]}
              onPress={() => navigation.navigate('Feeds', { screen: 'AddFeed' })}
            >
              <Text style={styles.addFeedButtonText}>{t('home.addFirstFeed')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

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
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoIcon: {
    width: 56,
    height: 56,
    marginRight: 8,
  },
  headerText: {
    flex: 1,
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
