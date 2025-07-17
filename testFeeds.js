// Test script to debug specific RSS feeds
const { debugRSSFeed } = require('./src/utils/debugRss');

async function testProblematicFeeds() {
  console.log('Testing feeds that don\'t show images...\n');
  
  const problematicFeeds = [
    { name: 'TechCrunch', url: 'https://techcrunch.com/feed/' },
    { name: 'BBC News', url: 'http://feeds.bbci.co.uk/news/rss.xml' },
    { name: 'Forbes', url: 'https://www.forbes.com/real-time/feed2/' },
  ];
  
  const workingFeeds = [
    { name: 'NASA', url: 'https://www.nasa.gov/rss/dyn/breaking_news.rss' },
    { name: 'The Verge', url: 'https://www.theverge.com/rss/index.xml' },
  ];
  
  console.log('=== Testing Problematic Feeds ===');
  for (const feed of problematicFeeds) {
    console.log(`\n--- Testing ${feed.name} ---`);
    try {
      await debugRSSFeed(feed.url);
    } catch (error) {
      console.error(`Error testing ${feed.name}:`, error.message);
    }
  }
  
  console.log('\n\n=== Testing Working Feeds (for comparison) ===');
  for (const feed of workingFeeds) {
    console.log(`\n--- Testing ${feed.name} ---`);
    try {
      await debugRSSFeed(feed.url);
    } catch (error) {
      console.error(`Error testing ${feed.name}:`, error.message);
    }
  }
}

testProblematicFeeds().catch(console.error);
