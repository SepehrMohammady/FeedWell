import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { NativeModules, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { tStatic } from '../i18n';
import { SUPPORTED_LANGUAGES, RTL_LANGUAGES } from '../i18n/appLanguages';
import { toPersianDigits } from '../utils/persianDigits';

export const APP_LANGUAGE_KEY = 'appLanguage';

// Best-effort device language detection without adding a native dependency
// (mirrors the approach already used in translationService.loadTargetLanguage).
export function detectDeviceLanguage() {
  try {
    const locale = Platform.OS === 'ios'
      ? (NativeModules.SettingsManager?.settings?.AppleLocale
        || NativeModules.SettingsManager?.settings?.AppleLanguages?.[0]
        || 'en')
      : (NativeModules.I18nManager?.localeIdentifier || 'en');
    const code = String(locale).split(/[-_]/)[0].toLowerCase();
    return SUPPORTED_LANGUAGES.includes(code) ? code : 'en';
  } catch (e) {
    return 'en';
  }
}

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState('en');
  const [langLoading, setLangLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(APP_LANGUAGE_KEY);
        if (!mounted) return;
        if (saved && SUPPORTED_LANGUAGES.includes(saved)) {
          setLanguageState(saved);
        } else {
          // Default to the device language on first run, but do NOT persist it,
          // so a later device-language change still applies until the user picks
          // explicitly (mirrors ThemeContext's auto-scheme behavior).
          setLanguageState(detectDeviceLanguage());
        }
      } catch (e) {
        // keep the 'en' default
      } finally {
        if (mounted) setLangLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const setLanguage = useCallback(async (code) => {
    if (!SUPPORTED_LANGUAGES.includes(code)) return;
    setLanguageState(code);
    try { await AsyncStorage.setItem(APP_LANGUAGE_KEY, code); } catch (e) { /* ignore */ }
  }, []);

  // Stable per-language: changes only when `language` changes (which is exactly
  // when every consumer should re-render).
  const t = useCallback((key, vars) => tStatic(key, language, vars), [language]);

  const formatNumber = useCallback((value) => {
    const s = String(value);
    return language === 'fa' ? toPersianDigits(s) : s;
  }, [language]);

  const isRTL = RTL_LANGUAGES.includes(language);
  const dir = isRTL ? 'rtl' : 'ltr';

  const value = useMemo(() => ({
    language, setLanguage, t, formatNumber, isRTL, dir, langLoading,
  }), [language, setLanguage, t, formatNumber, isRTL, dir, langLoading]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useTranslation must be used within a LanguageProvider');
  return ctx;
}

export default LanguageContext;
