import React, { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react';
import * as Speech from 'expo-speech';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Share,
  Platform,
  Image,
  Linking,
  Modal,
  FlatList,
  TextInput,
  Animated,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import { useAppSettings } from '../context/AppSettingsContext';
import { useFeed } from '../context/FeedContext';
import { useNotes } from '../context/NotesContext';
import { cleanHtmlContent, extractCleanText, extractArticleContent } from '../utils/rssParser';
import { detectLanguage, getTextDirection, getTextAlignment, getLanguageName } from '../utils/languageDetection';
import ArticleImage from '../components/ArticleImage';
import SaveButton from '../components/SaveButton';
import ErrorBoundary from '../components/ErrorBoundary';
import CustomAlert from '../components/CustomAlert';
import {
  translateText,
  identifyLanguage,
  localCodeToMLKit,
  loadTargetLanguage,
  saveTargetLanguage,
  loadTranslationMode,
  getMLKitName,
  getDisplayName,
  AVAILABLE_LANGUAGES,
  TRANSLATION_MODES,
  getPopularLanguages,
} from '../utils/translationService';

// Map short ISO-639 codes to full BCP-47 locales for TTS engine compatibility
const TTS_LOCALE_MAP = {
  'fa': 'fa-IR', 'ar': 'ar-SA', 'he': 'he-IL', 'ur': 'ur-PK',
  'zh': 'zh-CN', 'ja': 'ja-JP', 'ko': 'ko-KR', 'hi': 'hi-IN',
  'bn': 'bn-BD', 'pt': 'pt-BR', 'en': 'en-US', 'es': 'es-ES',
  'fr': 'fr-FR', 'de': 'de-DE', 'it': 'it-IT', 'ru': 'ru-RU',
  'tr': 'tr-TR', 'nl': 'nl-NL', 'pl': 'pl-PL', 'sv': 'sv-SE',
  'da': 'da-DK', 'nb': 'nb-NO', 'fi': 'fi-FI', 'el': 'el-GR',
  'cs': 'cs-CZ', 'ro': 'ro-RO', 'hu': 'hu-HU', 'th': 'th-TH',
  'vi': 'vi-VN', 'id': 'id-ID', 'ms': 'ms-MY',
};

// Strip HTML remnants and entities for clean TTS input
function cleanTextForTTS(text) {
  if (!text) return '';
  let t = text.replace(/<[^>]+>/g, '');
  t = t.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
       .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&nbsp;/g, ' ');
  t = t.replace(/\s+/g, ' ').trim();
  return t;
}

// Main component wrapped with error boundary
function ArticleReaderScreenContent({ route, navigation }) {
  const { article, currentFilter = 'all', currentSortOrder = 'newest' } = route.params;
  const { theme } = useTheme();
  const { showImages, showBookmarkIndicators, speechRate } = useAppSettings();
  const { markArticleRead } = useFeed();
  const { getNote, setNote, hasNote } = useNotes();
  const [fullContent, setFullContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [languageInfo, setLanguageInfo] = useState(null);
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const scrollViewRef = useRef(null);

  // Bookmark state
  const [hasBookmark, setHasBookmark] = useState(false);
  const [bookmarkScrollPercent, setBookmarkScrollPercent] = useState(null);
  const currentScrollY = useRef(0);
  const contentHeightRef = useRef(0);
  const viewportHeightRef = useRef(0);
  const hasAutoScrolled = useRef(false);
  const bookmarkFlashAnim = useRef(new Animated.Value(0)).current;
  const [contentReady, setContentReady] = useState(false);
  const [measuredContentHeight, setMeasuredContentHeight] = useState(0);

  // Custom alert state
  const [alertConfig, setAlertConfig] = useState({ visible: false, title: '', message: '', icon: null, buttons: [] });

  // Translation state
  const [isTranslated, setIsTranslated] = useState(false);
  const [translatedContent, setTranslatedContent] = useState(null);
  const [translatedTitle, setTranslatedTitle] = useState(null);
  const [translating, setTranslating] = useState(false);
  const [translationProgress, setTranslationProgress] = useState('');
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  const [targetLangCode, setTargetLangCode] = useState('en');
  const [detectedSourceLang, setDetectedSourceLang] = useState(null); // BCP-47 code
  const [languageSearchQuery, setLanguageSearchQuery] = useState('');
  const [translationMode, setTranslationMode] = useState(TRANSLATION_MODES.AUTO);
  const [translationMethod, setTranslationMethod] = useState(null); // 'online' | 'offline' | 'none'

  // Notes state
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [noteText, setNoteText] = useState('');
  const articleNote = getNote(article?.id);

  // Overflow menu state
  const [showOverflowMenu, setShowOverflowMenu] = useState(false);

  // TTS state
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [ttsCurrentIndex, setTtsCurrentIndex] = useState(-1); // -1 = inactive, 0 = title, 1+ = body paragraph
  const ttsParagraphsRef = useRef([]);
  const ttsBodyOffsetRef = useRef(1);
  const speakNextRef = useRef(null);
  const ttsLangRef = useRef(null);
  const articleContentYRef = useRef(0);
  const paragraphYRef = useRef({});
  const titleYRef = useRef(0);

  // Stop TTS on unmount or when content/translation changes
  useEffect(() => {
    return () => { Speech.stop(); };
  }, []);

  // Stop TTS when translation is toggled
  useEffect(() => {
    if (isSpeaking) {
      Speech.stop();
      setIsSpeaking(false);
      setTtsCurrentIndex(-1);
    }
  }, [isTranslated]);

  // Ref-based speak function to avoid stale closures in recursive callbacks
  useEffect(() => {
    speakNextRef.current = (index) => {
      const paras = ttsParagraphsRef.current;
      if (index >= paras.length) {
        setIsSpeaking(false);
        setTtsCurrentIndex(-1);
        return;
      }
      setTtsCurrentIndex(index);

      // Auto-scroll to current paragraph
      let targetY;
      if (index === 0 && ttsBodyOffsetRef.current > 0) {
        targetY = titleYRef.current;
      } else {
        const bodyIdx = index - ttsBodyOffsetRef.current;
        targetY = articleContentYRef.current + (paragraphYRef.current[bodyIdx] || 0);
      }
      if (scrollViewRef.current && targetY > 0) {
        scrollViewRef.current.scrollTo({ y: Math.max(0, targetY - 80), animated: true });
      }

      const cleanText = cleanTextForTTS(paras[index]);
      if (!cleanText) {
        // Skip empty paragraphs
        speakNextRef.current?.(index + 1);
        return;
      }
      Speech.speak(cleanText, {
        language: ttsLangRef.current,
        rate: speechRate,
        onDone: () => speakNextRef.current?.(index + 1),
        onStopped: () => { setIsSpeaking(false); setTtsCurrentIndex(-1); },
        onError: () => speakNextRef.current?.(index + 1),
      });
    };
  }, [speechRate]);

  // TTS handlers
  const handleReadAloud = useCallback(async () => {
    if (isSpeaking) {
      Speech.stop();
      setIsSpeaking(false);
      setTtsCurrentIndex(-1);
      return;
    }
    const useTranslated = isTranslated && translatedContent;
    const title = useTranslated ? (translatedTitle || article.title) : article.title;
    const body = useTranslated ? translatedContent : fullContent;
    if (!body?.trim()) return;

    const bodyParagraphs = body.split(/\n\n+/).filter(p => p.trim());
    const hasTitle = !!title?.trim();
    ttsBodyOffsetRef.current = hasTitle ? 1 : 0;
    const allParagraphs = hasTitle ? [title, ...bodyParagraphs] : bodyParagraphs;
    ttsParagraphsRef.current = allParagraphs;

    // Resolve language to full BCP-47 locale
    const rawLang = useTranslated ? targetLangCode : (languageInfo?.code || undefined);
    ttsLangRef.current = rawLang ? (TTS_LOCALE_MAP[rawLang] || rawLang) : undefined;

    setIsSpeaking(true);
    speakNextRef.current?.(0);
  }, [isSpeaking, isTranslated, translatedTitle, translatedContent, article.title, fullContent, languageInfo, targetLangCode]);

  const handleStopSpeech = useCallback(() => {
    Speech.stop();
    setIsSpeaking(false);
    setTtsCurrentIndex(-1);
  }, []);

  // Check if article language matches target translation language
  const isSameLanguage = useMemo(() => {
    if (!languageInfo || !languageInfo.code || languageInfo.confidence < 0.6) return false;
    return languageInfo.code === targetLangCode;
  }, [languageInfo, targetLangCode]);

  // Bookmark storage key
  const bookmarkKey = `reading_bookmark_${article.id}`;

  // Load bookmark on mount
  useEffect(() => {
    const loadBookmark = async () => {
      try {
        const saved = await AsyncStorage.getItem(bookmarkKey);
        if (saved) {
          const data = JSON.parse(saved);
          setHasBookmark(true);
          setBookmarkScrollPercent(data.scrollPercent);
        }
      } catch (e) {
        console.warn('Failed to load bookmark:', e);
      }
    };
    loadBookmark();
  }, [bookmarkKey]);

  // Auto-scroll to bookmark when content finishes loading
  const handleContentSizeChange = useCallback((w, h) => {
    contentHeightRef.current = h;
    setMeasuredContentHeight(h);
    if (h > 0 && viewportHeightRef.current > 0) {
      setContentReady(true);
    }
  }, []);

  // Effect to auto-scroll when all conditions are met
  useEffect(() => {
    if (
      bookmarkScrollPercent != null &&
      !hasAutoScrolled.current &&
      !loading &&
      contentReady
    ) {
      hasAutoScrolled.current = true;
      const cH = contentHeightRef.current;
      const vH = viewportHeightRef.current;
      if (cH > vH) {
        // scrollPercent is the center of viewport as fraction of content height
        const targetY = Math.max(0, bookmarkScrollPercent * cH - vH / 2);
        setTimeout(() => {
          scrollViewRef.current?.scrollTo({ y: targetY, animated: true });
          Animated.sequence([
            Animated.timing(bookmarkFlashAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
            Animated.delay(1500),
            Animated.timing(bookmarkFlashAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
          ]).start();
        }, 400);
      }
    }
  }, [bookmarkScrollPercent, loading, contentReady, bookmarkFlashAnim]);

  const handleScrollViewLayout = useCallback((event) => {
    viewportHeightRef.current = event.nativeEvent.layout.height;
    if (contentHeightRef.current > 0 && event.nativeEvent.layout.height > 0) {
      setContentReady(true);
    }
  }, []);

  const saveBookmark = useCallback(async () => {
    const cH = contentHeightRef.current;
    const vH = viewportHeightRef.current;
    if (cH <= vH) return;
    // Store the center of the viewport as a fraction of total content height
    const centerY = currentScrollY.current + vH / 2;
    const scrollPercent = Math.min(Math.max(centerY / cH, 0), 1);
    try {
      await AsyncStorage.setItem(bookmarkKey, JSON.stringify({
        scrollPercent,
        timestamp: Date.now(),
      }));
      setHasBookmark(true);
      setBookmarkScrollPercent(scrollPercent);
      // Flash animation
      Animated.sequence([
        Animated.timing(bookmarkFlashAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.delay(1000),
        Animated.timing(bookmarkFlashAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]).start();
    } catch (e) {
      console.warn('Failed to save bookmark:', e);
    }
  }, [bookmarkKey, bookmarkFlashAnim]);

  const removeBookmark = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(bookmarkKey);
      setHasBookmark(false);
      setBookmarkScrollPercent(null);
    } catch (e) {
      console.warn('Failed to remove bookmark:', e);
    }
  }, [bookmarkKey]);

  const handleBookmarkPress = useCallback(() => {
    if (hasBookmark) {
      setAlertConfig({
        visible: true,
        title: 'Reading Bookmark',
        message: 'What would you like to do?',
        icon: 'bookmark',
        buttons: [
          { text: 'Update Position', onPress: saveBookmark },
          { text: 'Remove Bookmark', onPress: removeBookmark, style: 'destructive' },
          { text: 'Cancel', style: 'cancel' },
        ],
      });
    } else {
      saveBookmark();
    }
  }, [hasBookmark, saveBookmark, removeBookmark]);

  const handleIndicatorPress = useCallback(() => {
    setAlertConfig({
      visible: true,
      title: 'Reading Bookmark',
      message: 'Remove your saved reading position?',
      icon: 'bookmark',
      buttons: [
        { text: 'Remove Bookmark', onPress: removeBookmark, style: 'destructive' },
        { text: 'Cancel', style: 'cancel' },
      ],
    });
  }, [removeBookmark]);

  // Compute the Y position of the saved bookmark inside the ScrollView content
  const bookmarkLineY = useMemo(() => {
    if (!hasBookmark || bookmarkScrollPercent == null || measuredContentHeight === 0) return null;
    return bookmarkScrollPercent * measuredContentHeight;
  }, [hasBookmark, bookmarkScrollPercent, measuredContentHeight]);

  // Determine text direction for bookmark indicator positioning
  const isRTL = languageInfo?.isRTL || false;

  // Split content into paragraphs for rendering and TTS tracking
  const paragraphs = useMemo(() => {
    if (!fullContent) return [];
    return fullContent.split(/\n\n+/).filter(p => p.trim());
  }, [fullContent]);

  const translatedParagraphs = useMemo(() => {
    if (!translatedContent) return [];
    return translatedContent.split(/\n\n+/).filter(p => p.trim());
  }, [translatedContent]);

  // Load saved target language and translation mode on mount
  useEffect(() => {
    loadTargetLanguage().then(code => setTargetLangCode(code));
    loadTranslationMode().then(mode => setTranslationMode(mode));
  }, []);

  // Track if we've already marked this article as read
  const hasMarkedReadRef = useRef(false);

  useEffect(() => {
    fetchFullArticle();
    
    // Cleanup function
    return () => {
      hasMarkedReadRef.current = false;
    };
  }, []);

  // Mark article as read when the screen is viewed - only once
  useEffect(() => {
    if (article && article.id && !hasMarkedReadRef.current) {
      hasMarkedReadRef.current = true;
      console.log('ArticleReaderScreen: Marking article as read:', article.id);
      markArticleRead(article.id, currentFilter, currentSortOrder);
    }
  }, [article?.id]); // Only depend on article.id, not the whole object or markArticleRead

  const fetchFullArticle = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check if we have offline content available
      if (article.offlineCached && article.offlineContent) {
        console.log('Using cached offline content');
        setFullContent(article.offlineContent);
        
        // Detect language for offline content
        if (article.offlineContent) {
          const detection = detectLanguage(article.offlineContent);
          setLanguageInfo({
            code: detection.code,
            language: detection.code,
            isRTL: detection.isRTL,
            confidence: detection.confidence,
            name: getLanguageName(detection.code)
          });
        }
        setLoading(false);
        return;
      }

      // Start with RSS content for non-cached articles
      let content = article.content || article.description || '';
      
      // Always try to fetch full article content since RSS summaries are often short
      try {
        const response = await fetch(article.url);
        if (response.ok) {
          const html = await response.text();
          
          // Extract main article content using sophisticated extraction
          const articleContent = extractArticleContent(html);
          
          // Check if extracted content looks like actual article text
          const isValidContent = articleContent.length > 200 && 
                                !articleContent.includes('contain-intrinsic-size') &&
                                !articleContent.includes('background-color:var') &&
                                !articleContent.includes('webkit-text-decoration') &&
                                !articleContent.includes('z-index:') &&
                                !articleContent.includes('position:relative') &&
                                !articleContent.includes('display:block') &&
                                !articleContent.includes('font-size:var') &&
                                !articleContent.includes('padding:var');
          
          // Use fetched content if it's valid and longer than RSS content
          if (isValidContent && articleContent.length > content.length) {
            content = articleContent;
            console.log('Using extracted article content, length:', articleContent.length);
          } else {
            console.log('Article extraction failed or content too short, using RSS content');
          }
        }
      } catch (fetchError) {
        console.log('Could not fetch full article, using RSS content:', fetchError.message);
      }
      
      // If we still have very short content, show a message
      if (content.length < 50) {
        content = content + '\n\n[Full article content may not be available in reader mode. Use the browser button (🌐) to view the complete article.]';
      }
      
      setFullContent(content);
      
      // Detect language and RTL for the content
      if (content) {
        const detection = detectLanguage(content);
        setLanguageInfo(detection);
        console.log('Language detection:', {
          language: detection.code,
          isRTL: detection.isRTL,
          confidence: detection.confidence,
          name: getLanguageName(detection.code)
        });
      }
    } catch (err) {
      console.error('Error loading article:', err);
      setError('Unable to load article content. Please try using the browser button to view the full article.');
      // Fallback to RSS content
      setFullContent(article.content || article.description || '');
    } finally {
      setLoading(false);
    }
  };

  const handleTranslate = async () => {
    // If already translated, toggle back to original
    if (isTranslated) {
      setIsTranslated(false);
      return;
    }

    // If we already have a translation cached, show it
    if (translatedContent) {
      setIsTranslated(true);
      return;
    }

    const contentToTranslate = fullContent;
    if (!contentToTranslate || contentToTranslate.length === 0) return;

    setTranslating(true);
    setTranslationProgress('Detecting language...');

    try {
      // Step 1: Detect source language (returns BCP-47 code)
      let sourceLangCode = detectedSourceLang;
      if (!sourceLangCode) {
        const identified = await identifyLanguage(contentToTranslate);
        if (identified) {
          sourceLangCode = identified;
          setDetectedSourceLang(identified);
        } else {
          // Fallback to our local detection
          sourceLangCode = languageInfo?.code || 'en';
          setDetectedSourceLang(sourceLangCode);
        }
      }

      // Check if source and target are the same
      if (sourceLangCode === targetLangCode) {
        setAlertConfig({
          visible: true,
          title: 'Same Language',
          message: `The article appears to be in ${getDisplayName(sourceLangCode)}. Please choose a different target language.`,
          icon: 'language-outline',
          buttons: [
            { text: 'Change Language', onPress: () => setShowLanguagePicker(true) },
            { text: 'Cancel', style: 'cancel' },
          ],
        });
        setTranslating(false);
        setTranslationProgress('');
        return;
      }

      // Step 2: Translate title
      setTranslationProgress('Translating title...');
      const titleResult = await translateText(
        article.title,
        sourceLangCode,
        targetLangCode,
        setTranslationProgress,
        translationMode
      );
      setTranslatedTitle(titleResult.text);

      // Step 3: Translate content
      const contentResult = await translateText(
        contentToTranslate,
        sourceLangCode,
        targetLangCode,
        setTranslationProgress,
        translationMode
      );

      setTranslatedContent(contentResult.text);
      setTranslationMethod(contentResult.method);
      setIsTranslated(true);
    } catch (error) {
      console.error('Translation error:', error);
      setAlertConfig({
        visible: true,
        title: 'Translation Failed',
        message: error.message || 'Unable to translate this article. Please check your connection for initial model download.',
        icon: 'alert-circle-outline',
        buttons: [{ text: 'OK' }],
      });
    } finally {
      setTranslating(false);
      setTranslationProgress('');
    }
  };

  const handleChangeTargetLanguage = async (langCode) => {
    setTargetLangCode(langCode);
    await saveTargetLanguage(langCode);
    setShowLanguagePicker(false);
    // Clear cached translation so it re-translates with new language
    setTranslatedContent(null);
    setTranslatedTitle(null);
    setIsTranslated(false);
    setLanguageSearchQuery('');
  };

  // Filtered languages for the picker
  const filteredLanguages = useMemo(() => {
    if (!languageSearchQuery.trim()) {
      // Show popular first, then the rest
      const popular = getPopularLanguages();
      const popularCodes = new Set(popular.map(l => l.code));
      const rest = AVAILABLE_LANGUAGES.filter(l => !popularCodes.has(l.code));
      return [...popular, ...rest];
    }
    const q = languageSearchQuery.toLowerCase();
    return AVAILABLE_LANGUAGES.filter(
      lang => lang.displayName.toLowerCase().includes(q) || lang.code.includes(q)
    );
  }, [languageSearchQuery]);

  const handleShare = async () => {
    try {
      const shareOptions = {
        message: Platform.OS === 'ios' ? `📰 Shared via FeedWell\n\n${article.title}` : `📰 Shared via FeedWell\n\n${article.title}\n\n${article.url}`,
        url: Platform.OS === 'ios' ? article.url : undefined,
        title: article.title,
      };
      
      await Share.share(shareOptions);
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleOpenBrowser = async () => {
    try {
      const supported = await Linking.canOpenURL(article.url);
      if (supported) {
        await Linking.openURL(article.url);
      } else {
        console.error('Cannot open URL:', article.url);
      }
    } catch (error) {
      console.error('Error opening browser:', error);
    }
  };

  const handleScroll = (event) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    currentScrollY.current = offsetY;
    // Show button when user scrolls down more than 200 pixels
    setShowScrollToTop(offsetY > 200);
  };

  const handleScrollToTop = () => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.surface,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    headerButton: {
      padding: 8,
      width: 40,
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text,
      flex: 1,
      textAlign: 'center',
    },
    content: {
      flex: 1,
    },
    contentInner: {
      paddingVertical: 20,
      paddingHorizontal: 32,
    },
    articleHeader: {
      marginBottom: 16,
    },
    feedTitle: {
      fontSize: 14,
      color: theme.colors.primary,
      fontWeight: '600',
      marginBottom: 4,
    },
    articleDate: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    articleTitle: {
      fontSize: 28,
      fontWeight: 'bold',
      color: theme.colors.text,
      lineHeight: 36,
      marginBottom: 8,
    },
    articleAuthor: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      fontStyle: 'italic',
      marginBottom: 16,
    },
    articleImage: {
      width: '100%',
      height: 200,
      borderRadius: 12,
      marginBottom: 20,
      backgroundColor: theme.colors.border,
    },
    articleContent: {
      marginBottom: 24,
    },
    articleText: {
      fontSize: 18,
      color: theme.colors.text,
      lineHeight: 28,
      fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    },
    languageInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 6,
      backgroundColor: theme.colors.border,
      borderRadius: 16,
      alignSelf: 'flex-start',
    },
    languageText: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      fontWeight: '500',
      marginLeft: 6,
    },
    translationBar: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 12,
    },
    translateButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.primary,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      gap: 6,
    },
    translateButtonActive: {
      backgroundColor: theme.colors.success || '#4CAF50',
    },
    translateButtonDisabled: {
      opacity: 0.7,
    },
    translateButtonText: {
      fontSize: 12,
      color: '#fff',
      fontWeight: '600',
    },
    translationProgressContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 12,
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: theme.colors.border,
      borderRadius: 8,
    },
    translationProgressText: {
      fontSize: 13,
      color: theme.colors.textSecondary,
    },
    translatedBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 12,
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: (theme.colors.success || '#4CAF50') + '15',
      borderRadius: 8,
      borderLeftWidth: 3,
      borderLeftColor: theme.colors.success || '#4CAF50',
    },
    translatedBannerText: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      fontWeight: '500',
    },
    // Modal styles
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
    languageList: {
      flex: 1,
    },
    languageItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    languageItemSelected: {
      backgroundColor: (theme.colors.primary) + '15',
    },
    languageItemText: {
      fontSize: 15,
      color: theme.colors.text,
    },
    languageItemTextSelected: {
      color: theme.colors.primary,
      fontWeight: '600',
    },
    loadingContainer: {
      alignItems: 'center',
      padding: 40,
    },
    loadingText: {
      marginTop: 16,
      color: theme.colors.textSecondary,
      fontSize: 16,
    },
    errorContainer: {
      alignItems: 'center',
      padding: 40,
    },
    errorTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.error,
      marginTop: 16,
      marginBottom: 8,
    },
    errorText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginBottom: 16,
    },
    retryButton: {
      backgroundColor: theme.colors.primary,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 8,
    },
    retryButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
    noContentContainer: {
      alignItems: 'center',
      padding: 40,
    },
    noContentTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.textSecondary,
      marginTop: 16,
      marginBottom: 8,
    },
    noContentText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
    scrollToTopButton: {
      position: 'absolute',
      bottom: 30,
      right: 20,
      backgroundColor: theme.colors.primary || '#007AFF',
      borderRadius: 25,
      width: 50,
      height: 50,
      justifyContent: 'center',
      alignItems: 'center',
      elevation: 5,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
    },
    bookmarkToast: {
      position: 'absolute',
      bottom: 90,
      alignSelf: 'center',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: theme.colors.primary || '#007AFF',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 20,
      elevation: 6,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
    },
    bookmarkToastText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '600',
    },
    savedBookmarkLine: {
      position: 'absolute',
      left: 4,
      right: 4,
      flexDirection: 'row',
      alignItems: 'center',
      zIndex: 10,
    },
    savedBookmarkBar: {
      flex: 1,
      height: 1.5,
      borderRadius: 1,
      opacity: 0.5,
    },
    savedBookmarkIcon: {
      width: 18,
      height: 18,
      borderRadius: 9,
      justifyContent: 'center',
      alignItems: 'center',
    },
    aimLineContainer: {
      position: 'absolute',
      top: '50%',
      left: 4,
      right: 4,
      flexDirection: 'row',
      alignItems: 'center',
      opacity: 0.35,
    },
    aimLineBar: {
      flex: 1,
      height: 0,
      borderStyle: 'dashed',
      borderTopWidth: 1.5,
    },
    aimLineIcon: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 1.5,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.surface + 'CC',
    },
    notesModalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    notesModalContainer: {
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingBottom: 24,
      maxHeight: '70%',
    },
    notesModalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
    },
    notesModalTitle: {
      fontSize: 18,
      fontWeight: '600',
    },
    notesModalCloseButton: {
      padding: 4,
    },
    notesInput: {
      margin: 16,
      padding: 14,
      borderRadius: 12,
      borderWidth: 1,
      fontSize: 15,
      lineHeight: 22,
      minHeight: 150,
      maxHeight: 300,
    },
    notesSaveButton: {
      marginHorizontal: 16,
      paddingVertical: 14,
      borderRadius: 10,
      alignItems: 'center',
    },
    notesSaveButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
    ttsFloatingBar: {
      position: 'absolute',
      bottom: 16,
      left: 16,
      right: 16,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 12,
      elevation: 6,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
    },
    ttsFloatingBarText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '600',
      flex: 1,
      marginLeft: 10,
    },
    ttsStopButton: {
      padding: 4,
    },
    ttsHighlight: {
      borderRadius: 6,
      paddingHorizontal: 4,
      paddingVertical: 2,
      marginHorizontal: -4,
    },
    overflowBackdrop: {
      flex: 1,
      justifyContent: 'flex-start',
      alignItems: 'flex-end',
    },
    overflowMenu: {
      marginTop: Platform.OS === 'ios' ? 90 : 60,
      marginRight: 12,
      borderRadius: 12,
      paddingVertical: 4,
      minWidth: 200,
      elevation: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
    },
    overflowItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    overflowItemText: {
      fontSize: 16,
      marginLeft: 14,
      fontWeight: '500',
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reader</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleBookmarkPress}
          >
            <Ionicons
              name={hasBookmark ? 'bookmark' : 'bookmark-outline'}
              size={24}
              color={hasBookmark ? theme.colors.primary : theme.colors.text}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={isSameLanguage ? () => setShowLanguagePicker(true) : handleTranslate}
            onLongPress={() => setShowLanguagePicker(true)}
            disabled={translating}
          >
            {translating ? (
              <ActivityIndicator size="small" color={theme.colors.text} />
            ) : (
              <Ionicons 
                name={isTranslated ? 'swap-horizontal' : 'language-outline'} 
                size={24} 
                color={isTranslated ? theme.colors.success : theme.colors.text} 
              />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleReadAloud}
          >
            <Ionicons
              name={isSpeaking ? 'volume-high' : 'volume-high-outline'}
              size={24}
              color={isSpeaking ? theme.colors.primary : theme.colors.text}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setShowOverflowMenu(true)}
          >
            <Ionicons name="ellipsis-vertical" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ flex: 1 }}>
      <ScrollView 
        ref={scrollViewRef}
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        onContentSizeChange={handleContentSizeChange}
        onLayout={handleScrollViewLayout}
      >
        <View style={styles.contentInner}>
        <View style={styles.articleHeader}>
          <Text selectable={true} style={styles.feedTitle}>{article.feedTitle}</Text>
          <Text selectable={true} style={styles.articleDate}>{formatDate(article.publishedDate)}</Text>
        </View>

        <View
          onLayout={(e) => { titleYRef.current = e.nativeEvent.layout.y; }}
          style={isSpeaking && ttsCurrentIndex === 0 && ttsBodyOffsetRef.current > 0 ? [styles.ttsHighlight, { backgroundColor: theme.colors.primary + '18' }] : null}
        >
          <Text 
            selectable={true}
            style={[
              styles.articleTitle,
              {
                writingDirection: isTranslated ? getTextDirection(translatedTitle || article.title) : getTextDirection(article.title),
                textAlign: isTranslated ? getTextAlignment(translatedTitle || article.title) : getTextAlignment(article.title),
              }
            ]}
          >
            {isTranslated && translatedTitle ? translatedTitle : article.title}
          </Text>
        </View>

        {article.authors && article.authors.length > 0 && (
          <Text selectable={true} style={styles.articleAuthor}>
            By {article.authors.map(author => author.name).join(', ')}
          </Text>
        )}

        {showImages && (
          <ArticleImage
            uri={article.imageUrl}
            style={styles.articleImage}
            resizeMode="cover"
          />
        )}

        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Loading article...</Text>
          </View>
        )}

        {error && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={48} color={theme.colors.error} />
            <Text style={styles.errorTitle}>Failed to load article</Text>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={fetchFullArticle}
            >
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        )}

        {fullContent && !loading && (
          <View style={styles.articleContent} onLayout={(e) => { articleContentYRef.current = e.nativeEvent.layout.y; }}>
            {/* Language info + translate controls */}
            <View style={styles.translationBar}>
              {languageInfo && languageInfo.confidence > 0.6 && (
                <View style={styles.languageInfo}>
                  <Ionicons 
                    name="language-outline" 
                    size={14} 
                    color={theme.colors.textSecondary} 
                  />
                  <Text style={styles.languageText}>
                    {getLanguageName(languageInfo.code)}
                    {languageInfo.isRTL ? ' (RTL)' : ''}
                  </Text>
                </View>
              )}
              
              {/* Only show translate button when article language differs from target */}
              {!isSameLanguage && (
                <TouchableOpacity
                  style={[
                    styles.translateButton,
                    isTranslated && styles.translateButtonActive,
                    translating && styles.translateButtonDisabled,
                  ]}
                  onPress={handleTranslate}
                  disabled={translating}
                >
                  {translating ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Ionicons 
                      name={isTranslated ? 'swap-horizontal' : 'language-outline'} 
                      size={16} 
                      color="#fff" 
                    />
                  )}
                  <Text style={styles.translateButtonText}>
                    {translating ? 'Translating...' : isTranslated ? 'Show Original' : `Translate to ${getDisplayName(targetLangCode)}`}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Translation progress */}
            {translating && translationProgress ? (
              <View style={styles.translationProgressContainer}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
                <Text style={styles.translationProgressText}>{translationProgress}</Text>
              </View>
            ) : null}

            {/* Show translation banner when translated */}
            {isTranslated && (
              <View style={styles.translatedBanner}>
                <Ionicons name="checkmark-circle" size={16} color={theme.colors.success} />
                <Text style={styles.translatedBannerText}>
                  Translated to {getDisplayName(targetLangCode)}
                  {detectedSourceLang ? ` from ${getDisplayName(detectedSourceLang)}` : ''}
                  {translationMethod === 'online' ? ' (Google Translate)' : translationMethod === 'offline' ? ' (Offline)' : ''}
                </Text>
              </View>
            )}

            {/* Render content as individual paragraphs for TTS highlight tracking */}
            {(isTranslated && translatedParagraphs.length > 0 ? translatedParagraphs : paragraphs).map((para, index) => {
              const isRTL = isTranslated ? ['ar', 'fa', 'he', 'ur'].includes(targetLangCode) : languageInfo?.isRTL;
              const isHighlighted = isSpeaking && ttsCurrentIndex === index + ttsBodyOffsetRef.current;
              return (
                <View
                  key={isTranslated ? `t-${index}` : index}
                  onLayout={(e) => { paragraphYRef.current[index] = e.nativeEvent.layout.y; }}
                  style={isHighlighted ? [styles.ttsHighlight, { backgroundColor: theme.colors.primary + '18' }] : null}
                >
                  <Text
                    selectable={true}
                    style={[
                      styles.articleText,
                      { writingDirection: isRTL ? 'rtl' : 'ltr', textAlign: isRTL ? 'right' : 'left' },
                      index < (isTranslated ? translatedParagraphs.length : paragraphs.length) - 1 ? { marginBottom: 16 } : null,
                    ]}
                  >
                    {para}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {!loading && !error && (!fullContent || fullContent.length === 0) && (
          <View style={styles.noContentContainer}>
            <Ionicons name="document-text-outline" size={48} color="#666" />
            <Text style={styles.noContentTitle}>No content available</Text>
            <Text style={styles.noContentText}>
              This article may not have full content available for reader mode.
            </Text>
          </View>
        )}
        </View>

        {/* Saved bookmark marker - scrolls with content, sits in the margin outside text */}
        {showBookmarkIndicators && hasBookmark && bookmarkLineY != null && (
          <TouchableOpacity
            activeOpacity={0.6}
            hitSlop={{ top: 16, bottom: 16, left: 8, right: 8 }}
            onPress={handleIndicatorPress}
            style={[styles.savedBookmarkLine, { top: bookmarkLineY, flexDirection: isRTL ? 'row-reverse' : 'row' }]}
          >
            <View style={[styles.savedBookmarkIcon, { backgroundColor: theme.colors.primary }]}>
              <Ionicons name="bookmark" size={10} color="#fff" />
            </View>
            <View style={[styles.savedBookmarkBar, { backgroundColor: theme.colors.primary + '50' }]} />
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Fixed aim line - tappable to save/remove bookmark */}
      {showBookmarkIndicators && showScrollToTop && (
        <TouchableOpacity
          activeOpacity={0.6}
          hitSlop={{ top: 16, bottom: 16, left: 8, right: 8 }}
          onPress={hasBookmark ? handleIndicatorPress : saveBookmark}
          style={[styles.aimLineContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
        >
          <View style={[styles.aimLineIcon, { borderColor: theme.colors.textSecondary + '50' }]}>
            <Ionicons name="bookmark-outline" size={11} color={theme.colors.textSecondary + '70'} />
          </View>
          <View style={[styles.aimLineBar, { borderColor: theme.colors.textSecondary + '40' }]} />
        </TouchableOpacity>
      )}

      {showScrollToTop && (
        <TouchableOpacity
          style={styles.scrollToTopButton}
          onPress={handleScrollToTop}
        >
          <Ionicons name="chevron-up" size={24} color="#fff" />
        </TouchableOpacity>
      )}

      {isSpeaking && (
        <View style={[styles.ttsFloatingBar, { backgroundColor: theme.colors.primary }]}>
          <Ionicons name="volume-high" size={18} color="#fff" />
          <Text style={styles.ttsFloatingBarText}>Reading aloud...</Text>
          <TouchableOpacity onPress={handleStopSpeech} style={styles.ttsStopButton}>
            <Ionicons name="stop-circle" size={28} color="#fff" />
          </TouchableOpacity>
        </View>
      )}
      </View>

      {/* Bookmark saved indicator */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.bookmarkToast,
          { opacity: bookmarkFlashAnim },
        ]}
      >
        <Ionicons name="bookmark" size={16} color="#fff" />
        <Text style={styles.bookmarkToastText}>
          {hasBookmark ? 'Bookmark saved' : 'Scrolled to bookmark'}
        </Text>
      </Animated.View>

      {/* Language Picker Modal */}
      <Modal
        visible={showLanguagePicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowLanguagePicker(false);
          setLanguageSearchQuery('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Translate To</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowLanguagePicker(false);
                  setLanguageSearchQuery('');
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
                value={languageSearchQuery}
                onChangeText={setLanguageSearchQuery}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {languageSearchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setLanguageSearchQuery('')}>
                  <Ionicons name="close-circle" size={18} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            <FlatList
              data={filteredLanguages}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.languageItem,
                    item.code === targetLangCode && styles.languageItemSelected,
                  ]}
                  onPress={() => handleChangeTargetLanguage(item.code)}
                >
                  <Text
                    style={[
                      styles.languageItemText,
                      item.code === targetLangCode && styles.languageItemTextSelected,
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
              style={styles.languageList}
            />
          </View>
        </View>
      </Modal>

      {/* Custom themed alert dialog */}
      <CustomAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        icon={alertConfig.icon}
        buttons={alertConfig.buttons}
        onDismiss={() => setAlertConfig(prev => ({ ...prev, visible: false }))}
      />

      {/* Notes Modal */}
      <Modal
        visible={showNotesModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowNotesModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.notesModalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={[styles.notesModalContainer, { backgroundColor: theme.colors.surface }]}>
            <View style={[styles.notesModalHeader, { borderBottomColor: theme.colors.border }]}>
              <Text style={[styles.notesModalTitle, { color: theme.colors.text }]}>Notes</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {noteText.trim() !== '' && (
                  <TouchableOpacity
                    onPress={() => {
                      setNote(article.id, '');
                      setNoteText('');
                      setShowNotesModal(false);
                    }}
                    style={styles.notesModalCloseButton}
                  >
                    <Ionicons name="trash-outline" size={22} color={theme.colors.error} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={() => setShowNotesModal(false)}
                  style={styles.notesModalCloseButton}
                >
                  <Ionicons name="close" size={24} color={theme.colors.text} />
                </TouchableOpacity>
              </View>
            </View>
            <TextInput
              style={[styles.notesInput, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}
              multiline
              placeholder="Write your notes about this article..."
              placeholderTextColor={theme.colors.textTertiary}
              value={noteText}
              onChangeText={setNoteText}
              textAlignVertical="top"
              autoFocus={true}
            />
            <TouchableOpacity
              style={[styles.notesSaveButton, { backgroundColor: theme.colors.primary }]}
              onPress={() => {
                setNote(article.id, noteText);
                setShowNotesModal(false);
              }}
            >
              <Text style={styles.notesSaveButtonText}>Save Note</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Overflow menu */}
      <Modal
        visible={showOverflowMenu}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowOverflowMenu(false)}
      >
        <TouchableOpacity
          style={styles.overflowBackdrop}
          activeOpacity={1}
          onPress={() => setShowOverflowMenu(false)}
        >
          <View style={[styles.overflowMenu, { backgroundColor: theme.colors.surface }]}>
            <TouchableOpacity
              style={styles.overflowItem}
              onPress={() => { setShowOverflowMenu(false); handleOpenBrowser(); }}
            >
              <Ionicons name="globe-outline" size={22} color={theme.colors.text} />
              <Text style={[styles.overflowItemText, { color: theme.colors.text }]}>Open in Browser</Text>
            </TouchableOpacity>
            <View style={styles.overflowItem}>
              <SaveButton article={article} size={22} variant="header" />
              <Text style={[styles.overflowItemText, { color: theme.colors.text }]}>Save for Later</Text>
            </View>
            <TouchableOpacity
              style={styles.overflowItem}
              onPress={() => {
                setShowOverflowMenu(false);
                setNoteText(articleNote ? articleNote.text : '');
                setShowNotesModal(true);
              }}
            >
              <Ionicons
                name={hasNote(article?.id) ? 'document-text' : 'document-text-outline'}
                size={22}
                color={hasNote(article?.id) ? theme.colors.primary : theme.colors.text}
              />
              <Text style={[styles.overflowItemText, { color: theme.colors.text }]}>Notes</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.overflowItem, { borderBottomWidth: 0 }]}
              onPress={() => { setShowOverflowMenu(false); handleShare(); }}
            >
              <Ionicons name="share-outline" size={22} color={theme.colors.text} />
              <Text style={[styles.overflowItemText, { color: theme.colors.text }]}>Share</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

// Export wrapped with ErrorBoundary to catch any rendering crashes
export default function ArticleReaderScreen(props) {
  return (
    <ErrorBoundary>
      <ArticleReaderScreenContent {...props} />
    </ErrorBoundary>
  );
}
