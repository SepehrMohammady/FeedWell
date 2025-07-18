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
import { cleanHtmlContent, extractCleanText } from '../utils/rssParser';
import ArticleImage from '../components/ArticleImage';

export default function ArticleReaderScreen({ route, navigation }) {
  const { article } = route.params;
  const { theme } = useTheme();
  const { showImages } = useAppSettings();
  const [fullContent, setFullContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchFullArticle();
  }, []);

  const fetchFullArticle = async () => {
    try {
      setLoading(true);
      setError(null);

      // Try to fetch the full article content
      const response = await fetch(article.url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      
      // Extract main content using simple heuristics
      const cleanedHtml = cleanHtmlContent(html);
      const cleanText = extractCleanText(cleanedHtml);
      
      // Try to find article content
      let content = cleanText;
      
      // If we have existing content from RSS, prefer that
      if (article.content && article.content.length > article.description?.length) {
        content = article.content;
      }
      
      setFullContent(content);
    } catch (err) {
      console.error('Error fetching article:', err);
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

        <Text style={styles.articleTitle}>{article.title}</Text>

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
            <Text style={styles.articleText}>{fullContent}</Text>
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
