import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAppSettings } from '../context/AppSettingsContext';
import { cleanHtmlContent, extractCleanText, extractArticleContent } from '../utils/rssParser';
import { detectLanguage, getTextDirection, getTextAlignment, getLanguageName } from '../utils/languageDetection';
import ArticleImage from '../components/ArticleImage';
import BookmarkButton from '../components/BookmarkButton';

export default function ArticleReaderScreen({ route, navigation }) {
  const { article } = route.params;
  const { theme } = useTheme();
  const { showImages } = useAppSettings();
  const [fullContent, setFullContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [languageInfo, setLanguageInfo] = useState(null);

  useEffect(() => {
    fetchFullArticle();
  }, []);

  const fetchFullArticle = async () => {
    try {
      setLoading(true);
      setError(null);

      // Start with RSS content
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
      setError(err.message);
      // Fallback to RSS content
      setFullContent(article.content || article.description || '');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    try {
      const shareOptions = {
        message: Platform.OS === 'ios' ? article.title : `${article.title}\n\n${article.url}`,
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
      padding: 20,
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
      marginBottom: 12,
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
            onPress={handleOpenBrowser}
          >
            <Ionicons name="globe-outline" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <BookmarkButton article={article} size={24} style={styles.headerButton} />
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleShare}
          >
            <Ionicons name="share-outline" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.articleHeader}>
          <Text style={styles.feedTitle}>{article.feedTitle}</Text>
          <Text style={styles.articleDate}>{formatDate(article.publishedDate)}</Text>
        </View>

        <Text 
          style={[
            styles.articleTitle,
            {
              writingDirection: getTextDirection(article.title),
              textAlign: getTextAlignment(article.title),
            }
          ]}
        >
          {article.title}
        </Text>

        {article.authors && article.authors.length > 0 && (
          <Text style={styles.articleAuthor}>
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
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Loading article...</Text>
          </View>
        )}

        {error && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={48} color="#FF3B30" />
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
          <View style={styles.articleContent}>
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
            <Text 
              style={[
                styles.articleText,
                {
                  writingDirection: languageInfo?.isRTL ? 'rtl' : 'ltr',
                  textAlign: languageInfo?.isRTL ? 'right' : 'left',
                }
              ]}
            >
              {fullContent}
            </Text>
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
      </ScrollView>
    </SafeAreaView>
  );
}
