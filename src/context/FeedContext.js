import React, { createContext, useContext, useReducer, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FeedContext = createContext();

const initialState = {
  feeds: [],
  articles: [],
  loading: false,
  error: null,
};

function feedReducer(state, action) {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'ADD_FEED':
      return { ...state, feeds: [...state.feeds, action.payload] };
    case 'REMOVE_FEED':
      return { 
        ...state, 
        feeds: state.feeds.filter(feed => feed.url !== action.payload),
        articles: state.articles.filter(article => article.feedUrl !== action.payload)
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
    case 'CLEAR_ALL_DATA':
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

  const loadData = async () => {
    try {
      const feeds = await AsyncStorage.getItem('feeds');
      const articles = await AsyncStorage.getItem('articles');
      
      if (feeds) {
        dispatch({ type: 'SET_FEEDS', payload: JSON.parse(feeds) });
      }
      if (articles) {
        dispatch({ type: 'SET_ARTICLES', payload: JSON.parse(articles) });
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const saveFeeds = async (feeds) => {
    try {
      await AsyncStorage.setItem('feeds', JSON.stringify(feeds));
    } catch (error) {
      console.error('Error saving feeds:', error);
    }
  };

  const saveArticles = async (articles) => {
    try {
      await AsyncStorage.setItem('articles', JSON.stringify(articles));
    } catch (error) {
      console.error('Error saving articles:', error);
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
    dispatch({ type: 'REMOVE_FEED', payload: feedUrl });
    const updatedFeeds = state.feeds.filter(feed => feed.url !== feedUrl);
    const updatedArticles = state.articles.filter(article => article.feedUrl !== feedUrl);
    await saveFeeds(updatedFeeds);
    await saveArticles(updatedArticles);
  };

  const addArticles = async (articles) => {
    dispatch({ type: 'ADD_ARTICLES', payload: articles });
    const updatedArticles = [...state.articles, ...articles].filter((article, index, self) =>
      index === self.findIndex(a => a.id === article.id)
    );
    await saveArticles(updatedArticles);
  };

  const clearAllData = async () => {
    dispatch({ type: 'CLEAR_ALL_DATA' });
    await saveFeeds([]);
    await saveArticles([]);
  };

  const value = {
    ...state,
    addFeed,
    removeFeed,
    addArticles,
    clearAllData,
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
