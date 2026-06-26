import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActionSheetIOS,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFeed } from '../context/FeedContext';
import { useTheme } from '../context/ThemeContext';
import { parseRSSFeed, isValidRSSUrl } from '../utils/rssParser';
import { parseRSSFeedWithProxy } from '../utils/corsRssParser';
import { useAppSettings } from '../context/AppSettingsContext';
import { useTranslation } from '../context/LanguageContext';
import { FEED_REGIONS, getCuratedFeeds, CURATED_FEEDS } from '../data/curatedFeeds';
import CustomAlert from '../components/CustomAlert';

export default function AddFeedScreen({ navigation }) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const { addFeed, addArticles, feeds, removeFeed, toggleFeedPriority } = useFeed();
  const { theme } = useTheme();
  const { maxArticleAge, feedRegion, feedRegionUserSet, updateFeedRegion } = useAppSettings();
  const { t, language, isRTL, formatNumber } = useTranslation();
  const [alertConfig, setAlertConfig] = useState({ visible: false, title: '', message: '', buttons: [] });

  // Effective feed region: an explicit user choice wins; otherwise follow the app
  // language (English -> 'global'), falling back to 'global' if no curated set exists.
  const effectiveRegion = feedRegionUserSet
    ? feedRegion
    : (language === 'en'
      ? 'global'
      : (CURATED_FEEDS[language] && CURATED_FEEDS[language].length > 0 ? language : 'global'));
  const [selectedRegion, setSelectedRegion] = useState(effectiveRegion);
  useEffect(() => { setSelectedRegion(effectiveRegion); }, [effectiveRegion]);

  const handleSelectRegion = (code) => {
    setSelectedRegion(code);
    updateFeedRegion(code); // explicit choice — stops auto-following the app language
  };

  const feedCategories = getCuratedFeeds(selectedRegion).map((c) => ({
    title: t('category.' + c.categoryKey),
    feeds: c.feeds,
  }));

  const handleAddFeed = async () => {
    if (!url.trim()) {
      setAlertConfig({ visible: true, title: t('common.error'), message: t('addFeed.enterUrl'), icon: 'alert-circle-outline', buttons: [{ text: t('common.ok') }] });
      return;
    }

    if (!isValidRSSUrl(url.trim())) {
      setAlertConfig({ visible: true, title: t('common.error'), message: t('addFeed.enterValidUrl'), icon: 'alert-circle-outline', buttons: [{ text: t('common.ok') }] });
      return;
    }

    // Check if feed already exists
    if (feeds.some(feed => feed.url === url.trim())) {
      setAlertConfig({ visible: true, title: t('common.error'), message: t('addFeed.alreadyAdded'), icon: 'alert-circle-outline', buttons: [{ text: t('common.ok') }] });
      return;
    }

    setLoading(true);
    try {
      console.log('Attempting to parse feed:', url.trim());
      
      let feedData;
      
      // Try the regular parser first
      try {
        feedData = await parseRSSFeed(url.trim(), maxArticleAge);
      } catch (error) {
        console.log('Regular parser failed, trying CORS proxy:', error.message);
        try {
          feedData = await parseRSSFeedWithProxy(url.trim());
        } catch (proxyError) {
          console.log('CORS proxy also failed:', proxyError.message);
          throw new Error('Unable to access this feed. Please check the URL or try a different feed.');
        }
      }
      
      console.log('Feed data received:', {
        title: feedData.title,
        articleCount: feedData.articles?.length || 0
      });
      
      if (!feedData.articles || feedData.articles.length === 0) {
        setAlertConfig({ visible: true, title: t('addFeed.warning'), message: t('addFeed.emptyFeedWarning'), icon: 'warning-outline', buttons: [{ text: t('common.ok') }] });
      }

      await addFeed(url.trim(), feedData.title);
      
      if (feedData.articles && feedData.articles.length > 0) {
        await addArticles(feedData.articles);
      }

      setAlertConfig({
        visible: true,
        title: t('common.success'),
        message: t('addFeed.addedWithArticles', { title: feedData.title, count: formatNumber(feedData.articles?.length || 0) }),
        icon: 'checkmark-circle-outline',
        buttons: [{
          text: t('common.ok'),
          onPress: () => {
            navigation.reset({
              index: 0,
              routes: [{ name: 'FeedList' }],
            });
          }
        }],
      });
    } catch (error) {
      console.error('Error adding feed:', error);
      
      // More detailed error message
      let errorMessage = t('addFeed.failedToAdd') + ' ';

      if (error.message.includes('CORS') || error.message.includes('accessible')) {
        errorMessage += t('addFeed.errorTemporarilyUnavailable') + ' ';
      } else if (error.message.includes('Network')) {
        errorMessage += t('addFeed.errorCheckConnection') + ' ';
      } else if (error.message.includes('Failed to fetch')) {
        errorMessage += t('addFeed.errorInvalidOrUnavailable') + ' ';
      } else if (error.message.includes('Unable to access')) {
        errorMessage += t('addFeed.unableToAccess');
      } else {
        errorMessage += t('addFeed.errorVerifyUrl');
      }

      setAlertConfig({ visible: true, title: t('common.error'), message: errorMessage, icon: 'alert-circle-outline', buttons: [{ text: t('common.ok') }] });
    } finally {
      setLoading(false);
    }
  };

  const handleDirectAddFeed = async (feed) => {
    // Check if feed already exists
    if (feeds.some(existingFeed => existingFeed.url === feed.url)) {
      setAlertConfig({ visible: true, title: t('addFeed.alreadyAddedTitle'), message: t('addFeed.feedAlreadyInFeeds', { name: feed.name }), icon: 'information-circle-outline', buttons: [{ text: t('common.ok') }] });
      return;
    }

    // Show confirmation popup
    setAlertConfig({
      visible: true,
      title: t('addFeed.addButton'),
      message: t('addFeed.confirmAddFeed', { name: feed.name }),
      icon: 'add-circle-outline',
      buttons: [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.add'),
          onPress: async () => {
            setLoading(true);
            try {
              console.log('Adding categorized feed directly:', feed.name, feed.url);

              // Try primary parser first
              let feedData;
              
              try {
                feedData = await parseRSSFeed(feed.url, maxArticleAge);
              } catch (primaryError) {
                console.log('Primary parser failed, trying CORS proxy:', primaryError.message);
                try {
                  feedData = await parseRSSFeedWithProxy(feed.url);
                } catch (proxyError) {
                  console.log('CORS proxy parser also failed:', proxyError.message);
                  throw proxyError;
                }
              }

              if (feedData) {
                console.log('Successfully parsed feed, adding to context...');
                await addFeed(feed.url, feedData.title || feed.name);

                if (feedData.articles && feedData.articles.length > 0) {
                  console.log(`Adding ${feedData.articles.length} articles...`);
                  await addArticles(feedData.articles);
                }

                setAlertConfig({
                  visible: true,
                  title: t('common.success'),
                  message: feedData.articles?.length > 0
                    ? t('addFeed.feedAddedWithCount', { name: feed.name, count: formatNumber(feedData.articles.length) })
                    : t('addFeed.feedAdded', { name: feed.name }),
                  icon: 'checkmark-circle-outline',
                  buttons: [{ text: t('common.ok') }],
                });
              } else {
                throw new Error('Unable to load feed content. Please check the feed URL and try again.');
              }
            } catch (error) {
              console.error('Error adding categorized feed:', error);
              console.error('Error details:', {
                name: error.name,
                message: error.message,
                stack: error.stack
              });

              let errorMessage = t('addFeed.failedToAddNamed', { name: feed.name }) + ' ';

              // More specific error handling
              if (error.message.includes('Network request failed') || error.message.includes('fetch')) {
                errorMessage += t('addFeed.errorNetworkConnection');
              } else if (error.message.includes('CORS') || error.message.includes('accessible')) {
                errorMessage += t('addFeed.errorTemporarilyUnavailable');
              } else if (error.message.includes('404') || error.message.includes('Not found')) {
                errorMessage += t('addFeed.errorNotAccessible404');
              } else if (error.message.includes('Invalid') || error.message.includes('parse')) {
                errorMessage += t('addFeed.errorInvalidFormat');
              } else if (error.message.includes('timeout')) {
                errorMessage += t('addFeed.errorTimedOut');
              } else if (error.message.includes('Unable to access')) {
                errorMessage += t('addFeed.unableToAccess');
              } else {
                errorMessage += t('addFeed.errorVerifyUrlTryAgain');
              }

              // Add troubleshooting tip
              errorMessage += '\n\n' + t('addFeed.manualAddTip');

              setAlertConfig({
                visible: true,
                title: t('common.error'),
                message: errorMessage,
                icon: 'alert-circle-outline',
                buttons: [
                  { text: t('common.cancel'), style: 'cancel' },
                  {
                    text: t('addFeed.tryManualAdd'),
                    onPress: () => {
                      setUrl(feed.url);
                      console.log('Populated URL field for manual add:', feed.url);
                    }
                  }
                ],
              });
            } finally {
              setLoading(false);
            }
          }
        }
      ],
    });
  };

  const clearInput = () => {
    setUrl('');
  };

  const handleRemoveFeed = (feed) => {
    console.log('Attempting to remove feed:', feed.title, 'URL:', feed.url);
    
    // For web platform, use window.confirm for better compatibility
    if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.confirm === 'function') {
      const confirmed = window.confirm(t('addFeed.removeConfirmWeb', { title: feed.title }));
      if (confirmed) {
        performRemoveFeed(feed);
      }
      return;
    }
    
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [t('common.cancel'), t('addFeed.removeFeed')],
          destructiveButtonIndex: 1,
          cancelButtonIndex: 0,
          title: t('addFeed.removeConfirmTitle', { title: feed.title }),
          message: t('addFeed.removeConfirmMessage'),
        },
        async (buttonIndex) => {
          if (buttonIndex === 1) {
            performRemoveFeed(feed);
          }
        }
      );
    } else {
      setAlertConfig({
        visible: true,
        title: t('addFeed.removeFeed'),
        message: t('addFeed.removeConfirmMessageNamed', { title: feed.title }),
        icon: 'trash-outline',
        buttons: [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('common.remove'),
            style: 'destructive',
            onPress: () => performRemoveFeed(feed),
          },
        ],
      });
    }
  };

  const performRemoveFeed = async (feed) => {
    try {
      console.log('Performing remove for feed:', feed.title);
      console.log('Feed data:', { id: feed.id, url: feed.url });
      
      // Always use URL for removal since FeedContext filters by URL
      await removeFeed(feed.url);
      
      // For web platform, use window.alert for better compatibility
      if (Platform.OS === 'web') {
        // Don't show success alert on web to avoid too many popups
        console.log('Feed removed successfully');
      } else {
        setAlertConfig({ visible: true, title: t('common.success'), message: t('addFeed.removedFeed', { title: feed.title }), icon: 'checkmark-circle-outline', buttons: [{ text: t('common.ok') }] });
      }
    } catch (error) {
      console.error('Error removing feed:', error);

      if (Platform.OS === 'web') {
        window.alert(t('addFeed.failedToRemove'));
      } else {
        setAlertConfig({ visible: true, title: t('common.error'), message: t('addFeed.failedToRemove'), icon: 'alert-circle-outline', buttons: [{ text: t('common.ok') }] });
      }
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    try {
      return date.toLocaleDateString(language);
    } catch (e) {
      return date.toLocaleDateString();
    }
  };

  const SectionHeader = ({ title }) => (
    <Text style={styles.sectionHeader}>{title}</Text>
  );

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    keyboardContainer: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    headerButton: {
      padding: 8,
      minWidth: 40,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text,
    },
    content: {
      flex: 1,
    },
    inputSection: {
      backgroundColor: theme.colors.surface,
      margin: 16,
      padding: 20,
      borderRadius: 12,
      ...(Platform.OS === 'web' ? theme.shadows.cardWeb : theme.shadows.card),
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 8,
    },
    sectionDescription: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      lineHeight: 20,
      marginBottom: 20,
    },
    inputContainer: {
      position: 'relative',
      marginBottom: 20,
    },
    textInput: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 8,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 16,
      backgroundColor: theme.colors.surface,
      paddingRight: 40,
      color: theme.colors.text,
    },
    clearButton: {
      position: 'absolute',
      right: 12,
      top: 12,
    },
    addButton: {
      backgroundColor: theme.colors.primary,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      borderRadius: 8,
    },
    addButtonDisabled: {
      backgroundColor: theme.colors.textTertiary,
    },
    addButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
      marginLeft: 8,
    },
    categoriesSection: {
      backgroundColor: theme.colors.surface,
      margin: 16,
      marginTop: 0,
      padding: 20,
      borderRadius: 12,
      ...(Platform.OS === 'web' ? theme.shadows.cardWeb : theme.shadows.card),
    },
    categoryContainer: {
      marginBottom: 20,
    },
    categoryTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 8,
    },
    feedGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    feedChip: {
      backgroundColor: theme.colors.background,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 16,
      marginRight: 8,
      marginBottom: 8,
    },
    feedChipText: {
      fontSize: 12,
      color: theme.colors.primary,
      fontWeight: '500',
    },
    helpSection: {
      backgroundColor: theme.colors.surface,
      margin: 16,
      marginTop: 0,
      padding: 20,
      borderRadius: 12,
      ...(Platform.OS === 'web' ? theme.shadows.cardWeb : theme.shadows.card),
    },
    helpItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    helpText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginLeft: 12,
      flex: 1,
      lineHeight: 20,
    },
    sectionHeader: {
      fontSize: 17,
      fontWeight: '600',
      color: theme.colors.text,
      marginHorizontal: 16,
      marginTop: 20,
      marginBottom: 8,
    },
    section: {
      backgroundColor: theme.colors.surface,
      margin: 16,
      marginTop: 0,
      borderRadius: 12,
      ...(Platform.OS === 'web' ? theme.shadows.cardWeb : theme.shadows.card),
    },
    feedItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 16,
      paddingHorizontal: 16,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    feedContent: {
      flex: 1,
    },
    feedTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 4,
    },
    feedUrl: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginBottom: 2,
    },
    feedDate: {
      fontSize: 12,
      color: theme.colors.textTertiary,
    },
    trashButton: {
      padding: 8,
      marginLeft: 8,
    },
    priorityButton: {
      padding: 8,
      marginLeft: 4,
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: 40,
      margin: 16,
      marginTop: 0,
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      ...(Platform.OS === 'web' ? theme.shadows.cardWeb : theme.shadows.card),
    },
    emptyText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.textSecondary,
      marginTop: 12,
      marginBottom: 4,
    },
    emptySubText: {
      fontSize: 14,
      color: theme.colors.textTertiary,
      textAlign: 'center',
    },
    loadingOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingBox: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      padding: 28,
      alignItems: 'center',
      minWidth: 200,
      elevation: 5,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
    },
    loadingText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
      marginTop: 16,
    },
    loadingSubtext: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      marginTop: 6,
    },
  });

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation.reset({
              index: 0,
              routes: [{ name: 'FeedList' }],
            })}
          >
            <Ionicons name="close" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('addFeed.addButton')}</Text>
          <View style={styles.headerButton} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <SectionHeader title={t('addFeed.yourFeeds', { count: formatNumber(feeds.length) })} />
          {feeds.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="newspaper-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>{t('addFeed.noFeedsYet')}</Text>
              <Text style={styles.emptySubText}>{t('addFeed.noFeedsSubtext')}</Text>
            </View>
          ) : (
            <View style={styles.section}>
              {feeds.map((feed, index) => (
                <View
                  key={feed.id || feed.url || index}
                  style={[styles.feedItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                >
                  <View style={styles.feedContent}>
                    <Text style={[styles.feedTitle, { textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={1}>
                      {feed.title || feed.url || t('addFeed.unknownFeed')}
                    </Text>
                    <Text style={[styles.feedUrl, { textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={1}>
                      {feed.url || t('addFeed.noUrl')}
                    </Text>
                    <Text style={[styles.feedDate, { textAlign: isRTL ? 'right' : 'left' }]}>
                      {t('addFeed.addedDate', { date: formatDate(feed.addedAt) })}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => toggleFeedPriority(feed.id)}
                    style={styles.priorityButton}
                  >
                    <Ionicons
                      name={feed.isPriority ? 'star' : 'star-outline'}
                      size={20}
                      color={feed.isPriority ? theme.colors.warning : theme.colors.textSecondary}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      console.log('Trash icon pressed for feed:', feed);
                      handleRemoveFeed(feed);
                    }}
                    style={styles.trashButton}
                  >
                    <Ionicons name="trash-outline" size={20} color={theme.colors.error} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          <View style={styles.inputSection}>
            <Text style={[styles.sectionTitle, { textAlign: isRTL ? 'right' : 'left' }]}>{t('addFeed.rssFeedUrl')}</Text>
            <Text style={[styles.sectionDescription, { textAlign: isRTL ? 'right' : 'left' }]}>
              {t('addFeed.rssFeedUrlDescription')}
            </Text>
            
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.textInput}
                value={url}
                onChangeText={setUrl}
                placeholder="https://example.com/feed.xml"
                placeholderTextColor="#999"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                returnKeyType="done"
                onSubmitEditing={handleAddFeed}
                editable={!loading}
              />
              {url.length > 0 && (
                <TouchableOpacity style={styles.clearButton} onPress={clearInput}>
                  <Ionicons name="close-circle" size={20} color="#999" />
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              style={[styles.addButton, { flexDirection: isRTL ? 'row-reverse' : 'row' }, loading && styles.addButtonDisabled]}
              onPress={handleAddFeed}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="add" size={20} color="#fff" />
                  <Text style={[styles.addButtonText, isRTL && { marginLeft: 0, marginRight: 8 }]}>{t('addFeed.addButton')}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.categoriesSection}>
            <Text style={[styles.sectionTitle, { textAlign: isRTL ? 'right' : 'left' }]}>{t('addFeed.popularCategories')}</Text>
            <Text style={[styles.sectionDescription, { textAlign: isRTL ? 'right' : 'left' }]}>
              {t('addFeed.popularDescription')}
            </Text>

            <Text style={{ color: theme.colors.textSecondary, textAlign: isRTL ? 'right' : 'left', fontSize: 13, fontWeight: '600', marginTop: 12, marginBottom: 8 }}>
              {t('region.label')}
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 14 }}
              contentContainerStyle={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}
            >
              {FEED_REGIONS.map((r) => {
                const active = selectedRegion === r.code;
                return (
                  <TouchableOpacity
                    key={r.code}
                    onPress={() => handleSelectRegion(r.code)}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: 20,
                      marginRight: isRTL ? 0 : 8,
                      marginLeft: isRTL ? 8 : 0,
                      backgroundColor: active ? theme.colors.primary : theme.colors.surface,
                      borderWidth: 1,
                      borderColor: active ? theme.colors.primary : theme.colors.border,
                    }}
                  >
                    <Text style={{ color: active ? '#fff' : theme.colors.text, fontWeight: active ? '700' : '500', fontSize: 13 }}>
                      {t(r.labelKey)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {feedCategories.map((category, index) => (
              <View key={index} style={styles.categoryContainer}>
                <Text style={[styles.categoryTitle, { textAlign: isRTL ? 'right' : 'left' }]}>{category.title}</Text>
                <View style={[styles.feedGrid, isRTL && { flexDirection: 'row-reverse' }]}>
                  {category.feeds.map((feed, feedIndex) => (
                    <TouchableOpacity
                      key={feedIndex}
                      style={styles.feedChip}
                      onPress={() => handleDirectAddFeed(feed)}
                      disabled={loading}
                    >
                      <Text style={styles.feedChipText}>{feed.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))}
          </View>

          <View style={styles.helpSection}>
            <Text style={[styles.sectionTitle, { textAlign: isRTL ? 'right' : 'left' }]}>{t('addFeed.howToFind')}</Text>
            <View style={[styles.helpItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Ionicons name="search-outline" size={20} color="#666" />
              <Text style={[styles.helpText, isRTL && { marginLeft: 0, marginRight: 12, textAlign: 'right' }]}>
                {t('addFeed.helpLookForLinks')}
              </Text>
            </View>
            <View style={[styles.helpItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Ionicons name="globe-outline" size={20} color="#666" />
              <Text style={[styles.helpText, isRTL && { marginLeft: 0, marginRight: 12, textAlign: 'right' }]}>
                {t('addFeed.helpFeedPaths')}
              </Text>
            </View>
            <View style={[styles.helpItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Ionicons name="shield-checkmark-outline" size={20} color={theme.colors.textSecondary} />
              <Text style={[styles.helpText, isRTL && { marginLeft: 0, marginRight: 12, textAlign: 'right' }]}>
                {t('addFeed.helpAdsRemoved')}
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Loading overlay - visible regardless of scroll position */}
      <Modal
        visible={loading}
        transparent={true}
        animationType="fade"
        statusBarTranslucent={true}
      >
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingBox}>
            <ActivityIndicator color={theme.colors.primary} size="large" />
            <Text style={styles.loadingText}>{t('addFeed.addingFeed')}</Text>
            <Text style={styles.loadingSubtext}>{t('addFeed.fetchingArticles')}</Text>
          </View>
        </View>
      </Modal>

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
