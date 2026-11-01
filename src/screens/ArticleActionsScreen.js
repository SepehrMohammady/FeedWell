import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  Linking,
  Share,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, makeStyles } from '../context/ThemeContext';
import { useUi } from '../theme/ui';
import { FONT, TYPE, RADIUS } from '../theme/type';
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
  const ui = useUi();
  const styles = useStyles(isRTL);

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

  const colors = theme.colors;

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={ui.page}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name={isRTL ? "arrow-forward" : "arrow-back"} size={20} color={colors.text} />
          <Text style={styles.headerButtonLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{t('articleActions.back')}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{t('articleActions.headerTitle')}</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerButton} onPress={handleOpenInBrowser}>
            <Ionicons name="globe-outline" size={20} color={colors.text} />
            <Text style={styles.headerButtonLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{t('articleActions.browser')}</Text>
          </TouchableOpacity>
          <SaveButton article={article} size={20} variant="header" label={t('common.save')} />
          <TouchableOpacity style={styles.headerButton} onPress={handleShare}>
            <Ionicons name="share-outline" size={20} color={colors.text} />
            <Text style={styles.headerButtonLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{t('articleActions.share')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton} onPress={() => openSoundPlaylist(true)}>
            <Ionicons name="musical-notes-outline" size={20} color={colors.text} />
            <Text style={styles.headerButtonLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{t('articleActions.sounds')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* The article's preview, in one card */}
        <View style={[ui.card, styles.articleCard]}>
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
        </View>

        {/* One primary action, the others secondary: red, green and amber are
            kept for states */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[ui.primaryButton, styles.actionButton]}
            onPress={handleOpenInBrowser}
          >
            <Ionicons name="globe-outline" size={22} color={colors.onPrimary} />
            <Text style={[ui.primaryLabel, styles.actionButtonText]}>{t('articleActions.openInBrowser')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[ui.secondaryButton, styles.actionButton]}
            onPress={handleReadInApp}
          >
            <Ionicons name="reader-outline" size={22} color={colors.mainInk} />
            <Text style={[ui.secondaryLabel, styles.actionButtonText]}>{t('articleActions.readInApp')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[ui.secondaryButton, styles.actionButton]}
            onPress={handleShare}
          >
            <Ionicons name="share-outline" size={22} color={colors.mainInk} />
            <Text style={[ui.secondaryLabel, styles.actionButtonText]}>{t('articleActions.share')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>


    </SafeAreaView>
  );
}

// Styles built once per theme and direction (Calm Surfaces 3)
const useStyles = makeStyles(({ colors: c }, isRTL) => {
  const row = isRTL ? 'row-reverse' : 'row';
  const textAlign = isRTL ? 'right' : 'left';
  const writingDirection = isRTL ? 'rtl' : 'ltr';
  return {
    header: {
      flexDirection: row,
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    headerButton: {
      flexShrink: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 6,
      paddingVertical: 4,
      minWidth: 44,
      minHeight: 44,
    },
    // Straight on the wash, so in the tone that reads on its glows
    headerButtonLabel: {
      fontFamily: FONT.medium,
      fontSize: 10,
      marginTop: 2,
      color: c.textSecondaryOnWash,
    },
    headerActions: {
      flexDirection: row,
      alignItems: 'center',
    },
    headerTitle: {
      ...TYPE.title,
      flexShrink: 1,
      color: c.text,
    },
    content: {
      flex: 1,
    },
    scrollContent: {
      padding: 16,
    },
    articleCard: {
      padding: 16,
    },
    articleHeader: {
      marginBottom: 12,
    },
    feedTitle: {
      fontFamily: FONT.semiBold,
      fontSize: 14,
      color: c.mainInk,
      marginBottom: 4,
      textAlign,
      writingDirection,
    },
    articleDate: {
      ...TYPE.secondary,
      color: c.textSecondary,
      textAlign,
      writingDirection,
    },
    articleTitle: {
      fontFamily: FONT.bold,
      fontSize: 24,
      letterSpacing: -0.3,
      color: c.text,
      lineHeight: 31,
      marginBottom: 16,
      textAlign,
      writingDirection,
    },
    articleImage: {
      width: '100%',
      height: 200,
      borderRadius: RADIUS.tile,
      marginBottom: 16,
      backgroundColor: c.surface2,
    },
    articleDescription: {
      ...TYPE.body,
      fontSize: 16,
      color: c.textSecondary,
      lineHeight: 24,
      textAlign,
      writingDirection,
    },
    actionsContainer: {
      gap: 12,
      paddingVertical: 16,
    },
    actionButton: {
      minHeight: 50,
    },
    actionButtonText: {
      fontSize: 15,
    },
  };
});
