// Alternative RSS parser for web platforms with CORS issues
import { parse } from 'react-native-rss-parser';

// Extract image URL from item (same as in rssParser.js)
function extractImageUrl(item) {
  // Try different fields where images might be stored
  if (item.imageUrl) return item.imageUrl;
  if (item.image?.url) return item.image.url;
  
  // Check for media:content or media:thumbnail (common in RSS feeds)
  if (item['media:content']?.[0]?.attributes?.url) {
    const mediaContent = item['media:content'][0].attributes;
    if (mediaContent.medium === 'image' || mediaContent.type?.startsWith('image/')) {
      return mediaContent.url;
    }
  }
  
  if (item['media:thumbnail']?.[0]?.attributes?.url) {
    return item['media:thumbnail'][0].attributes.url;
  }
  
  // Check enclosures for images
  if (item.enclosures?.[0]?.url && item.enclosures[0].type?.startsWith('image/')) {
    return item.enclosures[0].url;
  }
  
  // Extract from content/description - try multiple patterns
  const content = item.content || item.description || '';
  
  // Look for img tags with various patterns
  const imgPatterns = [
    /<img[^>]+src=['"]([^'"]+)['"][^>]*>/i,
    /<img[^>]+data-src=['"]([^'"]+)['"][^>]*>/i, // lazy loading
    /<img[^>]+data-original=['"]([^'"]+)['"][^>]*>/i, // lazy loading
  ];
  
  for (const pattern of imgPatterns) {
    const match = content.match(pattern);
    if (match && match[1]) {
      // Filter out common non-article images
      const url = match[1];
      if (!isAdOrTrackingImage(url)) {
        return url;
      }
    }
  }
  
  return null;
}

// Check if an image URL is likely an ad or tracking pixel
function isAdOrTrackingImage(url) {
  const adPatterns = [
    /\/ads?\//i,
    /\/tracking\//i,
    /\/analytics\//i,
    /\/pixel\//i,
    /1x1\./i,
    /\.gif$/i, // Many tracking pixels are 1x1 GIFs
    /doubleclick/i,
    /googleads/i,
    /adsystem/i,
    /facebook\.com\/tr/i,
    /twitter\.com\/i\/adsct/i,
  ];
  
  return adPatterns.some(pattern => pattern.test(url));
}

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
      
      return {
        title: feed.title || url,
        description: feed.description || '',
        url: url,
        articles: feed.items?.map((item, index) => ({
          id: item.id || `${url}_${index}_${Date.now()}`,
          title: item.title || 'No Title',
          description: item.description || '',
          content: item.content || '',
          url: item.links?.[0]?.url || item.url || '',
          publishedDate: item.published || item.pubDate || new Date().toISOString(),
          authors: item.authors || [],
          categories: item.categories || [],
          feedUrl: url,
          feedTitle: feed.title || url,
          imageUrl: extractImageUrl(item),
        })) || [],
      };
    } catch (error) {
      console.error(`Proxy ${proxy} failed:`, error.message);
      continue;
    }
  }

  throw new Error('All CORS proxies failed. This feed may not be accessible from the web browser.');
}

// Test feeds that work well without CORS issues
export const testFeeds = [
  {
    name: 'Hacker News',
    url: 'https://hnrss.org/frontpage',
    description: 'Tech news and discussions'
  },
  {
    name: 'NPR News',
    url: 'https://feeds.npr.org/1001/rss.xml',
    description: 'National Public Radio news'
  },
  {
    name: 'BBC World News',
    url: 'http://feeds.bbci.co.uk/news/world/rss.xml',
    description: 'BBC World News feed'
  },
  {
    name: 'Dev.to',
    url: 'https://dev.to/feed',
    description: 'Developer community articles'
  },
  {
    name: 'GitHub Blog',
    url: 'https://github.blog/feed/',
    description: 'GitHub official blog'
  }
];
