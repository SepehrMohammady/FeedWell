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
  /googleadservices/gi,
  /hero-ad-container/gi,
  /ad-unit/gi,
  /google_ads_iframe/gi,
  /safeframe\.googlesyndication/gi,
  /wp-block-tc-ads/gi,
  /tc-ads/gi,
  /us-tc-ros/gi,
  /data-unitcode/gi,
  /data-test.*ad/gi
];

// Clean HTML content by removing ads and unnecessary elements
export function cleanHtmlContent(html) {
  if (!html) return '';

  let cleanedHtml = html;

  // Remove script tags
  cleanedHtml = cleanedHtml.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // Remove iframe with ad domains
  AD_DOMAINS.forEach(domain => {
    const iframeRegex = new RegExp(`<iframe[^>]*${domain}[^>]*>.*?</iframe>`, 'gi');
    cleanedHtml = cleanedHtml.replace(iframeRegex, '');
  });

  // Remove elements with ad-related class names or IDs
  AD_PATTERNS.forEach(pattern => {
    const elementRegex = new RegExp(`<[^>]*(?:class|id)=['""][^'"]*${pattern.source}[^'"]*['"][^>]*>.*?</[^>]+>`, 'gi');
    cleanedHtml = cleanedHtml.replace(elementRegex, '');
  });

  // Remove specific ad elements and TechCrunch ad patterns
  cleanedHtml = cleanedHtml.replace(/<div[^>]*class=['""].*?(ad|advertisement|sponsored|promo).*?['"][^>]*>.*?<\/div>/gi, '');
  cleanedHtml = cleanedHtml.replace(/<aside[^>]*>.*?<\/aside>/gi, '');
  cleanedHtml = cleanedHtml.replace(/<div[^>]*id=['""].*?(ad|advertisement|sponsored|promo).*?['"][^>]*>.*?<\/div>/gi, '');
  
  // Specific TechCrunch ad patterns
  cleanedHtml = cleanedHtml.replace(/<div[^>]*class=['""].*?hero-ad-container.*?['"][^>]*>.*?<\/div>/gi, '');
  cleanedHtml = cleanedHtml.replace(/<div[^>]*class=['""].*?ad-unit.*?['"][^>]*>.*?<\/div>/gi, '');
  cleanedHtml = cleanedHtml.replace(/<div[^>]*class=['""].*?wp-block-tc-ads.*?['"][^>]*>.*?<\/div>/gi, '');
  cleanedHtml = cleanedHtml.replace(/<div[^>]*id=['""].*?google_ads_iframe.*?['"][^>]*>.*?<\/div>/gi, '');
  cleanedHtml = cleanedHtml.replace(/<iframe[^>]*src=['""].*?safeframe\.googlesyndication.*?['"][^>]*>.*?<\/iframe>/gi, '');
  cleanedHtml = cleanedHtml.replace(/<div[^>]*data-unitcode=['""].*?us_tc_ros.*?['"][^>]*>.*?<\/div>/gi, '');
  cleanedHtml = cleanedHtml.replace(/<div[^>]*data-test=['""].*?ad.*?['"][^>]*>.*?<\/div>/gi, '');

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
    
    // For web platform, use CORS proxy to avoid CORS issues
    if (typeof window !== 'undefined' && window.location) {
      // Use allorigins.me as a CORS proxy for web
      fetchUrl = `https://api.allorigins.me/get?url=${encodeURIComponent(url)}`;
    }
    
    const response = await fetch(fetchUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch feed: ${response.status} - ${response.statusText}`);
    }
    
    let responseText;
    if (typeof window !== 'undefined' && window.location && fetchUrl.includes('allorigins.me')) {
      // If using CORS proxy, extract the contents
      const jsonResponse = await response.json();
      responseText = jsonResponse.contents;
    } else {
      responseText = await response.text();
    }
    
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
        title: item.title || 'No Title',
        description: extractCleanText(cleanDescription),
        content: extractCleanText(cleanContent),
        htmlContent: cleanDescription || cleanContent,
        url: item.links?.[0]?.url || item.url || '',
        publishedDate: item.published || item.pubDate || new Date().toISOString(),
        authors: item.authors || [],
        categories: item.categories || [],
        feedUrl: url,
        feedTitle: feed.title || url,
        imageUrl: extractImageUrl(item),
      };
    });

    return {
      title: feed.title || url,
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
  // Try different fields where images might be stored
  if (item.imageUrl) return item.imageUrl;
  if (item.image?.url) return item.image.url;
  if (item.enclosures?.[0]?.url && item.enclosures[0].type?.startsWith('image/')) {
    return item.enclosures[0].url;
  }
  
  // Extract from content/description
  const content = item.content || item.description || '';
  const imgMatch = content.match(/<img[^>]+src=['"]([^'"]+)['"][^>]*>/i);
  if (imgMatch) {
    return imgMatch[1];
  }
  
  return null;
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
