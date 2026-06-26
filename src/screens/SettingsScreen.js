import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Switch,
  Platform,
  Linking,
  Modal,
  FlatList,
  TextInput,
  ActivityIndicator,
  NativeModules,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { APP_VERSION } from '../config/version';
import { useFeed } from '../context/FeedContext';
import { useTheme } from '../context/ThemeContext';
import { useAppSettings } from '../context/AppSettingsContext';
import { useTranslation } from '../context/LanguageContext';
import { APP_LANGUAGES, getAppLanguage } from '../i18n/appLanguages';
import { tStatic } from '../i18n';
import { useReadLater } from '../context/ReadLaterContext';
import { useAmbientSound } from '../context/AmbientSoundContext';
import OnboardingTutorial from '../components/OnboardingTutorial';
import CustomAlert from '../components/CustomAlert';
import { SafeStorage } from '../utils/SafeStorage';
import {
  AVAILABLE_LANGUAGES,
  getPopularLanguages,
  getDisplayName,
  getMLKitName,
  loadTargetLanguage,
  saveTargetLanguage,
  loadTranslationMode,
  saveTranslationMode,
  TRANSLATION_MODES,
  getLanguageModelsStatus,
  isModelDownloaded,
  downloadModel,
  deleteModel,
} from '../utils/translationService';

export default function SettingsScreen({ navigation }) {
  const { feeds, articles, clearAllData } = useFeed();
  const { theme, isDarkMode, toggleTheme, paletteIndex, setPalette, LIGHT_PALETTES, DARK_PALETTES } = useTheme();
  const { showImages, autoRefresh, showBookmarkIndicators, skipArticleView, showReadingPositionInFeeds, allowRotation, speechRate, readerHeaderActions, reduceMotion, readingReminder, updateShowImages, updateAutoRefresh, updateShowBookmarkIndicators, updateSkipArticleView, updateShowReadingPositionInFeeds, updateAllowRotation, updateSpeechRate, updateReaderHeaderActions, updateReduceMotion, updateReadingReminder, maxArticleAge, updateMaxArticleAge } = useAppSettings();
  const { feedRegionUserSet, updateFeedRegion, translationTargetUserSet, markTranslationTargetUserSet } = useAppSettings();
  const { articles: readLaterArticles } = useReadLater();
  const { autoPlay, setAutoPlay, currentSound } = useAmbientSound();
  const { t, language, setLanguage, isRTL, formatNumber } = useTranslation();
  const insets = useSafeAreaInsets();
  const [showTutorial, setShowTutorial] = useState(false);
  const [showAppLangPicker, setShowAppLangPicker] = useState(false);

  // Translation settings state
  const [targetLangCode, setTargetLangCode] = useState('en');
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [langSearchQuery, setLangSearchQuery] = useState('');
  const [downloadedModels, setDownloadedModels] = useState([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [showModelManager, setShowModelManager] = useState(false);
  const [translationMode, setTranslationMode] = useState(TRANSLATION_MODES.AUTO);
  const [showTranslationModePicker, setShowTranslationModePicker] = useState(false);
  const [allModels, setAllModels] = useState([]);
  const [modelSearchQuery, setModelSearchQuery] = useState('');
  const [downloadingModel, setDownloadingModel] = useState(null); // code of model being downloaded
  const [showArticleAgePicker, setShowArticleAgePicker] = useState(false);
  const [alertConfig, setAlertConfig] = useState({ visible: false, title: '', message: '', buttons: [] });
  const restoreResolveRef = useRef(null);

  // Widget settings state
  const [widgetTheme, setWidgetTheme] = useState('app'); // 'app', 'light', 'dark'
  const [showWidgetThemePicker, setShowWidgetThemePicker] = useState(false);
  const [widgetOpacity, setWidgetOpacity] = useState(100); // 0-100%

  // Load target language and translation mode on mount
  useEffect(() => {
    loadTargetLanguage().then(code => setTargetLangCode(code));
    loadTranslationMode().then(mode => setTranslationMode(mode));
    // Load widget preferences
    AsyncStorage.getItem('widget_theme').then(v => { if (v) setWidgetTheme(v); });
    AsyncStorage.getItem('widget_opacity').then(v => { if (v) setWidgetOpacity(parseInt(v, 10)); });
  }, []);

  const handleChangeDefaultLang = async (langCode) => {
    setTargetLangCode(langCode);
    await saveTargetLanguage(langCode);
    markTranslationTargetUserSet(); // user explicitly chose a translation target
    setShowLangPicker(false);
    setLangSearchQuery('');
  };

  const handleChangeAppLanguage = async (code) => {
    setShowAppLangPicker(false);
    if (code === language) return;
    await setLanguage(code);

    // Feed region follows the app language unless the user explicitly picked one.
    if (!feedRegionUserSet) {
      await updateFeedRegion(code === 'en' ? 'global' : code, false);
    }

    // Suggest (never force) a matching translation target + offline model.
    if (!translationTargetUserSet && code !== 'en') {
      setTargetLangCode(code);
      await saveTargetLanguage(code);
      try {
        const mlName = getMLKitName(code);
        const downloaded = await isModelDownloaded(mlName);
        if (!downloaded) {
          // Use tStatic with the NEW code: `t` from this render still points at the
          // previous language until the re-render, so the prompt would otherwise
          // appear in the old language.
          setAlertConfig({
            visible: true,
            title: tStatic('language.offlineModelTitle', code),
            message: tStatic('language.offlineModelBody', code, { language: getDisplayName(code) }),
            icon: 'cloud-download-outline',
            buttons: [
              { text: tStatic('common.download', code), onPress: () => { downloadModel(mlName); } },
              { text: tStatic('common.later', code), style: 'cancel' },
            ],
          });
        }
      } catch (e) { /* ignore */ }
    }
  };

  // Article age filter options
  const articleAgeOptions = [
    { value: 0, label: t('settings.articleAgeNoLimit') },
    { value: 1, label: t('settings.articleAge1Month') },
    { value: 3, label: t('settings.articleAge3Months') },
    { value: 6, label: t('settings.articleAge6Months') },
    { value: 12, label: t('settings.articleAge1Year') },
    { value: 24, label: t('settings.articleAge2Years') },
  ];

  const getArticleAgeLabel = (months) => {
    const option = articleAgeOptions.find(o => o.value === months);
    return option ? option.label : t('settings.articleAgeMonths', { count: formatNumber(months) });
  };

  // Widget settings handlers
  const { WidgetBridge } = NativeModules;

  const handleWidgetThemeChange = async (theme) => {
    setWidgetTheme(theme);
    setShowWidgetThemePicker(false);
    await AsyncStorage.setItem('widget_theme', theme);
    if (Platform.OS === 'android' && WidgetBridge) {
      try { WidgetBridge.setWidgetTheme(theme); } catch (e) {}
    }
  };

  const handleAddWidget = async () => {
    if (Platform.OS === 'android' && WidgetBridge) {
      try {
        const result = await WidgetBridge.requestPinWidget();
        if (!result) {
          setAlertConfig({
            visible: true,
            title: t('settings.widgetAlertTitle'),
            message: t('settings.widgetUnsupportedMessage'),
            icon: 'information-circle',
            buttons: [{ text: t('common.ok'), style: 'cancel' }],
          });
        }
      } catch (e) {
        setAlertConfig({
          visible: true,
          title: t('settings.widgetAlertTitle'),
          message: t('settings.widgetAddFailedMessage'),
          icon: 'information-circle',
          buttons: [{ text: t('common.ok'), style: 'cancel' }],
        });
      }
    }
  };

  const widgetThemeLabel = widgetTheme === 'app' ? t('settings.widgetThemeApp') : widgetTheme === 'light' ? t('settings.widgetThemeLight') : t('settings.widgetThemeDark');

  const handleWidgetOpacityChange = async (value) => {
    const rounded = Math.round(value);
    setWidgetOpacity(rounded);
    await AsyncStorage.setItem('widget_opacity', String(rounded));
    if (Platform.OS === 'android' && WidgetBridge) {
      try { WidgetBridge.setWidgetOpacity(Math.round(rounded * 2.55)); } catch (e) {}
    }
  };

  const handleOpenModelManager = async () => {
    setShowModelManager(true);
    setModelSearchQuery('');
    setLoadingModels(true);
    try {
      const statuses = await getLanguageModelsStatus();
      setAllModels(statuses);
      setDownloadedModels(statuses.filter(s => s.downloaded));
    } catch (error) {
      console.error('Error loading model status:', error);
    } finally {
      setLoadingModels(false);
    }
  };

  const handleDownloadModel = async (lang) => {
    setDownloadingModel(lang.code);
    try {
      const success = await downloadModel(lang.mlKitName);
      if (success) {
        setAllModels(prev => prev.map(m => m.code === lang.code ? { ...m, downloaded: true } : m));
        setDownloadedModels(prev => [...prev, { ...lang, downloaded: true }]);
      } else {
        setAlertConfig({ visible: true, title: t('settings.downloadFailedTitle'), message: t('settings.downloadFailedMessage', { language: lang.displayName }), icon: 'alert-circle-outline', buttons: [{ text: t('common.ok') }] });
      }
    } catch (error) {
      setAlertConfig({ visible: true, title: t('settings.downloadFailedTitle'), message: error.message, icon: 'alert-circle-outline', buttons: [{ text: t('common.ok') }] });
    } finally {
      setDownloadingModel(null);
    }
  };

  const handleDeleteModel = async (lang) => {
    setAlertConfig({
      visible: true,
      title: t('settings.deleteModelTitle'),
      message: t('settings.deleteModelConfirm', { language: lang.displayName }),
      icon: 'trash-outline',
      buttons: [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              const success = await deleteModel(lang.mlKitName);
              if (success) {
                setAllModels(prev => prev.map(m => m.code === lang.code ? { ...m, downloaded: false } : m));
                setDownloadedModels(prev => prev.filter(m => m.code !== lang.code));
              }
            } catch (error) {
              setAlertConfig({ visible: true, title: t('common.error'), message: t('settings.deleteModelError'), icon: 'alert-circle-outline', buttons: [{ text: t('common.ok') }] });
            }
          }
        },
      ],
    });
  };

  const handleSelectTranslationMode = (mode) => {
    setTranslationMode(mode);
    saveTranslationMode(mode);
    setShowTranslationModePicker(false);
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
      const confirmed = window.confirm(`${t('settings.clearAllDataTitle')}?\n\n${t('settings.clearAllDataConfirm')}`);
      if (confirmed) {
        performClearAllData();
      }
      return;
    }

    // For mobile platforms, use CustomAlert
    setAlertConfig({
      visible: true,
      title: t('settings.clearAllDataTitle'),
      message: t('settings.clearAllDataConfirm'),
      icon: 'trash-outline',
      buttons: [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.clearAction'),
          style: 'destructive',
          onPress: () => performClearAllData(),
        },
      ],
    });
  };

  const performClearAllData = async () => {
    try {
      console.log('Performing clear all data operation');
      await clearAllData();
      console.log('All data cleared successfully');
      
      // Show success message
      if (Platform.OS === 'web') {
        window.alert(t('settings.clearAllDataSuccess'));
      } else {
        setAlertConfig({ visible: true, title: t('common.success'), message: t('settings.clearAllDataSuccess'), icon: 'checkmark-circle-outline', buttons: [{ text: t('common.ok') }] });
      }
    } catch (error) {
      console.error('Error clearing data:', error);

      // Show error message
      if (Platform.OS === 'web') {
        window.alert(t('settings.clearAllDataError'));
      } else {
        setAlertConfig({ visible: true, title: t('common.error'), message: t('settings.clearAllDataError'), icon: 'alert-circle-outline', buttons: [{ text: t('common.ok') }] });
      }
    }
  };

  const handleOpenWebsite = async () => {
    const url = 'https://semo-lab.com/feedwell/';
    try {
      if (Platform.OS === 'web') {
        window.open(url, '_blank');
      } else {
        const supported = await Linking.canOpenURL(url);
        if (supported) {
          await Linking.openURL(url);
        } else {
          setAlertConfig({ visible: true, title: t('common.error'), message: t('settings.cannotOpenUrl'), icon: 'alert-circle-outline', buttons: [{ text: t('common.ok') }] });
        }
      }
    } catch (error) {
      console.error('Error opening website:', error);
      setAlertConfig({ visible: true, title: t('common.error'), message: t('settings.openWebsiteError'), icon: 'alert-circle-outline', buttons: [{ text: t('common.ok') }] });
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
          maxArticleAge,
          reduceMotion,
          readingReminder,
          showBookmarkIndicators,
          skipArticleView,
          showReadingPositionInFeeds,
          allowRotation,
          speechRate,
          readerHeaderActions,
          targetLangCode,
          translationMode,
        },
      };

      const jsonString = JSON.stringify(backupData, null, 2);
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
      const fileName = `FeedWell_Backup_${dateStr}_${timeStr}.feedwell`;

      if (Platform.OS === 'web') {
        // Web platform: Download file
        const blob = new Blob([jsonString], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        setAlertConfig({ visible: true, title: t('common.success'), message: t('settings.backupDownloadedMessage'), icon: 'checkmark-circle-outline', buttons: [{ text: t('common.ok') }] });
      } else {
        // Mobile: Save to file system and share
        const fileUri = `${FileSystem.documentDirectory}${fileName}`;
        await FileSystem.writeAsStringAsync(fileUri, jsonString);

        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          try {
            await Sharing.shareAsync(fileUri, {
              mimeType: 'application/octet-stream',
              dialogTitle: t('settings.backupShareDialogTitle'),
              UTI: 'public.data',
            });
          } catch (shareError) {
            // Share sheet dismissed/failed — the backup file is already written, so still a success.
            console.log('Share dismissed (backup file already saved):', shareError?.message);
          }
          setAlertConfig({ visible: true, title: t('settings.backupSuccessTitle'), message: t('settings.backupSuccessMessage'), icon: 'checkmark-circle-outline', buttons: [{ text: t('common.ok') }] });
        } else {
          setAlertConfig({ visible: true, title: t('settings.backupSuccessTitle'), message: t('settings.backupSavedTo', { path: fileUri }), icon: 'checkmark-circle-outline', buttons: [{ text: t('common.ok') }] });
        }
      }
    } catch (error) {
      console.error('Error creating backup:', error);
      setAlertConfig({ visible: true, title: t('common.error'), message: t('settings.backupError'), icon: 'alert-circle-outline', buttons: [{ text: t('common.ok') }] });
    }
  };

  const handleRestoreData = async () => {
    try {
      let jsonString;

      if (Platform.OS === 'web') {
        // Web platform: Use file input
        setAlertConfig({ visible: true, title: t('settings.restoreBackupTitle'), message: t('settings.restoreSelectFileMessage'), icon: 'cloud-upload-outline', buttons: [{ text: t('common.ok') }] });
        
        // Create file input dynamically
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.feedwell,.json,application/json,application/octet-stream';
        
        input.onchange = async (e) => {
          const file = e.target.files[0];
          if (!file) return;
          
          const reader = new FileReader();
          reader.onload = async (event) => {
            try {
              jsonString = event.target.result;
              await processRestore(jsonString);
            } catch (error) {
              setAlertConfig({ visible: true, title: t('common.error'), message: t('settings.restoreInvalidFormat'), icon: 'alert-circle-outline', buttons: [{ text: t('common.ok') }] });
            }
          };
          reader.readAsText(file);
        };
        
        input.click();
      } else {
        // Mobile: Use document picker
        const result = await DocumentPicker.getDocumentAsync({
          type: '*/*',
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
      setAlertConfig({ visible: true, title: t('common.error'), message: t('settings.restoreError'), icon: 'alert-circle-outline', buttons: [{ text: t('common.ok') }] });
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
        const restoreDate = backupData.timestamp
          ? new Date(backupData.timestamp).toLocaleDateString(language)
          : t('settings.restoreUnknownDate');
        const restoreMessage = t('settings.restoreConfirmMessage', {
          date: restoreDate,
          feeds: formatNumber(backupData.feeds.length),
          articles: formatNumber(backupData.articles.length),
          saved: formatNumber(backupData.readLater?.length || 0),
        });
        return new Promise((resolve) => {
          if (Platform.OS === 'web') {
            resolve(window.confirm(restoreMessage));
          } else {
            restoreResolveRef.current = resolve;
            setAlertConfig({
              visible: true,
              title: t('settings.restoreBackupTitle'),
              message: restoreMessage,
              icon: 'cloud-download-outline',
              buttons: [
                { text: t('common.cancel'), style: 'cancel', onPress: () => { restoreResolveRef.current?.(false); restoreResolveRef.current = null; } },
                { text: t('settings.restoreAction'), style: 'destructive', onPress: () => { restoreResolveRef.current?.(true); restoreResolveRef.current = null; } },
              ],
            });
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
        if (typeof backupData.settings.maxArticleAge === 'number') {
          await updateMaxArticleAge(backupData.settings.maxArticleAge);
        }
        if (typeof backupData.settings.reduceMotion === 'boolean') {
          await updateReduceMotion(backupData.settings.reduceMotion);
        }
        if (typeof backupData.settings.readingReminder === 'boolean') {
          await updateReadingReminder(backupData.settings.readingReminder);
        }
        if (typeof backupData.settings.showBookmarkIndicators === 'boolean') {
          await updateShowBookmarkIndicators(backupData.settings.showBookmarkIndicators);
        }
        if (typeof backupData.settings.skipArticleView === 'boolean') {
          await updateSkipArticleView(backupData.settings.skipArticleView);
        }
        if (typeof backupData.settings.showReadingPositionInFeeds === 'boolean') {
          await updateShowReadingPositionInFeeds(backupData.settings.showReadingPositionInFeeds);
        }
        if (typeof backupData.settings.allowRotation === 'boolean') {
          await updateAllowRotation(backupData.settings.allowRotation);
        }
        if (typeof backupData.settings.speechRate === 'number') {
          await updateSpeechRate(backupData.settings.speechRate);
        }
        if (Array.isArray(backupData.settings.readerHeaderActions)) {
          await updateReaderHeaderActions(backupData.settings.readerHeaderActions);
        }
        if (backupData.settings.targetLangCode) {
          await saveTargetLanguage(backupData.settings.targetLangCode);
          setTargetLangCode(backupData.settings.targetLangCode);
        }
        if (backupData.settings.translationMode) {
          await saveTranslationMode(backupData.settings.translationMode);
          setTranslationMode(backupData.settings.translationMode);
        }
      }

      // Show success message and reload the app
      if (Platform.OS === 'web') {
        if (window.confirm(t('settings.restoreCompleteWebMessage'))) {
          window.location.reload();
        }
      } else {
        setAlertConfig({
          visible: true,
          title: t('settings.restoreCompleteTitle'),
          message: t('settings.restoreCompleteMessage'),
          icon: 'checkmark-circle-outline',
          buttons: [{ text: t('common.ok') }],
        });
      }
    } catch (error) {
      console.error('Error processing restore:', error);
      throw error;
    }
  };

  const SettingItem = ({ title, description, onPress, rightElement, showArrow = false, isLast = false }) => (
    <TouchableOpacity
      style={[styles.settingItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }, isLast && styles.settingItemLast]}
      onPress={onPress}
      disabled={!onPress && !showArrow}
    >
      <View style={styles.settingContent}>
        <Text style={[styles.settingTitle, { textAlign: isRTL ? 'right' : 'left' }]}>{title}</Text>
        {description && <Text style={[styles.settingDescription, { textAlign: isRTL ? 'right' : 'left' }]}>{description}</Text>}
      </View>
      {rightElement || (showArrow && <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={20} color="#ccc" />)}
    </TouchableOpacity>
  );

  const SectionHeader = ({ title }) => (
    <Text style={styles.sectionHeader}>{title}</Text>
  );

  const TesterItem = ({ children, isNote = false, isLast = false }) => (
    <View style={styles.testerItem}>
      <Text style={[isNote ? styles.thanksNote : styles.testerName, { textAlign: isRTL ? 'right' : 'left' }]}>{children}</Text>
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
      [isRTL ? 'marginRight' : 'marginLeft']: 16,
      textAlign: isRTL ? 'right' : 'left',
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
      textAlign: isRTL ? 'right' : 'left',
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
      height: '75%',
      paddingBottom: Math.max(insets.bottom, 16),
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
    modelActionButton: {
      padding: 8,
    },
    modeItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    modeItemContent: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      gap: 14,
    },
    modeItemText: {
      flex: 1,
    },
    modeItemTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.colors.text,
    },
    modeItemDesc: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
  });

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.container}>
      <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <Text style={styles.headerTitle}>{t('tab.settings')}</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <SectionHeader title={t('settings.sectionPreferences')} />
        <View style={styles.section}>
          <SettingItem
            title={t('settings.autoRefresh')}
            description={t('settings.autoRefreshDesc')}
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
            title={t('settings.showImages')}
            description={t('settings.showImagesDesc')}
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
            title={t('settings.darkMode')}
            description={t('settings.darkModeDesc')}
            rightElement={
              <Switch
                value={isDarkMode}
                onValueChange={toggleTheme}
                trackColor={{ false: '#767577', true: theme.colors.primary }}
                thumbColor={isDarkMode ? '#fff' : '#f4f3f4'}
              />
            }
          />
          <SettingItem
            title={t('language.appTitle')}
            description={getAppLanguage(language).nativeLabel}
            onPress={() => setShowAppLangPicker(true)}
            rightElement={<Ionicons name="chevron-forward" size={20} color={theme.colors.primary} />}
          />
          <SettingItem
            title={t('settings.themeColor')}
            description={LIGHT_PALETTES[paletteIndex].name}
            rightElement={
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {LIGHT_PALETTES.map((p, i) => (
                  <TouchableOpacity key={i} onPress={() => setPalette(i)} style={{ marginLeft: i > 0 ? 6 : 0 }}>
                    <View style={{
                      width: 26, height: 26, borderRadius: 13,
                      backgroundColor: isDarkMode ? DARK_PALETTES[i].primary : p.primary,
                      borderWidth: paletteIndex === i ? 2.5 : 1.5,
                      borderColor: paletteIndex === i ? theme.colors.text : theme.colors.border,
                    }} />
                  </TouchableOpacity>
                ))}
              </View>
            }
          />
          <SettingItem
            title={t('settings.bookmarkIndicators')}
            description={t('settings.bookmarkIndicatorsDesc')}
            rightElement={
              <Switch
                value={showBookmarkIndicators}
                onValueChange={updateShowBookmarkIndicators}
                trackColor={{ false: '#767577', true: theme.colors.primary }}
                thumbColor={showBookmarkIndicators ? '#fff' : '#f4f3f4'}
              />
            }
          />
          <SettingItem
            title={t('settings.openReaderDirectly')}
            description={t('settings.openReaderDirectlyDesc')}
            rightElement={
              <Switch
                value={skipArticleView}
                onValueChange={updateSkipArticleView}
                trackColor={{ false: '#767577', true: theme.colors.primary }}
                thumbColor={skipArticleView ? '#fff' : '#f4f3f4'}
              />
            }
          />
          <SettingItem
            title={t('settings.readingPositionInFeeds')}
            description={t('settings.readingPositionInFeedsDesc')}
            rightElement={
              <Switch
                value={showReadingPositionInFeeds}
                onValueChange={updateShowReadingPositionInFeeds}
                trackColor={{ false: '#767577', true: theme.colors.primary }}
                thumbColor={showReadingPositionInFeeds ? '#fff' : '#f4f3f4'}
              />
            }
          />
          <SettingItem
            title={t('settings.screenRotation')}
            description={t('settings.screenRotationDesc')}
            rightElement={
              <Switch
                value={allowRotation}
                onValueChange={updateAllowRotation}
                trackColor={{ false: '#767577', true: theme.colors.primary }}
                thumbColor={allowRotation ? '#fff' : '#f4f3f4'}
              />
            }
          />
          <SettingItem
            title={t('settings.reduceMotion')}
            description={t('settings.reduceMotionDesc')}
            rightElement={
              <Switch
                value={reduceMotion}
                onValueChange={updateReduceMotion}
                trackColor={{ false: '#767577', true: theme.colors.primary }}
                thumbColor={reduceMotion ? '#fff' : '#f4f3f4'}
              />
            }
          />
          <SettingItem
            title={t('settings.readingReminder')}
            description={readingReminder ? t('settings.readingReminderOnDesc') : t('settings.readingReminderOffDesc')}
            rightElement={
              <Switch
                value={readingReminder}
                onValueChange={updateReadingReminder}
                trackColor={{ false: '#767577', true: theme.colors.primary }}
                thumbColor={readingReminder ? '#fff' : '#f4f3f4'}
              />
            }
          />
          <SettingItem
            title={t('settings.articleAgeFilter')}
            description={maxArticleAge === 0 ? t('settings.articleAgeFilterNoLimitDesc') : t('settings.articleAgeFilterDesc', { period: getArticleAgeLabel(maxArticleAge) })}
            onPress={() => setShowArticleAgePicker(true)}
            isLast={true}
            rightElement={<Ionicons name="chevron-forward" size={20} color={theme.colors.primary} />}
          />
        </View>

        {Platform.OS === 'android' && (
          <>
            <SectionHeader title={t('settings.sectionWidget')} />
            <View style={styles.section}>
              <SettingItem
                title={t('settings.addWidget')}
                description={t('settings.addWidgetDesc')}
                onPress={handleAddWidget}
                rightElement={<Ionicons name="add-circle-outline" size={22} color={theme.colors.primary} />}
              />
              <SettingItem
                title={t('settings.widgetTheme')}
                description={widgetThemeLabel}
                onPress={() => setShowWidgetThemePicker(true)}
                rightElement={<Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={20} color={theme.colors.primary} />}
              />
              <View style={{ paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border }}>
                <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ fontSize: 15, color: theme.colors.text }}>{t('settings.widgetOpacity')}</Text>
                  <Text style={{ fontSize: 14, color: theme.colors.textSecondary }}>{t('settings.percent', { value: formatNumber(widgetOpacity) })}</Text>
                </View>
                <Slider
                  minimumValue={20}
                  maximumValue={100}
                  step={5}
                  value={widgetOpacity}
                  onValueChange={(v) => setWidgetOpacity(Math.round(v))}
                  onSlidingComplete={handleWidgetOpacityChange}
                  minimumTrackTintColor={theme.colors.primary}
                  maximumTrackTintColor={theme.colors.border}
                  thumbTintColor={theme.colors.primary}
                />
              </View>
            </View>
          </>
        )}

        <SectionHeader title={t('settings.sectionAmbientSounds')} />
        <View style={styles.section}>
          <SettingItem
            title={t('settings.autoPlayStartup')}
            description={autoPlay ? t('settings.autoPlayOnDesc', { sound: currentSound ? t(currentSound.nameKey) : t('settings.lastSound') }) : t('settings.autoPlayOffDesc')}
            onPress={() => setAutoPlay(!autoPlay)}
            isLast={true}
            rightElement={
              <Switch
                value={autoPlay}
                onValueChange={setAutoPlay}
                trackColor={{ false: '#767577', true: theme.colors.primary }}
                thumbColor={autoPlay ? '#fff' : '#f4f3f4'}
              />
            }
          />
        </View>

        <SectionHeader title={t('settings.sectionReadAloud')} />
        <View style={styles.section}>
          <View style={[styles.settingItem, { flexDirection: 'column', alignItems: 'stretch', borderBottomWidth: 0 }]}>
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <Text style={[styles.settingTitle, { color: theme.colors.text }]}>{t('settings.speechSpeed')}</Text>
              <Text style={[styles.settingTitle, { color: theme.colors.primary, fontWeight: '700' }]}>{t('settings.speedMultiplier', { rate: formatNumber(speechRate) })}</Text>
            </View>
            <Slider
              style={{ width: '100%', height: 40 }}
              minimumValue={0.5}
              maximumValue={2.0}
              step={0.25}
              value={speechRate}
              onSlidingComplete={(val) => updateSpeechRate(Math.round(val * 100) / 100)}
              minimumTrackTintColor={theme.colors.primary}
              maximumTrackTintColor={theme.colors.border}
              thumbTintColor={theme.colors.primary}
            />
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between' }}>
              <Text style={[styles.settingDescription, { color: theme.colors.textSecondary }]}>{t('settings.speedSlow')}</Text>
              <Text style={[styles.settingDescription, { color: theme.colors.textSecondary }]}>{t('settings.speedFast')}</Text>
            </View>
          </View>
        </View>

        <SectionHeader title={t('settings.sectionTranslation')} />
        <View style={styles.section}>
          <SettingItem
            title={t('settings.translationMode')}
            description={
              translationMode === TRANSLATION_MODES.AUTO ? t('settings.translationModeAutoDesc') :
              translationMode === TRANSLATION_MODES.ONLINE ? t('settings.translationModeOnlineDesc') :
              t('settings.translationModeOfflineDesc')
            }
            onPress={() => setShowTranslationModePicker(true)}
            rightElement={<Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={20} color={theme.colors.primary} />}
          />
          <SettingItem
            title={t('settings.defaultLanguage')}
            description={t('settings.defaultLanguageDesc', { language: getDisplayName(targetLangCode) })}
            onPress={() => setShowLangPicker(true)}
            rightElement={<Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={20} color={theme.colors.primary} />}
          />
          <SettingItem
            title={t('settings.downloadedModels')}
            description={t('settings.downloadedModelsDesc')}
            onPress={handleOpenModelManager}
            isLast={true}
            rightElement={<Ionicons name="cloud-download-outline" size={20} color={theme.colors.primary} />}
          />
        </View>

        <SectionHeader title={t('settings.sectionHelp')} />
        <View style={styles.section}>
          <SettingItem
            title={t('settings.appTutorial')}
            description={t('settings.appTutorialDesc')}
            onPress={() => setShowTutorial(true)}
            isLast={true}
            rightElement={<Ionicons name="help-circle-outline" size={20} color={theme.colors.primary} />}
          />
        </View>

        <SectionHeader title={t('settings.sectionData')} />
        <View style={styles.section}>
          <SettingItem
            title={t('settings.backupData')}
            description={t('settings.backupDataDesc')}
            onPress={handleBackupData}
            rightElement={<Ionicons name="push-outline" size={20} color={theme.colors.primary} />}
          />
          <SettingItem
            title={t('settings.restoreData')}
            description={t('settings.restoreDataDesc')}
            onPress={handleRestoreData}
            rightElement={<Ionicons name="download-outline" size={20} color={theme.colors.primary} />}
          />
          <SettingItem
            title={t('settings.clearAllData')}
            description={t('settings.clearAllDataDesc')}
            onPress={handleClearAllData}
            isLast={true}
            rightElement={<Ionicons name="trash-outline" size={20} color={theme.colors.error} />}
          />
        </View>

        <SectionHeader title={t('settings.sectionTesters')} />
        <View style={styles.section}>
          <TesterItem isNote={true}>{t('settings.testersThankYou')}</TesterItem>
          <TesterItem>Amir Arsalan Serajoddin Mirghaed</TesterItem>
          <TesterItem>Amirhossein Yaghoubnezhad</TesterItem>
          <TesterItem>Chris (few-thoughts)</TesterItem>
          <TesterItem>Danoush Faryar</TesterItem>
          <TesterItem>Houriyeh Emadoleslami</TesterItem>
          <TesterItem>Mohammad Torabi</TesterItem>
          <TesterItem>Mojtaba Alehosseini</TesterItem>
          <TesterItem>Sadeq Hayati</TesterItem>
          <TesterItem isLast={true}>Saeed Abdollahi Taromsari</TesterItem>
        </View>

        <SectionHeader title={t('settings.sectionAbout')} />
        <View style={styles.section}>
          <SettingItem
            title="FeedWell"
            description={t('settings.aboutTagline')}
          />
          <SettingItem
            title={t('settings.version')}
            description={formatNumber(APP_VERSION.version)}
          />
          <SettingItem
            title={t('settings.developer')}
            description="SeMo Lab"
            onPress={handleOpenWebsite}
            rightElement={<Ionicons name="open-outline" size={20} color={theme.colors.primary} />}
          />
          <SettingItem
            title={t('settings.privacy')}
            description={t('settings.privacyDesc')}
            isLast={true}
          />
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
            {t('settings.footerText')}
          </Text>
          <Text style={[styles.copyrightText, { writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
            {t('settings.copyright')}
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
            <View style={[styles.modalHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={styles.modalTitle}>{t('settings.defaultTranslateLangTitle')}</Text>
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

            <View style={[styles.modalSearchContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Ionicons name="search" size={18} color={theme.colors.textSecondary} />
              <TextInput
                style={[styles.modalSearchInput, { textAlign: isRTL ? 'right' : 'left' }]}
                placeholder={t('settings.searchLanguagesPlaceholder')}
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
                    { flexDirection: isRTL ? 'row-reverse' : 'row' },
                    item.code === targetLangCode && styles.langItemSelected,
                  ]}
                  onPress={() => handleChangeDefaultLang(item.code)}
                >
                  <Text
                    style={[
                      styles.langItemText,
                      { textAlign: isRTL ? 'right' : 'left' },
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

      {/* App Language Picker Modal */}
      <Modal
        visible={showAppLangPicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAppLangPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={[styles.modalHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={styles.modalTitle}>{t('language.pickerTitle')}</Text>
              <TouchableOpacity
                onPress={() => setShowAppLangPicker(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={APP_LANGUAGES}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.langItem,
                    { flexDirection: isRTL ? 'row-reverse' : 'row' },
                    item.code === language && styles.langItemSelected,
                  ]}
                  onPress={() => handleChangeAppLanguage(item.code)}
                >
                  <Text
                    style={[
                      styles.langItemText,
                      { textAlign: isRTL ? 'right' : 'left' },
                      item.code === language && styles.langItemTextSelected,
                    ]}
                  >
                    {item.nativeLabel}{item.code !== 'en' ? `  ·  ${item.englishLabel}` : ''}
                  </Text>
                  {item.code === language && (
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
        onRequestClose={() => {
          setShowModelManager(false);
          setModelSearchQuery('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={[styles.modalHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={styles.modalTitle}>{t('settings.offlineModelsTitle')}</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowModelManager(false);
                  setModelSearchQuery('');
                }}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <View style={[styles.modalSearchContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Ionicons name="search" size={18} color={theme.colors.textSecondary} />
              <TextInput
                style={[styles.modalSearchInput, { textAlign: isRTL ? 'right' : 'left' }]}
                placeholder={t('settings.searchLanguagesPlaceholder')}
                placeholderTextColor={theme.colors.textTertiary}
                value={modelSearchQuery}
                onChangeText={setModelSearchQuery}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {modelSearchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setModelSearchQuery('')}>
                  <Ionicons name="close-circle" size={18} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            {loadingModels ? (
              <View style={styles.modelLoadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={styles.modelLoadingText}>{t('settings.checkingModels')}</Text>
              </View>
            ) : (
              <FlatList
                data={modelSearchQuery.trim()
                  ? allModels.filter(m => m.displayName.toLowerCase().includes(modelSearchQuery.toLowerCase()) || m.code.includes(modelSearchQuery.toLowerCase()))
                  : [...allModels.filter(m => m.downloaded), ...allModels.filter(m => !m.downloaded)]
                }
                keyExtractor={(item) => item.code}
                renderItem={({ item }) => (
                  <View style={[styles.modelItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <View style={[styles.modelItemInfo, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <Ionicons
                        name={item.downloaded ? 'checkmark-circle' : 'cloud-download-outline'}
                        size={20}
                        color={item.downloaded ? theme.colors.success : theme.colors.textSecondary}
                      />
                      <Text style={[styles.modelItemText, { textAlign: isRTL ? 'right' : 'left' }, item.downloaded && { fontWeight: '600' }]}>{item.displayName}</Text>
                    </View>
                    {downloadingModel === item.code ? (
                      <ActivityIndicator size="small" color={theme.colors.primary} />
                    ) : item.downloaded ? (
                      <TouchableOpacity
                        onPress={() => handleDeleteModel(item)}
                        style={styles.modelActionButton}
                      >
                        <Ionicons name="trash-outline" size={18} color={theme.colors.error || '#FF3B30'} />
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        onPress={() => handleDownloadModel(item)}
                        style={styles.modelActionButton}
                      >
                        <Ionicons name="download-outline" size={18} color={theme.colors.primary} />
                      </TouchableOpacity>
                    )}
                  </View>
                )}
                showsVerticalScrollIndicator={false}
                style={styles.langList}
                ListHeaderComponent={
                  <View style={styles.modelListHeader}>
                    <Text style={[styles.modelListHeaderText, { textAlign: isRTL ? 'right' : 'left' }]}>
                      {downloadedModels.length === 1
                        ? t('settings.modelsDownloadedOne', { count: formatNumber(downloadedModels.length) })
                        : t('settings.modelsDownloadedOther', { count: formatNumber(downloadedModels.length) })}
                    </Text>
                    <Text style={[styles.modelListSubtext, { textAlign: isRTL ? 'right' : 'left' }]}>
                      {t('settings.modelsDownloadedSubtext')}
                    </Text>
                  </View>
                }
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Translation Mode Picker Modal */}
      <Modal
        visible={showTranslationModePicker}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowTranslationModePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { height: 'auto', maxHeight: '50%' }]}>
            <View style={[styles.modalHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={styles.modalTitle}>{t('settings.translationMode')}</Text>
              <TouchableOpacity
                onPress={() => setShowTranslationModePicker(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.modeItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }, translationMode === TRANSLATION_MODES.AUTO && styles.langItemSelected]}
              onPress={() => handleSelectTranslationMode(TRANSLATION_MODES.AUTO)}
            >
              <View style={[styles.modeItemContent, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Ionicons name="sync-outline" size={22} color={translationMode === TRANSLATION_MODES.AUTO ? theme.colors.primary : theme.colors.text} />
                <View style={styles.modeItemText}>
                  <Text style={[styles.modeItemTitle, { textAlign: isRTL ? 'right' : 'left' }, translationMode === TRANSLATION_MODES.AUTO && { color: theme.colors.primary }]}>{t('settings.translationModeAutoTitle')}</Text>
                  <Text style={[styles.modeItemDesc, { textAlign: isRTL ? 'right' : 'left' }]}>{t('settings.translationModeAutoLong')}</Text>
                </View>
              </View>
              {translationMode === TRANSLATION_MODES.AUTO && (
                <Ionicons name="checkmark" size={20} color={theme.colors.primary} />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modeItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }, translationMode === TRANSLATION_MODES.ONLINE && styles.langItemSelected]}
              onPress={() => handleSelectTranslationMode(TRANSLATION_MODES.ONLINE)}
            >
              <View style={[styles.modeItemContent, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Ionicons name="cloud-outline" size={22} color={translationMode === TRANSLATION_MODES.ONLINE ? theme.colors.primary : theme.colors.text} />
                <View style={styles.modeItemText}>
                  <Text style={[styles.modeItemTitle, { textAlign: isRTL ? 'right' : 'left' }, translationMode === TRANSLATION_MODES.ONLINE && { color: theme.colors.primary }]}>{t('settings.translationModeOnlineTitle')}</Text>
                  <Text style={[styles.modeItemDesc, { textAlign: isRTL ? 'right' : 'left' }]}>{t('settings.translationModeOnlineLong')}</Text>
                </View>
              </View>
              {translationMode === TRANSLATION_MODES.ONLINE && (
                <Ionicons name="checkmark" size={20} color={theme.colors.primary} />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modeItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }, { borderBottomWidth: 0 }, translationMode === TRANSLATION_MODES.OFFLINE && styles.langItemSelected]}
              onPress={() => handleSelectTranslationMode(TRANSLATION_MODES.OFFLINE)}
            >
              <View style={[styles.modeItemContent, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Ionicons name="phone-portrait-outline" size={22} color={translationMode === TRANSLATION_MODES.OFFLINE ? theme.colors.primary : theme.colors.text} />
                <View style={styles.modeItemText}>
                  <Text style={[styles.modeItemTitle, { textAlign: isRTL ? 'right' : 'left' }, translationMode === TRANSLATION_MODES.OFFLINE && { color: theme.colors.primary }]}>{t('settings.translationModeOfflineTitle')}</Text>
                  <Text style={[styles.modeItemDesc, { textAlign: isRTL ? 'right' : 'left' }]}>{t('settings.translationModeOfflineLong')}</Text>
                </View>
              </View>
              {translationMode === TRANSLATION_MODES.OFFLINE && (
                <Ionicons name="checkmark" size={20} color={theme.colors.primary} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Article Age Filter Picker Modal */}
      <Modal
        visible={showArticleAgePicker}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowArticleAgePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { height: 'auto', maxHeight: '50%' }]}>
            <View style={[styles.modalHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={styles.modalTitle}>{t('settings.articleAgeFilter')}</Text>
              <TouchableOpacity
                onPress={() => setShowArticleAgePicker(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modeItemDesc, { paddingHorizontal: 16, paddingBottom: 8, textAlign: isRTL ? 'right' : 'left' }]}>
              {t('settings.articleAgeFilterModalDesc')}
            </Text>

            {articleAgeOptions.map((option, index) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.modeItem,
                  { flexDirection: isRTL ? 'row-reverse' : 'row' },
                  maxArticleAge === option.value && styles.langItemSelected,
                  index === articleAgeOptions.length - 1 && { borderBottomWidth: 0 },
                ]}
                onPress={() => {
                  updateMaxArticleAge(option.value);
                  setShowArticleAgePicker(false);
                }}
              >
                <View style={[styles.modeItemContent, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Ionicons
                    name={option.value === 0 ? 'infinite-outline' : 'time-outline'}
                    size={22}
                    color={maxArticleAge === option.value ? theme.colors.primary : theme.colors.text}
                  />
                  <View style={styles.modeItemText}>
                    <Text style={[styles.modeItemTitle, { textAlign: isRTL ? 'right' : 'left' }, maxArticleAge === option.value && { color: theme.colors.primary }]}>
                      {option.label}
                    </Text>
                  </View>
                </View>
                {maxArticleAge === option.value && (
                  <Ionicons name="checkmark" size={20} color={theme.colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* Widget Theme Picker Modal */}
      <Modal
        visible={showWidgetThemePicker}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowWidgetThemePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { height: 'auto', maxHeight: '50%' }]}>
            <View style={[styles.modalHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={styles.modalTitle}>{t('settings.widgetTheme')}</Text>
              <TouchableOpacity
                onPress={() => setShowWidgetThemePicker(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            {[
              { value: 'app', label: t('settings.widgetThemeApp'), desc: t('settings.widgetThemeAppDesc'), icon: 'phone-portrait-outline' },
              { value: 'light', label: t('settings.widgetThemeLight'), desc: t('settings.widgetThemeLightDesc'), icon: 'sunny-outline' },
              { value: 'dark', label: t('settings.widgetThemeDark'), desc: t('settings.widgetThemeDarkDesc'), icon: 'moon-outline' },
            ].map((option, index) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.modeItem,
                  { flexDirection: isRTL ? 'row-reverse' : 'row' },
                  widgetTheme === option.value && styles.langItemSelected,
                  index === 2 && { borderBottomWidth: 0 },
                ]}
                onPress={() => handleWidgetThemeChange(option.value)}
              >
                <View style={[styles.modeItemContent, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Ionicons
                    name={option.icon}
                    size={22}
                    color={widgetTheme === option.value ? theme.colors.primary : theme.colors.text}
                  />
                  <View style={styles.modeItemText}>
                    <Text style={[styles.modeItemTitle, { textAlign: isRTL ? 'right' : 'left' }, widgetTheme === option.value && { color: theme.colors.primary }]}>
                      {option.label}
                    </Text>
                    <Text style={[styles.modeItemDesc, { textAlign: isRTL ? 'right' : 'left' }]}>{option.desc}</Text>
                  </View>
                </View>
                {widgetTheme === option.value && (
                  <Ionicons name="checkmark" size={20} color={theme.colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      <CustomAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        icon={alertConfig.icon}
        buttons={alertConfig.buttons}
        onDismiss={() => {
          setAlertConfig(prev => ({ ...prev, visible: false }));
          if (restoreResolveRef.current) {
            restoreResolveRef.current(false);
            restoreResolveRef.current = null;
          }
        }}
      />
    </SafeAreaView>
  );
}

