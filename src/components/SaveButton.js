import React, { useState } from 'react';
import { TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useReadLater } from '../context/ReadLaterContext';
import { extractArticleContent, cleanHtmlContent } from '../utils/rssParser';

export default function SaveButton({ article, size = 24, style, variant = 'default' }) {
  const { theme } = useTheme();
  const { addToReadLater, removeFromReadLater, isInReadLater } = useReadLater();
  const [isLoading, setIsLoading] = useState(false);
  
  const isBookmarked = isInReadLater(article.id);

  const fetchFullContentForOffline = async (article) => {
    try {
      setIsLoading(true);
      console.log('Starting download for offline reading:', article.title);
      
      // If article doesn't have a URL, just save what we have
      if (!article.url) {
        console.log('No URL available, saving existing content');
        return {
          ...article,
          offlineContent: article.content || article.description || '',
          offlineCached: true,
          cachedAt: new Date().toISOString()
        };
      }

      // Try to fetch full article content from the URL
      console.log('Fetching full content from:', article.url);
      const response = await fetch(article.url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const html = await response.text();
      console.log('Content fetched, extracting article text...');
      
      // Extract and clean the article content
      const fullContent = extractArticleContent(html);
      const cleanedContent = cleanHtmlContent(fullContent);
      
      console.log('Content extracted and cleaned for offline storage');
      
      // Create enhanced article object with offline content
      const enhancedArticle = {
        ...article,
        offlineContent: cleanedContent || article.content || article.description || '',
        offlineHtmlContent: fullContent || article.htmlContent || '',
        offlineCached: true,
        cachedAt: new Date().toISOString()
      };

      return enhancedArticle;
    } catch (error) {
      console.log('Failed to fetch full content, saving article as-is:', error.message);
      // If fetching fails, save the article with existing content
      return {
        ...article,
        offlineContent: article.content || article.description || '',
        offlineCached: false,
        cachedAt: new Date().toISOString()
      };
    } finally {
      setIsLoading(false);
    }
  };

  const handlePress = async () => {
    if (isBookmarked) {
      // Remove from read later - use browser-compatible confirm dialog for web, Alert for mobile
      if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
        // Web environment - use native confirm
        const confirmed = window.confirm('Remove this article from saved articles?');
        if (confirmed) {
          removeFromReadLater(article.id);
        }
      } else {
        // Mobile environment - use Alert
        Alert.alert(
          'Remove from Saved',
          'Remove this article from saved articles?',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Remove', 
              style: 'destructive',
              onPress: () => removeFromReadLater(article.id)
            },
          ]
        );
      }
    } else {
      // Add to read later with offline content
      try {
        const enhancedArticle = await fetchFullContentForOffline(article);
        const success = addToReadLater(enhancedArticle);
        
        if (success) {
          // Use browser-compatible alert for web, Alert for mobile
          if (typeof window !== 'undefined') {
            // Web environment - use native alert (or just skip the confirmation)
            // For better UX in web, we can skip the success message
            console.log('Article saved for offline reading');
          } else {
            // Mobile environment - use Alert
            const message = enhancedArticle.offlineCached 
              ? 'Article downloaded and saved for offline reading!' 
              : 'Article saved (limited offline content available)';
            Alert.alert(
              'Saved!',
              message,
              [{ text: 'OK' }]
            );
          }
        } else {
          // Use browser-compatible alert for web, Alert for mobile
          if (typeof window !== 'undefined') {
            // Web environment - use native alert
            window.alert('This article is already saved');
          } else {
            // Mobile environment - use Alert
            Alert.alert(
              'Already Saved',
              'This article is already saved',
              [{ text: 'OK' }]
            );
          }
        }
      } catch (error) {
        console.error('Error saving article:', error);
        const errorMessage = error.message.includes('fetch') 
          ? 'Failed to download article content. Saved with limited offline content.'
          : 'Failed to save article. Please try again.';
        
        Alert.alert(
          'Save Error',
          errorMessage,
          [{ text: 'OK' }]
        );
      }
    }
  };

  return (
    <TouchableOpacity
      style={[
        variant === 'header' ? styles.headerButton : styles.button,
        variant === 'header' ? {} : { backgroundColor: theme.colors.surface },
        style
      ]}
      onPress={handlePress}
      activeOpacity={0.7}
      disabled={isLoading}
    >
      {isLoading ? (
        <ActivityIndicator 
          size={size > 20 ? "small" : size} 
          color={theme.colors.primary} 
        />
      ) : (
        <Ionicons
          name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
          size={size}
          color={theme.colors.text}
        />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  headerButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  button: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
});
