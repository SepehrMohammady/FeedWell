// Utility to clear demo content from storage
import AsyncStorage from '@react-native-async-storage/async-storage';

export async function clearDemoContent() {
  try {
    // Get existing feeds and articles
    const feedsData = await AsyncStorage.getItem('feeds');
    const articlesData = await AsyncStorage.getItem('articles');
    
    if (feedsData) {
      const feeds = JSON.parse(feedsData);
      // Remove any feeds that might be demo content
      const cleanFeeds = feeds.filter(feed => 
        !feed.title.includes('Demo') && 
        !feed.title.includes('Sample') && 
        !feed.url.includes('example.com') &&
        !feed.url.includes('demo-feed')
      );
      
      await AsyncStorage.setItem('feeds', JSON.stringify(cleanFeeds));
      console.log('Cleaned demo feeds:', feeds.length - cleanFeeds.length);
    }
    
    if (articlesData) {
      const articles = JSON.parse(articlesData);
      // Remove any articles from demo feeds
      const cleanArticles = articles.filter(article => 
        !article.feedTitle.includes('Demo') && 
        !article.feedTitle.includes('Sample') && 
        !article.feedUrl.includes('example.com') &&
        !article.feedUrl.includes('demo-feed')
      );
      
      await AsyncStorage.setItem('articles', JSON.stringify(cleanArticles));
      console.log('Cleaned demo articles:', articles.length - cleanArticles.length);
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error clearing demo content:', error);
    return { success: false, error };
  }
}
