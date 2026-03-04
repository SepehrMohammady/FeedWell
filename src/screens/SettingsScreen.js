import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Switch,
  Platform,
  Linking,
  Modal,
  FlatList,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { APP_VERSION } from '../config/version';
import { useFeed } from '../context/FeedContext';
import { useTheme } from '../context/ThemeContext';
import { useAppSettings } from '../context/AppSettingsContext';
import { useReadLater } from '../context/ReadLaterContext';
import OnboardingTutorial from '../components/OnboardingTutorial';
import { SafeStorage } from '../utils/SafeStorage';
import {
  AVAILABLE_LANGUAGES,
  getPopularLanguages,
  getDisplayName,
  loadTargetLanguage,
  saveTargetLanguage,
  getLanguageModelsStatus,
  isModelDownloaded,
} from '../utils/translationService';

export default function SettingsScreen({ navigation }) {
  const { feeds, articles, clearAllData } = useFeed();
  const { theme, isDarkMode, toggleTheme } = useTheme();
  const { showImages, autoRefresh, updateShowImages, updateAutoRefresh } = useAppSettings();
  const { articles: readLaterArticles } = useReadLater();
  const [showTutorial, setShowTutorial] = useState(false);

  // Translation settings state
  const [targetLangCode, setTargetLangCode] = useState('en');
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [langSearchQuery, setLangSearchQuery] = useState('');
  const [downloadedModels, setDownloadedModels] = useState([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [showModelManager, setShowModelManager] = useState(false);

  // Load target language on mount
  useEffect(() => {
    loadTargetLanguage().then(code => setTargetLangCode(code));
  }, []);

  const handleChangeDefaultLang = async (langCode) => {
    setTargetLangCode(langCode);
    await saveTargetLanguage(langCode);
    setShowLangPicker(false);
    setLangSearchQuery('');
  };

  const handleOpenModelManager = async () => {
    setShowModelManager(true);
    setLoadingModels(true);
    try {
      const statuses = await getLanguageModelsStatus();
      setDownloadedModels(statuses.filter(s => s.downloaded));
    } catch (error) {
      console.error('Error loading model status:', error);
    } finally {
      setLoadingModels(false);
    }
  };

  // Filtered languages for picker
  const pickerLanguages = (() => {
    if (!langSearchQuery.trim()) {
      const popular = getPopularLanguages();
      const popularCodes = new Set(popular.map(l => l.code));
      const rest = AVAILABLE_LANGUAGES.filter(l => !popularCodes.has(l.code));
      return [...popular, ...rest];
    }
    const q = langSearchQuery.toLowerCase();
    return AVAILABLE_LANGUAGES.filter(
      lang => lang.displayName.toLowerCase().includes(q) || lang.code.includes(q)
    );
  })();

  const handleClearAllData = () => {
    console.log('Attempting to clear all data');
    
    // For web platform, use window.confirm for better compatibility
    if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.confirm === 'function') {
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

  const handleOpenWebsite = async () => {
    const url = 'https://SepehrMohammady.ir';
    try {
      if (Platform.OS === 'web') {
        window.open(url, '_blank');
      } else {
        const supported = await Linking.canOpenURL(url);
        if (supported) {
          await Linking.openURL(url);
        } else {
          Alert.alert('Error', 'Cannot open URL');
        }
      }
    } catch (error) {
      console.error('Error opening website:', error);
      Alert.alert('Error', 'Failed to open website');
    }
  };

  const handleOpenGitHub = async () => {
    const url = 'https://github.com/SepehrMohammady/FeedWell';
    try {
      if (Platform.OS === 'web') {
        window.open(url, '_blank');
      } else {
        const supported = await Linking.canOpenURL(url);
        if (supported) {
          await Linking.openURL(url);
        } else {
          Alert.alert('Error', 'Cannot open URL');
        }
      }
    } catch (error) {
      console.error('Error opening GitHub:', error);
      Alert.alert('Error', 'Failed to open GitHub repository');
    }
  };

  const handleBackupData = async () => {
    try {
      // Gather all data
      const backupData = {
        version: APP_VERSION.version,
        timestamp: new Date().toISOString(),
        feeds: feeds,
        articles: articles,
        readLater: readLaterArticles,
        settings: {
          showImages,
          autoRefresh,
          isDarkMode,
        },
      };

      const jsonString = JSON.stringify(backupData, null, 2);
      const fileName = `FeedWell_Backup_${new Date().toISOString().split('T')[0]}.json`;

      if (Platform.OS === 'web') {
        // Web platform: Download file
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        Alert.alert('Success', 'Backup file downloaded successfully!');
      } else {
        // Mobile: Save to file system and share
        const fileUri = `${FileSystem.documentDirectory}${fileName}`;
        await FileSystem.writeAsStringAsync(fileUri, jsonString);

        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'application/json',
            dialogTitle: 'Save FeedWell Backup',
            UTI: 'public.json',
          });
        } else {
          Alert.alert('Success', `Backup saved to: ${fileUri}`);
        }
      }
    } catch (error) {
      console.error('Error creating backup:', error);
      Alert.alert('Error', 'Failed to create backup. Please try again.');
    }
  };

  const handleRestoreData = async () => {
    try {
      let jsonString;

      if (Platform.OS === 'web') {
        // Web platform: Use file input
        Alert.alert(
          'Restore Backup',
          'Please select a FeedWell backup JSON file',
          [{ text: 'OK' }]
        );
        
        // Create file input dynamically
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,application/json';
        
        input.onchange = async (e) => {
          const file = e.target.files[0];
          if (!file) return;
          
          const reader = new FileReader();
          reader.onload = async (event) => {
            try {
              jsonString = event.target.result;
              await processRestore(jsonString);
            } catch (error) {
              Alert.alert('Error', 'Invalid backup file format');
            }
          };
          reader.readAsText(file);
        };
        
        input.click();
      } else {
        // Mobile: Use document picker
        const result = await DocumentPicker.getDocumentAsync({
          type: 'application/json',
          copyToCacheDirectory: true,
        });

        if (result.canceled || !result.assets || result.assets.length === 0) {
          return;
        }

        const fileUri = result.assets[0].uri;
        jsonString = await FileSystem.readAsStringAsync(fileUri);

        await processRestore(jsonString);
      }
    } catch (error) {
      console.error('Error restoring backup:', error);
      Alert.alert('Error', 'Failed to restore backup. Please check the file and try again.');
    }
  };

  const processRestore = async (jsonString) => {
    try {
      const backupData = JSON.parse(jsonString);

      // Validate backup structure
      if (!backupData.feeds || !backupData.articles) {
        throw new Error('Invalid backup format');
      }

      // Confirm restore
      const confirmRestore = () => {
        return new Promise((resolve) => {
          if (Platform.OS === 'web') {
            resolve(window.confirm(
              `Restore backup from ${backupData.timestamp ? new Date(backupData.timestamp).toLocaleDateString() : 'unknown date'}?\n\n` +
              `This will replace all current data:\n` +
              `- ${backupData.feeds.length} feeds\n` +
              `- ${backupData.articles.length} articles\n` +
              `- ${backupData.readLater?.length || 0} saved articles\n\n` +
              `This action cannot be undone.`
            ));
          } else {
            Alert.alert(
              'Restore Backup',
              `Restore backup from ${backupData.timestamp ? new Date(backupData.timestamp).toLocaleDateString() : 'unknown date'}?\n\n` +
              `This will replace all current data:\n` +
              `- ${backupData.feeds.length} feeds\n` +
              `- ${backupData.articles.length} articles\n` +
              `- ${backupData.readLater?.length || 0} saved articles\n\n` +
              `This action cannot be undone.`,
              [
                { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
                { text: 'Restore', style: 'destructive', onPress: () => resolve(true) },
              ]
            );
          }
        });
      };

      const confirmed = await confirmRestore();
      if (!confirmed) return;

      // Restore feeds
      await SafeStorage.setItem('feeds', JSON.stringify(backupData.feeds));
      
      // Restore articles
      await SafeStorage.setItem('articles', JSON.stringify(backupData.articles));
      
      // Restore read later
      if (backupData.readLater) {
        await SafeStorage.setItem('feedwell_read_later_articles', JSON.stringify(backupData.readLater));
      }

      // Restore settings
      if (backupData.settings) {
        if (typeof backupData.settings.showImages === 'boolean') {
          await updateShowImages(backupData.settings.showImages);
        }
        if (typeof backupData.settings.autoRefresh === 'boolean') {
          await updateAutoRefresh(backupData.settings.autoRefresh);
        }
        if (typeof backupData.settings.isDarkMode === 'boolean' && backupData.settings.isDarkMode !== isDarkMode) {
          await toggleTheme();
        }
      }

      // Show success message and reload the app
      if (Platform.OS === 'web') {
        if (window.confirm('Backup restored successfully! The app will now reload to apply changes.')) {
          window.location.reload();
        }
      } else {
        Alert.alert(
          'Restore Complete',
          'Backup restored successfully! Please close and reopen the app to see your restored data.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error processing restore:', error);
      throw error;
    }
  };

  const SettingItem = ({ title, description, onPress, rightElement, showArrow = false, isLast = false }) => (
    <TouchableOpacity
      style={[styles.settingItem, isLast && styles.settingItemLast]}
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

  const TesterItem = ({ children, isNote = false, isLast = false }) => (
    <View style={styles.testerItem}>
      <Text style={isNote ? styles.thanksNote : styles.testerName}>{children}</Text>
    </View>
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
    testerItem: {
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    thanksNote: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 8,
    },
    testerName: {
      fontSize: 14,
      fontWeight: '400',
      color: theme.colors.textSecondary,
      marginBottom: 4,
    },
    // Translation modal styles
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    modalContainer: {
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: '75%',
      paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text,
    },
    modalCloseButton: {
      padding: 4,
    },
    modalSearchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      margin: 16,
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: theme.colors.background,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    modalSearchInput: {
      flex: 1,
      fontSize: 15,
      color: theme.colors.text,
      marginLeft: 8,
      paddingVertical: 4,
    },
    langList: {
      flex: 1,
    },
    langItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    langItemSelected: {
      backgroundColor: (theme.colors.primary) + '15',
    },
    langItemText: {
      fontSize: 15,
      color: theme.colors.text,
    },
    langItemTextSelected: {
      color: theme.colors.primary,
      fontWeight: '600',
    },
    modelLoadingContainer: {
      alignItems: 'center',
      padding: 40,
    },
    modelLoadingText: {
      marginTop: 16,
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    modelEmptyContainer: {
      alignItems: 'center',
      padding: 32,
    },
    modelEmptyTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text,
      marginTop: 16,
      marginBottom: 8,
    },
    modelEmptyText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
    },
    modelItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    modelItemInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    modelItemText: {
      fontSize: 15,
      color: theme.colors.text,
    },
    modelItemSize: {
      fontSize: 13,
      color: theme.colors.textSecondary,
    },
    modelListHeader: {
      paddingHorizontal: 20,
      paddingVertical: 12,
      backgroundColor: theme.colors.background,
    },
    modelListHeaderText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.text,
    },
    modelListSubtext: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginTop: 4,
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
                trackColor={{ false: '#767577', true: theme.colors.primary }}
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
                trackColor={{ false: '#767577', true: theme.colors.primary }}
                thumbColor={showImages ? '#fff' : '#f4f3f4'}
              />
            }
          />
          
          <SettingItem
            title="Dark Mode"
            description="Switch between light and dark themes"
            isLast={true}
            rightElement={
              <Switch
                value={isDarkMode}
                onValueChange={toggleTheme}
                trackColor={{ false: '#767577', true: theme.colors.primary }}
                thumbColor={isDarkMode ? '#fff' : '#f4f3f4'}
              />
            }
          />
        </View>

        <SectionHeader title="Translation" />
        <View style={styles.section}>
          <SettingItem
            title="Default Language"
            description={`Translate articles to ${getDisplayName(targetLangCode)}`}
            onPress={() => setShowLangPicker(true)}
            rightElement={<Ionicons name="chevron-forward" size={20} color={theme.colors.primary} />}
          />
          <SettingItem
            title="Downloaded Models"
            description="View and manage offline translation models"
            onPress={handleOpenModelManager}
            isLast={true}
            rightElement={<Ionicons name="cloud-download-outline" size={20} color={theme.colors.primary} />}
          />
        </View>

        <SectionHeader title="Help" />
        <View style={styles.section}>
          <SettingItem
            title="App Tutorial"
            description="Learn how to use FeedWell features"
            onPress={() => setShowTutorial(true)}
            isLast={true}
            rightElement={<Ionicons name="help-circle-outline" size={20} color={theme.colors.primary} />}
          />
        </View>

        <SectionHeader title="Data" />
        <View style={styles.section}>
          <SettingItem
            title="Backup Data"
            description="Export all feeds, articles, and settings"
            onPress={handleBackupData}
            rightElement={<Ionicons name="download-outline" size={20} color={theme.colors.primary} />}
          />
          <SettingItem
            title="Restore Data"
            description="Import data from a backup file"
            onPress={handleRestoreData}
            rightElement={<Ionicons name="cloud-upload-outline" size={20} color={theme.colors.primary} />}
          />
          <SettingItem
            title="Clear All Data"
            description="Remove all feeds and articles"
            onPress={handleClearAllData}
            isLast={true}
            rightElement={<Ionicons name="trash-outline" size={20} color={theme.colors.error} />}
          />
        </View>

        <SectionHeader title="TESTERS" />
        <View style={styles.section}>
          <TesterItem isNote={true}>Thank you for your valuable feedback!</TesterItem>
          <TesterItem>Amir Arsalan Serajoddin Mirghaed</TesterItem>
          <TesterItem>Amirhossein Yaghoubnezhad</TesterItem>
          <TesterItem>Mohammad Torabi</TesterItem>
          <TesterItem isLast={true}>Saeed Abdollahi Taromsari</TesterItem>
        </View>

        <SectionHeader title="About" />
        <View style={styles.section}>
          <SettingItem
            title="FeedWell"
            description="Ad-free RSS reader for all platforms"
          />
          <SettingItem
            title="Version"
            description={APP_VERSION.fullVersion}
          />
          <SettingItem
            title="Developer"
            description="Sepehr Mohammady"
            onPress={handleOpenWebsite}
            rightElement={<Ionicons name="open-outline" size={20} color={theme.colors.primary} />}
          />
          <SettingItem
            title="Source Code"
            description="github.com/SepehrMohammady/FeedWell"
            onPress={handleOpenGitHub}
            rightElement={<Ionicons name="logo-github" size={20} color={theme.colors.primary} />}
          />
          <SettingItem
            title="Privacy"
            description="No data is collected or shared"
            isLast={true}
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            FeedWell automatically blocks ads and tracking from RSS feeds to provide a clean reading experience.
          </Text>
          <Text style={styles.copyrightText}>
            © 2026 Sepehr Mohammady. Open source under MIT License.
          </Text>
        </View>
      </ScrollView>

      <OnboardingTutorial 
        visible={showTutorial} 
        onComplete={() => setShowTutorial(false)}
      />

      {/* Default Language Picker Modal */}
      <Modal
        visible={showLangPicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowLangPicker(false);
          setLangSearchQuery('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Default Translate Language</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowLangPicker(false);
                  setLangSearchQuery('');
                }}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalSearchContainer}>
              <Ionicons name="search" size={18} color={theme.colors.textSecondary} />
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Search languages..."
                placeholderTextColor={theme.colors.textTertiary}
                value={langSearchQuery}
                onChangeText={setLangSearchQuery}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {langSearchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setLangSearchQuery('')}>
                  <Ionicons name="close-circle" size={18} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            <FlatList
              data={pickerLanguages}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.langItem,
                    item.code === targetLangCode && styles.langItemSelected,
                  ]}
                  onPress={() => handleChangeDefaultLang(item.code)}
                >
                  <Text
                    style={[
                      styles.langItemText,
                      item.code === targetLangCode && styles.langItemTextSelected,
                    ]}
                  >
                    {item.displayName}
                  </Text>
                  {item.code === targetLangCode && (
                    <Ionicons name="checkmark" size={20} color={theme.colors.primary} />
                  )}
                </TouchableOpacity>
              )}
              showsVerticalScrollIndicator={false}
              style={styles.langList}
            />
          </View>
        </View>
      </Modal>

      {/* Downloaded Models Manager Modal */}
      <Modal
        visible={showModelManager}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowModelManager(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Downloaded Models</Text>
              <TouchableOpacity
                onPress={() => setShowModelManager(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            {loadingModels ? (
              <View style={styles.modelLoadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={styles.modelLoadingText}>Checking downloaded models...</Text>
              </View>
            ) : downloadedModels.length === 0 ? (
              <View style={styles.modelEmptyContainer}>
                <Ionicons name="cloud-download-outline" size={48} color={theme.colors.textSecondary} />
                <Text style={styles.modelEmptyTitle}>No Models Downloaded</Text>
                <Text style={styles.modelEmptyText}>
                  Translation models are automatically downloaded when you first translate an article.
                  Each model is about 30 MB and works fully offline after download.
                </Text>
              </View>
            ) : (
              <FlatList
                data={downloadedModels}
                keyExtractor={(item) => item.code}
                renderItem={({ item }) => (
                  <View style={styles.modelItem}>
                    <View style={styles.modelItemInfo}>
                      <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />
                      <Text style={styles.modelItemText}>{item.displayName}</Text>
                    </View>
                    <Text style={styles.modelItemSize}>~30 MB</Text>
                  </View>
                )}
                showsVerticalScrollIndicator={false}
                style={styles.langList}
                ListHeaderComponent={
                  <View style={styles.modelListHeader}>
                    <Text style={styles.modelListHeaderText}>
                      {downloadedModels.length} model{downloadedModels.length !== 1 ? 's' : ''} downloaded
                    </Text>
                    <Text style={styles.modelListSubtext}>
                      Models are downloaded automatically when translating. To free space, clear app data.
                    </Text>
                  </View>
                }
              />
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

