import { NativeModules, Platform } from 'react-native';

const { WidgetBridge } = NativeModules;

/**
 * Update the Android home screen widget with latest articles.
 * @param {Array} articles - Array of article objects from FeedContext
 * @param {Array} feeds - Array of feed objects to get feed names
 */
export function updateWidget(articles, feeds) {
  if (Platform.OS !== 'android' || !WidgetBridge) return;

  try {
    // Build a feed id-to-name map for quick lookup
    const feedMap = {};
    feeds.forEach(f => {
      feedMap[f.id || f.url] = f.title || f.name || 'Unknown Feed';
    });

    // Sort by publish date (newest first) and take top 20
    const sorted = [...articles]
      .sort((a, b) => new Date(b.pubDate || b.publishedDate || 0) - new Date(a.pubDate || a.publishedDate || 0))
      .slice(0, 20);

    const widgetArticles = sorted.map(article => ({
      title: article.title || 'Untitled',
      feedName: feedMap[article.feedId] || article.feedTitle || '',
      pubDate: article.pubDate || article.publishedDate || '',
      link: article.link || article.url || '',
    }));

    WidgetBridge.updateArticles(JSON.stringify(widgetArticles));
  } catch (error) {
    console.error('Error updating widget:', error);
  }
}
