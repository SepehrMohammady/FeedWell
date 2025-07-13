// Test utility to debug RSS parsing issues
export async function testRSSFeed(url) {
  console.log('Testing RSS feed:', url);
  
  try {
    // Test direct fetch
    console.log('1. Testing direct fetch...');
    const response = await fetch(url);
    console.log('Direct fetch response:', response.status, response.statusText);
    
    if (response.ok) {
      const text = await response.text();
      console.log('Direct fetch success, content length:', text.length);
      console.log('Content preview:', text.substring(0, 200));
      return { success: true, method: 'direct', content: text };
    }
  } catch (error) {
    console.log('Direct fetch failed:', error.message);
  }
  
  // Test with CORS proxy
  try {
    console.log('2. Testing with CORS proxy...');
    const proxyUrl = `https://api.allorigins.me/get?url=${encodeURIComponent(url)}`;
    const response = await fetch(proxyUrl);
    console.log('Proxy fetch response:', response.status, response.statusText);
    
    if (response.ok) {
      const json = await response.json();
      console.log('Proxy fetch success, content length:', json.contents?.length || 0);
      console.log('Content preview:', json.contents?.substring(0, 200));
      return { success: true, method: 'proxy', content: json.contents };
    }
  } catch (error) {
    console.log('Proxy fetch failed:', error.message);
  }
  
  return { success: false, error: 'All methods failed' };
}

// Quick test function you can call from browser console
window.testFeed = testRSSFeed;
