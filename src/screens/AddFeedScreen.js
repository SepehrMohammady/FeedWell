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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFeed } from '../context/FeedContext';
import { parseRSSFeed, isValidRSSUrl } from '../utils/rssParser';
import { parseRSSFeedWithProxy } from '../utils/corsRssParser';

export default function AddFeedScreen({ navigation }) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const { addFeed, addArticles, feeds } = useFeed();

  const popularFeeds = [
    { name: 'TechCrunch', url: 'https://techcrunch.com/feed/' },
    { name: 'BBC News', url: 'http://feeds.bbci.co.uk/news/rss.xml' },
    { name: 'The Verge', url: 'https://www.theverge.com/rss/index.xml' },
    { name: 'Hacker News', url: 'https://hnrss.org/frontpage' },
    { name: 'Dev.to', url: 'https://dev.to/feed' },
    { name: 'NPR News', url: 'https://feeds.npr.org/1001/rss.xml' },
    { name: 'Wired', url: 'https://www.wired.com/feed/rss' },
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

  const clearInput = () => {
    setUrl('');
  };

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

          <View style={styles.popularSection}>
            <Text style={styles.sectionTitle}>Popular Feeds</Text>
            <Text style={styles.sectionDescription}>
              Try one of these popular news and tech feeds
            </Text>

            {popularFeeds.map((feed, index) => (
              <TouchableOpacity
                key={index}
                style={styles.popularFeedItem}
                onPress={() => handlePopularFeed(feed.url)}
                disabled={loading}
              >
                <View style={styles.popularFeedContent}>
                  <Text style={styles.popularFeedName}>{feed.name}</Text>
                  <Text style={styles.popularFeedUrl} numberOfLines={1}>
                    {feed.url}
                  </Text>
                </View>
                <Ionicons name="add-circle-outline" size={24} color="#007AFF" />
              </TouchableOpacity>
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
              <Ionicons name="shield-checkmark-outline" size={20} color="#666" />
              <Text style={styles.helpText}>
                All ads and tracking are automatically removed
              </Text>
            </View>
            {isWebPlatform() && (
              <View style={styles.helpItem}>
                <Ionicons name="information-circle-outline" size={20} color="#007AFF" />
                <Text style={styles.helpText}>
                  <Text style={{ fontWeight: 'bold' }}>Web Demo:</Text> Some feeds may not work due to browser security restrictions. Try the "Sample Feed" above for a demo.
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerButton: {
    padding: 8,
    minWidth: 40,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  content: {
    flex: 1,
  },
  inputSection: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      },
    }),
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 20,
  },
  inputContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
    paddingRight: 40,
  },
  clearButton: {
    position: 'absolute',
    right: 12,
    top: 12,
  },
  addButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
  },
  addButtonDisabled: {
    backgroundColor: '#ccc',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  popularSection: {
    backgroundColor: '#fff',
    margin: 16,
    marginTop: 0,
    padding: 20,
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      },
    }),
  },
  popularFeedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  popularFeedContent: {
    flex: 1,
  },
  popularFeedName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  popularFeedUrl: {
    fontSize: 12,
    color: '#666',
  },
  helpSection: {
    backgroundColor: '#fff',
    margin: 16,
    marginTop: 0,
    padding: 20,
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      },
    }),
  },
  helpItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  helpText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },
});
