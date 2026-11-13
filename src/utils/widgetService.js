import { NativeModules, Platform } from 'react-native';
import { tStatic } from '../i18n';
import { digitsOf } from './digits';

const { WidgetBridge } = NativeModules;

// Seconds per article in the widget's slideshow; the widget has a layout for each
export const WIDGET_SLIDE_SECONDS = [5, 10, 20, 30];
export const DEFAULT_WIDGET_SLIDE_SECONDS = 10;

const EMPTY_KEYS = {
  all: ['widget.emptyTitle', 'widget.emptyBody'],
  unread: ['widget.emptyUnreadTitle', 'widget.emptyUnreadBody'],
  saved: ['widget.emptySavedTitle', 'widget.emptySavedBody'],
};

/**
 * The words and digits the widget writes with, in the app's language: the
 * app's own "just now", "{count}h ago" and "{count}d ago", so the widget says
 * what the article list says (older dates the widget writes itself, Farsi in
 * the Iranian calendar as the app does); the names of its buttons, for
 * TalkBack; and what it says when there is nothing to show, for the articles
 * it is set to show.
 */
export function updateWidgetLanguage(language, source = 'all') {
  if (Platform.OS !== 'android' || !WidgetBridge || !WidgetBridge.setWidgetLanguage) return;
  const [emptyTitle, emptyBody] = EMPTY_KEYS[source] || EMPTY_KEYS.all;
  try {
    WidgetBridge.setWidgetLanguage(JSON.stringify({
      language,
      digits: digitsOf(language),
      justNow: tStatic('date.justNow', language),
      hoursAgo: tStatic('date.hoursAgo', language),
      daysAgo: tStatic('date.daysAgo', language),
      previous: tStatic('widget.previous', language),
      next: tStatic('widget.next', language),
      play: tStatic('widget.play', language),
      pause: tStatic('widget.pause', language),
      refresh: tStatic('widget.refresh', language),
      emptyTitle: tStatic(emptyTitle, language),
      emptyBody: tStatic(emptyBody, language),
    }));
  } catch (error) {
    console.error('Error updating the widget language:', error);
  }
}

const timeOf = (article) => {
  const time = new Date(article.pubDate || article.publishedDate || 0).getTime();
  return Number.isNaN(time) ? 0 : time;
};

/**
 * The articles the widget shows, newest first: every article, the unread ones
 * or the saved ones, from one feed when one is picked. Hidden feeds stay out,
 * as they do in the Feeds list, unless the hidden feed is the one picked.
 */
export function widgetArticles({ articles = [], savedArticles = [], feeds = [], source = 'all', feedUrl = null }) {
  const picked = feedUrl && feeds.some((feed) => feed.url === feedUrl) ? feedUrl : null;
  let list;
  if (source === 'saved') {
    list = picked ? savedArticles.filter((article) => article.feedUrl === picked) : savedArticles;
  } else {
    const hidden = new Set(feeds.filter((feed) => feed.isHidden).map((feed) => feed.url));
    list = picked
      ? articles.filter((article) => article.feedUrl === picked)
      : articles.filter((article) => !hidden.has(article.feedUrl));
    if (source === 'unread') list = list.filter((article) => !article.isRead);
  }
  return [...list].sort((a, b) => timeOf(b) - timeOf(a)).slice(0, 20);
}

/**
 * Hands the Android home screen widget its articles.
 * @param {Array} articles - the articles to show, newest first (widgetArticles)
 * @param {Array} feeds - the feeds, for the feed names
 */
export function updateWidget(articles, feeds) {
  if (Platform.OS !== 'android' || !WidgetBridge) return;

  try {
    // Build a feed id-to-name map for quick lookup
    const feedMap = {};
    feeds.forEach(f => {
      feedMap[f.id || f.url] = f.title || f.name || 'Unknown Feed';
    });

    const widgetList = articles.map(article => ({
      title: article.title || 'Untitled',
      feedName: feedMap[article.feedId] || article.feedTitle || '',
      pubDate: article.pubDate || article.publishedDate || '',
      link: article.link || article.url || '',
      description: article.description || '',
      imageUrl: article.imageUrl || '',
    }));

    WidgetBridge.updateArticles(JSON.stringify(widgetList));
  } catch (error) {
    console.error('Error updating widget:', error);
  }
}

/** Seconds per article in the widget's slideshow */
export function setWidgetSlideSeconds(seconds) {
  if (Platform.OS !== 'android' || !WidgetBridge?.setWidgetSlideSeconds) return;
  try { WidgetBridge.setWidgetSlideSeconds(seconds); } catch (e) { /* no widget support */ }
}

/** What a tall widget shows: 'list' or 'article' */
export function setWidgetTallLayout(layout) {
  if (Platform.OS !== 'android' || !WidgetBridge?.setWidgetTallLayout) return;
  try { WidgetBridge.setWidgetTallLayout(layout); } catch (e) { /* no widget support */ }
}
