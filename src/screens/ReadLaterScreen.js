import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAppSettings } from '../context/AppSettingsContext';
import { useReadLater } from '../context/ReadLaterContext';
import ArticleImage from '../components/ArticleImage';

export default function ReadLaterScreen({ navigation }) {
  const { theme } = useTheme();
  const { showImages } = useAppSettings();
  const { articles, loading, clearReadLater, removeFromReadLater } = useReadLater();

  const handleArticlePress = (article) => {
    navigation.navigate('ArticleReader', { article });
  };

  const handleClearAll = () => {
    if (articles.length === 0) return;
    
    // Use browser-compatible confirm dialog for web, Alert for mobile
    if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
      // Web environment - use native confirm
      const confirmed = window.confirm('Are you sure you want to remove all saved articles?');
      if (confirmed) {
        clearReadLater();
      }
    } else {
      // Mobile environment - use Alert
      Alert.alert(
        'Clear All',
        'Are you sure you want to remove all saved articles?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Clear All', 
            style: 'destructive',
            onPress: clearReadLater
          },
        ]
      );
    }
  };

  const handleRemoveArticle = (articleId) => {
    // Use browser-compatible confirm dialog for web, Alert for mobile
    if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
      // Web environment - use native confirm
      const confirmed = window.confirm('Remove this article from saved articles?');
      if (confirmed) {
        removeFromReadLater(articleId);
      }
    } else {
      // Mobile environment - use Alert
      Alert.alert(
        'Remove Article',
        'Remove this article from saved articles?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Remove', 
            style: 'destructive',
            onPress: () => removeFromReadLater(articleId)
          },
        ]
      );
    }
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons 
        name="save-outline" 
        size={64} 
        color={theme.colors.textSecondary} 
      />
      <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
        No Saved Articles
      </Text>
      <Text style={[styles.emptyMessage, { color: theme.colors.textSecondary }]}>
        Articles you save for later reading will appear here
      </Text>
    </View>
  );

  const renderArticleItem = ({ item }) => (
    <View style={styles.articleContainer}>
      <TouchableOpacity
        style={[styles.articleCard, { backgroundColor: theme.colors.surface }]}
        onPress={() => handleArticlePress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.articleContent}>
          <View style={styles.articleHeader}>
            <Text style={[styles.feedTitle, { color: theme.colors.primary }]} numberOfLines={1}>
              {item.feedTitle}
            </Text>
            <Text style={[styles.date, { color: theme.colors.textSecondary }]}>
              {formatDate(item.publishedDate)}
            </Text>
          </View>
          
          <Text style={[styles.title, { color: theme.colors.text }]} numberOfLines={2}>
            {item.title}
          </Text>
          
          {item.description && (
            <Text style={[styles.description, { color: theme.colors.textSecondary }]} numberOfLines={2}>
              {item.description}
            </Text>
          )}

          <View style={styles.footer}>
            {item.offlineCached && (
              <View style={[styles.offlineIndicator, { backgroundColor: theme.colors.success || '#28a745' }]}>
                <Ionicons name="download" size={10} color="#fff" />
                <Text style={styles.offlineText}>OFFLINE</Text>
              </View>
            )}
            <TouchableOpacity
              style={[styles.trashButton, { backgroundColor: theme.colors.error }]}
              onPress={() => handleRemoveArticle(item.id)}
            >
              <Ionicons name="trash-outline" size={14} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
        
        {showImages ? (
          item.imageUrl ? (
            <ArticleImage
              uri={item.imageUrl}
              style={styles.image}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.image, styles.placeholderImage, { backgroundColor: theme.colors.border }]}>
              <Ionicons name="image-outline" size={32} color={theme.colors.textSecondary} />
            </View>
          )
        ) : null}
      </TouchableOpacity>
    </View>
  );

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

  const renderHeader = () => (
    <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.headerContent}>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          Saved Articles
        </Text>
        <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
          {articles.length} {articles.length === 1 ? 'article' : 'articles'} saved
        </Text>
      </View>
      {articles.length > 0 && (
        <TouchableOpacity
          style={[styles.clearButton, { borderColor: theme.colors.error }]}
          onPress={handleClearAll}
        >
          <Text style={[styles.clearButtonText, { color: theme.colors.error }]}>
            Clear All
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {renderHeader()}
      <FlatList
        data={articles}
        keyExtractor={(item) => item.id}
        renderItem={renderArticleItem}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={articles.length === 0 ? styles.emptyList : styles.list}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={() => {}} // Read Later doesn't need refresh
            tintColor={theme.colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 14,
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderRadius: 6,
  },
  clearButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  list: {
    padding: 16,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyContainer: {
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  articleContainer: {
    marginBottom: 16,
  },
  articleCard: {
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    flexDirection: 'row',
  },
  articleContent: {
    flex: 1,
  },
  articleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  feedTitle: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  date: {
    fontSize: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
    lineHeight: 22,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  offlineIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  offlineText: {
    fontSize: 10,
    color: '#fff',
    marginLeft: 4,
    fontWeight: '600',
  },
  trashButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginLeft: 12,
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
