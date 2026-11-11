import { extractArticleContent, cleanHtmlContent } from './rssParser';

/**
 * The article with its text kept for reading offline: the page is fetched and
 * its article text extracted. When that fails the article keeps what the feed
 * gave, and offlineCached says which of the two it is.
 */
export async function withOfflineContent(article) {
  const fallback = () => ({
    ...article,
    offlineContent: article.content || article.description || '',
    offlineCached: false,
    cachedAt: new Date().toISOString(),
  });
  if (!article.url) {
    return { ...fallback(), offlineCached: true };
  }
  try {
    const response = await fetch(article.url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const html = await response.text();
    const fullContent = extractArticleContent(html);
    const cleanedContent = cleanHtmlContent(fullContent);
    return {
      ...article,
      offlineContent: cleanedContent || article.content || article.description || '',
      offlineHtmlContent: fullContent || article.htmlContent || '',
      offlineCached: true,
      cachedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.log('Failed to fetch full content, saving article as-is:', error.message);
    return fallback();
  }
}

// What withOfflineContent adds, to merge into an article saved before it finished
export const offlineFields = (article) => ({
  offlineContent: article.offlineContent,
  offlineHtmlContent: article.offlineHtmlContent,
  offlineCached: article.offlineCached,
  cachedAt: article.cachedAt,
});
