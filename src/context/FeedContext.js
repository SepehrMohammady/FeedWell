import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeStorage } from '../utils/SafeStorage';

const FeedContext = createContext();

const initialState = {
  feeds: [],
  articles: [],
  loading: false,
  error: null,
  readingPosition: null, // { positionId: string, afterArticleId: string, timestamp: string }
};

function feedReducer(state, action) {
  console.log('FeedReducer called with action:', action.type, 'payload:', action.payload);
  console.log('Current state feeds:', state.feeds.length);
  
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'ADD_FEED':
      return { ...state, feeds: [...state.feeds, action.payload] };
    case 'REMOVE_FEED':
      const newFeeds = state.feeds.filter(feed => feed.url !== action.payload);
      const newArticles = state.articles.filter(article => article.feedUrl !== action.payload);
      console.log('REMOVE_FEED: Original feeds:', state.feeds.length);
      console.log('REMOVE_FEED: New feeds after filter:', newFeeds.length);
      console.log('REMOVE_FEED: URL to remove:', action.payload);
      console.log('REMOVE_FEED: Feed URLs in state:', state.feeds.map(f => f.url));
      return { 
        ...state, 
        feeds: newFeeds,
        articles: newArticles
      };
    case 'SET_FEEDS':
      return { ...state, feeds: action.payload };
    case 'SET_ARTICLES':
      return { ...state, articles: action.payload };
    case 'ADD_ARTICLES':
      console.log('=== REDUCER ADD_ARTICLES DEBUG ===');
      console.log('State articles before:', state.articles.length);
      console.log('State unread before:', state.articles.filter(a => !a.isRead).length);
      console.log('Payload articles:', action.payload.length);
      
      const result = { 
        ...state, 
        articles: (() => {
          const existingArticles = state.articles;
          const newArticles = action.payload;
          const mergedArticles = [];
          const existingIds = new Set();

          // First, add all existing articles
          existingArticles.forEach(article => {
            mergedArticles.push(article);
            existingIds.add(article.id);
          });

          // Then, add only new articles that don't exist yet
          let newCount = 0;
          newArticles.forEach(newArticle => {
            if (!existingIds.has(newArticle.id)) {
              mergedArticles.push(newArticle);
              newCount++;
            }
          });

          console.log('Reducer - actually new articles:', newCount);
          console.log('Reducer - final count:', mergedArticles.length);
          console.log('Reducer - final unread:', mergedArticles.filter(a => !a.isRead).length);

          return mergedArticles;
        })()
      };
      
      console.log('=== REDUCER ADD_ARTICLES END ===');
      return result;
    case 'MARK_ARTICLE_READ':
      return {
        ...state,
        articles: state.articles.map(article =>
          article.id === action.payload
            ? { ...article, isRead: true, readAt: new Date().toISOString() }
            : article
        )
      };
    case 'MARK_ARTICLE_UNREAD':
      return {
        ...state,
        articles: state.articles.map(article =>
          article.id === action.payload
            ? { ...article, isRead: false, readAt: null }
            : article
        )
      };
    case 'MARK_ALL_READ':
      const readTimestamp = new Date().toISOString();
      return {
        ...state,
        articles: state.articles.map(article => ({
          ...article,
          isRead: true,
          readAt: readTimestamp
        }))
      };
    case 'CLEAR_ALL_DATA':
      console.log('CLEAR_ALL_DATA: Clearing all feeds and articles');
      return { ...state, feeds: [], articles: [] };
    case 'SET_READING_POSITION':
      return { ...state, readingPosition: action.payload };
    case 'CLEAR_READING_POSITION':
      return { ...state, readingPosition: null };
    default:
      return state;
  }
}

export function FeedProvider({ children }) {
  const [state, dispatch] = useReducer(feedReducer, initialState);
  const [isInitialized, setIsInitialized] = React.useState(false);

  useEffect(() => {
    loadData();
  }, []);

  // Auto refresh on app start - only after initial load is complete
  useEffect(() => {
    if (isInitialized && state.feeds.length > 0) {
      console.log('Auto-refreshing feeds on app start...');
      autoRefreshFeeds();
    }
  }, [isInitialized, state.feeds.length]);

  const loadData = async () => {
    try {
      console.log('Loading data from SafeStorage...');
      
      const feeds = await SafeStorage.getItem('feeds');
      const articles = await SafeStorage.getItem('articles');
      const readingPosition = await SafeStorage.getItem('readingPosition');
      
      console.log('Raw feeds data:', feeds);
      console.log('Raw articles data:', articles ? 'Found' : 'None');
      console.log('Raw reading position data:', readingPosition ? 'Found' : 'None');
      
      if (feeds) {
        try {
          const parsedFeeds = JSON.parse(feeds);
          console.log('Parsed feeds:', parsedFeeds);
          // Validate that we got an array
          if (Array.isArray(parsedFeeds) && parsedFeeds.length > 0) {
            dispatch({ type: 'SET_FEEDS', payload: parsedFeeds });
          } else {
            console.warn('Parsed feeds is not a valid array, skipping load');
          }
        } catch (parseError) {
          console.error('Error parsing feeds JSON:', parseError);
          // Don't reset feeds if parse fails - keep current state
        }
      } else {
        console.log('No feeds found in storage');
      }
      
      if (articles) {
        try {
          const parsedArticles = JSON.parse(articles);
          console.log('Parsed articles count:', parsedArticles.length);
          // Validate that we got an array
          if (Array.isArray(parsedArticles)) {
            dispatch({ type: 'SET_ARTICLES', payload: parsedArticles });
          } else {
            console.warn('Parsed articles is not a valid array, skipping load');
          }
        } catch (parseError) {
          console.error('Error parsing articles JSON:', parseError);
          // Don't reset articles if parse fails - keep current state
        }
      }

      if (readingPosition) {
        try {
          const parsedPosition = JSON.parse(readingPosition);
          console.log('Parsed reading position:', parsedPosition);
          dispatch({ type: 'SET_READING_POSITION', payload: parsedPosition });
        } catch (parseError) {
          console.error('Error parsing reading position JSON:', parseError);
        }
      }
      
      // Mark as initialized after loading data
      setIsInitialized(true);
    } catch (error) {
      console.error('Error loading data:', error);
      // Don't dispatch any state changes if load fails completely
      setIsInitialized(true); // Still mark as initialized even on error
    }
  };

  const saveFeeds = async (feeds) => {
    try {
      // Validate feeds before saving
      if (!Array.isArray(feeds)) {
        console.error('Cannot save feeds - not an array');
        return;
      }
      
      // Create backup before saving
      const existingFeeds = await SafeStorage.getItem('feeds');
      if (existingFeeds) {
        await SafeStorage.setItem('feeds_backup', existingFeeds);
      }
      
      const success = await SafeStorage.setItem('feeds', JSON.stringify(feeds));
      if (!success) {
        console.warn('Failed to save feeds - attempting to restore from backup');
        // Try to restore from backup if save failed
        const backup = await SafeStorage.getItem('feeds_backup');
        if (backup) {
          await SafeStorage.setItem('feeds', backup);
          console.log('Restored feeds from backup');
        }
      }
    } catch (error) {
      console.error('Error saving feeds:', error);
    }
  };

  const saveArticles = async (articles) => {
    try {
      // Validate articles before saving
      if (!Array.isArray(articles)) {
        console.error('Cannot save articles - not an array');
        return;
      }
      
      // Create backup before saving
      const existingArticles = await SafeStorage.getItem('articles');
      if (existingArticles) {
        await SafeStorage.setItem('articles_backup', existingArticles);
      }
      
      // Limit articles to prevent storage overflow
      // Keep only the 100 most recent articles per feed
      const MAX_ARTICLES_PER_FEED = 100;
      const articlesByFeed = {};
      
      articles.forEach(article => {
        if (!articlesByFeed[article.feedUrl]) {
          articlesByFeed[article.feedUrl] = [];
        }
        articlesByFeed[article.feedUrl].push(article);
      });
      
      // Sort each feed's articles by date and keep only the most recent
      const limitedArticles = [];
      Object.values(articlesByFeed).forEach(feedArticles => {
        const sorted = feedArticles.sort((a, b) => 
          new Date(b.published || b.pubDate || 0) - new Date(a.published || a.pubDate || 0)
        );
        limitedArticles.push(...sorted.slice(0, MAX_ARTICLES_PER_FEED));
      });
      
      const success = await SafeStorage.setItem('articles', JSON.stringify(limitedArticles));
      if (!success) {
        console.warn('Failed to save articles - attempting with fewer articles');
        // Try with even fewer articles if it still fails
        const reducedArticles = limitedArticles.slice(0, 500);
        const retrySuccess = await SafeStorage.setItem('articles', JSON.stringify(reducedArticles));
        
        if (!retrySuccess) {
          console.warn('Failed to save articles even with reduction - restoring from backup');
          // Restore from backup if both attempts failed
          const backup = await SafeStorage.getItem('articles_backup');
          if (backup) {
            await SafeStorage.setItem('articles', backup);
            console.log('Restored articles from backup');
          }
        }
      }
    } catch (error) {
      console.error('Error saving articles:', error);
      // Try to restore from backup on error
      try {
        const backup = await SafeStorage.getItem('articles_backup');
        if (backup) {
          await SafeStorage.setItem('articles', backup);
          console.log('Restored articles from backup after error');
        }
      } catch (restoreError) {
        console.error('Failed to restore from backup:', restoreError);
      }
    }
  };

  const addFeed = async (feedUrl, title) => {
    const newFeed = {
      url: feedUrl,
      title: title || feedUrl,
      id: Date.now().toString(),
      addedAt: new Date().toISOString(),
    };
    
    dispatch({ type: 'ADD_FEED', payload: newFeed });
    const updatedFeeds = [...state.feeds, newFeed];
    await saveFeeds(updatedFeeds);
  };

  const removeFeed = async (feedUrl) => {
    console.log('FeedContext: removeFeed called with URL:', feedUrl);
    console.log('Current feeds:', state.feeds.map(f => ({ title: f.title, url: f.url })));
    
    dispatch({ type: 'REMOVE_FEED', payload: feedUrl });
    const updatedFeeds = state.feeds.filter(feed => feed.url !== feedUrl);
    const updatedArticles = state.articles.filter(article => article.feedUrl !== feedUrl);
    
    console.log('Updated feeds after filter:', updatedFeeds.map(f => ({ title: f.title, url: f.url })));
    
    await saveFeeds(updatedFeeds);
    await saveArticles(updatedArticles);
    
    console.log('Feed removal completed');
  };

  const addArticles = async (articles) => {
    console.log('=== ADD_ARTICLES DEBUG START ===');
    console.log('Incoming articles count:', articles.length);
    console.log('Current state articles count:', state.articles.length);
    console.log('Current unread count:', state.articles.filter(a => !a.isRead).length);
    console.log('Incoming article IDs:', articles.map(a => a.id).slice(0, 5));
    console.log('Current article IDs (first 5):', state.articles.map(a => a.id).slice(0, 5));
    
    dispatch({ type: 'ADD_ARTICLES', payload: articles });
    
    // Use the same merge logic as the reducer for storage
    const existingArticles = state.articles;
    const newArticles = articles;
    const mergedArticles = [];
    const existingIds = new Set();

    console.log('Before merge - existing articles:', existingArticles.length);
    console.log('Before merge - existing unread:', existingArticles.filter(a => !a.isRead).length);

    // First, add all existing articles (preserving read status)
    existingArticles.forEach(article => {
      mergedArticles.push(article);
      existingIds.add(article.id);
    });

    // Then, add only new articles that don't exist yet
    let actuallyNewCount = 0;
    newArticles.forEach(newArticle => {
      if (!existingIds.has(newArticle.id)) {
        mergedArticles.push(newArticle);
        actuallyNewCount++;
      }
    });

    console.log('Actually new articles added:', actuallyNewCount);
    console.log('Final merged articles count:', mergedArticles.length);
    console.log('Final unread count:', mergedArticles.filter(a => !a.isRead).length);
    console.log('=== ADD_ARTICLES DEBUG END ===');

    await saveArticles(mergedArticles);
  };

  // Auto refresh function for app start
  const autoRefreshFeeds = async () => {
    if (state.feeds.length === 0) return;
    
    try {
      console.log('Auto-refreshing feeds...');
      const { parseRSSFeed } = require('../utils/rssParser');
      const allArticles = [];
      
      for (const feed of state.feeds) {
        try {
          const parsedFeed = await parseRSSFeed(feed.url);
          allArticles.push(...parsedFeed.articles);
        } catch (error) {
          console.error(`Error parsing feed ${feed.url} during auto-refresh:`, error);
        }
      }
      
      if (allArticles.length > 0) {
        await addArticles(allArticles);
        console.log(`Auto-refresh completed: ${allArticles.length} articles processed`);
      }
    } catch (error) {
      console.error('Error during auto-refresh:', error);
    }
  };

  const clearAllData = async () => {
    console.log('FeedContext: clearAllData called');
    console.log('Current state before clearing:', { feeds: state.feeds.length, articles: state.articles.length });
    
    dispatch({ type: 'CLEAR_ALL_DATA' });
    await saveFeeds([]);
    await saveArticles([]);
    
    console.log('FeedContext: clearAllData completed');
  };

  const markArticleRead = useCallback(async (articleId, currentFilter = 'all', sortOrder = 'newest') => {
    console.log('FeedContext: markArticleRead called for:', articleId, 'filter:', currentFilter, 'sort:', sortOrder);
    dispatch({ type: 'MARK_ARTICLE_READ', payload: articleId });
    // Get updated articles from storage after dispatch
    try {
      const storedArticles = await AsyncStorage.getItem('articles');
      const readingPositionData = await AsyncStorage.getItem('readingPosition');
      
      if (storedArticles) {
        const articles = JSON.parse(storedArticles);
        const updatedArticles = articles.map(article =>
          article.id === articleId
            ? { ...article, isRead: true, readAt: new Date().toISOString() }
            : article
        );
        await saveArticles(updatedArticles);

        // If there's a reading position, check if we need to adjust it
        if (readingPositionData) {
          const currentPosition = JSON.parse(readingPositionData);
          
          // Only adjust if the article at the bookmark position was just marked read
          if (currentPosition.afterArticleId === articleId) {
            
            // For 'all' filter: Bookmark stays (no adjustment needed)
            if (currentFilter === 'all') {
              console.log('All filter: Bookmark stays at current position');
              return; // Don't move the bookmark
            }
            
            // For 'unread' filter: Move bookmark back to previous unread article
            if (currentFilter === 'unread') {
              // Get unread articles after the update
              const unreadArticles = updatedArticles.filter(a => !a.isRead);
              
              // Apply sorting
              const sortedArticles = [...unreadArticles].sort((a, b) => 
                sortOrder === 'newest' 
                  ? new Date(b.publishedDate) - new Date(a.publishedDate)
                  : new Date(a.publishedDate) - new Date(b.publishedDate)
              );
              
              // Since the article at bookmark was just read, it's no longer in the unread list
              // Find where it would have been and move to the previous one
              const allSortedForReference = [...updatedArticles].sort((a, b) => 
                sortOrder === 'newest' 
                  ? new Date(b.publishedDate) - new Date(a.publishedDate)
                  : new Date(a.publishedDate) - new Date(b.publishedDate)
              );
              
              const readArticleIndex = allSortedForReference.findIndex(a => a.id === articleId);
              
              // Find the previous unread article before this position
              let newPositionArticle = null;
              for (let i = readArticleIndex - 1; i >= 0; i--) {
                if (!allSortedForReference[i].isRead) {
                  newPositionArticle = allSortedForReference[i];
                  break;
                }
              }
              
              if (newPositionArticle) {
                const newReadingPosition = {
                  positionId: `after_article_${newPositionArticle.id}`,
                  afterArticleId: newPositionArticle.id,
                  timestamp: new Date().toISOString()
                };
                dispatch({ type: 'SET_READING_POSITION', payload: newReadingPosition });
                await AsyncStorage.setItem('readingPosition', JSON.stringify(newReadingPosition));
                console.log('Unread filter: Reading position moved back to:', newPositionArticle.id);
              } else {
                console.log('Unread filter: No previous unread article, clearing bookmark');
                dispatch({ type: 'CLEAR_READING_POSITION' });
                await AsyncStorage.removeItem('readingPosition');
              }
            }
            
            // For 'read' filter: Bookmark stays (article is still in the read list)
            if (currentFilter === 'read') {
              console.log('Read filter: Bookmark stays (article still in read list)');
              return; // Don't move the bookmark
            }
          }
        }
      }
    } catch (error) {
      console.error('Error updating article read status in storage:', error);
    }
  }, []);

  const markArticleUnread = useCallback(async (articleId, currentFilter = 'all', sortOrder = 'newest') => {
    console.log('FeedContext: markArticleUnread called for:', articleId, 'filter:', currentFilter, 'sort:', sortOrder);
    dispatch({ type: 'MARK_ARTICLE_UNREAD', payload: articleId });
    try {
      const storedArticles = await AsyncStorage.getItem('articles');
      const readingPositionData = await AsyncStorage.getItem('readingPosition');
      
      if (storedArticles) {
        const articles = JSON.parse(storedArticles);
        const updatedArticles = articles.map(article =>
          article.id === articleId
            ? { ...article, isRead: false, readAt: null }
            : article
        );
        await saveArticles(updatedArticles);
        
        // If there's a reading position, check if we need to adjust it
        if (readingPositionData) {
          const currentPosition = JSON.parse(readingPositionData);
          
          // Only adjust if the article at the bookmark position was just marked unread
          if (currentPosition.afterArticleId === articleId) {
            
            // For 'all' filter: Bookmark stays (article still in the list)
            if (currentFilter === 'all') {
              console.log('All filter: Bookmark stays at current position');
              return; // Don't move the bookmark
            }
            
            // For 'unread' filter: Bookmark stays (article still in unread list)
            if (currentFilter === 'unread') {
              console.log('Unread filter: Bookmark stays (article still in unread list)');
              return; // Don't move the bookmark
            }
            
            // For 'read' filter: Move bookmark back to previous read article
            if (currentFilter === 'read') {
              // Get read articles after the update
              const readArticles = updatedArticles.filter(a => a.isRead);
              
              // Apply sorting
              const allSortedForReference = [...updatedArticles].sort((a, b) => 
                sortOrder === 'newest' 
                  ? new Date(b.publishedDate) - new Date(a.publishedDate)
                  : new Date(a.publishedDate) - new Date(b.publishedDate)
              );
              
              const unreadArticleIndex = allSortedForReference.findIndex(a => a.id === articleId);
              
              // Find the previous read article before this position
              let newPositionArticle = null;
              for (let i = unreadArticleIndex - 1; i >= 0; i--) {
                if (allSortedForReference[i].isRead) {
                  newPositionArticle = allSortedForReference[i];
                  break;
                }
              }
              
              if (newPositionArticle) {
                const newReadingPosition = {
                  positionId: `after_article_${newPositionArticle.id}`,
                  afterArticleId: newPositionArticle.id,
                  timestamp: new Date().toISOString()
                };
                dispatch({ type: 'SET_READING_POSITION', payload: newReadingPosition });
                await AsyncStorage.setItem('readingPosition', JSON.stringify(newReadingPosition));
                console.log('Read filter: Reading position moved back to:', newPositionArticle.id);
              } else {
                console.log('Read filter: No previous read article, clearing bookmark');
                dispatch({ type: 'CLEAR_READING_POSITION' });
                await AsyncStorage.removeItem('readingPosition');
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error updating article unread status in storage:', error);
    }
  }, []);

  const markAllRead = useCallback(async () => {
    dispatch({ type: 'MARK_ALL_READ' });
    try {
      const storedArticles = await AsyncStorage.getItem('articles');
      if (storedArticles) {
        const articles = JSON.parse(storedArticles);
        const readTimestamp = new Date().toISOString();
        const updatedArticles = articles.map(article => ({
          ...article,
          isRead: true,
          readAt: readTimestamp
        }));
        await saveArticles(updatedArticles);

        // Clear reading position since all articles are now read
        console.log('All articles marked as read, clearing reading position');
        dispatch({ type: 'CLEAR_READING_POSITION' });
        await AsyncStorage.removeItem('readingPosition');
      }
    } catch (error) {
      console.error('Error marking all articles as read in storage:', error);
    }
  }, []);

  const getUnreadArticles = useCallback(() => {
    return state.articles.filter(article => !article.isRead);
  }, [state.articles]);

  const getUnreadCount = useCallback(() => {
    return state.articles.filter(article => !article.isRead).length;
  }, [state.articles]);

  const getReadArticles = useCallback(() => {
    return state.articles.filter(article => article.isRead);
  }, [state.articles]);

  const getReadCount = useCallback(() => {
    return state.articles.filter(article => article.isRead).length;
  }, [state.articles]);

  const setReadingPosition = useCallback(async (positionId, afterArticleId = null) => {
    try {
      const readingPosition = {
        positionId,
        afterArticleId,
        timestamp: new Date().toISOString()
      };
      dispatch({ type: 'SET_READING_POSITION', payload: readingPosition });
      await AsyncStorage.setItem('readingPosition', JSON.stringify(readingPosition));
      console.log('Reading position set:', readingPosition);
    } catch (error) {
      console.error('Error setting reading position:', error);
    }
  }, []);

  const clearReadingPosition = useCallback(async () => {
    try {
      dispatch({ type: 'CLEAR_READING_POSITION' });
      await AsyncStorage.removeItem('readingPosition');
      console.log('Reading position cleared');
    } catch (error) {
      console.error('Error clearing reading position:', error);
    }
  }, []);

  const loadReadingPosition = useCallback(async () => {
    try {
      const readingPosition = await AsyncStorage.getItem('readingPosition');
      if (readingPosition) {
        const parsedPosition = JSON.parse(readingPosition);
        dispatch({ type: 'SET_READING_POSITION', payload: parsedPosition });
        console.log('Reading position loaded:', parsedPosition);
      }
    } catch (error) {
      console.error('Error loading reading position:', error);
    }
  }, []);

  const value = {
    ...state,
    addFeed,
    removeFeed,
    addArticles,
    clearAllData,
    markArticleRead,
    markArticleUnread,
    markAllRead,
    getUnreadArticles,
    getUnreadCount,
    getReadArticles,
    getReadCount,
    autoRefreshFeeds,
    setReadingPosition,
    clearReadingPosition,
    loadReadingPosition,
    setLoading: (loading) => dispatch({ type: 'SET_LOADING', payload: loading }),
    setError: (error) => dispatch({ type: 'SET_ERROR', payload: error }),
  };

  return (
    <FeedContext.Provider value={value}>
      {children}
    </FeedContext.Provider>
  );
}

export function useFeed() {
  const context = useContext(FeedContext);
  if (!context) {
    throw new Error('useFeed must be used within a FeedProvider');
  }
  return context;
}
