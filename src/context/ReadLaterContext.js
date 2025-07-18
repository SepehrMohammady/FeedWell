import React, { createContext, useContext, useReducer, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ReadLaterContext = createContext();

// Action types
const SET_READ_LATER_ARTICLES = 'SET_READ_LATER_ARTICLES';
const ADD_TO_READ_LATER = 'ADD_TO_READ_LATER';
const REMOVE_FROM_READ_LATER = 'REMOVE_FROM_READ_LATER';
const CLEAR_READ_LATER = 'CLEAR_READ_LATER';
const SET_LOADING = 'SET_LOADING';

// Initial state
const initialState = {
  articles: [],
  loading: false,
};

// Reducer function
function readLaterReducer(state, action) {
  console.log('ReadLaterReducer called with action:', action.type, 'payload:', action.payload);
  
  switch (action.type) {
    case SET_READ_LATER_ARTICLES:
      console.log('Setting read later articles:', action.payload.length);
      return {
        ...state,
        articles: action.payload,
      };
    
    case ADD_TO_READ_LATER:
      const newArticles = [...state.articles, action.payload];
      console.log('Adding article to read later. Total articles:', newArticles.length);
      return {
        ...state,
        articles: newArticles,
      };
    
    case REMOVE_FROM_READ_LATER:
      const filteredArticles = state.articles.filter(article => article.id !== action.payload);
      console.log('Removing article from read later. Remaining articles:', filteredArticles.length);
      return {
        ...state,
        articles: filteredArticles,
      };
    
    case CLEAR_READ_LATER:
      console.log('Clearing all read later articles');
      return {
        ...state,
        articles: [],
      };
    
    case SET_LOADING:
      return {
        ...state,
        loading: action.payload,
      };
    
    default:
      return state;
  }
}

// Storage key
const READ_LATER_STORAGE_KEY = 'feedwell_read_later_articles';

// Provider component
export function ReadLaterProvider({ children }) {
  const [state, dispatch] = useReducer(readLaterReducer, initialState);

  // Load read later articles from storage on app start
  useEffect(() => {
    loadReadLaterArticles();
  }, []);

  // Save to storage whenever articles change
  useEffect(() => {
    saveReadLaterArticles(state.articles);
  }, [state.articles]);

  const loadReadLaterArticles = async () => {
    try {
      dispatch({ type: SET_LOADING, payload: true });
      const stored = await AsyncStorage.getItem(READ_LATER_STORAGE_KEY);
      if (stored) {
        const articles = JSON.parse(stored);
        console.log('Loaded read later articles from storage:', articles.length);
        dispatch({ type: SET_READ_LATER_ARTICLES, payload: articles });
      }
    } catch (error) {
      console.error('Error loading read later articles:', error);
    } finally {
      dispatch({ type: SET_LOADING, payload: false });
    }
  };

  const saveReadLaterArticles = async (articles) => {
    try {
      await AsyncStorage.setItem(READ_LATER_STORAGE_KEY, JSON.stringify(articles));
      console.log('Saved read later articles to storage:', articles.length);
    } catch (error) {
      console.error('Error saving read later articles:', error);
    }
  };

  const addToReadLater = (article) => {
    // Check if article is already in read later
    const exists = state.articles.some(existingArticle => existingArticle.id === article.id);
    if (!exists) {
      const articleWithTimestamp = {
        ...article,
        addedToReadLater: new Date().toISOString(),
      };
      dispatch({ type: ADD_TO_READ_LATER, payload: articleWithTimestamp });
      return true; // Successfully added
    }
    return false; // Already exists
  };

  const removeFromReadLater = (articleId) => {
    dispatch({ type: REMOVE_FROM_READ_LATER, payload: articleId });
  };

  const clearReadLater = async () => {
    try {
      await AsyncStorage.removeItem(READ_LATER_STORAGE_KEY);
      dispatch({ type: CLEAR_READ_LATER });
    } catch (error) {
      console.error('Error clearing read later articles:', error);
    }
  };

  const isInReadLater = (articleId) => {
    return state.articles.some(article => article.id === articleId);
  };

  const getReadLaterCount = () => {
    return state.articles.length;
  };

  const value = {
    articles: state.articles,
    loading: state.loading,
    addToReadLater,
    removeFromReadLater,
    clearReadLater,
    isInReadLater,
    getReadLaterCount,
  };

  return (
    <ReadLaterContext.Provider value={value}>
      {children}
    </ReadLaterContext.Provider>
  );
}

// Hook to use read later context
export function useReadLater() {
  const context = useContext(ReadLaterContext);
  if (!context) {
    throw new Error('useReadLater must be used within a ReadLaterProvider');
  }
  return context;
}
