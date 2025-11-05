import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  Linking,
  Share,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useFeed } from '../context/FeedContext';
import SaveButton from '../components/SaveButton';

export default function ArticleActionsScreen({ route, navigation }) {
  const { article, currentFilter = 'all', currentSortOrder = 'newest' } = route.params;
  const { theme } = useTheme();
  const { markArticleRead } = useFeed();

  // Mark article as read when the actions screen is viewed
  useEffect(() => {
    if (article && article.id) {
      console.log('ArticleActionsScreen: Marking article as read:', article.id, 'Current isRead:', article.isRead, 'Filter:', currentFilter, 'Sort:', currentSortOrder);
      markArticleRead(article.id, currentFilter, currentSortOrder);
    }
  }, [article, markArticleRead, currentFilter, currentSortOrder]);

  const handleOpenInBrowser = async () => {
    try {
      const supported = await Linking.canOpenURL(article.url);
      if (supported) {
        await Linking.openURL(article.url);
      } else {
        console.error("Can't open URL:", article.url);
      }
    } catch (error) {
      console.error('Error opening URL:', error);
    }
  };

  const handleReadInApp = () => {
    navigation.navigate('ArticleReader', { 
      article,
      currentFilter,
      currentSortOrder
    });
  };

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
      backgroundColor: theme.colors.background,
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
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text,
    },
    content: {
      flex: 1,
      padding: 16,
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
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.colors.text,
      lineHeight: 32,
      marginBottom: 16,
    },
    articleImage: {
      width: '100%',
      height: 200,
      borderRadius: 12,
      marginBottom: 16,
      backgroundColor: theme.colors.border,
    },
    articleDescription: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      lineHeight: 24,
      marginBottom: 24,
    },
    actionsContainer: {
      gap: 12,
      paddingVertical: 16,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
      borderRadius: 12,
      gap: 8,
    },
    browserButton: {
      backgroundColor: theme.colors.primary,
    },
    readerButton: {
      backgroundColor: theme.colors.success,
    },
    shareButton: {
      backgroundColor: theme.colors.warning,
    },
    actionButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Article</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerButton} onPress={handleOpenInBrowser}>
            <Ionicons name="globe-outline" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <SaveButton article={article} size={24} variant="header" />
          <TouchableOpacity style={styles.headerButton} onPress={handleShare}>
            <Ionicons name="share-outline" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.articleHeader}>
          <Text selectable={true} style={styles.feedTitle}>{article.feedTitle}</Text>
          <Text selectable={true} style={styles.articleDate}>{formatDate(article.publishedDate)}</Text>
        </View>

        <Text selectable={true} style={styles.articleTitle}>{article.title}</Text>

        {article.imageUrl && (
          <Image
            source={{ uri: article.imageUrl }}
            style={styles.articleImage}
            resizeMode="cover"
          />
        )}

        {article.description && (
          <Text selectable={true} style={styles.articleDescription}>{article.description}</Text>
        )}

        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.actionButton, styles.browserButton]}
            onPress={handleOpenInBrowser}
          >
            <Ionicons name="globe-outline" size={24} color="#fff" />
            <Text style={styles.actionButtonText}>Open in Browser</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.readerButton]}
            onPress={handleReadInApp}
          >
            <Ionicons name="reader-outline" size={24} color="#fff" />
            <Text style={styles.actionButtonText}>Read in App</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.shareButton]}
            onPress={handleShare}
          >
            <Ionicons name="share-outline" size={24} color="#fff" />
            <Text style={styles.actionButtonText}>Share</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
