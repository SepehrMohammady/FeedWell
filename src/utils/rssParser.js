import { parse } from 'react-native-rss-parser';

// Ad domains and patterns to block
const AD_DOMAINS = [
  'googleads.g.doubleclick.net',
  'googlesyndication.com',
  'amazon-adsystem.com',
  'adsystem.amazon.com',
  'facebook.com/tr',
  'google-analytics.com',
  'googletagmanager.com',
  'outbrain.com',
  'taboola.com',
  'stumbleupon.com',
  'addthis.com',
  'sharethis.com',
  'disqus.com',
  'scorecardresearch.com',
  'quantserve.com',
  'adsystem.net',
  'adsystem.com',
  'ads.yahoo.com',
  'advertising.com',
  'adsystem.microsoft.com'
];

const AD_PATTERNS = [
  /advertisement/gi,
  /sponsored/gi,
  /promo/gi,
  /ad-/gi,
  /-ad/gi,
  /banner/gi,
  /popup/gi,
  /tracking/gi,
  /analytics/gi,
  /adsense/gi,
  /doubleclick/gi,
  /googleadservices/gi
];

// Decode HTML entities
export function decodeHtmlEntities(text) {
  if (!text) return '';
  
  const entityMap = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&#8217;': "'",
    '&#8216;': "'",
    '&#8220;': '"',
    '&#8221;': '"',
    '&#8211;': '–',
    '&#8212;': '—',
    '&#8230;': '…',
    '&nbsp;': ' ',
    '&copy;': '©',
    '&reg;': '®',
    '&trade;': '™',
    '&ldquo;': '"',
    '&rdquo;': '"',
    '&lsquo;': "'",
    '&rsquo;': "'",
    '&ndash;': '–',
    '&mdash;': '—',
    '&hellip;': '…'
  };

  return text.replace(/&[a-zA-Z0-9#]+;/g, (entity) => {
    return entityMap[entity] || entity;
  });
}

// Clean HTML content by removing ads and unnecessary elements
export function cleanHtmlContent(html) {
  if (!html) return '';

  let cleanedHtml = html;

  // Remove script tags
  cleanedHtml = cleanedHtml.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // Remove iframe with ad domains (be more specific)
  AD_DOMAINS.forEach(domain => {
    const iframeRegex = new RegExp(`<iframe[^>]*${domain}[^>]*>.*?</iframe>`, 'gi');
    cleanedHtml = cleanedHtml.replace(iframeRegex, '');
  });

  // Only remove elements with very specific ad-related class names or IDs
  const specificAdPatterns = [
    /advertisement/gi,
    /sponsored/gi,
    /promo/gi,
    /doubleclick/gi,
    /googlead/gi,
  ];
  
  specificAdPatterns.forEach(pattern => {
    const elementRegex = new RegExp(`<[^>]*(?:class|id)=['""][^'"]*${pattern.source}[^'"]*['"][^>]*>.*?</[^>]+>`, 'gi');
    cleanedHtml = cleanedHtml.replace(elementRegex, '');
  });

  // Remove specific ad elements but be more conservative
  cleanedHtml = cleanedHtml.replace(/<div[^>]*class=['""].*?(advertisement|sponsored|googlead).*?['"][^>]*>.*?<\/div>/gi, '');
  cleanedHtml = cleanedHtml.replace(/<div[^>]*id=['""].*?(advertisement|sponsored|googlead).*?['"][^>]*>.*?<\/div>/gi, '');

  // Clean up empty paragraphs and divs
  cleanedHtml = cleanedHtml.replace(/<p>\s*<\/p>/gi, '');
  cleanedHtml = cleanedHtml.replace(/<div>\s*<\/div>/gi, '');

  return cleanedHtml.trim();
}

// Extract clean text from HTML
export function extractCleanText(html) {
  if (!html) return '';

  let text = cleanHtmlContent(html);
  
  // Remove all HTML tags but keep line breaks
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/p>/gi, '\n\n');
  text = text.replace(/<[^>]+>/g, '');
  
  // Decode HTML entities
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  text = text.replace(/&nbsp;/g, ' ');
  
  // Clean up multiple spaces and newlines
  text = text.replace(/\s+/g, ' ');
  text = text.replace(/\n\s*\n/g, '\n\n');
  
  return text.trim();
}

// Parse RSS feed and clean articles
export async function parseRSSFeed(url) {
  try {
    let fetchUrl = url;
    
    // For web platform, use multiple CORS proxies to avoid CORS issues
    if (typeof window !== 'undefined' && window.location) {
      const corsProxies = [
        'https://api.allorigins.me/get?url=',
        'https://corsproxy.io/?',
        'https://api.codetabs.com/v1/proxy?quest=',
        'https://thingproxy.freeboard.io/fetch/',
      ];
      
      for (const proxy of corsProxies) {
        try {
          let proxyUrl;
          let isJsonResponse = false;
          
          if (proxy.includes('allorigins.me')) {
            proxyUrl = `${proxy}${encodeURIComponent(url)}`;
            isJsonResponse = true;
          } else {
            proxyUrl = `${proxy}${encodeURIComponent(url)}`;
          }
          
          console.log('Trying CORS proxy:', proxy.replace(/\?.*$/, ''), 'for:', url);
          
          const response = await fetch(proxyUrl);
          
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
          
          // Successfully got content, parse it
          const feed = await parse(responseText);
          
          // Process and clean articles
          const cleanedArticles = feed.items.map((item, index) => {
            const cleanDescription = cleanHtmlContent(item.description || '');
            const cleanContent = cleanHtmlContent(item.content || '');
            
            return {
              id: item.id || `${url}_${index}_${Date.now()}`,
              title: decodeHtmlEntities(item.title || 'No Title'),
              description: extractCleanText(cleanDescription),
              content: extractCleanText(cleanContent),
              htmlContent: cleanDescription || cleanContent,
              url: item.links?.[0]?.url || item.url || '',
              publishedDate: item.published || item.pubDate || new Date().toISOString(),
              authors: item.authors || [],
              categories: item.categories || [],
              feedUrl: url,
              feedTitle: decodeHtmlEntities(feed.title || url),
              imageUrl: extractImageUrl(item),
            };
          });

          return {
            title: decodeHtmlEntities(feed.title || url),
            description: feed.description || '',
            url: url,
            articles: cleanedArticles,
          };
        } catch (error) {
          console.warn(`CORS proxy ${proxy.replace(/\?.*$/, '')} failed:`, error.message);
          continue; // Try next proxy
        }
      }
      
      throw new Error('All CORS proxies failed. This feed may not be accessible from web browsers due to CORS restrictions.');
    }
    
    // Direct fetch for mobile/native platforms
    const response = await fetch(fetchUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch feed: ${response.status} - ${response.statusText}`);
    }
    
    const responseText = await response.text();
    
    if (!responseText || responseText.trim() === '') {
      throw new Error('Empty response from feed URL');
    }
    
    const feed = await parse(responseText);
    
    // Process and clean articles
    const cleanedArticles = feed.items.map((item, index) => {
      const cleanDescription = cleanHtmlContent(item.description || '');
      const cleanContent = cleanHtmlContent(item.content || '');
      
      return {
        id: item.id || `${url}_${index}_${Date.now()}`,
        title: decodeHtmlEntities(item.title || 'No Title'),
        description: extractCleanText(cleanDescription),
        content: extractCleanText(cleanContent),
        htmlContent: cleanDescription || cleanContent,
        url: item.links?.[0]?.url || item.url || '',
        publishedDate: item.published || item.pubDate || new Date().toISOString(),
        authors: item.authors || [],
        categories: item.categories || [],
        feedUrl: url,
        feedTitle: decodeHtmlEntities(feed.title || url),
        imageUrl: extractImageUrl(item),
      };
    });

    return {
      title: decodeHtmlEntities(feed.title || url),
      description: feed.description || '',
      url: url,
      articles: cleanedArticles,
    };
  } catch (error) {
    console.error('Error parsing RSS feed:', error);
    throw error;
  }
}

// Extract image URL from item
function extractImageUrl(item) {
  console.log('Extracting image for article:', item.title);
  
  // Try different fields where images might be stored
  if (item.imageUrl) {
    console.log('Found imageUrl:', item.imageUrl);
    return item.imageUrl;
  }
  
  if (item.image?.url) {
    console.log('Found image.url:', item.image.url);
    return item.image.url;
  }
  
  // Check for media:content or media:thumbnail (common in RSS feeds)
  if (item['media:content']?.[0]?.attributes?.url) {
    const mediaContent = item['media:content'][0].attributes;
    if (mediaContent.medium === 'image' || mediaContent.type?.startsWith('image/')) {
      console.log('Found media:content:', mediaContent.url);
      return mediaContent.url;
    }
  }
  
  if (item['media:thumbnail']?.[0]?.attributes?.url) {
    console.log('Found media:thumbnail:', item['media:thumbnail'][0].attributes.url);
    return item['media:thumbnail'][0].attributes.url;
  }
  
  // Check for iTunes/podcast images
  if (item['itunes:image']?.attributes?.href) {
    console.log('Found itunes:image:', item['itunes:image'].attributes.href);
    return item['itunes:image'].attributes.href;
  }
  
  // Check enclosures for images
  if (item.enclosures?.length > 0) {
    for (const enclosure of item.enclosures) {
      if (enclosure.type?.startsWith('image/') && enclosure.url) {
        console.log('Found enclosure image:', enclosure.url);
        return enclosure.url;
      }
    }
  }
  
  // Extract from content/description - try multiple patterns
  const content = item.content || item.description || '';
  
  if (content) {
    // Look for img tags with various patterns
    const imgPatterns = [
      /<img[^>]+src=['"]([^'"]+)['"][^>]*>/i,
      /<img[^>]+data-src=['"]([^'"]+)['"][^>]*>/i, // lazy loading
      /<img[^>]+data-original=['"]([^'"]+)['"][^>]*>/i, // lazy loading
      /<img[^>]+data-lazy-src=['"]([^'"]+)['"][^>]*>/i, // lazy loading
      /<figure[^>]*>.*?<img[^>]+src=['"]([^'"]+)['"][^>]*>.*?<\/figure>/is,
    ];
    
    for (const pattern of imgPatterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        const url = match[1];
        console.log('Found img tag:', url);
        if (!isAdOrTrackingImage(url)) {
          return url;
        } else {
          console.log('Rejected ad/tracking image:', url);
        }
      }
    }
    
    // Look for Open Graph images in content
    const ogImageMatch = content.match(/<meta[^>]+property=['"]og:image['"][^>]+content=['"]([^'"]+)['"][^>]*>/i);
    if (ogImageMatch) {
      console.log('Found og:image:', ogImageMatch[1]);
      return ogImageMatch[1];
    }
    
    // Look for WordPress featured images
    const wpFeaturedMatch = content.match(/wp:featured_media.*?href=['"]([^'"]+)['"][^>]*>/i);
    if (wpFeaturedMatch) {
      console.log('Found wp:featured_media:', wpFeaturedMatch[1]);
      return wpFeaturedMatch[1];
    }
    
    // Look for any URL that ends with image extensions
    const imageUrlMatch = content.match(/(https?:\/\/[^\s<>"']+\.(?:jpg|jpeg|png|gif|webp|svg))/i);
    if (imageUrlMatch) {
      const url = imageUrlMatch[1];
      console.log('Found image URL by extension:', url);
      if (!isAdOrTrackingImage(url)) {
        return url;
      }
    }
  }
  
  // Check if item has other image-related fields
  const otherImageFields = ['thumbnail', 'thumb', 'featured_image', 'image_url', 'img'];
  for (const field of otherImageFields) {
    if (item[field]) {
      const value = typeof item[field] === 'string' ? item[field] : item[field].url || item[field].href;
      if (value) {
        console.log(`Found ${field}:`, value);
        return value;
      }
    }
  }
  
  console.log('No image found for article:', item.title);
  return null;
}

// Check if an image URL is likely an ad or tracking pixel
function isAdOrTrackingImage(url) {
  if (!url) return true;
  
  // Very specific ad patterns - be conservative to avoid removing content images
  const adPatterns = [
    /\/ads?\//i,
    /\/tracking\//i,
    /\/analytics\//i,
    /\/pixel\//i,
    /1x1\.(gif|png|jpg)/i, // Only 1x1 tracking pixels
    /doubleclick/i,
    /googleads/i,
    /adsystem/i,
    /facebook\.com\/tr/i,
    /twitter\.com\/i\/adsct/i,
    /\/wp-content\/plugins\/.*\/(images|img)\//i, // Only plugin images folder
    /gravatar\.com/i,
    /avatar\.(gif|png|jpg)/i, // Only avatar image files
  ];
  
  // Check for very small images (likely tracking pixels)
  const sizeMatch = url.match(/(\d+)x(\d+)/);
  if (sizeMatch) {
    const width = parseInt(sizeMatch[1]);
    const height = parseInt(sizeMatch[2]);
    if (width <= 2 && height <= 2) {
      return true; // Tracking pixel
    }
  }
  
  // Allow images that are clearly content-related
  const contentPatterns = [
    /wp-content\/uploads/i,
    /media\//i,
    /images\//i,
    /img\//i,
    /assets\//i,
    /static\//i,
    /content\//i,
    /article/i,
    /post/i,
    /news/i,
    /feature/i,
    /gallery/i,
    /photo/i,
    /picture/i,
  ];
  
  // If it matches content patterns, it's likely a content image
  if (contentPatterns.some(pattern => pattern.test(url))) {
    return false; // Likely content image
  }
  
  return adPatterns.some(pattern => pattern.test(url));
}

// Validate RSS URL
export function isValidRSSUrl(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}
