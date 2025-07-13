// Test script to debug feed removal
import AsyncStorage from '@react-native-async-storage/async-storage';

export const testFeedRemoval = async () => {
  console.log('=== Testing Feed Removal ===');
  
  try {
    // Check current feeds
    const feedsStr = await AsyncStorage.getItem('feeds');
    const feeds = feedsStr ? JSON.parse(feedsStr) : [];
    console.log('Current feeds:', feeds);
    
    if (feeds.length > 0) {
      const feedToRemove = feeds[0];
      console.log('Attempting to remove feed:', feedToRemove);
      
      // Filter out the feed
      const updatedFeeds = feeds.filter(feed => feed.url !== feedToRemove.url);
      console.log('Updated feeds:', updatedFeeds);
      
      // Save back to storage
      await AsyncStorage.setItem('feeds', JSON.stringify(updatedFeeds));
      console.log('Feed removal test completed');
      
      // Verify it was removed
      const verifyStr = await AsyncStorage.getItem('feeds');
      const verifyFeeds = verifyStr ? JSON.parse(verifyStr) : [];
      console.log('Verification - feeds after removal:', verifyFeeds);
      
      alert(`Feed removal test completed. Removed: ${feedToRemove.title}`);
    } else {
      console.log('No feeds to remove');
      alert('No feeds to remove. Please add a feed first.');
    }
  } catch (error) {
    console.error('Error during feed removal test:', error);
    alert('Error during feed removal test: ' + error.message);
  }
};

// Test data consistency
export const testDataConsistency = async () => {
  console.log('=== Testing Data Consistency ===');
  
  try {
    const feedsStr = await AsyncStorage.getItem('feeds');
    const feeds = feedsStr ? JSON.parse(feedsStr) : [];
    
    console.log('Total feeds:', feeds.length);
    feeds.forEach((feed, index) => {
      console.log(`Feed ${index}:`, {
        id: feed.id,
        title: feed.title,
        url: feed.url,
        addedAt: feed.addedAt
      });
    });
    
    alert(`Data consistency check completed. Found ${feeds.length} feeds. Check console for details.`);
  } catch (error) {
    console.error('Error during data consistency check:', error);
    alert('Error during data consistency check: ' + error.message);
  }
};

// Add a demo feed for testing
export const addDemoFeed = async () => {
  console.log('=== Adding Demo Feed ===');
  
  try {
    const feedsStr = await AsyncStorage.getItem('feeds');
    const feeds = feedsStr ? JSON.parse(feedsStr) : [];
    
    const demoFeed = {
      id: Date.now().toString(),
      url: 'https://example.com/demo-feed',
      title: 'Demo Feed for Testing',
      addedAt: new Date().toISOString(),
    };
    
    const updatedFeeds = [...feeds, demoFeed];
    await AsyncStorage.setItem('feeds', JSON.stringify(updatedFeeds));
    
    console.log('Demo feed added:', demoFeed);
    alert('Demo feed added successfully!');
  } catch (error) {
    console.error('Error adding demo feed:', error);
    alert('Error adding demo feed: ' + error.message);
  }
};
