// Debug utility to inspect RSS feed structure
export function debugRSSFeed(feedData, feedUrl) {
  console.log('=== RSS FEED DEBUG ===');
  console.log('Feed URL:', feedUrl);
  console.log('Feed Title:', feedData.title);
  console.log('Total Articles:', feedData.articles?.length || 0);
  
  if (feedData.articles && feedData.articles.length > 0) {
    console.log('\n=== FIRST ARTICLE STRUCTURE ===');
    const firstArticle = feedData.articles[0];
    console.log('Title:', firstArticle.title);
    console.log('Description length:', firstArticle.description?.length || 0);
    console.log('Content length:', firstArticle.content?.length || 0);
    console.log('Image URL:', firstArticle.imageUrl);
    
    // Log all available fields
    console.log('\n=== ALL ARTICLE FIELDS ===');
    Object.keys(firstArticle).forEach(key => {
      const value = firstArticle[key];
      if (typeof value === 'string') {
        console.log(`${key}: ${value.substring(0, 100)}${value.length > 100 ? '...' : ''}`);
      } else if (value && typeof value === 'object') {
        console.log(`${key}:`, value);
      } else {
        console.log(`${key}:`, value);
      }
    });
    
    // Check for images in first few articles
    console.log('\n=== IMAGE STATUS FOR FIRST 3 ARTICLES ===');
    feedData.articles.slice(0, 3).forEach((article, index) => {
      console.log(`Article ${index + 1}: "${article.title}"`);
      console.log(`  - Image URL: ${article.imageUrl || 'NONE'}`);
      
      // Check for potential image fields
      const imageFields = ['imageUrl', 'image', 'thumbnail', 'media:content', 'media:thumbnail', 'enclosures'];
      imageFields.forEach(field => {
        if (article[field]) {
          console.log(`  - ${field}:`, article[field]);
        }
      });
      
      // Check content for images
      if (article.content || article.description) {
        const content = article.content || article.description;
        const imgMatch = content.match(/<img[^>]+src=['"]([^'"]+)['"][^>]*>/i);
        if (imgMatch) {
          console.log(`  - IMG tag found: ${imgMatch[1]}`);
        } else {
          console.log(`  - No IMG tag in content`);
        }
      }
      console.log('');
    });
  }
  
  console.log('=== END RSS FEED DEBUG ===\n');
}
