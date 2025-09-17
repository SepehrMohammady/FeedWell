import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAppSettings } from '../context/AppSettingsContext';
import ArticleImage from './ArticleImage';

export default function ArticleCard({ article, onPress, showFeedTitle = false }) {
  const { theme } = useTheme();
  const { showImages } = useAppSettings();

  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      return '';
    }
  };

  const styles = StyleSheet.create({
    container: {
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      shadowColor: theme.colors.shadow,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 3.84,
      elevation: 5,
      flexDirection: 'row',
    },
    content: {
      flex: 1,
      marginRight: showImages && article.imageUrl ? 12 : 0,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    feedTitle: {
      fontSize: 12,
      color: theme.colors.primary,
      fontWeight: '600',
      flex: 1,
    },
    date: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    title: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 6,
      lineHeight: 22,
    },
    description: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      lineHeight: 20,
    },
    image: {
      width: 80,
      height: 80,
      borderRadius: 8,
    },
    offlineIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.success || '#28a745',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      marginLeft: 8,
    },
    offlineText: {
      fontSize: 10,
      color: '#fff',
      marginLeft: 2,
      fontWeight: '600',
    },
  });

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          {showFeedTitle && (
            <Text style={styles.feedTitle} numberOfLines={1}>
              {article.feedTitle}
            </Text>
          )}
          <Text style={styles.date}>
            {formatDate(article.publishedDate)}
          </Text>
          {article.offlineCached && (
            <View style={styles.offlineIndicator}>
              <Ionicons name="download" size={10} color="#fff" />
              <Text style={styles.offlineText}>OFFLINE</Text>
            </View>
          )}
        </View>
        
        <Text style={styles.title} numberOfLines={2}>
          {article.title}
        </Text>
        
        {article.description && (
          <Text style={styles.description} numberOfLines={2}>
            {article.description}
          </Text>
        )}
      </View>
      
      {showImages && article.imageUrl && (
        <ArticleImage
          uri={article.imageUrl}
          style={styles.image}
          resizeMode="cover"
        />
      )}
    </TouchableOpacity>
  );
}
