import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Linking,
  Share,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';

export default function ArticleScreen({ route, navigation }) {
  const { article } = route.params;
  const [showWebView, setShowWebView] = useState(false);

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

  const handleShare = async () => {
    try {
      await Share.share({
        message: `${article.title}\n\n${article.url}`,
        url: article.url,
        title: article.title,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleOpenInBrowser = () => {
    if (article.url) {
      Linking.openURL(article.url).catch(() => {
        Alert.alert('Error', 'Unable to open link');
      });
    }
  };

  const handleToggleWebView = () => {
    if (!article.url) {
      Alert.alert('Error', 'No URL available for this article');
      return;
    }
    setShowWebView(!showWebView);
  };

  // CSS for ad blocking in WebView
  const adBlockCSS = `
    <style>
      /* Hide common ad elements */
      [class*="ad"], [id*="ad"], [class*="advertisement"], [id*="advertisement"],
      [class*="sponsor"], [id*="sponsor"], [class*="promo"], [id*="promo"],
      iframe[src*="doubleclick"], iframe[src*="googleads"], iframe[src*="adsystem"],
      iframe[src*="amazon-adsystem"], iframe[src*="facebook.com/tr"],
      .ad, .ads, .advertisement, .sponsored, .promo, .banner,
      #ad, #ads, #advertisement, #sponsored, #promo, #banner,
      aside, .sidebar-ad, .ad-container, .ad-wrapper,
      [data-ad], [data-advertisement], [data-sponsor] {
        display: none !important;
        visibility: hidden !important;
        height: 0 !important;
        width: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      
      /* Clean article styling */
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        line-height: 1.6;
        color: #333;
        max-width: 100%;
        margin: 0;
        padding: 16px;
        background: #fff;
      }
      
      h1, h2, h3, h4, h5, h6 {
        color: #222;
        margin-top: 24px;
        margin-bottom: 16px;
        line-height: 1.25;
      }
      
      p {
        margin-bottom: 16px;
        text-align: justify;
      }
      
      img {
        max-width: 100%;
        height: auto;
        border-radius: 8px;
        margin: 16px 0;
      }
      
      a {
        color: #007AFF;
        text-decoration: none;
      }
      
      blockquote {
        border-left: 4px solid #007AFF;
        padding-left: 16px;
        margin: 16px 0;
        font-style: italic;
        color: #666;
      }
    </style>
  `;

  const injectedJavaScript = `
    // Remove ads and tracking scripts
    const adSelectors = [
      '[class*="ad"]', '[id*="ad"]', '[class*="advertisement"]', '[id*="advertisement"]',
      '[class*="sponsor"]', '[id*="sponsor"]', '[class*="promo"]', '[id*="promo"]',
      'iframe[src*="doubleclick"]', 'iframe[src*="googleads"]', 'iframe[src*="adsystem"]',
      'script[src*="analytics"]', 'script[src*="googletagmanager"]', 'script[src*="doubleclick"]',
      '.ad', '.ads', '.advertisement', '.sponsored', '.promo', '.banner',
      '#ad', '#ads', '#advertisement', '#sponsored', '#promo', '#banner',
      'aside', '.sidebar-ad', '.ad-container', '.ad-wrapper'
    ];
    
    adSelectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(el => el.remove());
    });
    
    // Remove tracking scripts
    document.querySelectorAll('script').forEach(script => {
      if (script.src && (
        script.src.includes('analytics') ||
        script.src.includes('doubleclick') ||
        script.src.includes('googleads') ||
        script.src.includes('adsystem')
      )) {
        script.remove();
      }
    });
    
    true;
  `;

  if (showWebView) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.webViewHeader}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setShowWebView(false)}
          >
            <Ionicons name="arrow-back" size={24} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.webViewTitle} numberOfLines={1}>
            {article.title}
          </Text>
          <TouchableOpacity style={styles.headerButton} onPress={handleShare}>
            <Ionicons name="share-outline" size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>
        
        <WebView
          source={{ uri: article.url }}
          style={styles.webView}
          injectedJavaScript={injectedJavaScript}
          onMessage={() => {}}
          javaScriptEnabled={true}
          domStorageEnabled={false}
          thirdPartyCookiesEnabled={false}
          allowsInlineMediaPlayback={true}
          mediaPlaybackRequiresUserAction={false}
          startInLoadingState={true}
          scalesPageToFit={true}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerButton} onPress={handleToggleWebView}>
            <Ionicons name="globe-outline" size={24} color="#007AFF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton} onPress={handleShare}>
            <Ionicons name="share-outline" size={24} color="#007AFF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton} onPress={handleOpenInBrowser}>
            <Ionicons name="open-outline" size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.articleHeader}>
          <Text style={styles.feedTitle}>{article.feedTitle}</Text>
          <Text style={styles.publishDate}>{formatDate(article.publishedDate)}</Text>
        </View>

        <Text style={styles.title}>{article.title}</Text>

        {article.authors && article.authors.length > 0 && (
          <Text style={styles.author}>
            By {article.authors.map(author => author.name || author).join(', ')}
          </Text>
        )}

        {article.imageUrl && (
          <Image
            source={{ uri: article.imageUrl }}
            style={styles.heroImage}
            resizeMode="cover"
          />
        )}

        {article.description && (
          <Text style={styles.description}>{article.description}</Text>
        )}

        {article.content && article.content !== article.description && (
          <Text style={styles.content}>{article.content}</Text>
        )}

        {article.categories && article.categories.length > 0 && (
          <View style={styles.categoriesContainer}>
            <Text style={styles.categoriesLabel}>Categories:</Text>
            <View style={styles.categories}>
              {article.categories.map((category, index) => (
                <View key={index} style={styles.categoryTag}>
                  <Text style={styles.categoryText}>
                    {category.name || category}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.footer}>
          <TouchableOpacity style={styles.readOriginalButton} onPress={handleOpenInBrowser}>
            <Ionicons name="open-outline" size={16} color="#007AFF" />
            <Text style={styles.readOriginalText}>Read Original Article</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerButton: {
    padding: 8,
  },
  headerActions: {
    flexDirection: 'row',
  },
  webViewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  webViewTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginHorizontal: 16,
  },
  webView: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  articleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  feedTitle: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  publishDate: {
    fontSize: 12,
    color: '#666',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#222',
    lineHeight: 32,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  author: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  heroImage: {
    width: '100%',
    height: 200,
    marginVertical: 16,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
    paddingHorizontal: 16,
    marginBottom: 16,
    textAlign: 'justify',
  },
  content: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
    paddingHorizontal: 16,
    marginBottom: 24,
    textAlign: 'justify',
  },
  categoriesContainer: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  categoriesLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  categories: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  categoryTag: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  categoryText: {
    fontSize: 12,
    color: '#666',
  },
  footer: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  readOriginalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  readOriginalText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
    marginLeft: 8,
  },
});
