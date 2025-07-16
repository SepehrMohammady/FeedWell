import React from 'react';
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

export default function ArticleActionsScreen({ route, navigation }) {
  const { article } = route.params;

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
    navigation.navigate('ArticleReader', { article });
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Article</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.articleHeader}>
          <Text style={styles.feedTitle}>{article.feedTitle}</Text>
          <Text style={styles.articleDate}>{formatDate(article.publishedDate)}</Text>
        </View>

        <Text style={styles.articleTitle}>{article.title}</Text>

        {article.imageUrl && (
          <Image
            source={{ uri: article.imageUrl }}
            style={styles.articleImage}
            resizeMode="cover"
          />
        )}

        {article.description && (
          <Text style={styles.articleDescription}>{article.description}</Text>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerButton: {
    padding: 8,
    width: 40,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
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
    color: '#007AFF',
    fontWeight: '600',
    marginBottom: 4,
  },
  articleDate: {
    fontSize: 12,
    color: '#666',
  },
  articleTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    lineHeight: 32,
    marginBottom: 16,
  },
  articleImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 16,
    backgroundColor: '#f0f0f0',
  },
  articleDescription: {
    fontSize: 16,
    color: '#666',
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
    backgroundColor: '#007AFF',
  },
  readerButton: {
    backgroundColor: '#34C759',
  },
  shareButton: {
    backgroundColor: '#FF9500',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
