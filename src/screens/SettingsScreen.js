import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Switch,
  ActionSheetIOS,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFeed } from '../context/FeedContext';

export default function SettingsScreen({ navigation }) {
  const { feeds, removeFeed, clearAllData } = useFeed();
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [showImages, setShowImages] = useState(true);

  const handleClearAllData = () => {
    Alert.alert(
      'Clear All Data',
      'This will remove all feeds and articles. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearAllData();
              Alert.alert('Success', 'All data has been cleared');
            } catch (error) {
              console.error('Error clearing data:', error);
              Alert.alert('Error', 'Failed to clear data');
            }
          },
        },
      ]
    );
  };

  const handleRemoveFeed = (feed) => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Remove Feed'],
          destructiveButtonIndex: 1,
          cancelButtonIndex: 0,
          title: `Remove "${feed.title}"?`,
          message: 'This will remove the feed and all its articles.',
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            removeFeed(feed.url);
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
            onPress: () => removeFeed(feed.url),
          },
        ]
      );
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const SettingItem = ({ title, description, onPress, rightElement, showArrow = false }) => (
    <TouchableOpacity
      style={styles.settingItem}
      onPress={onPress}
      disabled={!onPress && !showArrow}
    >
      <View style={styles.settingContent}>
        <Text style={styles.settingTitle}>{title}</Text>
        {description && <Text style={styles.settingDescription}>{description}</Text>}
      </View>
      {rightElement || (showArrow && <Ionicons name="chevron-forward" size={20} color="#ccc" />)}
    </TouchableOpacity>
  );

  const SectionHeader = ({ title }) => (
    <Text style={styles.sectionHeader}>{title}</Text>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <SectionHeader title="Preferences" />
        <View style={styles.section}>
          <SettingItem
            title="Auto Refresh"
            description="Automatically refresh feeds when opening the app"
            rightElement={
              <Switch
                value={autoRefresh}
                onValueChange={setAutoRefresh}
                trackColor={{ false: '#767577', true: '#007AFF' }}
                thumbColor={autoRefresh ? '#fff' : '#f4f3f4'}
              />
            }
          />
          
          <SettingItem
            title="Show Images"
            description="Display images in articles and feed list"
            rightElement={
              <Switch
                value={showImages}
                onValueChange={setShowImages}
                trackColor={{ false: '#767577', true: '#007AFF' }}
                thumbColor={showImages ? '#fff' : '#f4f3f4'}
              />
            }
          />
          
          <SettingItem
            title="Dark Mode"
            description="Coming soon in future updates"
            rightElement={
              <Switch
                value={darkMode}
                onValueChange={setDarkMode}
                disabled={true}
                trackColor={{ false: '#767577', true: '#007AFF' }}
                thumbColor={darkMode ? '#fff' : '#f4f3f4'}
              />
            }
          />
        </View>

        <SectionHeader title={`Your Feeds (${feeds.length})`} />
        {feeds.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="newspaper-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>No feeds added yet</Text>
            <TouchableOpacity
              style={styles.addFirstFeedButton}
              onPress={() => navigation.navigate('Feeds', { screen: 'AddFeed' })}
            >
              <Text style={styles.addFirstFeedText}>Add Your First Feed</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.section}>
            {feeds.map((feed) => (
              <TouchableOpacity
                key={feed.id}
                style={styles.feedItem}
                onPress={() => handleRemoveFeed(feed)}
              >
                <View style={styles.feedContent}>
                  <Text style={styles.feedTitle} numberOfLines={1}>
                    {feed.title}
                  </Text>
                  <Text style={styles.feedUrl} numberOfLines={1}>
                    {feed.url}
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

        <SectionHeader title="Data" />
        <View style={styles.section}>
          <SettingItem
            title="Clear All Data"
            description="Remove all feeds and articles"
            onPress={handleClearAllData}
            rightElement={<Ionicons name="trash-outline" size={20} color="#ff3b30" />}
          />
        </View>

        <SectionHeader title="About" />
        <View style={styles.section}>
          <SettingItem
            title="FeedWell"
            description="Ad-free RSS reader for all platforms"
          />
          <SettingItem
            title="Version"
            description="1.0.0"
          />
          <SettingItem
            title="Privacy"
            description="No data is collected or shared"
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            FeedWell automatically blocks ads and tracking from RSS feeds to provide a clean reading experience.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    flex: 1,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 24,
    marginBottom: 8,
    marginHorizontal: 16,
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: 'hidden',
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
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
  },
  feedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  feedContent: {
    flex: 1,
  },
  feedTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  feedUrl: {
    fontSize: 12,
    color: '#007AFF',
    marginBottom: 2,
  },
  feedDate: {
    fontSize: 12,
    color: '#666',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 32,
    backgroundColor: '#fff',
    marginHorizontal: 16,
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
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
    marginBottom: 20,
  },
  addFirstFeedButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addFirstFeedText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 32,
  },
  footerText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
});
