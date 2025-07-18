import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Switch,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFeed } from '../context/FeedContext';
import { useTheme } from '../context/ThemeContext';
import { useAppSettings } from '../context/AppSettingsContext';
import { testFeedRemoval, testDataConsistency, addDemoFeed } from '../utils/debugFeedRemoval';

export default function SettingsScreen({ navigation }) {
  const { feeds, clearAllData } = useFeed();
  const { theme, isDarkMode, toggleTheme } = useTheme();
  const { showImages, autoRefresh, updateShowImages, updateAutoRefresh } = useAppSettings();

  // Debug: Log feeds when component mounts or feeds change
  React.useEffect(() => {
    console.log('SettingsScreen: Current feeds:', feeds);
    console.log('SettingsScreen: Feeds count:', feeds.length);
    feeds.forEach((feed, index) => {
      console.log(`SettingsScreen: Feed ${index}:`, {
        id: feed.id,
        title: feed.title,
        url: feed.url,
        addedAt: feed.addedAt
      });
    });
  }, [feeds]);

  const handleClearAllData = () => {
    console.log('Attempting to clear all data');
    
    // For web platform, use window.confirm for better compatibility
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Clear All Data?\n\nThis will remove all feeds and articles. This action cannot be undone.');
      if (confirmed) {
        performClearAllData();
      }
      return;
    }
    
    // For mobile platforms, use Alert.alert
    Alert.alert(
      'Clear All Data',
      'This will remove all feeds and articles. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => performClearAllData(),
        },
      ]
    );
  };

  const performClearAllData = async () => {
    try {
      console.log('Performing clear all data operation');
      await clearAllData();
      console.log('All data cleared successfully');
      
      // Show success message
      if (Platform.OS === 'web') {
        window.alert('All data has been cleared successfully!');
      } else {
        Alert.alert('Success', 'All data has been cleared');
      }
    } catch (error) {
      console.error('Error clearing data:', error);
      
      // Show error message
      if (Platform.OS === 'web') {
        window.alert('Failed to clear data. Please try again.');
      } else {
        Alert.alert('Error', 'Failed to clear data');
      }
    }
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

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: theme.colors.text,
      marginLeft: 16,
    },
    content: {
      flex: 1,
    },
    section: {
      backgroundColor: theme.colors.surface,
      marginHorizontal: 16,
      marginTop: 16,
      borderRadius: 12,
      ...(Platform.OS === 'web' ? theme.shadows.cardWeb : theme.shadows.card),
    },
    sectionHeader: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.textTertiary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginTop: 24,
      marginBottom: 8,
      marginHorizontal: 16,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
      marginLeft: 8,
    },
    settingItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    settingItemLast: {
      borderBottomWidth: 0,
    },
    settingContent: {
      flex: 1,
    },
    settingTitle: {
      fontSize: 16,
      fontWeight: '500',
      color: theme.colors.text,
      marginBottom: 2,
    },
    settingDescription: {
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    actionButton: {
      backgroundColor: theme.colors.primary,
      marginHorizontal: 16,
      marginTop: 16,
      paddingVertical: 12,
      borderRadius: 8,
      alignItems: 'center',
    },
    actionButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
    dangerButton: {
      backgroundColor: theme.colors.error,
    },
    footer: {
      paddingHorizontal: 16,
      paddingVertical: 32,
    },
    footerText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
    },
    copyrightText: {
      fontSize: 12,
      color: theme.colors.textTertiary,
      textAlign: 'center',
      marginTop: 12,
      lineHeight: 16,
    },
  });

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
                onValueChange={updateAutoRefresh}
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
                onValueChange={updateShowImages}
                trackColor={{ false: '#767577', true: '#007AFF' }}
                thumbColor={showImages ? '#fff' : '#f4f3f4'}
              />
            }
          />
          
          <SettingItem
            title="Dark Mode"
            description="Switch between light and dark themes"
            rightElement={
              <Switch
                value={isDarkMode}
                onValueChange={toggleTheme}
                trackColor={{ false: '#767577', true: '#007AFF' }}
                thumbColor={isDarkMode ? '#fff' : '#f4f3f4'}
              />
            }
          />
        </View>

        <SectionHeader title="Data" />
        <View style={styles.section}>
          <SettingItem
            title="Clear All Data"
            description="Remove all feeds and articles"
            onPress={handleClearAllData}
            rightElement={<Ionicons name="trash-outline" size={20} color="#ff3b30" />}
          />
        </View>

        <SectionHeader title="Debug" />
        <View style={styles.section}>
          <SettingItem
            title="Add Demo Feed"
            description="Add a demo feed for testing removal"
            onPress={() => addDemoFeed()}
          />
          <SettingItem
            title="Test Feed Removal"
            description="Debug feed removal functionality"
            onPress={() => testFeedRemoval()}
          />
          <SettingItem
            title="Check Data Consistency"
            description="Log current feeds data"
            onPress={() => testDataConsistency()}
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
            description="0.1.0 (Beta)"
          />
          <SettingItem
            title="Developer"
            description="Sepehr Mohammady"
          />
          <SettingItem
            title="Source Code"
            description="github.com/SepehrMohammady/FeedWell"
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
          <Text style={styles.copyrightText}>
            © 2025 Sepehr Mohammady. Open source under MIT License.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

