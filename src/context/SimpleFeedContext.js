import React, { createContext, useContext, useReducer, useEffect } from 'react';
import SafeStorage from '../utils/SafeStorage';

const FeedContext = createContext();

// Simple action types
const FEED_ACTIONS = {
  ADD_FEED: 'ADD_FEED',
  REMOVE_FEED: 'REMOVE_FEED',
  ADD_ARTICLES: 'ADD_ARTICLES',
  CLEAR_ALL: 'CLEAR_ALL',
  LOAD_FEEDS: 'LOAD_FEEDS',
  LOAD_ARTICLES: 'LOAD_ARTICLES',
  MARK_ARTICLE_READ: 'MARK_ARTICLE_READ',
};

// Simple reducer for safe persistent state management
const feedReducer = (state, action) => {
  switch (action.type) {
    case FEED_ACTIONS.ADD_FEED:
      return {
        ...state,
        feeds: [...state.feeds, action.payload],
      };
    
    case FEED_ACTIONS.REMOVE_FEED:
      const filteredArticles = state.articles.filter(article => article.feedId !== action.payload);
      return {
        ...state,
        feeds: state.feeds.filter(feed => feed.id !== action.payload),
        articles: filteredArticles,
      };
    
    case FEED_ACTIONS.ADD_ARTICLES:
      return {
        ...state,
        articles: [...state.articles, ...action.payload],
      };
    
    case FEED_ACTIONS.LOAD_FEEDS:
      return {
        ...state,
        feeds: action.payload,
      };
    
    case FEED_ACTIONS.LOAD_ARTICLES:
      return {
        ...state,
        articles: action.payload,
      };
    
    case FEED_ACTIONS.MARK_ARTICLE_READ:
      return {
        ...state,
        articles: state.articles.map(article => 
          article.id === action.payload 
            ? { ...article, read: true }
            : article
        ),
      };
    
    case FEED_ACTIONS.CLEAR_ALL:
      return {
        feeds: [],
        articles: [],
      };
    
    default:
      return state;
  }
};

// Initial state
const initialState = {
  feeds: [],
  articles: [],
};

export const SimpleFeedProvider = ({ children }) => {
  const [state, dispatch] = useReducer(feedReducer, initialState);

  // Load data from storage on app start
  useEffect(() => {
    loadStoredData();
  }, []);

  // Save data whenever state changes
  useEffect(() => {
    if (state.feeds.length > 0 || state.articles.length > 0) {
      saveStoredData();
    }
  }, [state.feeds, state.articles]);

  const loadStoredData = async () => {
    const savedFeeds = await SafeStorage.getItem('feeds', []);
    const savedArticles = await SafeStorage.getItem('articles', []);
    
    console.log('Loaded feeds from storage:', savedFeeds.length);
    console.log('Loaded articles from storage:', savedArticles.length);
    
    if (savedFeeds.length > 0) {
      dispatch({ type: FEED_ACTIONS.LOAD_FEEDS, payload: savedFeeds });
    }
    
    if (savedArticles.length > 0) {
      dispatch({ type: FEED_ACTIONS.LOAD_ARTICLES, payload: savedArticles });
    }
  };

  const saveStoredData = async () => {
    const feedsSaved = await SafeStorage.setItem('feeds', state.feeds);
    const articlesSaved = await SafeStorage.setItem('articles', state.articles);
    
    if (feedsSaved && articlesSaved) {
      console.log('Data saved successfully - Feeds:', state.feeds.length, 'Articles:', state.articles.length);
    } else {
      console.log('Failed to save some data, but continuing in-memory');
    }
  };

  // Simple actions that only work with in-memory state
  const addFeed = (feed) => {
    const newFeed = {
      id: Date.now().toString(),
      title: feed.title || 'Unnamed Feed',
      url: feed.url,
      addedAt: new Date().toISOString(),
      description: feed.description || '',
      articleCount: 3, // We'll add 3 sample articles
    };
    
    dispatch({ type: FEED_ACTIONS.ADD_FEED, payload: newFeed });
    console.log('Feed added:', newFeed);
    
    // Add some sample articles for this feed
    const sampleArticles = [
      {
        id: `article_${Date.now()}_1`,
        feedId: newFeed.id,
        title: 'Welcome to your new feed!',
        summary: 'This is a sample article to demonstrate how articles appear in your feed reader.',
        content: 'This is sample content. In the full version, real RSS articles will be fetched and displayed here.',
        publishedAt: new Date().toISOString(),
        read: false,
        url: 'https://example.com/article1',
        author: 'FeedWell Demo',
      },
      {
        id: `article_${Date.now()}_2`,
        feedId: newFeed.id,
        title: 'Getting Started with RSS',
        summary: 'Learn how to make the most of your RSS reader experience.',
        content: 'RSS feeds are a great way to stay updated with your favorite websites and blogs. This reader will help you organize and read content efficiently.',
        publishedAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        read: false,
        url: 'https://example.com/article2',
        author: 'RSS Guide',
      },
      {
        id: `article_${Date.now()}_3`,
        feedId: newFeed.id,
        title: 'Ad-Free Reading Experience',
        summary: 'Enjoy clean, distraction-free content consumption.',
        content: 'This RSS reader focuses on providing a clean reading experience without ads, tracking, or distractions.',
        publishedAt: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
        read: true, // Mark as read for variety
        url: 'https://example.com/article3',
        author: 'Clean Reader',
      }
    ];
    
    dispatch({ type: FEED_ACTIONS.ADD_ARTICLES, payload: sampleArticles });
    console.log('Sample articles added:', sampleArticles.length);
  };

  const removeFeed = (feedId) => {
    dispatch({ type: FEED_ACTIONS.REMOVE_FEED, payload: feedId });
    console.log('Feed removed with articles:', feedId);
  };

  const addArticles = (articles) => {
    dispatch({ type: FEED_ACTIONS.ADD_ARTICLES, payload: articles });
    console.log('Articles added:', articles.length);
  };

  const markArticleAsRead = (articleId) => {
    dispatch({ type: FEED_ACTIONS.MARK_ARTICLE_READ, payload: articleId });
    console.log('Article marked as read:', articleId);
  };

  const clearAllData = async () => {
    dispatch({ type: FEED_ACTIONS.CLEAR_ALL });
    
    // Also clear from storage
    await SafeStorage.removeItem('feeds');
    await SafeStorage.removeItem('articles');
    console.log('All data cleared from memory and storage');
  };

  const value = {
    feeds: state.feeds,
    articles: state.articles,
    addFeed,
    removeFeed,
    addArticles,
    markArticleAsRead,
    clearAllData,
    // Utility functions
    feedCount: state.feeds.length,
    articleCount: state.articles.length,
  };

  return (
    <FeedContext.Provider value={value}>
      {children}
    </FeedContext.Provider>
  );
};

export const useFeed = () => {
  const context = useContext(FeedContext);
  if (!context) {
    throw new Error('useFeed must be used within a SimpleFeedProvider');
  }
  return context;
};

export default FeedContext;
