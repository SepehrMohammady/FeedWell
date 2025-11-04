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
import { useReadLater } from '../context/ReadLaterContext';
import ArticleCard from '../components/ArticleCard';

export default function ReadLaterScreen({ navigation }) {
  const { theme } = useTheme();
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
      <ArticleCard
        article={item}
        onPress={() => handleArticlePress(item)}
        showFeedTitle={true}
      />
      <TouchableOpacity
        style={[styles.removeButton, { backgroundColor: theme.colors.error }]}
        onPress={() => handleRemoveArticle(item.id)}
      >
        <Ionicons name="trash-outline" size={16} color="#fff" />
      </TouchableOpacity>
    </View>
  );

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
    position: 'relative',
    marginBottom: 16,
  },
  removeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});
