import { NativeModules, Platform } from 'react-native';
import { tStatic } from '../i18n';
import { digitsOf } from './digits';

const { WidgetBridge } = NativeModules;

/**
 * The words and digits the widget writes its dates with, in the app's language:
 * the app's own "just now", "{count}h ago" and "{count}d ago", so the widget
 * says what the article list says. Older dates the widget writes itself, in the
 * language (Farsi in the Persian calendar, as the app does).
 */
export function updateWidgetLanguage(language) {
  if (Platform.OS !== 'android' || !WidgetBridge || !WidgetBridge.setWidgetLanguage) return;
  try {
    WidgetBridge.setWidgetLanguage(JSON.stringify({
      language,
      digits: digitsOf(language),
      justNow: tStatic('date.justNow', language),
      hoursAgo: tStatic('date.hoursAgo', language),
      daysAgo: tStatic('date.daysAgo', language),
    }));
  } catch (error) {
    console.error('Error updating the widget language:', error);
  }
}

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
      description: article.description || '',
      imageUrl: article.imageUrl || '',
    }));

    WidgetBridge.updateArticles(JSON.stringify(widgetArticles));
  } catch (error) {
    console.error('Error updating widget:', error);
  }
}
