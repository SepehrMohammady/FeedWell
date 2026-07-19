// Alternative RSS parser for web platforms with CORS issues
// v1.8.1: image extraction is shared with rssParser.js so both parsers
// resolve preview images identically (media:*, enclosure, itunes:image,
// <img> in content/description with lazy-load/srcset/entity-decode support).
import { parse } from 'react-native-rss-parser';
import {
  decodeHtmlEntities,
  extractImageUrl,
  extractMediaUrlsFromXml,
  normalizeImageUrl,
} from './rssParser';

// Simple RSS parser that works with CORS proxies
export async function parseRSSFeedWithProxy(url) {
  const corsProxies = [
    'https://api.allorigins.me/get?url=',
    'https://cors-anywhere.herokuapp.com/',
    'https://api.codetabs.com/v1/proxy?quest=',
  ];

  for (const proxy of corsProxies) {
    try {
      let fetchUrl;
      let isJsonResponse = false;

      if (proxy.includes('allorigins.me')) {
        fetchUrl = `${proxy}${encodeURIComponent(url)}`;
        isJsonResponse = true;
      } else if (proxy.includes('codetabs.com')) {
        fetchUrl = `${proxy}${encodeURIComponent(url)}`;
      } else {
        fetchUrl = `${proxy}${url}`;
      }

      console.log('Trying proxy:', fetchUrl);
      
      const response = await fetch(fetchUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      let responseText;
      if (isJsonResponse) {
        const jsonResponse = await response.json();
        responseText = jsonResponse.contents;
      } else {
        responseText = await response.text();
      }

      if (!responseText || responseText.trim() === '') {
        throw new Error('Empty response');
      }

      // Parse the RSS
      const feed = await parse(responseText);

      // Extract media:* / enclosure / itunes / <img> URLs from the raw XML,
      // since the parser drops media-namespace elements (same as rssParser.js)
      const media = extractMediaUrlsFromXml(responseText);

      return {
        title: decodeHtmlEntities(feed.title || url),
        description: feed.description || '',
        url: url,
        articles: feed.items?.map((item, index) => {
          const rawParsedImageUrl = extractImageUrl(item);
          const parsedImageUrl = normalizeImageUrl(rawParsedImageUrl) || rawParsedImageUrl;
          const articleUrl = item.links?.[0]?.url || item.url || '';
          return {
            id: item.id || `${url}_${index}_${Date.now()}`,
            title: decodeHtmlEntities(item.title || 'No Title'),
            description: item.description || '',
            content: item.content || '',
            url: articleUrl,
            publishedDate: item.published || item.pubDate || new Date().toISOString(),
            authors: item.authors || [],
            categories: item.categories || [],
            feedUrl: url,
            feedTitle: decodeHtmlEntities(feed.title || url),
            imageUrl: parsedImageUrl || media.byUrl[articleUrl] || media.byUrl[item.id] || media.byIndex[index] || null,
          };
        }) || [],
      };
    } catch (error) {
      console.error(`Proxy ${proxy} failed:`, error.message);
      continue;
    }
  }

  throw new Error('All CORS proxies failed. This feed may not be accessible from the web browser.');
}
