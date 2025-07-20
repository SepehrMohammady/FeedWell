import React from 'react';
import { TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useReadLater } from '../context/ReadLaterContext';

export default function BookmarkButton({ article, size = 24, style }) {
  const { theme } = useTheme();
  const { addToReadLater, removeFromReadLater, isInReadLater } = useReadLater();
  
  const isBookmarked = isInReadLater(article.id);

  const handlePress = () => {
    if (isBookmarked) {
      // Remove from read later - use browser-compatible confirm dialog for web, Alert for mobile
      if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
        // Web environment - use native confirm
        const confirmed = window.confirm('Remove this article from Read Later?');
        if (confirmed) {
          removeFromReadLater(article.id);
        }
      } else {
        // Mobile environment - use Alert
        Alert.alert(
          'Remove Bookmark',
          'Remove this article from Read Later?',
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
      // Add to read later
      const success = addToReadLater(article);
      if (success) {
        // Use browser-compatible alert for web, Alert for mobile
        if (typeof window !== 'undefined') {
          // Web environment - use native alert (or just skip the confirmation)
          // For better UX in web, we can skip the success message
          console.log('Article added to Read Later');
        } else {
          // Mobile environment - use Alert
          Alert.alert(
            'Saved!',
            'Article added to Read Later',
            [{ text: 'OK' }]
          );
        }
      } else {
        // Use browser-compatible alert for web, Alert for mobile
        if (typeof window !== 'undefined') {
          // Web environment - use native alert
          window.alert('This article is already in your Read Later list');
        } else {
          // Mobile environment - use Alert
          Alert.alert(
            'Already Saved',
            'This article is already in your Read Later list',
            [{ text: 'OK' }]
          );
        }
      }
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        { backgroundColor: theme.colors.surface },
        style
      ]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <Ionicons
        name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
        size={size}
        color={isBookmarked ? theme.colors.primary : theme.colors.textSecondary}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
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
