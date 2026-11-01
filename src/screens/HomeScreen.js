import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  RefreshControl,
  Modal,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useFeed } from '../context/FeedContext';
import { useReadLater } from '../context/ReadLaterContext';
import { useAppSettings } from '../context/AppSettingsContext';
import { useNotes } from '../context/NotesContext';
import { useAmbientSound } from '../context/AmbientSoundContext';
import { useTourTarget } from '../context/TourContext';
import { parseRSSFeed } from '../utils/rssParser';
import CustomAlert from '../components/CustomAlert';
import { useTranslation } from '../context/LanguageContext';
import { formatRelativeDate } from '../utils/formatDate';
import { HOME_SECTIONS } from '../config/homeSections';

const BOOKMARK_PREFIX = 'reading_bookmark_';
const LIST_LIMIT = 5;
const FEEDS_LIMIT = 8;

const sectionInfo = new Map(HOME_SECTIONS.map((section) => [section.id, section]));
const timeOf = (value) => {
  const time = new Date(value || 0).getTime();
  return Number.isNaN(time) ? 0 : time;
};

export default function HomeScreen({ navigation }) {
  const { theme, isDarkMode } = useTheme();
  const { t, isRTL, formatNumber, language } = useTranslation();
  const { feeds, articles, addArticles, setLoading, setError } = useFeed();
  const { articles: readLaterArticles } = useReadLater();
  const { maxArticleAge, homeSections, updateHomeSections, resetHomeSections } = useAppSettings();
  const { notes } = useNotes();
  const { setShowPlaylist } = useAmbientSound();
  const tourCustomizeRef = useTourTarget('home.customize');
  const [refreshing, setRefreshing] = useState(false);
  const [customizeVisible, setCustomizeVisible] = useState(false);
  const [bookmarks, setBookmarks] = useState([]);
  const [alertConfig, setAlertConfig] = useState({ visible: false, title: '', message: '', buttons: [] });

  const rowDirection = isRTL ? 'row-reverse' : 'row';
  const textAlign = isRTL ? 'right' : 'left';
  const writingDirection = isRTL ? 'rtl' : 'ltr';

  // Opens a screen in a tab with only that tab's list beneath it. A plain
  // navigate() would stack it on top of whatever the tab last showed, often an
  // article, and Back would then return to that old article. Reusing the tab's
  // existing list route keeps the list mounted, scroll position and all.
  const openInTab = (tabName, listName, screen, params) => {
    const stack = navigation.getState()?.routes?.find((route) => route.name === tabName)?.state;
    const list = stack?.routes?.find((route) => route.name === listName) || { name: listName };
    const routes = screen === listName
      ? [{ ...list, params: { ...list.params, ...params } }]
      : [list, { name: screen, params }];
    navigation.navigate(tabName, { state: { index: routes.length - 1, routes } });
  };
  const openInFeeds = (screen, params) => openInTab('Feeds', 'FeedList', screen, params);
  // sourceAt makes the feed list apply the source (or clear it) on every tap.
  const openFeedList = (params) => openInFeeds('FeedList', { sourceFeedUrl: null, ...params, sourceAt: Date.now() });

  // Bookmarks are set inside the reader, so read them again whenever Home shows.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        try {
          const keys = (await AsyncStorage.getAllKeys()).filter((key) => key.startsWith(BOOKMARK_PREFIX));
          if (keys.length === 0) {
            if (!cancelled) setBookmarks([]);
            return;
          }
          const pairs = await AsyncStorage.multiGet(keys);
          const list = [];
          pairs.forEach(([key, value]) => {
            try {
              const data = JSON.parse(value);
              if (data && typeof data.scrollPercent === 'number') {
                list.push({ id: key.slice(BOOKMARK_PREFIX.length), scrollPercent: data.scrollPercent, timestamp: data.timestamp || 0 });
              }
            } catch (e) { /* skip a damaged bookmark */ }
          });
          list.sort((a, b) => b.timestamp - a.timestamp);
          if (!cancelled) setBookmarks(list);
        } catch (e) {
          console.warn('Failed to read reading bookmarks:', e);
        }
      })();
      return () => { cancelled = true; };
    }, [])
  );

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
  const unreadCount = ageFilteredArticles.filter(a => !a.isRead).length;
  const readLaterCount = readLaterArticles.length;

  // The newest articles first
  const recentArticles = useMemo(
    () => [...ageFilteredArticles]
      .sort((a, b) => timeOf(b.publishedDate || b.pubDate) - timeOf(a.publishedDate || a.pubDate))
      .slice(0, LIST_LIMIT),
    [ageFilteredArticles]
  );

  // An article can be in the feed list, in Saved, or both; the reader opens it
  // from whichever tab holds it.
  const articleById = useMemo(() => new Map(articles.map((article) => [article.id, article])), [articles]);
  const savedById = useMemo(() => new Map(readLaterArticles.map((article) => [article.id, article])), [readLaterArticles]);
  const findArticle = (id) => {
    if (articleById.has(id)) return { article: articleById.get(id), saved: false };
    if (savedById.has(id)) return { article: savedById.get(id), saved: true };
    return null;
  };
  const openArticle = ({ article, saved }) => {
    if (saved) openInTab('ReadLater', 'ReadLaterList', 'ArticleReader', { article });
    else openInFeeds('ArticleReader', { article });
  };

  const continueReading = bookmarks
    .map((bookmark) => {
      const found = findArticle(bookmark.id);
      return found ? { ...found, scrollPercent: bookmark.scrollPercent } : null;
    })
    .filter(Boolean)
    .slice(0, LIST_LIMIT);

  const recentlySaved = useMemo(
    () => [...readLaterArticles]
      .sort((a, b) => timeOf(b.addedToReadLater) - timeOf(a.addedToReadLater))
      .slice(0, LIST_LIMIT),
    [readLaterArticles]
  );

  // Pinned feeds first, then the ones with the most unread articles.
  const yourFeeds = useMemo(() => {
    const unreadByFeed = new Map();
    ageFilteredArticles.forEach((article) => {
      if (!article.isRead) unreadByFeed.set(article.feedUrl, (unreadByFeed.get(article.feedUrl) || 0) + 1);
    });
    return feeds
      .filter((feed) => !feed.isHidden)
      .map((feed) => ({ feed, unread: unreadByFeed.get(feed.url) || 0 }))
      .sort((a, b) => (Number(!!b.feed.isPriority) - Number(!!a.feed.isPriority))
        || (b.unread - a.unread)
        || String(a.feed.title || '').localeCompare(String(b.feed.title || '')))
      .slice(0, FEEDS_LIMIT);
  }, [feeds, ageFilteredArticles]);

  const recentNotes = Object.entries(notes || {})
    .filter(([, note]) => note && note.text && note.text.trim())
    .sort(([, a], [, b]) => timeOf(b.updatedAt) - timeOf(a.updatedAt))
    .map(([id, note]) => {
      const found = findArticle(id);
      return found ? { ...found, text: note.text.trim() } : null;
    })
    .filter(Boolean)
    .slice(0, LIST_LIMIT);

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

  const formatTimeAgo = (dateString) => {
    return formatRelativeDate(dateString, t, formatNumber, language);
  };

  const toggleSection = (id) => {
    updateHomeSections(homeSections.map((section) => (section.id === id ? { ...section, visible: !section.visible } : section)));
  };

  const moveSection = (index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= homeSections.length) return;
    const next = [...homeSections];
    [next[index], next[target]] = [next[target], next[index]];
    updateHomeSections(next);
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

  // One row in a list section: a title, a line under it, and a chevron.
  const renderRow = ({ key, title, subtitle, onPress, leading }) => (
    <TouchableOpacity
      key={key}
      style={[styles.recentArticle, { backgroundColor: theme.colors.surface, flexDirection: rowDirection }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {leading}
      <View style={styles.recentArticleContent}>
        <Text style={[styles.recentArticleTitle, { color: theme.colors.text, textAlign, writingDirection }]} numberOfLines={2}>
          {title}
        </Text>
        {!!subtitle && (
          <Text style={[styles.recentArticleFeed, { color: theme.colors.textSecondary, textAlign, writingDirection }]} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>
      <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={16} color={theme.colors.textSecondary} />
    </TouchableOpacity>
  );

  const renderQuickAction = (key, label, icon, onPress) => (
    <TouchableOpacity
      key={key}
      style={[styles.quickAction, { backgroundColor: theme.colors.surface }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.quickActionIcon, { backgroundColor: theme.colors.primary + '20' }]}>
        <Ionicons name={icon} size={20} color={theme.colors.primary} />
      </View>
      <Text style={[styles.quickActionLabel, { color: theme.colors.text }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const articleSubtitle = (article, extra) =>
    [article.feedTitle, extra].filter(Boolean).join(' • ');

  // Each section's content, or null when it has nothing to show.
  const renderSectionBody = (id) => {
    switch (id) {
      case 'overview':
        return (
          <View style={[styles.overviewGrid, { flexDirection: rowDirection }]}>
            {renderOverviewCard(t('home.feeds'), totalFeeds, 'newspaper', theme.colors.primary, () => openInFeeds('AddFeed'))}
            {renderOverviewCard(t('home.unread'), unreadCount, 'mail-unread', theme.colors.primary, () => openFeedList({ filter: 'unread' }))}
            {renderOverviewCard(t('home.saved'), readLaterCount, 'save', theme.colors.primary, () => navigation.navigate('ReadLater'))}
          </View>
        );
      case 'quickActions':
        return (
          <View style={[styles.quickActions, { flexDirection: rowDirection }]}>
            {renderQuickAction('refresh', t('home.actionRefresh'), 'refresh-outline', onRefresh)}
            {renderQuickAction('add', t('addFeed.addButton'), 'add-circle-outline', () => openInFeeds('AddFeed'))}
            {renderQuickAction('search', t('common.search'), 'search-outline', () => openFeedList({ focusSearchAt: Date.now() }))}
            {renderQuickAction('sounds', t('feedList.soundsLabel'), 'musical-notes-outline', () => setShowPlaylist(true))}
          </View>
        );
      case 'continueReading':
        if (continueReading.length === 0) return null;
        return (
          <View style={styles.recentArticlesContainer}>
            {continueReading.map((entry) => renderRow({
              key: entry.article.id,
              title: entry.article.title,
              subtitle: articleSubtitle(entry.article, t('home.percentRead', { percent: formatNumber(Math.round(entry.scrollPercent * 100)) })),
              onPress: () => openArticle(entry),
            }))}
          </View>
        );
      case 'recentArticles':
        if (recentArticles.length === 0) return null;
        return (
          <View style={styles.recentArticlesContainer}>
            {recentArticles.map((article) => renderRow({
              key: article.id,
              title: article.title,
              subtitle: articleSubtitle(article, formatTimeAgo(article.publishedDate || article.pubDate)),
              onPress: () => openInFeeds('ArticleReader', { article }),
            }))}
          </View>
        );
      case 'savedArticles':
        if (recentlySaved.length === 0) return null;
        return (
          <View style={styles.recentArticlesContainer}>
            {recentlySaved.map((article) => renderRow({
              key: article.id,
              title: article.title,
              subtitle: articleSubtitle(article, formatTimeAgo(article.addedToReadLater)),
              onPress: () => openArticle({ article, saved: true }),
            }))}
          </View>
        );
      case 'yourFeeds':
        if (yourFeeds.length === 0) return null;
        return (
          <View style={styles.recentArticlesContainer}>
            {yourFeeds.map(({ feed, unread }) => renderRow({
              key: feed.id || feed.url,
              title: feed.title || feed.url,
              subtitle: t('home.unreadCount', { count: formatNumber(unread) }),
              onPress: () => openFeedList({ sourceFeedUrl: feed.url }),
              leading: feed.isPriority ? (
                <Ionicons name="star" size={16} color={theme.colors.warning} style={styles.rowLeading} />
              ) : null,
            }))}
          </View>
        );
      case 'recentNotes':
        if (recentNotes.length === 0) return null;
        return (
          <View style={styles.recentArticlesContainer}>
            {recentNotes.map((entry) => renderRow({
              key: entry.article.id,
              title: entry.text,
              subtitle: entry.article.title,
              onPress: () => openArticle(entry),
            }))}
          </View>
        );
      default:
        return null;
    }
  };

  const visibleSections = homeSections
    .filter((section) => section.visible && sectionInfo.has(section.id))
    .map((section) => ({ id: section.id, body: renderSectionBody(section.id) }))
    .filter((section) => section.body);
  const allHidden = homeSections.every((section) => !section.visible);

  const renderCustomizeSheet = () => (
    <Modal
      visible={customizeVisible}
      transparent
      animationType="slide"
      onRequestClose={() => setCustomizeVisible(false)}
    >
      <View style={styles.sheetOverlay}>
        <TouchableOpacity style={styles.sheetBackdrop} activeOpacity={1} onPress={() => setCustomizeVisible(false)} />
        <View style={[styles.sheet, { backgroundColor: theme.colors.surface }]}>
          <View style={[styles.sheetHandle, { backgroundColor: theme.colors.border }]} />
          <Text style={[styles.sheetTitle, { color: theme.colors.text, textAlign, writingDirection }]}>{t('home.customize')}</Text>
          <Text style={[styles.sheetHint, { color: theme.colors.textSecondary, textAlign, writingDirection }]}>{t('home.customizeHint')}</Text>
          <ScrollView style={styles.sheetList}>
            {homeSections.map((section, index) => {
              const info = sectionInfo.get(section.id);
              if (!info) return null;
              const isFirst = index === 0;
              const isLast = index === homeSections.length - 1;
              return (
                <View
                  key={section.id}
                  style={[styles.customizeRow, { flexDirection: rowDirection, borderBottomColor: theme.colors.border }, isLast && styles.customizeRowLast]}
                >
                  <Ionicons name={info.icon} size={20} color={section.visible ? theme.colors.primary : theme.colors.textSecondary} />
                  <Text
                    style={[styles.customizeLabel, { color: section.visible ? theme.colors.text : theme.colors.textSecondary, textAlign, writingDirection }]}
                    numberOfLines={1}
                  >
                    {t(info.titleKey)}
                  </Text>
                  <TouchableOpacity
                    onPress={() => moveSection(index, -1)}
                    disabled={isFirst}
                    style={styles.arrowButton}
                    accessibilityLabel={t('home.moveUp')}
                  >
                    <Ionicons name="arrow-up" size={20} color={isFirst ? theme.colors.border : theme.colors.text} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => moveSection(index, 1)}
                    disabled={isLast}
                    style={styles.arrowButton}
                    accessibilityLabel={t('home.moveDown')}
                  >
                    <Ionicons name="arrow-down" size={20} color={isLast ? theme.colors.border : theme.colors.text} />
                  </TouchableOpacity>
                  <Switch
                    value={section.visible}
                    onValueChange={() => toggleSection(section.id)}
                    trackColor={{ false: '#767577', true: theme.colors.primary }}
                    thumbColor={section.visible ? '#fff' : '#f4f3f4'}
                    accessibilityLabel={t(info.titleKey)}
                  />
                </View>
              );
            })}
          </ScrollView>
          <View style={[styles.sheetButtons, { flexDirection: rowDirection }]}>
            <TouchableOpacity style={styles.sheetTextButton} onPress={resetHomeSections}>
              <Text style={[styles.sheetTextButtonLabel, { color: theme.colors.primary }]}>{t('home.resetLayout')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sheetDoneButton, { backgroundColor: theme.colors.primary }]}
              onPress={() => setCustomizeVisible(false)}
            >
              <Text style={styles.addFeedButtonText}>{t('common.done')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
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
          <View style={[styles.headerContent, { flexDirection: rowDirection }]}>
            <Image
              source={isDarkMode ? require('../../assets/logo-invert.png') : require('../../assets/logo.png')}
              style={[styles.logoIcon, { marginRight: isRTL ? 0 : 8, marginLeft: isRTL ? 8 : 0 }]}
              resizeMode="contain"
            />
            <View style={styles.headerText}>
              <Text style={[styles.welcomeText, { color: theme.colors.text, textAlign, writingDirection }]}>
                {t('home.welcome')}
              </Text>
              <Text style={[styles.subtitleText, { color: theme.colors.textSecondary, textAlign, writingDirection }]}>
                {t('home.subtitle')}
              </Text>
            </View>
            <TouchableOpacity
              ref={tourCustomizeRef}
              style={[styles.customizeButton, { backgroundColor: theme.colors.surface }]}
              onPress={() => setCustomizeVisible(true)}
              accessibilityLabel={t('home.customize')}
            >
              <Ionicons name="grid-outline" size={20} color={theme.colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        {visibleSections.map(({ id, body }) => (
          <View key={id} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text, textAlign, writingDirection }]}>
              {t(sectionInfo.get(id).titleKey)}
            </Text>
            {body}
          </View>
        ))}

        {allHidden && totalFeeds > 0 && (
          <Text style={[styles.allHiddenText, { color: theme.colors.textSecondary }]}>
            {t('home.allSectionsHidden')}
          </Text>
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
              onPress={() => openInFeeds('AddFeed')}
            >
              <Text style={styles.addFeedButtonText}>{t('home.addFirstFeed')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {renderCustomizeSheet()}

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
  },
  scrollContent: {
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
  customizeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginStart: 8,
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
  quickActions: {
    gap: 12,
  },
  quickAction: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  quickActionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  quickActionLabel: {
    fontSize: 12,
    fontWeight: '500',
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
  rowLeading: {
    marginHorizontal: 8,
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
  allHiddenText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 8,
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
  sheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheetBackdrop: {
    flex: 1,
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 24,
    maxHeight: '85%',
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 14,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  sheetHint: {
    fontSize: 13,
    marginTop: 4,
    marginBottom: 8,
  },
  sheetList: {
    flexGrow: 0,
  },
  customizeRow: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  customizeRowLast: {
    borderBottomWidth: 0,
  },
  customizeLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  arrowButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetButtons: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 12,
  },
  sheetTextButton: {
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  sheetTextButtonLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  sheetDoneButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 24,
  },
});
