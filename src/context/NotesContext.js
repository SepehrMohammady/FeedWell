import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { SafeStorage } from '../utils/SafeStorage';

const NotesContext = createContext();

const NOTES_STORAGE_KEY = 'feedwell_article_notes';

export function NotesProvider({ children }) {
  const [notes, setNotes] = useState({}); // { [articleId]: { text, updatedAt } }
  const [isLoading, setIsLoading] = useState(true);
  const isInitialLoad = useRef(true);

  useEffect(() => {
    loadNotes();
  }, []);

  // Save whenever notes changes (skip initial load)
  useEffect(() => {
    if (isInitialLoad.current) return;
    saveNotes(notes);
  }, [notes]);

  const loadNotes = async () => {
    try {
      const stored = await SafeStorage.getItem(NOTES_STORAGE_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed && typeof parsed === 'object') {
            setNotes(parsed);
          }
        } catch (parseError) {
          console.error('Error parsing notes JSON:', parseError);
        }
      }
      isInitialLoad.current = false;
    } catch (error) {
      console.error('Error loading notes:', error);
      isInitialLoad.current = false;
    } finally {
      setIsLoading(false);
    }
  };

  const saveNotes = async (notesData) => {
    try {
      if (!notesData || typeof notesData !== 'object') return;
      const existing = await SafeStorage.getItem(NOTES_STORAGE_KEY);
      if (existing) {
        await SafeStorage.setItem(`${NOTES_STORAGE_KEY}_backup`, existing);
      }
      const success = await SafeStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notesData));
      if (!success) {
        const backup = await SafeStorage.getItem(`${NOTES_STORAGE_KEY}_backup`);
        if (backup) {
          await SafeStorage.setItem(NOTES_STORAGE_KEY, backup);
        }
      }
    } catch (error) {
      console.error('Error saving notes:', error);
    }
  };

  const setNote = useCallback((articleId, text) => {
    setNotes(prev => {
      if (!text || text.trim() === '') {
        // Remove note if empty
        const updated = { ...prev };
        delete updated[articleId];
        return updated;
      }
      return {
        ...prev,
        [articleId]: {
          text: text.trim(),
          updatedAt: new Date().toISOString(),
        },
      };
    });
  }, []);

  const getNote = useCallback((articleId) => {
    return notes[articleId] || null;
  }, [notes]);

  const hasNote = useCallback((articleId) => {
    return !!notes[articleId];
  }, [notes]);

  const value = {
    notes,
    isLoading,
    setNote,
    getNote,
    hasNote,
  };

  return (
    <NotesContext.Provider value={value}>
      {children}
    </NotesContext.Provider>
  );
}

export function useNotes() {
  const context = useContext(NotesContext);
  if (!context) {
    throw new Error('useNotes must be used within a NotesProvider');
  }
  return context;
}
