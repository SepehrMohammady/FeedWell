import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, makeStyles } from '../context/ThemeContext';
import { FONT, TYPE, RADIUS } from '../theme/type';
import { useTranslation } from '../context/LanguageContext';
import { formatLocalizedDate } from '../utils/formatDate';
import { useAppSettings } from '../context/AppSettingsContext';
import { useReadLater } from '../context/ReadLaterContext';
import { useAmbientSound } from '../context/AmbientSoundContext';
import ArticleImage from '../components/ArticleImage';
import CustomAlert from '../components/CustomAlert';
import { useTourTarget } from '../context/TourContext';

export default function ReadLaterScreen({ navigation }) {
  const { theme } = useTheme();
  const tourHeaderRef = useTourTarget('saved.header');
  const { t, isRTL, formatNumber, language } = useTranslation();
  const styles = useStyles(isRTL);
  // Sort order is persisted app-wide (like the Feeds tab) so it survives
  // navigating into an article and back.
  const { showImages, readLaterSortOrder: sortOrder, updateReadLaterSortOrder } = useAppSettings();
  const { articles, loading, clearReadLater, removeFromReadLater } = useReadLater();
  const { setShowPlaylist: openSoundPlaylist } = useAmbientSound();
  const [searchQuery, setSearchQuery] = useState('');
  const [alertConfig, setAlertConfig] = useState({ visible: false, title: '', message: '', buttons: [] });

  // Filter and sort articles
  const filteredAndSortedArticles = useMemo(() => {
    let filtered = articles;
    
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
    const sorted = [...filtered].sort((a, b) => {
      const dateA = new Date(a.publishedDate || 0);
      const dateB = new Date(b.publishedDate || 0);
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });
    
    return sorted;
  }, [articles, searchQuery, sortOrder]);

  const toggleSort = () => {
    updateReadLaterSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest');
  };

  const handleArticlePress = (article) => {
    navigation.navigate('ArticleReader', { article });
  };

  const handleClearAll = () => {
    if (articles.length === 0) return;
    
    // Use browser-compatible confirm dialog for web, Alert for mobile
    if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
      // Web environment - use native confirm
      const confirmed = window.confirm(t('readLater.clearAllConfirm'));
      if (confirmed) {
        clearReadLater();
      }
    } else {
      // Mobile environment - use Alert
      setAlertConfig({
        visible: true,
        title: t('common.clearAll'),
        message: t('readLater.clearAllConfirm'),
        icon: 'trash-outline',
        buttons: [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('common.clearAll'),
            style: 'destructive',
            onPress: clearReadLater
          },
        ],
      });
    }
  };

  const handleRemoveArticle = (articleId) => {
    // Use browser-compatible confirm dialog for web, Alert for mobile
    if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
      // Web environment - use native confirm
      const confirmed = window.confirm(t('readLater.removeConfirm'));
      if (confirmed) {
        removeFromReadLater(articleId);
      }
    } else {
      // Mobile environment - use Alert
      setAlertConfig({
        visible: true,
        title: t('readLater.removeArticle'),
        message: t('readLater.removeConfirm'),
        icon: 'trash-outline',
        buttons: [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('common.remove'),
            style: 'destructive',
            onPress: () => removeFromReadLater(articleId)
          },
        ],
      });
    }
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons
        name="save-outline"
        size={64}
        color={theme.colors.textSecondary}
      />
      <Text style={styles.emptyTitle}>
        {t('readLater.emptyTitle')}
      </Text>
      <Text style={styles.emptyMessage}>
        {t('readLater.emptyMessage')}
      </Text>
    </View>
  );

  // The list is one card made of its rows: each on the surface, the first and
  // last with the card's corners, hairlines between them
  const renderArticleItem = ({ item, index }) => {
    const isFirst = index === 0;
    const isLast = index === filteredAndSortedArticles.length - 1;
    return (
      <View style={[styles.item, isFirst && styles.itemFirst, isLast && styles.itemLast]}>
        <TouchableOpacity
          style={styles.articleCard}
          onPress={() => handleArticlePress(item)}
          activeOpacity={0.7}
        >
          <View style={styles.articleContent}>
            <View style={styles.articleHeader}>
              <Text style={styles.feedTitle} numberOfLines={1}>
                {item.feedTitle}
              </Text>
              <Text style={styles.date}>
                {formatDate(item.publishedDate)}
              </Text>
            </View>

            <Text style={styles.title} numberOfLines={2}>
              {item.title}
            </Text>

            {item.description && (
              <Text style={styles.description} numberOfLines={2}>
                {item.description}
              </Text>
            )}

            <View style={styles.footer}>
              {item.offlineCached && (
                <View style={styles.offlineIndicator}>
                  <Ionicons name="download" size={10} color={theme.colors.success} />
                  <Text style={styles.offlineText}>{t('readLater.offline')}</Text>
                </View>
              )}
              <TouchableOpacity
                style={styles.trashButton}
                onPress={() => handleRemoveArticle(item.id)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="trash-outline" size={14} color={theme.colors.error} />
              </TouchableOpacity>
            </View>
          </View>

          {showImages ? (
            item.imageUrl ? (
              <ArticleImage
                uri={item.imageUrl}
                style={styles.image}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.image, styles.placeholderImage]}>
                <Ionicons name="image-outline" size={32} color={theme.colors.textSecondary} />
              </View>
            )
          ) : null}
        </TouchableOpacity>
        {!isLast && <View style={styles.rowDivider} />}
      </View>
    );
  };

  const formatDate = (dateString) => formatLocalizedDate(dateString, language, formatNumber, {
    withYear: false,
    withTime: true,
    localeOptions: { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' },
  });

  const renderHeader = () => (
    <View style={styles.header}>
      <View ref={tourHeaderRef} collapsable={false} style={styles.headerContent}>
        <Text style={styles.headerTitle}>
          {t('readLater.title')}
        </Text>
        <Text style={styles.headerSubtitle}>
          {searchQuery
            ? t(filteredAndSortedArticles.length === 1 ? 'readLater.subtitleFoundOne' : 'readLater.subtitleFoundOther', { count: formatNumber(filteredAndSortedArticles.length) })
            : t(filteredAndSortedArticles.length === 1 ? 'readLater.subtitleSavedOne' : 'readLater.subtitleSavedOther', { count: formatNumber(filteredAndSortedArticles.length) })}
        </Text>
      </View>
      <View style={styles.headerButtons}>
        <TouchableOpacity
          style={styles.sortButton}
          onPress={() => openSoundPlaylist(true)}
        >
          <Ionicons name="musical-notes-outline" size={20} color={theme.colors.text} />
          <Text style={styles.headerButtonLabel}>{t('readLater.sounds')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.sortButton}
          onPress={toggleSort}
        >
          <Ionicons
            name={sortOrder === 'newest' ? 'arrow-down' : 'arrow-up'}
            size={20}
            color={theme.colors.text}
          />
          <Text style={styles.headerButtonLabel}>{t('readLater.sort')}</Text>
        </TouchableOpacity>
        {articles.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={handleClearAll}
          >
            <Text style={styles.clearButtonText}>
              {t('common.clearAll')}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderSearchBar = () => (
    <View style={styles.searchContainer}>
      <Ionicons name="search" size={20} color={theme.colors.textSecondary} style={styles.searchIcon} />
      <TextInput
        style={styles.searchInput}
        placeholder={t('readLater.searchPlaceholder')}
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
  );

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.container}>
      {renderHeader()}
      {articles.length > 0 && renderSearchBar()}
      <FlatList
        data={filteredAndSortedArticles}
        keyExtractor={(item) => item.id}
        renderItem={renderArticleItem}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={filteredAndSortedArticles.length === 0 ? styles.emptyList : styles.list}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={() => {}} // Read Later doesn't need refresh
            tintColor={theme.colors.mainInk}
            colors={[theme.colors.mainInk]}
            progressBackgroundColor={theme.colors.surface}
          />
        }
        showsVerticalScrollIndicator={false}
      />

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

// Styles built once per theme and direction (Calm Surfaces 3), the same
// pieces as the Feeds list
const useStyles = makeStyles(({ colors: c }, isRTL) => {
  const row = isRTL ? 'row-reverse' : 'row';
  const textAlign = isRTL ? 'right' : 'left';
  const writingDirection = isRTL ? 'rtl' : 'ltr';
  return {
    container: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    header: {
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 4,
      flexDirection: row,
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 8,
    },
    headerContent: {
      flex: 1,
    },
    headerTitle: {
      ...TYPE.screenTitle,
      color: c.text,
      textAlign,
      writingDirection,
    },
    // Straight on the wash, so in the tone that reads on its glows
    headerSubtitle: {
      ...TYPE.secondary,
      color: c.textSecondaryOnWash,
      marginTop: 2,
      textAlign,
      writingDirection,
    },
    headerButtons: {
      flexDirection: row,
      alignItems: 'center',
      gap: 4,
    },
    sortButton: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 6,
      paddingVertical: 4,
      minWidth: 44,
      minHeight: 44,
    },
    headerButtonLabel: {
      fontFamily: FONT.medium,
      fontSize: 10,
      marginTop: 2,
      color: c.textSecondaryOnWash,
    },
    // A text button on the wash sits on a round surface pill, where red reads
    clearButton: {
      justifyContent: 'center',
      paddingHorizontal: 14,
      minHeight: 36,
      borderRadius: RADIUS.round,
      backgroundColor: c.surface,
      ...(c.amoled ? { borderWidth: 1, borderColor: c.cardBorder } : null),
    },
    clearButtonText: {
      ...TYPE.label,
      fontFamily: FONT.semiBold,
      color: c.error,
    },
    searchContainer: {
      flexDirection: row,
      alignItems: 'center',
      marginHorizontal: 16,
      marginVertical: 8,
      paddingHorizontal: 16,
      minHeight: 48,
      backgroundColor: c.surface,
      borderRadius: RADIUS.round,
      borderWidth: 1,
      borderColor: c.border,
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
    list: {
      paddingTop: 4,
      paddingBottom: 16,
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
      ...TYPE.title,
      fontSize: 20,
      color: c.text,
      marginTop: 16,
      marginBottom: 8,
      textAlign: 'center',
    },
    emptyMessage: {
      ...TYPE.body,
      fontSize: 15,
      color: c.textSecondaryOnWash,
      textAlign: 'center',
      lineHeight: 22,
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
    // The first and last rows round the card's corners, without clipping (a
    // clipped edge shows a faint seam on Android)
    itemFirst: {
      borderTopLeftRadius: RADIUS.card,
      borderTopRightRadius: RADIUS.card,
      ...(c.amoled ? { borderTopWidth: 1 } : null),
    },
    itemLast: {
      borderBottomLeftRadius: RADIUS.card,
      borderBottomRightRadius: RADIUS.card,
      marginBottom: 0,
      ...(c.amoled ? { borderBottomWidth: 1 } : null),
    },
    rowDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: c.border,
      marginHorizontal: 16,
    },
    articleCard: {
      padding: 16,
      flexDirection: row,
    },
    articleContent: {
      flex: 1,
    },
    articleHeader: {
      flexDirection: row,
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 6,
    },
    feedTitle: {
      fontFamily: FONT.semiBold,
      fontSize: 12.5,
      color: c.mainInk,
      flex: 1,
      marginRight: isRTL ? 0 : 8,
      marginLeft: isRTL ? 8 : 0,
      textAlign,
      writingDirection,
    },
    date: {
      ...TYPE.secondary,
      color: c.textSecondary,
    },
    title: {
      ...TYPE.rowTitle,
      color: c.text,
      marginBottom: 4,
      lineHeight: 20,
      textAlign,
      writingDirection,
    },
    description: {
      ...TYPE.body,
      fontSize: 13.5,
      color: c.textSecondary,
      lineHeight: 19,
      marginBottom: 8,
      textAlign,
      writingDirection,
    },
    footer: {
      flexDirection: row,
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 4,
    },
    // Saved for offline reading: a state, so in green on its tint
    offlineIndicator: {
      flexDirection: row,
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: RADIUS.round,
      backgroundColor: c.successTint,
    },
    offlineText: {
      ...TYPE.small,
      fontSize: 10,
      fontFamily: FONT.semiBold,
      color: c.success,
    },
    // Removing is the red action: a red icon on its tint
    trashButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.errorTint,
    },
    image: {
      width: 80,
      height: 80,
      borderRadius: 12,
      backgroundColor: c.surface2,
      marginLeft: isRTL ? 0 : 12,
      marginRight: isRTL ? 12 : 0,
    },
    placeholderImage: {
      justifyContent: 'center',
      alignItems: 'center',
    },
  };
});
