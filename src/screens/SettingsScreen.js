import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  BackHandler,
  Linking,
  Modal,
  FlatList,
  TextInput,
  ActivityIndicator,
  NativeModules,
  AppState,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { READING_FONTS, getReadingFont, readingFontStyle } from '../config/readingFonts';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { APP_VERSION } from '../config/version';
import { useTheme, makeStyles, COLOR_THEMES } from '../context/ThemeContext';
import { useUi, ListCard, SectionTitle, Segmented, ThemedSwitch } from '../theme/ui';
import { FONT, TYPE, RADIUS } from '../theme/type';
import { useAppSettings } from '../context/AppSettingsContext';
import { useTranslation } from '../context/LanguageContext';
import { APP_LANGUAGES, getAppLanguage } from '../i18n/appLanguages';
import { tStatic } from '../i18n';
import { formatLocalizedDate } from '../utils/formatDate';
import { useAmbientSound } from '../context/AmbientSoundContext';
import { useTour, useTourTarget } from '../context/TourContext';
import CustomAlert from '../components/CustomAlert';
import { useAppReload } from '../context/AppReloadContext';
import {
  BACKUP_MIME,
  BackupError,
  applyRestore,
  applyWidgetSettings,
  autoBackupAvailable,
  changeBackupFolder,
  clearAllData,
  createBackup,
  currentCounts,
  downloadOnWeb,
  folderNameOf,
  getAutoBackupState,
  listAutomaticBackups,
  readAutomaticBackup,
  readBackup,
  readPickedFile,
  resetSettings,
  runAutomaticBackup,
  turnOffAutomaticBackup,
  turnOnAutomaticBackup,
  writeShareCopy,
} from '../services/BackupService';
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
  { name: 'TuneWell', packageName: 'com.tunewell.app', descKey: 'settings.appTuneWellDesc' },
  { name: 'WeatherWell', packageName: 'com.weatherwell.app', descKey: 'settings.appWeatherWellDesc' },
];

// What a restore, Reset Settings or Clear All Data did, said by the screen
// that mounts after the providers reload (translation keys, so it's said in
// the language in use then)
let pendingNotice = null;

export default function SettingsScreen({ navigation }) {
  const { theme, isDarkMode, themeMode, setThemeMode, paletteIndex, setPalette, accentIndex, setAccent, amoledBlack, toggleAmoledBlack } = useTheme();
  const { showImages, autoRefresh, showBookmarkIndicators, skipArticleView, showReadingPositionInFeeds, allowRotation, speechRate, readerHeaderActions, reduceMotion, readingReminder, updateShowImages, updateAutoRefresh, updateShowBookmarkIndicators, updateSkipArticleView, updateShowReadingPositionInFeeds, updateAllowRotation, updateSpeechRate, updateReaderHeaderActions, updateReduceMotion, updateReadingReminder, maxArticleAge, updateMaxArticleAge, autoScrollEnabled, autoScrollDelay, autoScrollSpeed, updateAutoScrollEnabled, updateAutoScrollDelay, updateAutoScrollSpeed, keepAwakeEnabled, updateKeepAwakeEnabled, autoTranslate, updateAutoTranslate } = useAppSettings();
  const { feedRegionUserSet, updateFeedRegion, translationTargetUserSet, markTranslationTargetUserSet, readingFont, updateReadingFont, motionCuesStyle, updateMotionCuesStyle } = useAppSettings();
  const { autoPlay, setAutoPlay, currentSound } = useAmbientSound();
  const { t, language, setLanguage, isRTL, formatNumber } = useTranslation();
  const insets = useSafeAreaInsets();
  const ui = useUi();
  const styles = useStyles(isRTL);
  const tour = useTour();
  const reloadApp = useAppReload();
  // Settings opens on a list of categories; each opens a page of its own
  const [page, setPage] = useState(null);
  // The tour points at the list's rows, so it brings the list back first
  const tourAppearanceRef = useTourTarget('settings.appearance', () => setPage(null));
  const tourDataRef = useTourTarget('settings.data', () => setPage(null));
  // Android's back button on a page returns to the list
  useFocusEffect(
    useCallback(() => {
      if (!page) return undefined;
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        setPage(null);
        return true;
      });
      return () => subscription.remove();
    }, [page])
  );
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
  // Data: busy while a file is made or read; the automatic backup's state;
  // Restore's sheet of automatic backups
  const [busy, setBusy] = useState(false);
  const [autoBackup, setAutoBackup] = useState({ enabled: false, folder: null, files: [] });
  const [showRestoreSheet, setShowRestoreSheet] = useState(false);
  const [automaticBackups, setAutomaticBackups] = useState([]);

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

  // ---- Data: backup, restore, the automatic backup, Reset Settings, Clear All Data

  const showError = (message) =>
    setAlertConfig({ visible: true, title: t('common.error'), message, icon: 'alert-circle-outline', buttons: [{ text: t('common.ok') }] });

  // Making or reading a file blocks for a moment: show that first
  const whileBusy = async (work) => {
    setBusy(true);
    await new Promise((resolve) => setTimeout(resolve, 60));
    try {
      return await work();
    } finally {
      setBusy(false);
    }
  };

  const refreshAutoBackup = useCallback(async () => {
    if (autoBackupAvailable) setAutoBackup(await getAutoBackupState());
  }, []);
  // The automatic backup can change behind this screen (it runs as FeedWell goes
  // to the background, and its folder can go away), so read it again whenever
  // Settings comes into view, FeedWell comes back, or the Data page opens
  useFocusEffect(
    useCallback(() => {
      refreshAutoBackup();
      const subscription = AppState.addEventListener('change', (state) => {
        if (state === 'active') refreshAutoBackup();
      });
      return () => subscription.remove();
    }, [refreshAutoBackup])
  );
  useEffect(() => {
    if (page === 'data') refreshAutoBackup();
  }, [page, refreshAutoBackup]);

  // With the time: the automatic backups of one day differ only in it. Latin
  // digits, as in the rest of the app (Farsi's become Persian through formatNumber).
  const formatBackupDate = (iso) => formatLocalizedDate(iso, language, formatNumber, {
    withYear: true,
    withTime: true,
    locale: `${language}-u-nu-latn`,
    localeOptions: { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' },
  });

  // A restore, Reset Settings and Clear All Data reload every provider, which
  // remounts this screen: it says what happened once it's back
  useEffect(() => {
    if (pendingNotice) {
      const notice = pendingNotice;
      pendingNotice = null;
      const message = t(notice.messageKey) + (notice.moreKey ? `\n\n${t(notice.moreKey, notice.moreParams)}` : '');
      setAlertConfig({ visible: true, title: t(notice.titleKey), message, icon: notice.icon || 'checkmark-circle-outline', buttons: [{ text: t('common.ok') }] });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const reloadWith = (notice) => {
    pendingNotice = notice;
    reloadApp();
  };

  const handleBackupData = async () => {
    try {
      const backup = await whileBusy(() => createBackup());
      if (Platform.OS === 'web') {
        downloadOnWeb(backup);
        setAlertConfig({ visible: true, title: t('common.success'), message: t('settings.backupDownloadedMessage'), icon: 'checkmark-circle-outline', buttons: [{ text: t('common.ok') }] });
        return;
      }
      // The share sheet's copy goes to the cache directory
      const uri = writeShareCopy(backup);
      if (await Sharing.isAvailableAsync()) {
        try {
          await Sharing.shareAsync(uri, { mimeType: BACKUP_MIME, dialogTitle: t('settings.backupShareDialogTitle'), UTI: 'public.data' });
        } catch (shareError) {
          console.log('Share dismissed:', shareError?.message);
        }
      }
      setAlertConfig({ visible: true, title: t('settings.backupSuccessTitle'), message: t('settings.backupSuccessMessage'), icon: 'checkmark-circle-outline', buttons: [{ text: t('common.ok') }] });
    } catch (error) {
      console.error('Error creating backup:', error);
      showError(t('settings.backupError'));
    }
  };

  const applyBackup = async (backup, mode) => {
    let result;
    try {
      result = await whileBusy(async () => {
        // Replace can't be undone: the automatic backup, if it's on, saves the phone's state first
        if (mode === 'replace') await runAutomaticBackup('beforeReplace');
        const applied = await applyRestore(backup, mode);
        await applyWidgetSettings(WidgetBridge);
        return applied;
      });
    } catch (error) {
      // No room for its saved articles and notes: refused before anything was written
      if (error instanceof BackupError && error.code === 'noRoom') {
        setAlertConfig({ visible: true, title: t('settings.restoreBackupTitle'), message: t('backup.noRoomMessage'), icon: 'alert-circle-outline', buttons: [{ text: t('common.ok') }] });
        return;
      }
      // Some of it may be written by now: reload, so every screen shows what's stored
      console.error('Error restoring backup:', error);
      reloadWith({ titleKey: 'common.error', messageKey: 'settings.restoreError', icon: 'alert-circle-outline' });
      return;
    }
    reloadWith({
      titleKey: 'settings.restoreCompleteTitle',
      messageKey: 'backup.restoreDone',
      // The oldest articles that didn't fit
      ...(result && result.leftOut ? { moreKey: 'backup.restoreLeftOut', moreParams: { count: formatNumber(result.leftOut) } } : {}),
    });
  };

  // Checks the file, then shows what it holds and offers Replace or Merge
  const restoreFromBytes = async (bytes) => {
    let backup;
    try {
      backup = await whileBusy(() => readBackup(bytes));
    } catch (error) {
      if (!(error instanceof BackupError)) throw error;
      const message =
        error.code === 'otherApp' && error.details.app ? t('backup.otherAppMessage', { app: error.details.app })
          : error.code === 'newer' ? t('backup.newerMessage')
            : error.code === 'damaged' ? t('backup.damagedMessage')
              : t('settings.restoreInvalidFormat');
      setAlertConfig({ visible: true, title: t('settings.restoreBackupTitle'), message, icon: 'alert-circle-outline', buttons: [{ text: t('common.ok') }] });
      return;
    }
    const { counts } = backup;
    setAlertConfig({
      visible: true,
      title: t('settings.restoreBackupTitle'),
      message: t('backup.previewMessage', {
        date: backup.createdAt ? formatBackupDate(backup.createdAt) : t('settings.restoreUnknownDate'),
        feeds: formatNumber(counts.feeds),
        articles: formatNumber(counts.articles),
        saved: formatNumber(counts.saved),
        notes: formatNumber(counts.notes),
      }),
      icon: 'cloud-download-outline',
      buttons: [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('backup.merge'), onPress: () => applyBackup(backup, 'merge') },
        { text: t('backup.replace'), style: 'destructive', onPress: () => applyBackup(backup, 'replace') },
      ],
    });
  };

  const pickBackupFile = async () => {
    setShowRestoreSheet(false);
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
      if (result.canceled || !result.assets || result.assets.length === 0) return;
      await restoreFromBytes(await readPickedFile(result.assets[0].uri));
    } catch (error) {
      console.error('Error restoring backup:', error);
      showError(t('settings.restoreError'));
    }
  };

  const pickWebFile = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.feedwell,.json,application/json,application/octet-stream';
    input.onchange = async (event) => {
      const file = event.target.files && event.target.files[0];
      if (!file) return;
      try {
        await restoreFromBytes(await readPickedFile(file));
      } catch (error) {
        showError(t('settings.restoreError'));
      }
    };
    input.click();
  };

  const restoreFromAutomatic = async (entry) => {
    setShowRestoreSheet(false);
    try {
      await restoreFromBytes(await readAutomaticBackup(entry));
    } catch (error) {
      console.error('Error restoring automatic backup:', error);
      showError(t('settings.restoreError'));
    }
  };

  // The automatic backups come first: the copies in FeedWell's own storage
  // can't be reached with the file picker
  const handleRestoreData = async () => {
    if (Platform.OS === 'web') {
      pickWebFile();
      return;
    }
    const automatic = await listAutomaticBackups();
    if (automatic.length > 0) {
      setAutomaticBackups(automatic);
      setShowRestoreSheet(true);
    } else {
      pickBackupFile();
    }
  };

  const handleAutoBackupChange = async (value) => {
    if (value) await whileBusy(() => turnOnAutomaticBackup());
    else await turnOffAutomaticBackup();
    refreshAutoBackup();
  };

  const handleChangeBackupFolder = async () => {
    if (await changeBackupFolder()) await whileBusy(() => runAutomaticBackup('folderChanged'));
    refreshAutoBackup();
  };

  const handleResetSettings = () => {
    setAlertConfig({
      visible: true,
      title: t('settings.resetTitle'),
      message: t('settings.resetConfirm'),
      icon: 'refresh-outline',
      buttons: [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.resetTitle'),
          style: 'destructive',
          onPress: async () => {
            try {
              await whileBusy(async () => {
                await resetSettings();
                await applyWidgetSettings(WidgetBridge);
              });
              reloadWith({ titleKey: 'settings.resetTitle', messageKey: 'settings.resetDone' });
            } catch (error) {
              console.error('Error resetting settings:', error);
              showError(t('settings.restoreError'));
            }
          },
        },
      ],
    });
  };

  const performClearAllData = async () => {
    try {
      await whileBusy(async () => {
        // It can't be undone: the automatic backup, if it's on, saves the data first
        await runAutomaticBackup('beforeClear');
        await clearAllData();
      });
      reloadWith({ titleKey: 'common.success', messageKey: 'settings.clearAllDataSuccess' });
    } catch (error) {
      console.error('Error clearing data:', error);
      reloadWith({ titleKey: 'common.error', messageKey: 'settings.clearAllDataError', icon: 'alert-circle-outline' });
    }
  };

  const handleClearAllData = async () => {
    const counts = await currentCounts();
    const message = t('settings.clearAllDataConfirm', {
      feeds: formatNumber(counts.feeds),
      articles: formatNumber(counts.articles),
      saved: formatNumber(counts.saved),
      notes: formatNumber(counts.notes),
    });
    if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.confirm === 'function') {
      if (window.confirm(`${t('settings.clearAllDataTitle')}?\n\n${message}`)) performClearAllData();
      return;
    }
    setAlertConfig({
      visible: true,
      title: t('settings.clearAllDataTitle'),
      message,
      icon: 'trash-outline',
      buttons: [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('settings.clearAction'), style: 'destructive', onPress: performClearAllData },
      ],
    });
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

  // ---- The list Settings opens on: one row per category, each saying what is
  // set now in the words its page already uses

  const join = (parts) => parts.filter(Boolean).join(' · ');
  const colorName = (index) => t(COLOR_THEMES[index].nameKey);
  const modeLabel =
    themeMode === 'light' ? t('settings.modeLight') : themeMode === 'dark' ? t('settings.modeDark') : t('settings.modeSystem');
  const translationModeTitle =
    translationMode === TRANSLATION_MODES.AUTO ? t('settings.translationModeAutoTitle')
      : translationMode === TRANSLATION_MODES.ONLINE ? t('settings.translationModeOnlineTitle')
        : t('settings.translationModeOfflineTitle');
  const lastAutoBackup = autoBackup.files.length ? autoBackup.files[autoBackup.files.length - 1] : null;

  const pageTitles = {
    appearance: t('settings.appearance'),
    feeds: t('tab.feeds'),
    reading: t('settings.sectionReading'),
    translation: t('settings.sectionTranslation'),
    widget: t('settings.sectionWidget'),
    data: t('settings.sectionData'),
    about: t('settings.sectionAbout'),
  };
  const summaries = {
    appearance: join([
      modeLabel,
      themeMode !== 'light' && amoledBlack && t('settings.amoledBlack'),
      colorName(paletteIndex),
      colorName(accentIndex),
      getAppLanguage(language).nativeLabel,
    ]),
    feeds: join([
      autoRefresh && t('settings.autoRefresh'),
      showImages && t('settings.showImages'),
      getArticleAgeLabel(maxArticleAge),
    ]),
    reading: join([
      getReadingFont(readingFont).label || t(getReadingFont(readingFont).labelKey),
      skipArticleView && t('settings.openReaderDirectly'),
      autoScrollEnabled && t('settings.autoScroll'),
      reduceMotion && t('settings.reduceMotion'),
    ]),
    translation: join([
      translationModeTitle,
      getDisplayName(targetLangCode),
      autoTranslate && t('settings.autoTranslate'),
    ]),
    widget: join([widgetThemeLabel, t('settings.percent', { value: formatNumber(widgetOpacity) })]),
    data: autoBackup.enabled
      ? join([t('backup.autoBackup'), lastAutoBackup && formatBackupDate(lastAutoBackup.createdAt)])
      : join([t('settings.backupData'), t('settings.restoreData')]),
    about: `FeedWell ${formatNumber(APP_VERSION.version)}`,
  };

  const categoryRow = (key, icon, title, summary, onPress, ref) => (
    <TouchableOpacity
      key={key}
      ref={ref}
      collapsable={false}
      style={styles.categoryRow}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={ui.iconCircle}>
        <Ionicons name={icon} size={19} color={colors.accentInk} />
      </View>
      <View style={styles.flexText}>
        <Text style={ui.rowTitle} numberOfLines={1}>{title}</Text>
        {!!summary && <Text style={[ui.secondary, styles.hint]} numberOfLines={1}>{summary}</Text>}
      </View>
      {chevron}
    </TouchableOpacity>
  );

  // The family order: FeedWell's own categories, then Data, then the tour and
  // What's New, then About
  const renderCategories = () => (
    <>
      <ListCard>
        {categoryRow('appearance', 'color-palette-outline', pageTitles.appearance, summaries.appearance, () => setPage('appearance'), tourAppearanceRef)}
        {categoryRow('feeds', 'newspaper-outline', pageTitles.feeds, summaries.feeds, () => setPage('feeds'))}
        {categoryRow('reading', 'book-outline', pageTitles.reading, summaries.reading, () => setPage('reading'))}
        {categoryRow('translation', 'language-outline', pageTitles.translation, summaries.translation, () => setPage('translation'))}
        {Platform.OS === 'android' && categoryRow('widget', 'apps-outline', pageTitles.widget, summaries.widget, () => setPage('widget'))}
      </ListCard>
      <View style={styles.group}>
        <ListCard>
          {categoryRow('data', 'save-outline', pageTitles.data, summaries.data, () => setPage('data'), tourDataRef)}
        </ListCard>
      </View>
      <View style={styles.group}>
        <ListCard>
          {categoryRow('tour', 'compass-outline', t('settings.appTour'), t('settings.appTourDesc'), () => tour?.startTour())}
          {categoryRow('whatsNew', 'sparkles-outline', t('settings.whatsNew'), t('settings.whatsNewDesc'), () => tour?.setWhatsNewOpen(true))}
        </ListCard>
      </View>
      <View style={styles.group}>
        <ListCard>
          {categoryRow('about', 'information-circle-outline', pageTitles.about, summaries.about, () => setPage('about'))}
        </ListCard>
      </View>
    </>
  );

  // ---- The pages

  const renderAppearance = () => (
    <ListCard>
      {/* System follows the phone while the app is open */}
      <View style={styles.block}>
        <Segmented
          framed
          options={[
            { value: 'system', label: t('settings.modeSystem'), icon: (c) => <Ionicons name="contrast-outline" size={15} color={c} /> },
            { value: 'light', label: t('settings.modeLight'), icon: (c) => <Ionicons name="sunny-outline" size={15} color={c} /> },
            { value: 'dark', label: t('settings.modeDark'), icon: (c) => <Ionicons name="moon-outline" size={15} color={c} /> },
          ]}
          value={themeMode}
          onChange={setThemeMode}
        />
      </View>
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
      {themeMode !== 'light' && (
        <SettingItem
          title={t('settings.amoledBlack')}
          description={t('settings.amoledBlackDesc')}
          rightElement={<ThemedSwitch value={amoledBlack} onValueChange={toggleAmoledBlack} />}
        />
      )}
      <SettingItem
        title={t('language.appTitle')}
        description={getAppLanguage(language).nativeLabel}
        onPress={() => setShowAppLangPicker(true)}
        rightElement={chevron}
      />
    </ListCard>
  );

  const renderFeeds = () => (
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
        title={t('settings.articleAgeFilter')}
        description={maxArticleAge === 0 ? t('settings.articleAgeFilterNoLimitDesc') : t('settings.articleAgeFilterDesc', { period: getArticleAgeLabel(maxArticleAge) })}
        onPress={() => setShowArticleAgePicker(true)}
        rightElement={chevron}
      />
      <SettingItem
        title={t('settings.readingPositionInFeeds')}
        description={t('settings.readingPositionInFeedsDesc')}
        rightElement={<ThemedSwitch value={showReadingPositionInFeeds} onValueChange={updateShowReadingPositionInFeeds} />}
      />
    </ListCard>
  );

  const renderReading = () => (
    <>
      <ListCard>
        <SettingItem
          title={t('settings.readingFont')}
          description={getReadingFont(readingFont).label || t(getReadingFont(readingFont).labelKey)}
          onPress={() => setShowFontPicker(true)}
          rightElement={chevron}
        />
        <SettingItem
          title={t('settings.openReaderDirectly')}
          description={t('settings.openReaderDirectlyDesc')}
          rightElement={<ThemedSwitch value={skipArticleView} onValueChange={updateSkipArticleView} />}
        />
        {/* The reader's own markers, so with the reader's settings */}
        <SettingItem
          title={t('settings.bookmarkIndicators')}
          description={t('settings.bookmarkIndicatorsDesc')}
          rightElement={<ThemedSwitch value={showBookmarkIndicators} onValueChange={updateShowBookmarkIndicators} />}
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
          title={t('settings.screenRotation')}
          description={t('settings.screenRotationDesc')}
          rightElement={<ThemedSwitch value={allowRotation} onValueChange={updateAllowRotation} />}
        />
        <SettingItem
          title={t('settings.reduceMotion')}
          description={t('settings.reduceMotionDesc')}
          rightElement={<ThemedSwitch value={reduceMotion} onValueChange={updateReduceMotion} />}
        />
        {/* What the cues show: dots at the sides, or a horizon with them */}
        {reduceMotion && (
          <View style={styles.block}>
            <Text style={ui.rowTitle}>{t('settings.motionCues')}</Text>
            <Text style={[ui.secondary, styles.hint]}>{t('settings.motionCuesHint')}</Text>
            <Segmented
              framed
              style={styles.cuesChoice}
              options={[
                { value: 'dots', label: t('settings.motionCuesDots') },
                { value: 'horizon', label: t('settings.motionCuesHorizon') },
              ]}
              value={motionCuesStyle}
              onChange={updateMotionCuesStyle}
            />
          </View>
        )}
        <SettingItem
          title={t('settings.readingReminder')}
          description={readingReminder ? t('settings.readingReminderOnDesc') : t('settings.readingReminderOffDesc')}
          rightElement={<ThemedSwitch value={readingReminder} onValueChange={updateReadingReminder} />}
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

      <SectionTitle title={t('settings.sectionAmbientSounds')} />
      <ListCard>
        <SettingItem
          title={t('settings.autoPlayStartup')}
          description={autoPlay ? t('settings.autoPlayOnDesc', { sound: currentSound ? t(currentSound.nameKey) : t('settings.lastSound') }) : t('settings.autoPlayOffDesc')}
          onPress={() => setAutoPlay(!autoPlay)}
          rightElement={<ThemedSwitch value={autoPlay} onValueChange={setAutoPlay} />}
        />
      </ListCard>
    </>
  );

  const renderTranslation = () => (
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
  );

  const renderWidget = () => (
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
  );

  const renderData = () => (
    <>
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
        {autoBackupAvailable && (
          <SettingItem
            title={t('backup.autoBackup')}
            description={
              !autoBackup.enabled ? t('backup.autoBackupDesc')
                : lastAutoBackup ? `${t('backup.lastBackup')}: ${formatBackupDate(lastAutoBackup.createdAt)}`
                  : t('backup.noBackupYet')
            }
            rightElement={<ThemedSwitch value={autoBackup.enabled} onValueChange={handleAutoBackupChange} />}
          />
        )}
        {autoBackupAvailable && autoBackup.enabled && (
          <SettingItem
            title={t('backup.folder')}
            description={autoBackup.folder ? folderNameOf(autoBackup.folder.uri) : t('backup.folderAppStorage')}
            onPress={handleChangeBackupFolder}
            rightElement={chevron}
          />
        )}
      </ListCard>
      <View style={styles.group}>
        <ListCard>
          <SettingItem
            title={t('settings.resetTitle')}
            description={t('settings.resetSettingsDesc')}
            onPress={handleResetSettings}
            rightElement={<Ionicons name="refresh-outline" size={20} color={colors.mainInk} />}
          />
          <SettingItem
            title={t('settings.clearAllData')}
            description={t('settings.clearAllDataDesc')}
            onPress={handleClearAllData}
            rightElement={<Ionicons name="trash-outline" size={20} color={colors.error} />}
          />
        </ListCard>
      </View>
    </>
  );

  const renderAbout = () => (
    <>
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
    </>
  );

  const pages = {
    appearance: renderAppearance,
    feeds: renderFeeds,
    reading: renderReading,
    translation: renderTranslation,
    widget: renderWidget,
    data: renderData,
    about: renderAbout,
  };

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={ui.page}>
      {/* The list's title, or a page's with a way back to the list */}
      <View style={styles.header}>
        {page && (
          <TouchableOpacity style={ui.roundButton} onPress={() => setPage(null)} accessibilityLabel={t('articleActions.back')}>
            <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={22} color={colors.text} />
          </TouchableOpacity>
        )}
        <Text style={[ui.screenTitle, styles.headerTitle]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
          {page ? pageTitles[page] : t('tab.settings')}
        </Text>
      </View>

      <ScrollView key={page || 'list'} style={styles.content} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {page ? pages[page]() : renderCategories()}
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

      {/* Restore: the automatic backups, newest first, then choosing a file */}
      <Modal
        visible={showRestoreSheet}
        animationType="slide"
        transparent={true}
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={() => setShowRestoreSheet(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[ui.sheet, styles.modalContainer, styles.modalContainerTall, sheetPadding]}>
            {renderSheetHeader(t('settings.restoreData'), () => setShowRestoreSheet(false))}
            <Text style={[ui.sectionTitle, styles.sheetSection]}>{t('backup.automaticBackups')}</Text>
            <ScrollView>
              {automaticBackups.map((entry) => renderChoice({
                key: entry.uri,
                icon: 'time-outline',
                title: formatBackupDate(entry.createdAt),
                description: entry.folder ? folderNameOf(entry.folder) : t('backup.folderAppStorage'),
                selected: false,
                onPress: () => restoreFromAutomatic(entry),
              }))}
              {renderChoice({
                key: 'file',
                icon: 'folder-open-outline',
                title: t('backup.chooseFile'),
                selected: false,
                onPress: pickBackupFile,
              })}
            </ScrollView>
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

      {/* While a backup file is made or read */}
      {busy && (
        <View style={styles.busyOverlay}>
          <View style={[ui.dialog, styles.busyBox]}>
            <ActivityIndicator size="large" color={colors.mainInk} />
          </View>
        </View>
      )}
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
      gap: 12,
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 4,
    },
    headerTitle: {
      flex: 1,
    },
    // The list's rows: an icon circle, the category and a line of what is set
    categoryRow: {
      flexDirection: row,
      alignItems: 'center',
      gap: 12,
      paddingVertical: 11,
      minHeight: 62,
    },
    group: {
      marginTop: 12,
    },
    sheetSection: {
      paddingHorizontal: 20,
      paddingTop: 4,
      paddingBottom: 4,
    },
    busyOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: c.overlay,
      alignItems: 'center',
      justifyContent: 'center',
    },
    busyBox: {
      padding: 24,
    },
    content: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 16,
      paddingTop: 8,
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
    cuesChoice: {
      marginTop: 12,
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
