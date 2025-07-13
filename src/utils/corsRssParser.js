// Alternative RSS parser for web platforms with CORS issues
import { parse } from 'react-native-rss-parser';

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
          imageUrl: item.imageUrl || item.image?.url || null,
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
