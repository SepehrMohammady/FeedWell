import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActionSheetIOS,
  Modal,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFeed } from '../context/FeedContext';
import { useTheme, makeStyles } from '../context/ThemeContext';
import { useUi, ListCard, SectionTitle } from '../theme/ui';
import { FONT, TYPE, RADIUS } from '../theme/type';
import { parseRSSFeed, isValidRSSUrl, discoverFeedUrl } from '../utils/rssParser';
import { parseRSSFeedWithProxy } from '../utils/corsRssParser';
import { useAppSettings } from '../context/AppSettingsContext';
import { useTranslation } from '../context/LanguageContext';
import { FEED_REGIONS, getCuratedFeeds, CURATED_FEEDS } from '../data/curatedFeeds';
import { formatLocalizedDate } from '../utils/formatDate';
import CustomAlert from '../components/CustomAlert';
import { DragSheet, SheetDragArea } from '../components/DragSheet';
import { useTourTarget } from '../context/TourContext';

export default function AddFeedScreen({ navigation }) {
  // The tour scrolls each target into view before spotlighting it.
  const scrollRef = useRef(null);
  const inputYRef = useRef(0);
  const categoriesYRef = useRef(0);
  // The URL box sits below the user's feed list, so with many feeds it starts
  // off screen: scroll it into view before the tour spotlights it.
  const tourUrlRef = useTourTarget('addFeed.url', () =>
    scrollRef.current?.scrollTo({ y: Math.max(0, inputYRef.current - 12), animated: false }));
  const tourRegionRef = useTourTarget('addFeed.popular', () =>
    scrollRef.current?.scrollTo({ y: Math.max(0, categoriesYRef.current - 12), animated: false }));
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const { addFeed, addArticles, feeds, removeFeed, toggleFeedPriority, toggleFeedHidden } = useFeed();
  const { theme } = useTheme();
  const { maxArticleAge, feedRegion, feedRegionUserSet, updateFeedRegion } = useAppSettings();
  const { t, language, isRTL, formatNumber } = useTranslation();
  const ui = useUi();
  const styles = useStyles(isRTL);
  const insets = useSafeAreaInsets();
  const [alertConfig, setAlertConfig] = useState({ visible: false, title: '', message: '', buttons: [] });

  // Effective feed region: an explicit user choice wins; otherwise follow the app
  // language (English -> 'global'), falling back to 'global' if no curated set exists.
  const effectiveRegion = feedRegionUserSet
    ? feedRegion
    : (language === 'en'
      ? 'global'
      : (CURATED_FEEDS[language] && CURATED_FEEDS[language].length > 0 ? language : 'global'));
  const [selectedRegion, setSelectedRegion] = useState(effectiveRegion);
  const [showRegionPicker, setShowRegionPicker] = useState(false);
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
      
      let feedUrl = url.trim();
      let feedData;

      // Try the regular parser first
      try {
        feedData = await parseRSSFeed(feedUrl, maxArticleAge);
      } catch (error) {
        console.log('Regular parser failed, trying CORS proxy:', error.message);
        try {
          feedData = await parseRSSFeedWithProxy(feedUrl);
        } catch (proxyError) {
          console.log('CORS proxy also failed, trying discovery:', proxyError.message);
          // The user most likely pasted a website address rather than a feed
          // address — look up the site's feed the way a browser would.
          let discovered = null;
          setDiscovering(true);
          try {
            discovered = await discoverFeedUrl(feedUrl);
          } finally {
            setDiscovering(false);
          }
          if (!discovered) {
            throw new Error('Unable to access this feed. Please check the URL or try a different feed.');
          }
          if (feeds.some(feed => feed.url === discovered)) {
            setAlertConfig({ visible: true, title: t('common.error'), message: t('addFeed.alreadyAdded'), icon: 'alert-circle-outline', buttons: [{ text: t('common.ok') }] });
            return;
          }
          console.log('Discovered feed for site:', feedUrl, '->', discovered);
          feedUrl = discovered;
          feedData = await parseRSSFeed(feedUrl, maxArticleAge);
        }
      }
      
      console.log('Feed data received:', {
        title: feedData.title,
        articleCount: feedData.articles?.length || 0
      });
      
      if (!feedData.articles || feedData.articles.length === 0) {
        setAlertConfig({ visible: true, title: t('addFeed.warning'), message: t('addFeed.emptyFeedWarning'), icon: 'warning-outline', buttons: [{ text: t('common.ok') }] });
      }

      await addFeed(feedUrl, feedData.title);
      
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

  const formatDate = (dateString) => formatLocalizedDate(dateString, language, formatNumber, {
    withYear: true,
    withTime: false,
  });

  const colors = theme.colors;
  const region = FEED_REGIONS.find((r) => r.code === selectedRegion) || FEED_REGIONS[0];

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={ui.page}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={ui.roundButton}
            onPress={() => navigation.reset({
              index: 0,
              routes: [{ name: 'FeedList' }],
            })}
          >
            <Ionicons name="close" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={[ui.screenTitle, styles.headerTitle]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
            {t('addFeed.addButton')}
          </Text>
        </View>

        <ScrollView ref={scrollRef} style={styles.content} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <SectionTitle title={t('addFeed.yourFeeds', { count: formatNumber(feeds.length) })} />
          {feeds.length === 0 ? (
            <View style={[ui.card, styles.emptyState]}>
              <Ionicons name="newspaper-outline" size={48} color={colors.outline} />
              <Text style={[ui.rowTitle, styles.emptyText]}>{t('addFeed.noFeedsYet')}</Text>
              <Text style={[ui.secondary, styles.centered]}>{t('addFeed.noFeedsSubtext')}</Text>
            </View>
          ) : (
            <ListCard>
              {feeds.map((feed, index) => (
                <View
                  key={feed.id || feed.url || index}
                  style={styles.feedItem}
                >
                  <View style={styles.feedContent}>
                    <Text style={[ui.rowTitle, feed.isHidden && styles.hiddenFeed]} numberOfLines={1}>
                      {feed.title || feed.url || t('addFeed.unknownFeed')}
                    </Text>
                    <Text style={[ui.secondary, styles.feedUrl]} numberOfLines={1}>
                      {feed.url || t('addFeed.noUrl')}
                    </Text>
                    <Text style={ui.secondary}>
                      {t('addFeed.addedDate', { date: formatDate(feed.addedAt) })}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => toggleFeedHidden(feed.id)}
                    style={styles.feedButton}
                    accessibilityLabel={feed.isHidden ? t('addFeed.showFeed') : t('addFeed.hideFeed')}
                  >
                    <Ionicons
                      name={feed.isHidden ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={feed.isHidden ? colors.disabled : colors.textSecondary}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => toggleFeedPriority(feed.id)}
                    style={styles.feedButton}
                  >
                    <Ionicons
                      name={feed.isPriority ? 'star' : 'star-outline'}
                      size={20}
                      color={feed.isPriority ? colors.warning : colors.textSecondary}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      console.log('Trash icon pressed for feed:', feed);
                      handleRemoveFeed(feed);
                    }}
                    style={styles.feedButton}
                  >
                    <Ionicons name="trash-outline" size={20} color={colors.error} />
                  </TouchableOpacity>
                </View>
              ))}
            </ListCard>
          )}

          <View style={[ui.card, styles.cardSection]} onLayout={(e) => { inputYRef.current = e.nativeEvent.layout.y; }}>
            <Text style={ui.title}>{t('addFeed.rssFeedUrl')}</Text>
            <Text style={[ui.secondary, styles.sectionDescription]}>
              {t('addFeed.rssFeedUrlDescription')}
            </Text>

            <View ref={tourUrlRef} collapsable={false} style={styles.inputContainer}>
              {/* An address reads left to right in every language */}
              <TextInput
                style={[ui.input, styles.textInput]}
                value={url}
                onChangeText={setUrl}
                placeholder="https://example.com/feed.xml"
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                returnKeyType="done"
                onSubmitEditing={handleAddFeed}
                editable={!loading}
              />
              {url.length > 0 && (
                <TouchableOpacity style={styles.clearButton} onPress={clearInput}>
                  <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              style={[ui.primaryButton, loading && styles.addButtonDisabled]}
              onPress={handleAddFeed}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.onPrimary} size="small" />
              ) : (
                <>
                  <Ionicons name="add" size={20} color={colors.onPrimary} />
                  <Text style={ui.primaryLabel}>{t('addFeed.addButton')}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <View style={[ui.card, styles.cardSection]} onLayout={(e) => { categoriesYRef.current = e.nativeEvent.layout.y; }}>
            <Text style={ui.title}>{t('addFeed.popularCategories')}</Text>
            <Text style={[ui.secondary, styles.sectionDescription]}>
              {t('addFeed.popularDescription')}
            </Text>

            <Text style={styles.regionLabel}>
              {t('region.label')}
            </Text>
            <TouchableOpacity
              ref={tourRegionRef}
              onPress={() => setShowRegionPicker(true)}
              style={styles.regionButton}
            >
              <Text style={[ui.rowTitle, styles.flexText]}>
                {t(region.labelKey)}
              </Text>
              <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
            </TouchableOpacity>

            {feedCategories.map((category, index) => (
              <View key={index} style={styles.categoryContainer}>
                <Text style={[ui.rowTitle, styles.categoryTitle]}>{category.title}</Text>
                <View style={styles.feedGrid}>
                  {category.feeds.map((feed, feedIndex) => (
                    <TouchableOpacity
                      key={feedIndex}
                      style={[ui.chip, styles.feedChip]}
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

          <View style={[ui.card, styles.cardSection]}>
            <Text style={[ui.title, styles.helpTitle]}>{t('addFeed.howToFind')}</Text>
            {[
              { icon: 'search-outline', key: 'addFeed.helpLookForLinks' },
              { icon: 'globe-outline', key: 'addFeed.helpFeedPaths' },
              { icon: 'shield-checkmark-outline', key: 'addFeed.helpAdsRemoved' },
            ].map((item) => (
              <View key={item.key} style={styles.helpItem}>
                <View style={ui.iconCircle}>
                  <Ionicons name={item.icon} size={19} color={colors.accentInk} />
                </View>
                <Text style={[ui.body, styles.helpText]}>
                  {t(item.key)}
                </Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Loading overlay - visible regardless of scroll position */}
      <Modal
        visible={loading}
        transparent={true}
        animationType="fade"
        statusBarTranslucent={true}
        navigationBarTranslucent
      >
        <View style={styles.loadingOverlay}>
          <View style={[ui.dialog, styles.loadingBox]}>
            <ActivityIndicator color={colors.mainInk} size="large" />
            <Text style={[ui.title, styles.loadingText]}>{discovering ? t('addFeed.lookingForFeed') : t('addFeed.addingFeed')}</Text>
            <Text style={[ui.secondary, styles.loadingSubtext]}>{t('addFeed.fetchingArticles')}</Text>
          </View>
        </View>
      </Modal>

      {/* Feed-region picker (dropdown) */}
      <Modal
        visible={showRegionPicker}
        transparent
        animationType="slide"
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={() => setShowRegionPicker(false)}
      >
        <View style={styles.sheetOverlay}>
          <DragSheet onClose={() => setShowRegionPicker(false)} style={[ui.sheet, styles.sheet, { paddingBottom: Math.max(insets.bottom, 12) + 12 }]}>
            <SheetDragArea>
              <View style={ui.sheetHandle} />
              <View style={styles.sheetHeader}>
                <Text style={[ui.title, styles.flexText]}>{t('region.label')}</Text>
                <TouchableOpacity
                  onPress={() => setShowRegionPicker(false)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityLabel={t('common.close')}
                >
                  <Ionicons name="close" size={22} color={colors.text} />
                </TouchableOpacity>
              </View>
            </SheetDragArea>
            <ScrollView>
              {FEED_REGIONS.map((r) => {
                const active = selectedRegion === r.code;
                return (
                  <TouchableOpacity
                    key={r.code}
                    onPress={() => { handleSelectRegion(r.code); setShowRegionPicker(false); }}
                    style={[styles.regionItem, active && styles.regionItemActive]}
                  >
                    <Text style={[ui.body, styles.regionItemText, active && styles.regionItemTextActive]}>
                      {t(r.labelKey)}
                    </Text>
                    {active && <Ionicons name="checkmark" size={20} color={colors.mainInk} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </DragSheet>
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

// Styles built once per theme and direction (Calm Surfaces 3)
const useStyles = makeStyles(({ colors: c }, isRTL) => {
  const row = isRTL ? 'row-reverse' : 'row';
  const textAlign = isRTL ? 'right' : 'left';
  return {
    keyboardContainer: {
      flex: 1,
    },
    // A round close button, then the screen's title
    header: {
      flexDirection: row,
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 4,
    },
    headerTitle: {
      flex: 1,
    },
    content: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 16,
      paddingBottom: 24,
    },
    flexText: {
      flex: 1,
    },
    centered: {
      textAlign: 'center',
    },
    cardSection: {
      marginTop: 16,
      padding: 16,
    },
    sectionDescription: {
      lineHeight: 18,
      marginTop: 4,
      marginBottom: 16,
    },
    inputContainer: {
      position: 'relative',
      marginBottom: 14,
    },
    textInput: {
      paddingRight: 44,
      textAlign: 'left',
      writingDirection: 'ltr',
    },
    clearButton: {
      position: 'absolute',
      right: 14,
      top: 14,
    },
    addButtonDisabled: {
      backgroundColor: c.disabled,
    },
    regionLabel: {
      ...TYPE.label,
      color: c.textSecondary,
      textAlign,
      marginBottom: 8,
    },
    // The region opens a picker: a round field with a hairline
    regionButton: {
      flexDirection: row,
      alignItems: 'center',
      gap: 8,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: RADIUS.round,
      paddingHorizontal: 18,
      minHeight: 48,
      marginBottom: 16,
    },
    categoryContainer: {
      marginBottom: 16,
    },
    categoryTitle: {
      marginBottom: 8,
    },
    feedGrid: {
      flexDirection: row,
      flexWrap: 'wrap',
      gap: 8,
    },
    feedChip: {
      minHeight: 36,
      paddingVertical: 6,
    },
    // Each chip adds its feed: what you tap, in main ink
    feedChipText: {
      ...TYPE.label,
      color: c.mainInk,
    },
    helpTitle: {
      marginBottom: 12,
    },
    helpItem: {
      flexDirection: row,
      alignItems: 'center',
      gap: 12,
      marginBottom: 12,
    },
    helpText: {
      flex: 1,
      color: c.textSecondary,
      lineHeight: 20,
    },
    feedItem: {
      flexDirection: row,
      alignItems: 'center',
      paddingVertical: 12,
      gap: 4,
    },
    feedContent: {
      flex: 1,
    },
    feedUrl: {
      marginTop: 2,
    },
    hiddenFeed: {
      opacity: 0.5,
    },
    feedButton: {
      padding: 8,
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: 32,
    },
    emptyText: {
      color: c.textSecondary,
      marginTop: 12,
      marginBottom: 4,
      textAlign: 'center',
    },
    loadingOverlay: {
      flex: 1,
      backgroundColor: c.overlay,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingBox: {
      padding: 28,
      alignItems: 'center',
      minWidth: 200,
    },
    loadingText: {
      marginTop: 16,
      textAlign: 'center',
    },
    loadingSubtext: {
      marginTop: 6,
      textAlign: 'center',
    },
    sheetOverlay: {
      flex: 1,
      backgroundColor: c.overlay,
      justifyContent: 'flex-end',
    },
    sheet: {
      maxHeight: '70%',
    },
    sheetHeader: {
      flexDirection: row,
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 8,
    },
    regionItem: {
      flexDirection: row,
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 14,
    },
    // The region in use: the main tint, its name in main ink
    regionItemActive: {
      backgroundColor: c.mainTint,
    },
    regionItemText: {
      fontFamily: FONT.medium,
      fontSize: 15,
    },
    regionItemTextActive: {
      fontFamily: FONT.semiBold,
      color: c.mainInk,
    },
  };
});
