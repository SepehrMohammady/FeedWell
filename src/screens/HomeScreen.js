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
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, makeStyles } from '../context/ThemeContext';
import { useFeed } from '../context/FeedContext';
import { useReadLater } from '../context/ReadLaterContext';
import { useAppSettings } from '../context/AppSettingsContext';
import { useNotes } from '../context/NotesContext';
import { useAmbientSound } from '../context/AmbientSoundContext';
import { useTourTarget } from '../context/TourContext';
import { parseRSSFeed } from '../utils/rssParser';
import CustomAlert from '../components/CustomAlert';
import { DragSheet, SheetDragArea } from '../components/DragSheet';
import { useTranslation } from '../context/LanguageContext';
import { formatRelativeDate } from '../utils/formatDate';
import { HOME_SECTIONS } from '../config/homeSections';
import { useUi, ListCard, SectionTitle, ThemedSwitch } from '../theme/ui';
import { FONT, TYPE } from '../theme/type';

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

  const ui = useUi();
  const styles = useStyles(isRTL);
  const insets = useSafeAreaInsets();

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

  const iconColor = theme.colors.accentInk;

  // An overview tile: an accent icon circle over the figure and its label
  const renderOverviewCard = (title, value, icon, onPress, highlight) => (
    <TouchableOpacity style={[ui.tile, styles.overviewCard]} onPress={onPress} activeOpacity={0.7}>
      <View style={[ui.iconCircle, styles.overviewIcon]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <Text style={[styles.overviewValue, highlight && styles.overviewValueHighlight]}>
        {formatNumber(value)}
      </Text>
      <Text style={styles.overviewTitle} numberOfLines={1}>
        {title}
      </Text>
    </TouchableOpacity>
  );

  // One row in a list card: a title, a line under it, and a chevron.
  const renderRow = ({ key, title, subtitle, onPress, leading }) => (
    <TouchableOpacity key={key} style={styles.row} onPress={onPress} activeOpacity={0.7}>
      {leading}
      <View style={styles.rowText}>
        <Text style={ui.rowTitle} numberOfLines={2}>
          {title}
        </Text>
        {!!subtitle && (
          <Text style={[ui.secondary, styles.rowSubtitle]} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>
      <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={16} color={theme.colors.textSecondary} />
    </TouchableOpacity>
  );

  const renderQuickAction = (key, label, icon, onPress) => (
    <TouchableOpacity key={key} style={[ui.tile, styles.quickAction]} onPress={onPress} activeOpacity={0.7}>
      <View style={ui.iconCircle}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <Text style={styles.quickActionLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
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
          <View style={styles.overviewGrid}>
            {renderOverviewCard(t('home.feeds'), totalFeeds, 'newspaper-outline', () => openInFeeds('AddFeed'))}
            {renderOverviewCard(t('home.unread'), unreadCount, 'mail-unread-outline', () => openFeedList({ filter: 'unread' }), true)}
            {renderOverviewCard(t('home.saved'), readLaterCount, 'save-outline', () => navigation.navigate('ReadLater'))}
          </View>
        );
      case 'quickActions':
        return (
          <View style={styles.quickActions}>
            {renderQuickAction('refresh', t('home.actionRefresh'), 'refresh-outline', onRefresh)}
            {renderQuickAction('add', t('addFeed.addButton'), 'add-circle-outline', () => openInFeeds('AddFeed'))}
            {renderQuickAction('search', t('common.search'), 'search-outline', () => openFeedList({ focusSearchAt: Date.now() }))}
            {renderQuickAction('sounds', t('feedList.soundsLabel'), 'musical-notes-outline', () => setShowPlaylist(true))}
          </View>
        );
      case 'continueReading':
        if (continueReading.length === 0) return null;
        return (
          <ListCard>
            {continueReading.map((entry) => renderRow({
              key: entry.article.id,
              title: entry.article.title,
              subtitle: articleSubtitle(entry.article, t('home.percentRead', { percent: formatNumber(Math.round(entry.scrollPercent * 100)) })),
              onPress: () => openArticle(entry),
            }))}
          </ListCard>
        );
      case 'recentArticles':
        if (recentArticles.length === 0) return null;
        return (
          <ListCard>
            {recentArticles.map((article) => renderRow({
              key: article.id,
              title: article.title,
              subtitle: articleSubtitle(article, formatTimeAgo(article.publishedDate || article.pubDate)),
              onPress: () => openInFeeds('ArticleReader', { article }),
            }))}
          </ListCard>
        );
      case 'savedArticles':
        if (recentlySaved.length === 0) return null;
        return (
          <ListCard>
            {recentlySaved.map((article) => renderRow({
              key: article.id,
              title: article.title,
              subtitle: articleSubtitle(article, formatTimeAgo(article.addedToReadLater)),
              onPress: () => openArticle({ article, saved: true }),
            }))}
          </ListCard>
        );
      case 'yourFeeds':
        if (yourFeeds.length === 0) return null;
        return (
          <ListCard>
            {yourFeeds.map(({ feed, unread }) => renderRow({
              key: feed.id || feed.url,
              title: feed.title || feed.url,
              subtitle: t('home.unreadCount', { count: formatNumber(unread) }),
              onPress: () => openFeedList({ sourceFeedUrl: feed.url }),
              leading: feed.isPriority ? (
                <Ionicons name="star" size={16} color={theme.colors.warning} style={styles.rowLeading} />
              ) : null,
            }))}
          </ListCard>
        );
      case 'recentNotes':
        if (recentNotes.length === 0) return null;
        return (
          <ListCard>
            {recentNotes.map((entry) => renderRow({
              key: entry.article.id,
              title: entry.text,
              subtitle: entry.article.title,
              onPress: () => openArticle(entry),
            }))}
          </ListCard>
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
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={() => setCustomizeVisible(false)}
    >
      <View style={ui.scrim}>
        <TouchableOpacity style={styles.sheetBackdrop} activeOpacity={1} onPress={() => setCustomizeVisible(false)} />
        <DragSheet onClose={() => setCustomizeVisible(false)} style={[ui.sheet, styles.sheet, { paddingBottom: Math.max(insets.bottom, 12) + 12 }]}>
          <SheetDragArea>
            <View style={ui.sheetHandle} />
            <Text style={[ui.title, styles.sheetTitle]}>{t('home.customize')}</Text>
          </SheetDragArea>
          <Text style={[ui.secondary, styles.sheetHint]}>{t('home.customizeHint')}</Text>
          <ScrollView style={styles.sheetList}>
            {homeSections.map((section, index) => {
              const info = sectionInfo.get(section.id);
              if (!info) return null;
              const isFirst = index === 0;
              const isLast = index === homeSections.length - 1;
              return (
                <View key={section.id} style={[styles.customizeRow, isLast && styles.customizeRowLast]}>
                  <Ionicons name={info.icon} size={20} color={section.visible ? iconColor : theme.colors.textSecondary} />
                  <Text
                    style={[ui.body, styles.customizeLabel, !section.visible && styles.customizeLabelHidden]}
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
                    <Ionicons name="arrow-up" size={20} color={isFirst ? theme.colors.disabled : theme.colors.text} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => moveSection(index, 1)}
                    disabled={isLast}
                    style={styles.arrowButton}
                    accessibilityLabel={t('home.moveDown')}
                  >
                    <Ionicons name="arrow-down" size={20} color={isLast ? theme.colors.disabled : theme.colors.text} />
                  </TouchableOpacity>
                  <ThemedSwitch
                    value={section.visible}
                    onValueChange={() => toggleSection(section.id)}
                    accessibilityLabel={t(info.titleKey)}
                  />
                </View>
              );
            })}
          </ScrollView>
          <View style={styles.sheetButtons}>
            <TouchableOpacity style={styles.textButton} onPress={resetHomeSections}>
              <Text style={styles.textButtonLabel}>{t('home.resetLayout')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[ui.primaryButton, styles.doneButton]} onPress={() => setCustomizeVisible(false)}>
              <Text style={ui.primaryLabel}>{t('common.done')}</Text>
            </TouchableOpacity>
          </View>
        </DragSheet>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={ui.page}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.mainInk}
            colors={[theme.colors.mainInk]}
            progressBackgroundColor={theme.colors.surface}
          />
        }
      >
        {/* Header: the logo, the welcome as the screen's title, and a round
            button to customize the sections below */}
        <View style={styles.header}>
          <Image
            source={isDarkMode ? require('../../assets/logo-invert.png') : require('../../assets/logo.png')}
            style={styles.logoIcon}
            resizeMode="contain"
          />
          <View style={styles.headerText}>
            <Text style={ui.screenTitle} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.8}>
              {t('home.welcome')}
            </Text>
            <Text style={[ui.secondaryOnWash, styles.subtitleText]}>
              {t('home.subtitle')}
            </Text>
          </View>
          <TouchableOpacity
            ref={tourCustomizeRef}
            style={ui.roundButton}
            onPress={() => setCustomizeVisible(true)}
            accessibilityLabel={t('home.customize')}
          >
            <Ionicons name="grid-outline" size={20} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        {visibleSections.map(({ id, body }) => (
          <View key={id} style={styles.section}>
            <SectionTitle title={t(sectionInfo.get(id).titleKey)} />
            {body}
          </View>
        ))}

        {allHidden && totalFeeds > 0 && (
          <Text style={[ui.secondaryOnWash, styles.allHiddenText]}>
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
            <Text style={styles.emptyTitle}>
              {t('home.getStarted')}
            </Text>
            <Text style={styles.emptyMessage}>
              {t('home.getStartedMessage')}
            </Text>
            <TouchableOpacity
              style={ui.primaryButton}
              onPress={() => openInFeeds('AddFeed')}
            >
              <Text style={ui.primaryLabel}>{t('home.addFirstFeed')}</Text>
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

const useStyles = makeStyles(({ colors: c }, isRTL) => {
  const row = isRTL ? 'row-reverse' : 'row';
  return {
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 24,
    },
    header: {
      flexDirection: row,
      alignItems: 'center',
      gap: 10,
      marginBottom: 8,
    },
    logoIcon: {
      width: 48,
      height: 48,
    },
    headerText: {
      flex: 1,
    },
    subtitleText: {
      marginTop: 2,
    },
    section: {
      marginBottom: 4,
    },
    overviewGrid: {
      flexDirection: row,
      gap: 12,
    },
    overviewCard: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 14,
      paddingHorizontal: 8,
    },
    overviewIcon: {
      marginBottom: 8,
    },
    overviewValue: {
      ...TYPE.count,
      fontSize: 22,
      color: c.text,
    },
    // The unread count is what to notice: accent ink
    overviewValueHighlight: {
      color: c.accentInk,
    },
    overviewTitle: {
      ...TYPE.secondary,
      color: c.textSecondary,
      marginTop: 2,
      textAlign: 'center',
    },
    quickActions: {
      flexDirection: row,
      gap: 12,
    },
    quickAction: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 4,
    },
    quickActionLabel: {
      ...TYPE.label,
      color: c.text,
      marginTop: 6,
    },
    row: {
      flexDirection: row,
      alignItems: 'center',
      gap: 8,
      paddingVertical: 12,
      minHeight: 48,
    },
    rowLeading: {
      marginHorizontal: 2,
    },
    rowText: {
      flex: 1,
    },
    rowSubtitle: {
      marginTop: 3,
    },
    allHiddenText: {
      textAlign: 'center',
      marginTop: 16,
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 40,
    },
    emptyTitle: {
      fontFamily: FONT.bold,
      fontSize: 22,
      color: c.text,
      marginTop: 16,
      marginBottom: 8,
    },
    emptyMessage: {
      ...TYPE.body,
      fontSize: 15,
      color: c.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
      marginBottom: 24,
    },
    sheetBackdrop: {
      flex: 1,
    },
    sheet: {
      paddingHorizontal: 20,
      maxHeight: '85%',
    },
    sheetTitle: {
      marginTop: 14,
    },
    sheetHint: {
      marginTop: 4,
      marginBottom: 8,
    },
    sheetList: {
      flexGrow: 0,
    },
    customizeRow: {
      flexDirection: row,
      alignItems: 'center',
      gap: 8,
      paddingVertical: 8,
      minHeight: 52,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    customizeRowLast: {
      borderBottomWidth: 0,
    },
    customizeLabel: {
      flex: 1,
      fontFamily: FONT.medium,
    },
    customizeLabelHidden: {
      color: c.textSecondary,
    },
    arrowButton: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sheetButtons: {
      flexDirection: row,
      alignItems: 'center',
      gap: 12,
      marginTop: 16,
    },
    textButton: {
      minHeight: 46,
      justifyContent: 'center',
      paddingHorizontal: 8,
    },
    textButtonLabel: {
      ...TYPE.button,
      color: c.mainInk,
    },
    doneButton: {
      flex: 1,
    },
  };
});
