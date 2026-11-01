import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Linking,
  Modal,
  FlatList,
  TextInput,
  ActivityIndicator,
  NativeModules,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { READING_FONTS, getReadingFont, readingFontStyle } from '../config/readingFonts';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { APP_VERSION } from '../config/version';
import { useFeed, REMOVED_ARTICLES_KEY } from '../context/FeedContext';
import { useTheme, makeStyles, COLOR_THEMES } from '../context/ThemeContext';
import { useUi, ListCard, SectionTitle, ThemedSwitch } from '../theme/ui';
import { FONT, TYPE, RADIUS } from '../theme/type';
import { useAppSettings } from '../context/AppSettingsContext';
import { useTranslation } from '../context/LanguageContext';
import { APP_LANGUAGES, getAppLanguage } from '../i18n/appLanguages';
import { tStatic } from '../i18n';
import { formatLocalizedDate } from '../utils/formatDate';
import { useReadLater } from '../context/ReadLaterContext';
import { useAmbientSound } from '../context/AmbientSoundContext';
import { useTour, useTourTarget } from '../context/TourContext';
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

// "More from SeMo Lab" — the other apps, alphabetical. Names are brands and stay
// untranslated; descriptions are localized.
const SEMO_LAB_DEVELOPER_ID = '6449174405168948991';
const SEMO_LAB_APPS = [
  { name: 'LedgerWell', packageName: 'com.ledgerwell.app', descKey: 'settings.appLedgerWellDesc' },
  { name: 'ThinkWell', packageName: 'com.thinkwell.app', descKey: 'settings.appThinkWellDesc' },
  { name: 'WeatherWell', packageName: 'com.weatherwell.app', descKey: 'settings.appWeatherWellDesc' },
];

export default function SettingsScreen({ navigation }) {
  const { feeds, articles, clearAllData } = useFeed();
  const { theme, isDarkMode, toggleTheme, paletteIndex, setPalette, accentIndex, setAccent, amoledBlack, toggleAmoledBlack } = useTheme();
  const { showImages, autoRefresh, showBookmarkIndicators, skipArticleView, showReadingPositionInFeeds, allowRotation, speechRate, readerHeaderActions, reduceMotion, readingReminder, updateShowImages, updateAutoRefresh, updateShowBookmarkIndicators, updateSkipArticleView, updateShowReadingPositionInFeeds, updateAllowRotation, updateSpeechRate, updateReaderHeaderActions, updateReduceMotion, updateReadingReminder, maxArticleAge, updateMaxArticleAge, autoScrollEnabled, autoScrollDelay, autoScrollSpeed, updateAutoScrollEnabled, updateAutoScrollDelay, updateAutoScrollSpeed, keepAwakeEnabled, updateKeepAwakeEnabled, autoTranslate, updateAutoTranslate } = useAppSettings();
  const { feedRegionUserSet, updateFeedRegion, translationTargetUserSet, markTranslationTargetUserSet, readingFont, updateReadingFont } = useAppSettings();
  const { articles: readLaterArticles } = useReadLater();
  const { autoPlay, setAutoPlay, currentSound } = useAmbientSound();
  const { t, language, setLanguage, isRTL, formatNumber } = useTranslation();
  const insets = useSafeAreaInsets();
  const ui = useUi();
  const styles = useStyles(isRTL);
  const tour = useTour();
  const tourHeaderRef = useTourTarget('settings.header');
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
  const [showAutoScrollDelayPicker, setShowAutoScrollDelayPicker] = useState(false);
  const [showFontPicker, setShowFontPicker] = useState(false);
  const [alertConfig, setAlertConfig] = useState({ visible: false, title: '', message: '', buttons: [] });
  const restoreResolveRef = useRef(null);

  // Widget settings state
  const [widgetTheme, setWidgetTheme] = useState('app'); // 'app', 'light', 'dark'
  const [showWidgetThemePicker, setShowWidgetThemePicker] = useState(false);
  const [widgetOpacity, setWidgetOpacity] = useState(100); // 0-100%
  const [widgetShowImages, setWidgetShowImages] = useState(true);

  // Load target language and translation mode on mount
  useEffect(() => {
    loadTargetLanguage().then(code => setTargetLangCode(code));
    loadTranslationMode().then(mode => setTranslationMode(mode));
    // Load widget preferences
    AsyncStorage.getItem('widget_theme').then(v => { if (v) setWidgetTheme(v); });
    AsyncStorage.getItem('widget_opacity').then(v => { if (v) setWidgetOpacity(parseInt(v, 10)); });
    AsyncStorage.getItem('widget_show_images').then(v => { if (v !== null) setWidgetShowImages(v === 'true'); });
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

  const handleWidgetShowImagesChange = async (value) => {
    setWidgetShowImages(value);
    await AsyncStorage.setItem('widget_show_images', String(value));
    if (Platform.OS === 'android' && WidgetBridge?.setWidgetShowImages) {
      try { WidgetBridge.setWidgetShowImages(value); } catch (e) {}
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

  const handleOpenWebsite = async (target) => {
    const url = typeof target === 'string' ? target : 'https://semo-lab.com/feedwell/';
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

  // More from SeMo Lab: open the Play Store app directly, falling back to the
  // web listing where there is no store app (or on web).
  const openPlayListing = async (packageName) => {
    try {
      await Linking.openURL(`market://details?id=${packageName}`);
    } catch (e) {
      handleOpenWebsite(`https://play.google.com/store/apps/details?id=${packageName}`);
    }
  };

  const openDeveloperPage = async () => {
    try {
      await Linking.openURL(`market://dev?id=${SEMO_LAB_DEVELOPER_ID}`);
    } catch (e) {
      handleOpenWebsite(`https://play.google.com/store/apps/dev?id=${SEMO_LAB_DEVELOPER_ID}`);
    }
  };

  const handleBackupData = async () => {
    try {
      // Articles the reader removed, so a restore keeps them out of the list
      let removedArticles = [];
      try {
        const storedRemoved = await SafeStorage.getItem(REMOVED_ARTICLES_KEY);
        removedArticles = storedRemoved ? JSON.parse(storedRemoved) : [];
      } catch (e) { /* none removed yet */ }

      // Gather all data
      const backupData = {
        version: APP_VERSION.version,
        timestamp: new Date().toISOString(),
        feeds: feeds,
        articles: articles,
        readLater: readLaterArticles,
        removedArticles,
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
          ? formatLocalizedDate(backupData.timestamp, language, formatNumber, { withTime: false, locale: language })
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

      // Restore the removed articles (backups from 1.19.0 on carry them)
      if (Array.isArray(backupData.removedArticles)) {
        await SafeStorage.setItem(REMOVED_ARTICLES_KEY, JSON.stringify(backupData.removedArticles));
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

  const colors = theme.colors;
  const chevron = <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={18} color={colors.textSecondary} />;
  // Sheets run under the navigation bar and end above it
  const sheetPadding = { paddingBottom: Math.max(insets.bottom, 12) + 12 };

  // One row of the five colors, for the main color and for the accent. Each
  // name stays on one line under its swatch.
  const renderSwatches = (selectedIndex, onSelect) => (
    <View style={styles.swatchRow}>
      {COLOR_THEMES.map((option, index) => {
        const selected = index === selectedIndex;
        return (
          <TouchableOpacity
            key={option.key}
            style={styles.swatchItem}
            onPress={() => onSelect(index)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={t(option.nameKey)}
            activeOpacity={0.8}
          >
            <View style={[styles.swatchRing, selected && styles.swatchRingSelected]}>
              <View style={[styles.swatch, { backgroundColor: isDarkMode ? option.dark : option.light }]} />
            </View>
            <Text
              style={[styles.swatchName, selected && styles.swatchNameSelected]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.85}
            >
              {t(option.nameKey)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  // A slider in a card: its name and value above it, its two ends below
  const renderSlider = ({ title, valueLabel, valueStyle, ends, ...slider }) => (
    <View style={styles.block}>
      <View style={styles.sliderHeader}>
        <Text style={[ui.rowTitle, styles.flexText]}>{title}</Text>
        <Text style={[styles.sliderValue, valueStyle]}>{valueLabel}</Text>
      </View>
      <Slider
        style={styles.slider}
        minimumTrackTintColor={colors.primary}
        maximumTrackTintColor={colors.outline}
        thumbTintColor={colors.primary}
        {...slider}
      />
      {ends && (
        <View style={styles.sliderEnds}>
          <Text style={ui.secondary}>{ends[0]}</Text>
          <Text style={ui.secondary}>{ends[1]}</Text>
        </View>
      )}
    </View>
  );

  // A sheet's top: the handle, the title and a close button
  const renderSheetHeader = (title, onClose) => (
    <>
      <View style={ui.sheetHandle} />
      <View style={styles.modalHeader}>
        <Text style={[ui.title, styles.flexText]}>{title}</Text>
        <TouchableOpacity
          onPress={onClose}
          style={styles.modalCloseButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="close" size={22} color={colors.text} />
        </TouchableOpacity>
      </View>
    </>
  );

  // A choice in a picker sheet: an icon, the choice and a line about it, and
  // a check on the one in use
  const renderChoice = ({ key, icon, title, description, selected, onPress, titleStyle, selectedTitleStyle = styles.choiceTitleSelected, descriptionStyle, numberOfLines }) => (
    <TouchableOpacity key={key} style={[styles.modeItem, selected && styles.choiceSelected]} onPress={onPress}>
      <View style={styles.modeItemContent}>
        <Ionicons name={icon} size={22} color={selected ? colors.mainInk : colors.textSecondary} />
        <View style={styles.flexText}>
          <Text style={[ui.rowTitle, titleStyle, selected && selectedTitleStyle]}>{title}</Text>
          {!!description && (
            <Text style={[ui.secondary, styles.modeItemDesc, descriptionStyle]} numberOfLines={numberOfLines}>
              {description}
            </Text>
          )}
        </View>
      </View>
      {selected && <Ionicons name="checkmark" size={20} color={colors.mainInk} />}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={ui.page}>
      <View ref={tourHeaderRef} collapsable={false} style={styles.header}>
        <Text style={ui.screenTitle}>{t('tab.settings')}</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <SectionTitle title={t('settings.sectionPreferences')} />
        <ListCard>
          <SettingItem
            title={t('settings.autoRefresh')}
            description={t('settings.autoRefreshDesc')}
            rightElement={<ThemedSwitch value={autoRefresh} onValueChange={updateAutoRefresh} />}
          />
          <SettingItem
            title={t('settings.showImages')}
            description={t('settings.showImagesDesc')}
            rightElement={<ThemedSwitch value={showImages} onValueChange={updateShowImages} />}
          />
          <SettingItem
            title={t('settings.darkMode')}
            description={t('settings.darkModeDesc')}
            rightElement={<ThemedSwitch value={isDarkMode} onValueChange={toggleTheme} />}
          />
          {isDarkMode && (
            <SettingItem
              title={t('settings.amoledBlack')}
              description={t('settings.amoledBlackDesc')}
              rightElement={<ThemedSwitch value={amoledBlack} onValueChange={toggleAmoledBlack} />}
            />
          )}
          <SettingItem
            title={t('settings.readingFont')}
            description={getReadingFont(readingFont).label || t(getReadingFont(readingFont).labelKey)}
            onPress={() => setShowFontPicker(true)}
            rightElement={chevron}
          />
          <SettingItem
            title={t('language.appTitle')}
            description={getAppLanguage(language).nativeLabel}
            onPress={() => setShowAppLangPicker(true)}
            rightElement={chevron}
          />
          {/* Two colors: the main color is what you tap, the accent what to notice */}
          <View style={styles.block}>
            <Text style={ui.rowTitle}>{t('settings.mainColor')}</Text>
            <Text style={[ui.secondary, styles.hint]}>{t('settings.mainColorHint')}</Text>
            {renderSwatches(paletteIndex, setPalette)}
          </View>
          <View style={styles.block}>
            <Text style={ui.rowTitle}>{t('settings.accentColor')}</Text>
            <Text style={[ui.secondary, styles.hint]}>{t('settings.accentColorHint')}</Text>
            {renderSwatches(accentIndex, setAccent)}
          </View>
          <SettingItem
            title={t('settings.bookmarkIndicators')}
            description={t('settings.bookmarkIndicatorsDesc')}
            rightElement={<ThemedSwitch value={showBookmarkIndicators} onValueChange={updateShowBookmarkIndicators} />}
          />
          <SettingItem
            title={t('settings.openReaderDirectly')}
            description={t('settings.openReaderDirectlyDesc')}
            rightElement={<ThemedSwitch value={skipArticleView} onValueChange={updateSkipArticleView} />}
          />
          <SettingItem
            title={t('settings.readingPositionInFeeds')}
            description={t('settings.readingPositionInFeedsDesc')}
            rightElement={<ThemedSwitch value={showReadingPositionInFeeds} onValueChange={updateShowReadingPositionInFeeds} />}
          />
          <SettingItem
            title={t('settings.screenRotation')}
            description={t('settings.screenRotationDesc')}
            rightElement={<ThemedSwitch value={allowRotation} onValueChange={updateAllowRotation} />}
          />
          <SettingItem
            title={t('settings.reduceMotion')}
            description={t('settings.reduceMotionDesc')}
            rightElement={<ThemedSwitch value={reduceMotion} onValueChange={updateReduceMotion} />}
          />
          <SettingItem
            title={t('settings.readingReminder')}
            description={readingReminder ? t('settings.readingReminderOnDesc') : t('settings.readingReminderOffDesc')}
            rightElement={<ThemedSwitch value={readingReminder} onValueChange={updateReadingReminder} />}
          />
          <SettingItem
            title={t('settings.autoScroll')}
            description={t('settings.autoScrollDesc')}
            rightElement={<ThemedSwitch value={autoScrollEnabled} onValueChange={updateAutoScrollEnabled} />}
          />
          {autoScrollEnabled && (
            <SettingItem
              title={t('settings.autoScrollDelay')}
              description={t('settings.autoScrollDelayValue', { count: formatNumber(autoScrollDelay) })}
              onPress={() => setShowAutoScrollDelayPicker(true)}
              rightElement={chevron}
            />
          )}
          {autoScrollEnabled && renderSlider({
            title: t('settings.autoScrollSpeed'),
            valueLabel: t('settings.percent', { value: formatNumber(autoScrollSpeed) }),
            ends: [t('settings.speedSlow'), t('settings.speedFast')],
            minimumValue: 25,
            maximumValue: 250,
            step: 25,
            value: autoScrollSpeed,
            onSlidingComplete: (v) => updateAutoScrollSpeed(Math.round(v)),
          })}
          {autoScrollEnabled && (
            <SettingItem
              title={t('settings.keepAwake')}
              description={t('settings.keepAwakeDesc')}
              rightElement={<ThemedSwitch value={keepAwakeEnabled} onValueChange={updateKeepAwakeEnabled} />}
            />
          )}
          <SettingItem
            title={t('settings.articleAgeFilter')}
            description={maxArticleAge === 0 ? t('settings.articleAgeFilterNoLimitDesc') : t('settings.articleAgeFilterDesc', { period: getArticleAgeLabel(maxArticleAge) })}
            onPress={() => setShowArticleAgePicker(true)}
            rightElement={chevron}
          />
        </ListCard>

        {Platform.OS === 'android' && (
          <>
            <SectionTitle title={t('settings.sectionWidget')} />
            <ListCard>
              <SettingItem
                title={t('settings.addWidget')}
                description={t('settings.addWidgetDesc')}
                onPress={handleAddWidget}
                rightElement={<Ionicons name="add-circle-outline" size={22} color={colors.mainInk} />}
              />
              <SettingItem
                title={t('settings.widgetTheme')}
                description={widgetThemeLabel}
                onPress={() => setShowWidgetThemePicker(true)}
                rightElement={chevron}
              />
              <SettingItem
                title={t('settings.widgetImages')}
                description={t('settings.widgetImagesDesc')}
                rightElement={<ThemedSwitch value={widgetShowImages} onValueChange={handleWidgetShowImagesChange} />}
              />
              {renderSlider({
                title: t('settings.widgetOpacity'),
                valueLabel: t('settings.percent', { value: formatNumber(widgetOpacity) }),
                minimumValue: 20,
                maximumValue: 100,
                step: 5,
                value: widgetOpacity,
                onValueChange: (v) => setWidgetOpacity(Math.round(v)),
                onSlidingComplete: handleWidgetOpacityChange,
              })}
            </ListCard>
          </>
        )}

        <SectionTitle title={t('settings.sectionAmbientSounds')} />
        <ListCard>
          <SettingItem
            title={t('settings.autoPlayStartup')}
            description={autoPlay ? t('settings.autoPlayOnDesc', { sound: currentSound ? t(currentSound.nameKey) : t('settings.lastSound') }) : t('settings.autoPlayOffDesc')}
            onPress={() => setAutoPlay(!autoPlay)}
            rightElement={<ThemedSwitch value={autoPlay} onValueChange={setAutoPlay} />}
          />
        </ListCard>

        <SectionTitle title={t('settings.sectionReadAloud')} />
        <ListCard>
          {renderSlider({
            title: t('settings.speechSpeed'),
            valueLabel: t('settings.speedMultiplier', { rate: formatNumber(speechRate) }),
            // The speed is the value this card sets: in main ink
            valueStyle: styles.sliderValueMain,
            ends: [t('settings.speedSlow'), t('settings.speedFast')],
            minimumValue: 0.5,
            maximumValue: 2.0,
            step: 0.25,
            value: speechRate,
            onSlidingComplete: (val) => updateSpeechRate(Math.round(val * 100) / 100),
          })}
        </ListCard>

        <SectionTitle title={t('settings.sectionTranslation')} />
        <ListCard>
          <SettingItem
            title={t('settings.translationMode')}
            description={
              translationMode === TRANSLATION_MODES.AUTO ? t('settings.translationModeAutoDesc') :
              translationMode === TRANSLATION_MODES.ONLINE ? t('settings.translationModeOnlineDesc') :
              t('settings.translationModeOfflineDesc')
            }
            onPress={() => setShowTranslationModePicker(true)}
            rightElement={chevron}
          />
          <SettingItem
            title={t('settings.defaultLanguage')}
            description={t('settings.defaultLanguageDesc', { language: getDisplayName(targetLangCode) })}
            onPress={() => setShowLangPicker(true)}
            rightElement={chevron}
          />
          <SettingItem
            title={t('settings.autoTranslate')}
            description={t('settings.autoTranslateDesc', { language: getDisplayName(targetLangCode) })}
            rightElement={<ThemedSwitch value={autoTranslate} onValueChange={updateAutoTranslate} />}
          />
          <SettingItem
            title={t('settings.downloadedModels')}
            description={t('settings.downloadedModelsDesc')}
            onPress={handleOpenModelManager}
            rightElement={<Ionicons name="cloud-download-outline" size={20} color={colors.mainInk} />}
          />
        </ListCard>

        <SectionTitle title={t('settings.sectionHelp')} />
        <ListCard>
          <SettingItem
            title={t('settings.appTour')}
            description={t('settings.appTourDesc')}
            onPress={() => tour?.startTour()}
            rightElement={<Ionicons name="help-circle-outline" size={20} color={colors.mainInk} />}
          />
        </ListCard>

        <SectionTitle title={t('settings.sectionData')} />
        <ListCard>
          <SettingItem
            title={t('settings.backupData')}
            description={t('settings.backupDataDesc')}
            onPress={handleBackupData}
            rightElement={<Ionicons name="push-outline" size={20} color={colors.mainInk} />}
          />
          <SettingItem
            title={t('settings.restoreData')}
            description={t('settings.restoreDataDesc')}
            onPress={handleRestoreData}
            rightElement={<Ionicons name="download-outline" size={20} color={colors.mainInk} />}
          />
          <SettingItem
            title={t('settings.clearAllData')}
            description={t('settings.clearAllDataDesc')}
            onPress={handleClearAllData}
            rightElement={<Ionicons name="trash-outline" size={20} color={colors.error} />}
          />
        </ListCard>

        <SectionTitle title={t('settings.sectionTesters')} />
        <View style={[ui.card, styles.testersCard]}>
          <TesterItem isNote={true}>{t('settings.testersThankYou')}</TesterItem>
          <TesterItem>Amir Arsalan Serajoddin Mirghaed</TesterItem>
          <TesterItem>Amirhossein Yaghoubnezhad</TesterItem>
          <TesterItem>Basel Badich</TesterItem>
          <TesterItem>Chris (few-thoughts)</TesterItem>
          <TesterItem>Danoush Faryar</TesterItem>
          <TesterItem>Houriyeh Emadoleslami</TesterItem>
          <TesterItem>Mohammad Torabi</TesterItem>
          <TesterItem>Mojtaba Alehosseini</TesterItem>
          <TesterItem>Sadeq Hayati</TesterItem>
          <TesterItem>Saeed Abdollahi Taromsari</TesterItem>
          <TesterItem>Ulas Altun</TesterItem>
        </View>

        <SectionTitle title={t('settings.sectionAbout')} />
        <ListCard>
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
            rightElement={<Ionicons name="open-outline" size={20} color={colors.mainInk} />}
          />
          <SettingItem
            title={t('settings.privacy')}
            description={t('settings.privacyDesc')}
            onPress={() => handleOpenWebsite('https://semo-lab.com/feedwell/privacy-policy/')}
            rightElement={<Ionicons name="open-outline" size={20} color={colors.mainInk} />}
          />
        </ListCard>

        <SectionTitle title={t('settings.sectionMoreApps')} />
        <ListCard>
          {SEMO_LAB_APPS.map((app) => (
            <SettingItem
              key={app.packageName}
              title={app.name}
              description={t(app.descKey)}
              onPress={() => openPlayListing(app.packageName)}
              rightElement={<Ionicons name="logo-google-playstore" size={20} color={colors.mainInk} />}
            />
          ))}
          <SettingItem
            title={t('settings.allApps')}
            description={t('settings.allAppsDesc')}
            onPress={openDeveloperPage}
            rightElement={<Ionicons name="open-outline" size={20} color={colors.mainInk} />}
          />
        </ListCard>

        <View style={styles.footer}>
          {/* Centered like every language; explicit writingDirection keeps the bidi
              base stable so the line doesn't flip when it starts with a Latin word. */}
          <Text style={[ui.secondaryOnWash, styles.footerText, { writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
            {t('settings.footerText')}
          </Text>
          {/* Keep the copyright in English + LTR for RTL languages (it's brand + year). */}
          <Text style={[ui.secondaryOnWash, styles.copyrightText, { writingDirection: 'ltr' }]}>
            {isRTL ? tStatic('settings.copyright', 'en') : t('settings.copyright')}
          </Text>
        </View>
      </ScrollView>


      {/* Default Language Picker Modal */}
      <Modal
        visible={showLangPicker}
        animationType="slide"
        transparent={true}
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={() => {
          setShowLangPicker(false);
          setLangSearchQuery('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[ui.sheet, styles.modalContainer, sheetPadding]}>
            {renderSheetHeader(t('settings.defaultTranslateLangTitle'), () => {
              setShowLangPicker(false);
              setLangSearchQuery('');
            })}

            <View style={styles.modalSearchContainer}>
              <Ionicons name="search" size={18} color={colors.textSecondary} />
              <TextInput
                style={styles.modalSearchInput}
                placeholder={t('settings.searchLanguagesPlaceholder')}
                placeholderTextColor={colors.textSecondary}
                value={langSearchQuery}
                onChangeText={setLangSearchQuery}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {langSearchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setLangSearchQuery('')}>
                  <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            <FlatList
              data={pickerLanguages}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.langItem, item.code === targetLangCode && styles.choiceSelected]}
                  onPress={() => handleChangeDefaultLang(item.code)}
                >
                  <Text style={[ui.body, styles.flexText, item.code === targetLangCode && styles.choiceTitleSelected]}>
                    {item.displayName}
                  </Text>
                  {item.code === targetLangCode && (
                    <Ionicons name="checkmark" size={20} color={colors.mainInk} />
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
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={() => setShowAppLangPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[ui.sheet, styles.modalContainer, sheetPadding]}>
            {renderSheetHeader(t('language.pickerTitle'), () => setShowAppLangPicker(false))}

            <FlatList
              data={APP_LANGUAGES}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.langItem, item.code === language && styles.choiceSelected]}
                  onPress={() => handleChangeAppLanguage(item.code)}
                >
                  <Text style={[ui.body, styles.flexText, item.code === language && styles.choiceTitleSelected]}>
                    {item.nativeLabel}{item.code !== 'en' ? `  ·  ${item.englishLabel}` : ''}
                  </Text>
                  {item.code === language && (
                    <Ionicons name="checkmark" size={20} color={colors.mainInk} />
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
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={() => {
          setShowModelManager(false);
          setModelSearchQuery('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[ui.sheet, styles.modalContainer, sheetPadding]}>
            {renderSheetHeader(t('settings.offlineModelsTitle'), () => {
              setShowModelManager(false);
              setModelSearchQuery('');
            })}

            <View style={styles.modalSearchContainer}>
              <Ionicons name="search" size={18} color={colors.textSecondary} />
              <TextInput
                style={styles.modalSearchInput}
                placeholder={t('settings.searchLanguagesPlaceholder')}
                placeholderTextColor={colors.textSecondary}
                value={modelSearchQuery}
                onChangeText={setModelSearchQuery}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {modelSearchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setModelSearchQuery('')}>
                  <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            {loadingModels ? (
              <View style={styles.modelLoadingContainer}>
                <ActivityIndicator size="large" color={colors.mainInk} />
                <Text style={[ui.secondary, styles.modelLoadingText]}>{t('settings.checkingModels')}</Text>
              </View>
            ) : (
              <FlatList
                data={modelSearchQuery.trim()
                  ? allModels.filter(m => m.displayName.toLowerCase().includes(modelSearchQuery.toLowerCase()) || m.code.includes(modelSearchQuery.toLowerCase()))
                  : [...allModels.filter(m => m.downloaded), ...allModels.filter(m => !m.downloaded)]
                }
                keyExtractor={(item) => item.code}
                renderItem={({ item }) => (
                  <View style={styles.modelItem}>
                    <View style={styles.modelItemInfo}>
                      <Ionicons
                        name={item.downloaded ? 'checkmark-circle' : 'cloud-download-outline'}
                        size={20}
                        color={item.downloaded ? colors.success : colors.textSecondary}
                      />
                      <Text style={[ui.body, styles.flexText, item.downloaded && styles.modelItemDownloaded]}>{item.displayName}</Text>
                    </View>
                    {downloadingModel === item.code ? (
                      <ActivityIndicator size="small" color={colors.mainInk} />
                    ) : item.downloaded ? (
                      <TouchableOpacity
                        onPress={() => handleDeleteModel(item)}
                        style={styles.modelActionButton}
                      >
                        <Ionicons name="trash-outline" size={18} color={colors.error} />
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        onPress={() => handleDownloadModel(item)}
                        style={styles.modelActionButton}
                      >
                        <Ionicons name="download-outline" size={18} color={colors.mainInk} />
                      </TouchableOpacity>
                    )}
                  </View>
                )}
                showsVerticalScrollIndicator={false}
                style={styles.langList}
                ListHeaderComponent={
                  <View style={styles.modelListHeader}>
                    <Text style={ui.rowTitle}>
                      {downloadedModels.length === 1
                        ? t('settings.modelsDownloadedOne', { count: formatNumber(downloadedModels.length) })
                        : t('settings.modelsDownloadedOther', { count: formatNumber(downloadedModels.length) })}
                    </Text>
                    <Text style={[ui.secondary, styles.hint]}>
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
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={() => setShowTranslationModePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[ui.sheet, styles.modalContainer, styles.modalContainerShort, sheetPadding]}>
            {renderSheetHeader(t('settings.translationMode'), () => setShowTranslationModePicker(false))}

            {[
              { mode: TRANSLATION_MODES.AUTO, icon: 'sync-outline', title: t('settings.translationModeAutoTitle'), description: t('settings.translationModeAutoLong') },
              { mode: TRANSLATION_MODES.ONLINE, icon: 'cloud-outline', title: t('settings.translationModeOnlineTitle'), description: t('settings.translationModeOnlineLong') },
              { mode: TRANSLATION_MODES.OFFLINE, icon: 'phone-portrait-outline', title: t('settings.translationModeOfflineTitle'), description: t('settings.translationModeOfflineLong') },
            ].map((option) => renderChoice({
              key: option.mode,
              icon: option.icon,
              title: option.title,
              description: option.description,
              selected: translationMode === option.mode,
              onPress: () => handleSelectTranslationMode(option.mode),
            }))}
          </View>
        </View>
      </Modal>

      {/* Article Age Filter Picker Modal */}
      <Modal
        visible={showArticleAgePicker}
        animationType="fade"
        transparent={true}
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={() => setShowArticleAgePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[ui.sheet, styles.modalContainer, styles.modalContainerShort, sheetPadding]}>
            {renderSheetHeader(t('settings.articleAgeFilter'), () => setShowArticleAgePicker(false))}

            <Text style={[ui.secondary, styles.modalDescription]}>
              {t('settings.articleAgeFilterModalDesc')}
            </Text>

            {articleAgeOptions.map((option) => renderChoice({
              key: option.value,
              icon: option.value === 0 ? 'infinite-outline' : 'time-outline',
              title: option.label,
              selected: maxArticleAge === option.value,
              onPress: () => {
                updateMaxArticleAge(option.value);
                setShowArticleAgePicker(false);
              },
            }))}
          </View>
        </View>
      </Modal>

      {/* Auto-Scroll Delay Picker Modal */}
      <Modal
        visible={showAutoScrollDelayPicker}
        animationType="fade"
        transparent={true}
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={() => setShowAutoScrollDelayPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[ui.sheet, styles.modalContainer, styles.modalContainerShort, sheetPadding]}>
            {renderSheetHeader(t('settings.autoScrollDelay'), () => setShowAutoScrollDelayPicker(false))}

            {[3, 5, 10, 15].map((seconds) => renderChoice({
              key: seconds,
              icon: 'timer-outline',
              title: t('settings.autoScrollDelayValue', { count: formatNumber(seconds) }),
              selected: autoScrollDelay === seconds,
              onPress: () => {
                updateAutoScrollDelay(seconds);
                setShowAutoScrollDelayPicker(false);
              },
            }))}
          </View>
        </View>
      </Modal>

      {/* Reading Font Picker Modal */}
      <Modal
        visible={showFontPicker}
        animationType="fade"
        transparent={true}
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={() => setShowFontPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[ui.sheet, styles.modalContainer, styles.modalContainerTall, sheetPadding]}>
            {renderSheetHeader(t('settings.readingFont'), () => setShowFontPicker(false))}
            <ScrollView>
              {/* Each font shows itself: its name and a preview in it */}
              {READING_FONTS.map((font) => renderChoice({
                key: font.key,
                icon: 'text-outline',
                title: font.label || t(font.labelKey),
                // Not Inter, so a weight applies: semi-bold in the font itself
                titleStyle: [readingFontStyle(font.key), styles.fontTitle],
                selectedTitleStyle: styles.choiceInk,
                description: t('settings.fontPreview'),
                descriptionStyle: readingFontStyle(font.key),
                numberOfLines: 1,
                selected: readingFont === font.key,
                onPress: () => {
                  updateReadingFont(font.key);
                  setShowFontPicker(false);
                },
              }))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Widget Theme Picker Modal */}
      <Modal
        visible={showWidgetThemePicker}
        animationType="fade"
        transparent={true}
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={() => setShowWidgetThemePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[ui.sheet, styles.modalContainer, styles.modalContainerShort, sheetPadding]}>
            {renderSheetHeader(t('settings.widgetTheme'), () => setShowWidgetThemePicker(false))}

            {[
              { value: 'app', label: t('settings.widgetThemeApp'), desc: t('settings.widgetThemeAppDesc'), icon: 'phone-portrait-outline' },
              { value: 'light', label: t('settings.widgetThemeLight'), desc: t('settings.widgetThemeLightDesc'), icon: 'sunny-outline' },
              { value: 'dark', label: t('settings.widgetThemeDark'), desc: t('settings.widgetThemeDarkDesc'), icon: 'moon-outline' },
            ].map((option) => renderChoice({
              key: option.value,
              icon: option.icon,
              title: option.label,
              description: option.desc,
              selected: widgetTheme === option.value,
              onPress: () => handleWidgetThemeChange(option.value),
            }))}
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

// A row of a card in Settings: a title, a line under it, and an optional
// control or icon at the end. The card draws the hairlines between rows.
function SettingItem({ title, description, onPress, rightElement }) {
  const ui = useUi();
  const { isRTL } = useTranslation();
  const styles = useStyles(isRTL);
  return (
    <TouchableOpacity style={styles.settingItem} onPress={onPress} disabled={!onPress} activeOpacity={0.7}>
      <View style={styles.flexText}>
        <Text style={ui.rowTitle}>{title}</Text>
        {!!description && <Text style={[ui.secondary, styles.hint]}>{description}</Text>}
      </View>
      {rightElement}
    </TouchableOpacity>
  );
}

// The testers card: the thanks as its title, then one name per line
function TesterItem({ children, isNote = false }) {
  const ui = useUi();
  const { isRTL } = useTranslation();
  const styles = useStyles(isRTL);
  return (
    <View style={isNote ? styles.testersNote : styles.testerItem}>
      <Text style={isNote ? ui.title : ui.body}>{children}</Text>
    </View>
  );
}

// Built once per theme and direction. FeedWell lays out right to left per
// component, so rows reverse themselves in RTL.
const useStyles = makeStyles(({ colors: c }, isRTL) => {
  const row = isRTL ? 'row-reverse' : 'row';
  const textAlign = isRTL ? 'right' : 'left';
  return {
    header: {
      flexDirection: row,
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 4,
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
    hint: {
      marginTop: 2,
    },
    // A row: a control beside its name
    settingItem: {
      flexDirection: row,
      alignItems: 'center',
      gap: 12,
      paddingVertical: 12,
      minHeight: 56,
    },
    // A block: a control under its name (the color rows, the sliders)
    block: {
      paddingVertical: 14,
    },
    // Two rows of the five colors. Each name sits on one line under its
    // swatch, a little wider than its column so a long name stays whole.
    swatchRow: {
      flexDirection: row,
      justifyContent: 'space-between',
      marginTop: 12,
    },
    swatchItem: {
      flex: 1,
      alignItems: 'center',
    },
    // The selected swatch has a ring in the text color
    swatchRing: {
      width: 44,
      height: 44,
      borderRadius: 22,
      borderWidth: 2,
      borderColor: 'transparent',
      alignItems: 'center',
      justifyContent: 'center',
    },
    swatchRingSelected: {
      borderColor: c.text,
    },
    swatch: {
      width: 32,
      height: 32,
      borderRadius: 16,
    },
    swatchName: {
      ...TYPE.small,
      color: c.textSecondary,
      marginTop: 4,
      marginHorizontal: -8,
      textAlign: 'center',
    },
    swatchNameSelected: {
      fontFamily: FONT.semiBold,
      color: c.text,
    },
    sliderHeader: {
      flexDirection: row,
      alignItems: 'center',
      gap: 12,
      marginBottom: 4,
    },
    sliderValue: {
      ...TYPE.secondary,
      ...TYPE.count,
      color: c.textSecondary,
    },
    sliderValueMain: {
      fontSize: 14.5,
      color: c.mainInk,
    },
    slider: {
      width: '100%',
      height: 40,
    },
    sliderEnds: {
      flexDirection: row,
      justifyContent: 'space-between',
    },
    testersCard: {
      paddingHorizontal: 16,
      paddingVertical: 14,
      gap: 6,
    },
    testersNote: {
      marginBottom: 4,
    },
    testerItem: {
      paddingVertical: 1,
    },
    footer: {
      paddingHorizontal: 16,
      paddingTop: 24,
      paddingBottom: 16,
    },
    footerText: {
      textAlign: 'center',
      lineHeight: 19,
    },
    copyrightText: {
      textAlign: 'center',
      marginTop: 12,
    },
    // Sheets: over a 40% scrim, rising from the bottom
    modalOverlay: {
      flex: 1,
      backgroundColor: c.overlay,
      justifyContent: 'flex-end',
    },
    modalContainer: {
      height: '75%',
    },
    modalContainerShort: {
      height: 'auto',
      maxHeight: '60%',
    },
    modalContainerTall: {
      height: 'auto',
      maxHeight: '75%',
    },
    modalHeader: {
      flexDirection: row,
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 8,
    },
    modalCloseButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalDescription: {
      paddingHorizontal: 20,
      paddingBottom: 8,
    },
    // A round search field on the sheet, with a hairline
    modalSearchContainer: {
      flexDirection: row,
      alignItems: 'center',
      gap: 8,
      marginHorizontal: 16,
      marginTop: 4,
      marginBottom: 8,
      paddingHorizontal: 16,
      minHeight: 44,
      backgroundColor: c.surface,
      borderRadius: RADIUS.round,
      borderWidth: 1,
      borderColor: c.border,
    },
    modalSearchInput: {
      ...TYPE.body,
      flex: 1,
      color: c.text,
      paddingVertical: 8,
      textAlign,
    },
    langList: {
      flex: 1,
    },
    langItem: {
      flexDirection: row,
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    // The choice in use: the main tint, its name in main ink
    choiceSelected: {
      backgroundColor: c.mainTint,
    },
    choiceTitleSelected: {
      fontFamily: FONT.semiBold,
      color: c.mainInk,
    },
    choiceInk: {
      color: c.mainInk,
    },
    fontTitle: {
      fontWeight: '600',
    },
    modelLoadingContainer: {
      alignItems: 'center',
      padding: 40,
    },
    modelLoadingText: {
      marginTop: 16,
    },
    modelItem: {
      flexDirection: row,
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    modelItemInfo: {
      flex: 1,
      flexDirection: row,
      alignItems: 'center',
      gap: 10,
    },
    modelItemDownloaded: {
      fontFamily: FONT.semiBold,
    },
    modelListHeader: {
      paddingHorizontal: 20,
      paddingTop: 4,
      paddingBottom: 12,
    },
    modelActionButton: {
      padding: 8,
    },
    modeItem: {
      flexDirection: row,
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 20,
      paddingVertical: 14,
    },
    modeItemContent: {
      flexDirection: row,
      alignItems: 'center',
      flex: 1,
      gap: 14,
    },
    modeItemDesc: {
      marginTop: 2,
    },
  };
});
