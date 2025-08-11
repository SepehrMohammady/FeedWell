import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActionSheetIOS,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFeed } from '../context/FeedContext';
import { useTheme } from '../context/ThemeContext';
import { parseRSSFeed, isValidRSSUrl } from '../utils/rssParser';
import { parseRSSFeedWithProxy } from '../utils/corsRssParser';

export default function AddFeedScreen({ navigation }) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const { addFeed, addArticles, feeds, removeFeed } = useFeed();
  const { theme } = useTheme();

  const feedCategories = [
    {
      title: 'Technology',
      feeds: [
        { name: 'TechCrunch', url: 'https://techcrunch.com/feed/' },
        { name: 'The Verge', url: 'https://www.theverge.com/rss/index.xml' },
        { name: 'Wired', url: 'https://www.wired.com/feed/rss' },
        { name: 'Dev.to', url: 'https://dev.to/feed' },
        { name: 'Hacker News', url: 'https://hnrss.org/frontpage' },
      ]
    },
    {
      title: 'News',
      feeds: [
        { name: 'BBC News', url: 'http://feeds.bbci.co.uk/news/rss.xml' },
        { name: 'NPR News', url: 'https://feeds.npr.org/1001/rss.xml' },
        { name: 'Reuters', url: 'https://feeds.reuters.com/reuters/topNews' },
        { name: 'Associated Press', url: 'https://feeds.apnews.com/apnews/topnews' },
        { name: 'CNN News', url: 'http://rss.cnn.com/rss/edition.rss' },
      ]
    },
    {
      title: 'Business',
      feeds: [
        { name: 'Harvard Business Review', url: 'https://feeds.hbr.org/harvardbusiness' },
        { name: 'Forbes', url: 'https://www.forbes.com/real-time/feed2/' },
        { name: 'Financial Times', url: 'https://www.ft.com/rss/home' },
        { name: 'Wall Street Journal', url: 'https://feeds.wsj.com/wsj/xml/rss/3_7085.xml' },
        { name: 'Bloomberg', url: 'https://feeds.bloomberg.com/markets/news.rss' },
      ]
    },
    {
      title: 'Science',
      feeds: [
        { name: 'Science Daily', url: 'https://www.sciencedaily.com/rss/all.xml' },
        { name: 'NASA', url: 'https://www.nasa.gov/rss/dyn/breaking_news.rss' },
        { name: 'Scientific American', url: 'https://rss.sciam.com/ScientificAmerican-Global' },
        { name: 'Nature', url: 'https://www.nature.com/nature.rss' },
        { name: 'New Scientist', url: 'https://www.newscientist.com/feed/home/' },
      ]
    },
    {
      title: 'Lifestyle',
      feeds: [
        { name: 'Medium', url: 'https://medium.com/feed' },
        { name: 'Lifehacker', url: 'https://lifehacker.com/rss' },
        { name: 'The Guardian Culture', url: 'https://www.theguardian.com/culture/rss' },
        { name: 'Mashable', url: 'https://mashable.com/feeds/rss/all' },
        { name: 'BuzzFeed', url: 'https://www.buzzfeed.com/index.xml' },
      ]
    }
  ];

  const handleAddFeed = async () => {
    if (!url.trim()) {
      Alert.alert('Error', 'Please enter a feed URL');
      return;
    }

    if (!isValidRSSUrl(url.trim())) {
      Alert.alert('Error', 'Please enter a valid HTTP or HTTPS URL');
      return;
    }

    // Check if feed already exists
    if (feeds.some(feed => feed.url === url.trim())) {
      Alert.alert('Error', 'This feed has already been added');
      return;
    }

    setLoading(true);
    try {
      console.log('Attempting to parse feed:', url.trim());
      
      let feedData;
      
      // Try the regular parser first
      try {
        feedData = await parseRSSFeed(url.trim());
      } catch (error) {
        console.log('Regular parser failed, trying CORS proxy:', error.message);
        try {
          feedData = await parseRSSFeedWithProxy(url.trim());
        } catch (proxyError) {
          console.log('CORS proxy also failed:', proxyError.message);
          throw new Error(`Failed to parse RSS feed: ${error.message}`);
        }
      }
      
      console.log('Feed data received:', {
        title: feedData.title,
        articleCount: feedData.articles?.length || 0
      });
      
      if (!feedData.articles || feedData.articles.length === 0) {
        Alert.alert('Warning', 'This feed appears to be empty or invalid, but will be added anyway.');
      }

      await addFeed(url.trim(), feedData.title);
      
      if (feedData.articles && feedData.articles.length > 0) {
        await addArticles(feedData.articles);
      }

      Alert.alert(
        'Success',
        `Added "${feedData.title}" with ${feedData.articles?.length || 0} articles`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Error adding feed:', error);
      
      // More detailed error message
      let errorMessage = 'Failed to add feed. ';
      
      if (error.message.includes('CORS')) {
        errorMessage += 'This feed may not be accessible from the web browser due to CORS restrictions. ';
      } else if (error.message.includes('Network')) {
        errorMessage += 'Please check your internet connection. ';
      } else if (error.message.includes('Failed to fetch')) {
        errorMessage += 'The feed URL may be invalid or temporarily unavailable. ';
      } else {
        errorMessage += error.message;
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handlePopularFeed = (feedUrl) => {
    setUrl(feedUrl);
  };

  const handleDirectAddFeed = async (feed) => {
    // Check if feed already exists
    if (feeds.some(existingFeed => existingFeed.url === feed.url)) {
      Alert.alert('Already Added', `"${feed.name}" is already in your feeds`);
      return;
    }

    // Show confirmation popup
    Alert.alert(
      'Add Feed',
      `Add "${feed.name}" to your feeds?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Add', 
          onPress: async () => {
            setLoading(true);
            try {
              console.log('Adding categorized feed directly:', feed.name, feed.url);
              
              // Try primary parser first
              let parsedFeed = null;
              let articles = [];
              
              try {
                const result = await parseRSSFeed(feed.url);
                parsedFeed = result.feed;
                articles = result.articles;
              } catch (primaryError) {
                console.log('Primary parser failed, trying CORS proxy:', primaryError.message);
                try {
                  const result = await parseRSSFeedWithProxy(feed.url);
                  parsedFeed = result.feed;
                  articles = result.articles;
                } catch (proxyError) {
                  console.log('CORS proxy parser also failed:', proxyError.message);
                  throw proxyError;
                }
              }

              if (parsedFeed) {
                console.log('Successfully parsed feed, adding to context...');
                await addFeed(parsedFeed);
                
                if (articles && articles.length > 0) {
                  console.log(`Adding ${articles.length} articles...`);
                  await addArticles(articles);
                }

                Alert.alert(
                  'Success',
                  `"${feed.name}" has been added successfully!${articles.length > 0 ? ` Found ${articles.length} articles.` : ''}`,
                  [{ text: 'OK' }]
                );
              } else {
                throw new Error('Failed to parse feed data');
              }
            } catch (error) {
              console.error('Error adding categorized feed:', error);
              console.error('Error details:', {
                name: error.name,
                message: error.message,
                stack: error.stack
              });
              
              let errorMessage = `Failed to add "${feed.name}". `;
              
              // More specific error handling
              if (error.message.includes('Network request failed') || error.message.includes('fetch')) {
                errorMessage += 'Network connection error. Please check your internet connection.';
              } else if (error.message.includes('CORS')) {
                errorMessage += 'This feed cannot be accessed due to browser security restrictions.';
              } else if (error.message.includes('404') || error.message.includes('Not found')) {
                errorMessage += 'The feed URL is not accessible (404 error).';
              } else if (error.message.includes('Invalid') || error.message.includes('parse')) {
                errorMessage += 'The feed format is invalid or unsupported.';
              } else if (error.message.includes('timeout')) {
                errorMessage += 'Request timed out. The feed server may be slow or unavailable.';
              } else {
                errorMessage += `${error.message}`;
              }
              
              // Add troubleshooting tip
              errorMessage += '\n\nTip: You can try adding the feed manually using the URL input above.';
              
              Alert.alert(
                'Error', 
                errorMessage,
                [
                  { text: 'Cancel', style: 'cancel' },
                  { 
                    text: 'Try Manual Add', 
                    onPress: () => {
                      setUrl(feed.url);
                      console.log('Populated URL field for manual add:', feed.url);
                    }
                  }
                ]
              );
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const clearInput = () => {
    setUrl('');
  };

  const handleRemoveFeed = (feed) => {
    console.log('Attempting to remove feed:', feed.title, 'URL:', feed.url);
    
    // For web platform, use window.confirm for better compatibility
    if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.confirm === 'function') {
      const confirmed = window.confirm(`Remove "${feed.title}"?\n\nThis will remove the feed and all its articles.`);
      if (confirmed) {
        performRemoveFeed(feed);
      }
      return;
    }
    
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Remove Feed'],
          destructiveButtonIndex: 1,
          cancelButtonIndex: 0,
          title: `Remove "${feed.title}"?`,
          message: 'This will remove the feed and all its articles.',
        },
        async (buttonIndex) => {
          if (buttonIndex === 1) {
            performRemoveFeed(feed);
          }
        }
      );
    } else {
      Alert.alert(
        'Remove Feed',
        `Remove "${feed.title}"? This will remove the feed and all its articles.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: () => performRemoveFeed(feed),
          },
        ]
      );
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
        Alert.alert('Success', `Removed "${feed.title}"`);
      }
    } catch (error) {
      console.error('Error removing feed:', error);
      
      if (Platform.OS === 'web') {
        window.alert('Failed to remove feed. Please try again.');
      } else {
        Alert.alert('Error', 'Failed to remove feed. Please try again.');
      }
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
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
  });

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="close" size={24} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add Feed</Text>
          <View style={styles.headerButton} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <SectionHeader title={`Your Feeds (${feeds.length})`} />
          {feeds.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="newspaper-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>No feeds added yet</Text>
              <Text style={styles.emptySubText}>Add your first feed below to get started</Text>
            </View>
          ) : (
            <View style={styles.section}>
              {feeds.map((feed, index) => (
                <TouchableOpacity
                  key={feed.id || feed.url || index}
                  style={styles.feedItem}
                  onPress={() => {
                    console.log('Feed item pressed:', feed);
                    handleRemoveFeed(feed);
                  }}
                >
                  <View style={styles.feedContent}>
                    <Text style={styles.feedTitle} numberOfLines={1}>
                      {feed.title || feed.url || 'Unknown Feed'}
                    </Text>
                    <Text style={styles.feedUrl} numberOfLines={1}>
                      {feed.url || 'No URL'}
                    </Text>
                    <Text style={styles.feedDate}>
                      Added {formatDate(feed.addedAt)}
                    </Text>
                  </View>
                  <Ionicons name="trash-outline" size={20} color="#ff3b30" />
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={styles.inputSection}>
            <Text style={styles.sectionTitle}>RSS Feed URL</Text>
            <Text style={styles.sectionDescription}>
              Enter the URL of an RSS or Atom feed you'd like to follow
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
              style={[styles.addButton, loading && styles.addButtonDisabled]}
              onPress={handleAddFeed}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="add" size={20} color="#fff" />
                  <Text style={styles.addButtonText}>Add Feed</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.categoriesSection}>
            <Text style={styles.sectionTitle}>Popular Categories</Text>
            <Text style={styles.sectionDescription}>
              Choose from curated feeds in different categories
            </Text>
            
            {feedCategories.map((category, index) => (
              <View key={index} style={styles.categoryContainer}>
                <Text style={styles.categoryTitle}>{category.title}</Text>
                <View style={styles.feedGrid}>
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
            <Text style={styles.sectionTitle}>How to find RSS feeds</Text>
            <View style={styles.helpItem}>
              <Ionicons name="search-outline" size={20} color="#666" />
              <Text style={styles.helpText}>
                Look for RSS, XML, or feed links on websites
              </Text>
            </View>
            <View style={styles.helpItem}>
              <Ionicons name="globe-outline" size={20} color="#666" />
              <Text style={styles.helpText}>
                Many news sites have feeds at /feed, /rss, or /feed.xml
              </Text>
            </View>
            <View style={styles.helpItem}>
              <Ionicons name="shield-checkmark-outline" size={20} color={theme.colors.textSecondary} />
              <Text style={styles.helpText}>
                All ads and tracking are automatically removed
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
