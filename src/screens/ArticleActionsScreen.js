import React, { useEffect, useRef } from 'react';
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
import { useAmbientSound } from '../context/AmbientSoundContext';
import { useTranslation } from '../context/LanguageContext';
import { formatLocalizedDate } from '../utils/formatDate';
import SaveButton from '../components/SaveButton';

export default function ArticleActionsScreen({ route, navigation }) {
  const { article, currentFilter = 'all', currentSortOrder = 'newest' } = route.params;
  const { theme } = useTheme();
  const { markArticleRead } = useFeed();
  const { setShowPlaylist: openSoundPlaylist } = useAmbientSound();
  const { t, isRTL, formatNumber, language } = useTranslation();

  
  // Track if we've already marked this article as read to prevent infinite loops
  const hasMarkedReadRef = useRef(false);

  // Mark article as read when the actions screen is viewed - only once
  useEffect(() => {
    if (article && article.id && !hasMarkedReadRef.current) {
      hasMarkedReadRef.current = true;
      console.log('ArticleActionsScreen: Marking article as read:', article.id, 'Current isRead:', article.isRead, 'Filter:', currentFilter, 'Sort:', currentSortOrder);
      markArticleRead(article.id, currentFilter, currentSortOrder);
    }
  }, [article?.id]); // Only depend on article.id, not the whole object or markArticleRead

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
        message: Platform.OS === 'ios' ? `📰 ${t('articleActions.sharedVia')}\n\n${article.title}` : `📰 ${t('articleActions.sharedVia')}\n\n${article.title}\n\n${article.url}`,
        url: Platform.OS === 'ios' ? article.url : undefined,
        title: article.title,
      };
      
      await Share.share(shareOptions);
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const formatDate = (dateString) => formatLocalizedDate(dateString, language, formatNumber, {
    withYear: true,
    withTime: true,
    localeOptions: { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' },
  });

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    backButton: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 6,
      paddingVertical: 4,
      minWidth: 44,
    },
    headerButton: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 6,
      paddingVertical: 4,
      minWidth: 44,
    },
    headerButtonLabel: {
      fontSize: 9,
      marginTop: 2,
      fontWeight: '500',
      color: theme.colors.textSecondary,
    },
    headerActions: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
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
      textAlign: isRTL ? 'right' : 'left',
      writingDirection: isRTL ? 'rtl' : 'ltr',
    },
    articleDate: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      textAlign: isRTL ? 'right' : 'left',
      writingDirection: isRTL ? 'rtl' : 'ltr',
    },
    articleTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.colors.text,
      lineHeight: 32,
      marginBottom: 16,
      textAlign: isRTL ? 'right' : 'left',
      writingDirection: isRTL ? 'rtl' : 'ltr',
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
      textAlign: isRTL ? 'right' : 'left',
      writingDirection: isRTL ? 'rtl' : 'ltr',
    },
    actionsContainer: {
      gap: 12,
      paddingVertical: 16,
    },
    actionButton: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
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
    notesButton: {
      backgroundColor: theme.colors.textSecondary,
    },
    actionButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
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
  });

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name={isRTL ? "arrow-forward" : "arrow-back"} size={20} color={theme.colors.text} />
          <Text style={styles.headerButtonLabel}>{t('articleActions.back')}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('articleActions.headerTitle')}</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerButton} onPress={handleOpenInBrowser}>
            <Ionicons name="globe-outline" size={20} color={theme.colors.text} />
            <Text style={styles.headerButtonLabel}>{t('articleActions.browser')}</Text>
          </TouchableOpacity>
          <SaveButton article={article} size={20} variant="header" label={t('common.save')} />
          <TouchableOpacity style={styles.headerButton} onPress={handleShare}>
            <Ionicons name="share-outline" size={20} color={theme.colors.text} />
            <Text style={styles.headerButtonLabel}>{t('articleActions.share')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton} onPress={() => openSoundPlaylist(true)}>
            <Ionicons name="musical-notes-outline" size={20} color={theme.colors.text} />
            <Text style={styles.headerButtonLabel}>{t('articleActions.sounds')}</Text>
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
            <Text style={styles.actionButtonText}>{t('articleActions.openInBrowser')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.readerButton]}
            onPress={handleReadInApp}
          >
            <Ionicons name="reader-outline" size={24} color="#fff" />
            <Text style={styles.actionButtonText}>{t('articleActions.readInApp')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.shareButton]}
            onPress={handleShare}
          >
            <Ionicons name="share-outline" size={24} color="#fff" />
            <Text style={styles.actionButtonText}>{t('articleActions.share')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>


    </SafeAreaView>
  );
}
