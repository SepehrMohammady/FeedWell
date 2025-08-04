import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FeedContext = createContext();

const initialState = {
  feeds: [],
  articles: [],
  loading: false,
  error: null,
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
      return { 
        ...state, 
        articles: [...state.articles, ...action.payload].filter((article, index, self) =>
          index === self.findIndex(a => a.id === article.id)
        )
      };
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
    default:
      return state;
  }
}

export function FeedProvider({ children }) {
  const [state, dispatch] = useReducer(feedReducer, initialState);

  useEffect(() => {
    loadData();
  }, []);

  // Data integrity monitoring - check for data loss every 5 minutes when app is active
  useEffect(() => {
    const monitorDataIntegrity = async () => {
      try {
        const feeds = await AsyncStorage.getItem('feeds');
        const articles = await AsyncStorage.getItem('articles');
        
        if (!feeds && state.feeds.length > 0) {
          console.error('🚨 DATA LOSS DETECTED: Feeds in memory but not in storage!');
          console.error('🚨 Feeds in memory:', state.feeds.length);
          console.error('🚨 This suggests AsyncStorage was cleared or corrupted');
        }
        
        if (!articles && state.articles.length > 0) {
          console.error('🚨 DATA LOSS DETECTED: Articles in memory but not in storage!');
          console.error('🚨 Articles in memory:', state.articles.length);
        }
        
        if (feeds) {
          const storedFeeds = JSON.parse(feeds);
          if (storedFeeds.length !== state.feeds.length) {
            console.warn('⚠️ Feed count mismatch between memory and storage');
            console.warn('⚠️ Memory:', state.feeds.length, 'Storage:', storedFeeds.length);
          }
        }
        
      } catch (error) {
        console.error('❌ Error during data integrity check:', error);
      }
    };

    // Run immediately and then every 5 minutes
    monitorDataIntegrity();
    const interval = setInterval(monitorDataIntegrity, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [state.feeds.length, state.articles.length]);

  const loadData = async () => {
    try {
      console.log('🔄 Loading data from AsyncStorage...');
      console.log('🔄 Timestamp:', new Date().toISOString());
      
      // Get all keys first to see what's in storage
      const allKeys = await AsyncStorage.getAllKeys();
      console.log('🔑 All AsyncStorage keys:', allKeys);
      
      const feeds = await AsyncStorage.getItem('feeds');
      const articles = await AsyncStorage.getItem('articles');
      
      console.log('📦 Raw feeds data:', feeds ? `Found (${feeds.length} chars)` : 'NULL');
      console.log('📦 Raw articles data:', articles ? `Found (${articles.length} chars)` : 'NULL');
      
      if (feeds) {
        try {
          const parsedFeeds = JSON.parse(feeds);
          console.log('✅ Parsed feeds successfully:', parsedFeeds.length, 'feeds');
          console.log('📋 Feed URLs:', parsedFeeds.map(f => f.url));
          dispatch({ type: 'SET_FEEDS', payload: parsedFeeds });
        } catch (parseError) {
          console.error('❌ Error parsing feeds JSON:', parseError);
          console.log('🔍 Corrupted feeds data:', feeds.substring(0, 200));
        }
      } else {
        console.log('⚠️ No feeds found in storage - this could indicate data loss!');
      }
      
      if (articles) {
        try {
          const parsedArticles = JSON.parse(articles);
          console.log('✅ Parsed articles successfully:', parsedArticles.length, 'articles');
          dispatch({ type: 'SET_ARTICLES', payload: parsedArticles });
        } catch (parseError) {
          console.error('❌ Error parsing articles JSON:', parseError);
          console.log('🔍 Corrupted articles data:', articles.substring(0, 200));
        }
      } else {
        console.log('⚠️ No articles found in storage');
      }
      
      console.log('✅ Data loading completed');
    } catch (error) {
      console.error('❌ Critical error loading data:', error);
      console.error('❌ Error stack:', error.stack);
    }
  };

  const saveFeeds = async (feeds) => {
    try {
      console.log('💾 Saving feeds to AsyncStorage:', feeds.length, 'feeds');
      const feedsJson = JSON.stringify(feeds);
      console.log('💾 Feeds JSON size:', feedsJson.length, 'characters');
      
      await AsyncStorage.setItem('feeds', feedsJson);
      
      // Verify the save by reading it back
      const verification = await AsyncStorage.getItem('feeds');
      if (verification) {
        const verifiedFeeds = JSON.parse(verification);
        console.log('✅ Feeds save verified:', verifiedFeeds.length, 'feeds');
      } else {
        console.error('❌ Feed save verification failed - data is null!');
      }
    } catch (error) {
      console.error('❌ Error saving feeds:', error);
      console.error('❌ Feeds data that failed to save:', feeds);
    }
  };

  const saveArticles = async (articles) => {
    try {
      console.log('💾 Saving articles to AsyncStorage:', articles.length, 'articles');
      const articlesJson = JSON.stringify(articles);
      console.log('💾 Articles JSON size:', articlesJson.length, 'characters');
      
      await AsyncStorage.setItem('articles', articlesJson);
      
      // Verify the save by reading it back
      const verification = await AsyncStorage.getItem('articles');
      if (verification) {
        const verifiedArticles = JSON.parse(verification);
        console.log('✅ Articles save verified:', verifiedArticles.length, 'articles');
      } else {
        console.error('❌ Articles save verification failed - data is null!');
      }
    } catch (error) {
      console.error('❌ Error saving articles:', error);
      console.error('❌ Articles data that failed to save:', articles.length, 'items');
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
    dispatch({ type: 'ADD_ARTICLES', payload: articles });
    const updatedArticles = [...state.articles, ...articles].filter((article, index, self) =>
      index === self.findIndex(a => a.id === article.id)
    );
    await saveArticles(updatedArticles);
  };

  const clearAllData = async () => {
    console.log('FeedContext: clearAllData called');
    console.log('Current state before clearing:', { feeds: state.feeds.length, articles: state.articles.length });
    
    dispatch({ type: 'CLEAR_ALL_DATA' });
    await saveFeeds([]);
    await saveArticles([]);
    
    console.log('FeedContext: clearAllData completed');
  };

  const markArticleRead = useCallback(async (articleId) => {
    console.log('FeedContext: markArticleRead called for:', articleId);
    dispatch({ type: 'MARK_ARTICLE_READ', payload: articleId });
    // Get updated articles from storage after dispatch
    try {
      const storedArticles = await AsyncStorage.getItem('articles');
      if (storedArticles) {
        const articles = JSON.parse(storedArticles);
        const updatedArticles = articles.map(article =>
          article.id === articleId
            ? { ...article, isRead: true, readAt: new Date().toISOString() }
            : article
        );
        await saveArticles(updatedArticles);
      }
    } catch (error) {
      console.error('Error updating article read status in storage:', error);
    }
  }, []);

  const markArticleUnread = useCallback(async (articleId) => {
    dispatch({ type: 'MARK_ARTICLE_UNREAD', payload: articleId });
    try {
      const storedArticles = await AsyncStorage.getItem('articles');
      if (storedArticles) {
        const articles = JSON.parse(storedArticles);
        const updatedArticles = articles.map(article =>
          article.id === articleId
            ? { ...article, isRead: false, readAt: null }
            : article
        );
        await saveArticles(updatedArticles);
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
