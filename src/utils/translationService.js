// Offline Translation Service using Google ML Kit On-Device Translation
// Uses fast-mlkit-translate-text for on-device translation (~30MB per language model)

import FastTranslator from 'fast-mlkit-translate-text';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage key for saved target language preference
const TARGET_LANGUAGE_KEY = 'feedwell_translation_target_language';

/**
 * All available languages supported by Google ML Kit On-Device Translation.
 * Each entry has: code (BCP-47), mlKitName (what ML Kit expects), displayName.
 */
export const AVAILABLE_LANGUAGES = [
  { code: 'af', mlKitName: 'Afrikaans', displayName: 'Afrikaans' },
  { code: 'ar', mlKitName: 'Arabic', displayName: 'العربية (Arabic)' },
  { code: 'be', mlKitName: 'Belarusian', displayName: 'Беларуская (Belarusian)' },
  { code: 'bg', mlKitName: 'Bulgarian', displayName: 'Български (Bulgarian)' },
  { code: 'bn', mlKitName: 'Bengali', displayName: 'বাংলা (Bengali)' },
  { code: 'ca', mlKitName: 'Catalan', displayName: 'Català (Catalan)' },
  { code: 'cs', mlKitName: 'Czech', displayName: 'Čeština (Czech)' },
  { code: 'cy', mlKitName: 'Welsh', displayName: 'Cymraeg (Welsh)' },
  { code: 'da', mlKitName: 'Danish', displayName: 'Dansk (Danish)' },
  { code: 'de', mlKitName: 'German', displayName: 'Deutsch (German)' },
  { code: 'el', mlKitName: 'Greek', displayName: 'Ελληνικά (Greek)' },
  { code: 'en', mlKitName: 'English', displayName: 'English' },
  { code: 'eo', mlKitName: 'Esperanto', displayName: 'Esperanto' },
  { code: 'es', mlKitName: 'Spanish', displayName: 'Español (Spanish)' },
  { code: 'et', mlKitName: 'Estonian', displayName: 'Eesti (Estonian)' },
  { code: 'fa', mlKitName: 'Persian', displayName: 'فارسی (Persian)' },
  { code: 'fi', mlKitName: 'Finnish', displayName: 'Suomi (Finnish)' },
  { code: 'fr', mlKitName: 'French', displayName: 'Français (French)' },
  { code: 'ga', mlKitName: 'Irish', displayName: 'Gaeilge (Irish)' },
  { code: 'gl', mlKitName: 'Galician', displayName: 'Galego (Galician)' },
  { code: 'gu', mlKitName: 'Gujarati', displayName: 'ગુજરાતી (Gujarati)' },
  { code: 'he', mlKitName: 'Hebrew', displayName: 'עברית (Hebrew)' },
  { code: 'hi', mlKitName: 'Hindi', displayName: 'हिन्दी (Hindi)' },
  { code: 'hr', mlKitName: 'Croatian', displayName: 'Hrvatski (Croatian)' },
  { code: 'ht', mlKitName: 'Haitian Creole', displayName: 'Kreyòl ayisyen (Haitian)' },
  { code: 'hu', mlKitName: 'Hungarian', displayName: 'Magyar (Hungarian)' },
  { code: 'id', mlKitName: 'Indonesian', displayName: 'Bahasa Indonesia' },
  { code: 'is', mlKitName: 'Icelandic', displayName: 'Íslenska (Icelandic)' },
  { code: 'it', mlKitName: 'Italian', displayName: 'Italiano (Italian)' },
  { code: 'ja', mlKitName: 'Japanese', displayName: '日本語 (Japanese)' },
  { code: 'ka', mlKitName: 'Georgian', displayName: 'ქართული (Georgian)' },
  { code: 'kn', mlKitName: 'Kannada', displayName: 'ಕನ್ನಡ (Kannada)' },
  { code: 'ko', mlKitName: 'Korean', displayName: '한국어 (Korean)' },
  { code: 'lt', mlKitName: 'Lithuanian', displayName: 'Lietuvių (Lithuanian)' },
  { code: 'lv', mlKitName: 'Latvian', displayName: 'Latviešu (Latvian)' },
  { code: 'mk', mlKitName: 'Macedonian', displayName: 'Македонски (Macedonian)' },
  { code: 'mr', mlKitName: 'Marathi', displayName: 'मराठी (Marathi)' },
  { code: 'ms', mlKitName: 'Malay', displayName: 'Bahasa Melayu (Malay)' },
  { code: 'mt', mlKitName: 'Maltese', displayName: 'Malti (Maltese)' },
  { code: 'nl', mlKitName: 'Dutch', displayName: 'Nederlands (Dutch)' },
  { code: 'no', mlKitName: 'Norwegian', displayName: 'Norsk (Norwegian)' },
  { code: 'pl', mlKitName: 'Polish', displayName: 'Polski (Polish)' },
  { code: 'pt', mlKitName: 'Portuguese', displayName: 'Português (Portuguese)' },
  { code: 'ro', mlKitName: 'Romanian', displayName: 'Română (Romanian)' },
  { code: 'ru', mlKitName: 'Russian', displayName: 'Русский (Russian)' },
  { code: 'sk', mlKitName: 'Slovak', displayName: 'Slovenčina (Slovak)' },
  { code: 'sl', mlKitName: 'Slovenian', displayName: 'Slovenščina (Slovenian)' },
  { code: 'sq', mlKitName: 'Albanian', displayName: 'Shqip (Albanian)' },
  { code: 'sv', mlKitName: 'Swedish', displayName: 'Svenska (Swedish)' },
  { code: 'sw', mlKitName: 'Swahili', displayName: 'Kiswahili (Swahili)' },
  { code: 'ta', mlKitName: 'Tamil', displayName: 'தமிழ் (Tamil)' },
  { code: 'te', mlKitName: 'Telugu', displayName: 'తెలుగు (Telugu)' },
  { code: 'th', mlKitName: 'Thai', displayName: 'ไทย (Thai)' },
  { code: 'tl', mlKitName: 'Tagalog', displayName: 'Tagalog (Filipino)' },
  { code: 'tr', mlKitName: 'Turkish', displayName: 'Türkçe (Turkish)' },
  { code: 'uk', mlKitName: 'Ukrainian', displayName: 'Українська (Ukrainian)' },
  { code: 'ur', mlKitName: 'Urdu', displayName: 'اردو (Urdu)' },
  { code: 'vi', mlKitName: 'Vietnamese', displayName: 'Tiếng Việt (Vietnamese)' },
  { code: 'zh', mlKitName: 'Chinese', displayName: '中文 (Chinese)' },
];

// Quick lookup maps
const CODE_TO_MLKIT = {};
const CODE_TO_DISPLAY = {};
const MLKIT_TO_CODE = {};
AVAILABLE_LANGUAGES.forEach(lang => {
  CODE_TO_MLKIT[lang.code] = lang.mlKitName;
  CODE_TO_DISPLAY[lang.code] = lang.displayName;
  MLKIT_TO_CODE[lang.mlKitName.toLowerCase()] = lang.code;
});

/**
 * Get the ML Kit language name from a BCP-47 code
 */
export function getMLKitName(langCode) {
  return CODE_TO_MLKIT[langCode] || 'English';
}

/**
 * Get the display name from a BCP-47 code
 */
export function getDisplayName(langCode) {
  return CODE_TO_DISPLAY[langCode] || langCode;
}

/**
 * Identify the language of a text using ML Kit
 * @param {string} text - Text to identify
 * @returns {Promise<string|null>} ML Kit language name or null
 */
export async function identifyLanguage(text) {
  try {
    if (!text || text.length < 20) return null;
    // Use a sample (first 500 chars) for speed
    const sample = text.substring(0, 500);
    const result = await FastTranslator.identifyLanguage(sample);
    console.log('ML Kit language identification:', result);
    return result; // Returns ML Kit language name like "English", "Persian", etc.
  } catch (error) {
    console.error('Language identification failed:', error);
    return null;
  }
}

/**
 * Check if a specific language model is downloaded
 * @param {string} mlKitName - ML Kit language name (e.g. "English", "Persian")
 * @returns {Promise<boolean>}
 */
export async function isModelDownloaded(mlKitName) {
  try {
    return await FastTranslator.isLanguageDownloaded(mlKitName);
  } catch (error) {
    console.error('Error checking model status:', error);
    return false;
  }
}

/**
 * Get download status for all available languages
 * @returns {Promise<Array<{code, mlKitName, displayName, downloaded}>>}
 */
export async function getLanguageModelsStatus() {
  const results = [];
  for (const lang of AVAILABLE_LANGUAGES) {
    try {
      const downloaded = await FastTranslator.isLanguageDownloaded(lang.mlKitName);
      results.push({ ...lang, downloaded });
    } catch {
      results.push({ ...lang, downloaded: false });
    }
  }
  return results;
}

/**
 * Translate text from source language to target language.
 * Downloads models automatically if needed.
 * 
 * For non-English↔non-English, ML Kit routes through English internally.
 * 
 * @param {string} text - Text to translate
 * @param {string} sourceLang - ML Kit source language name (e.g. "Persian")
 * @param {string} targetLang - ML Kit target language name (e.g. "English")
 * @param {function} onProgress - Optional callback for progress updates
 * @returns {Promise<string>} Translated text
 */
export async function translateText(text, sourceLang, targetLang, onProgress) {
  if (!text || text.trim().length === 0) {
    return text;
  }

  if (sourceLang === targetLang) {
    return text;
  }

  try {
    // Step 1: Prepare translator (downloads model if needed)
    if (onProgress) onProgress('Preparing translation models...');
    
    await FastTranslator.prepare({
      source: sourceLang,
      target: targetLang,
      downloadIfNeeded: true,
    });

    // Step 2: Translate
    if (onProgress) onProgress('Translating...');
    
    // ML Kit has a practical limit per call; split long texts into paragraphs
    const MAX_CHUNK = 4000; // Safe limit for ML Kit
    
    if (text.length <= MAX_CHUNK) {
      const result = await FastTranslator.translate(text);
      return result;
    }

    // Split by paragraphs for long content
    const paragraphs = text.split(/\n\n+/);
    const translatedParagraphs = [];
    
    for (let i = 0; i < paragraphs.length; i++) {
      const paragraph = paragraphs[i];
      
      if (onProgress) {
        onProgress(`Translating... (${Math.round(((i + 1) / paragraphs.length) * 100)}%)`);
      }
      
      if (paragraph.trim().length === 0) {
        translatedParagraphs.push(paragraph);
        continue;
      }

      // If a single paragraph is too long, split by sentences
      if (paragraph.length > MAX_CHUNK) {
        const sentences = paragraph.split(/(?<=[.!?।。！？])\s+/);
        let currentBatch = '';
        const translatedSentences = [];

        for (const sentence of sentences) {
          if ((currentBatch + ' ' + sentence).length > MAX_CHUNK && currentBatch.length > 0) {
            // Re-prepare just in case (fast if already prepared)
            await FastTranslator.prepare({
              source: sourceLang,
              target: targetLang,
              downloadIfNeeded: false,
            });
            const translated = await FastTranslator.translate(currentBatch);
            translatedSentences.push(translated);
            currentBatch = sentence;
          } else {
            currentBatch += (currentBatch ? ' ' : '') + sentence;
          }
        }

        if (currentBatch.length > 0) {
          await FastTranslator.prepare({
            source: sourceLang,
            target: targetLang,
            downloadIfNeeded: false,
          });
          const translated = await FastTranslator.translate(currentBatch);
          translatedSentences.push(translated);
        }

        translatedParagraphs.push(translatedSentences.join(' '));
      } else {
        // Re-prepare before each paragraph translation (fast if already prepared)
        await FastTranslator.prepare({
          source: sourceLang,
          target: targetLang,
          downloadIfNeeded: false,
        });
        const translated = await FastTranslator.translate(paragraph);
        translatedParagraphs.push(translated);
      }
    }

    return translatedParagraphs.join('\n\n');
  } catch (error) {
    console.error('Translation failed:', error);
    throw new Error(`Translation failed: ${error.message}`);
  }
}

/**
 * Map our local language detection code to ML Kit language name.
 * Our languageDetection.js uses BCP-47 codes (fa, ar, en, etc.)
 */
export function localCodeToMLKit(localCode) {
  if (!localCode) return 'English';
  // Handle the special 'rtl' code from our detector
  if (localCode === 'rtl') return null; // Can't determine specific language
  return CODE_TO_MLKIT[localCode] || null;
}

/**
 * Save the user's preferred target language
 */
export async function saveTargetLanguage(langCode) {
  try {
    await AsyncStorage.setItem(TARGET_LANGUAGE_KEY, langCode);
  } catch (error) {
    console.error('Error saving target language:', error);
  }
}

/**
 * Load the user's preferred target language (defaults to 'en')
 */
export async function loadTargetLanguage() {
  try {
    const saved = await AsyncStorage.getItem(TARGET_LANGUAGE_KEY);
    return saved || 'en';
  } catch (error) {
    console.error('Error loading target language:', error);
    return 'en';
  }
}

/**
 * Get popular/commonly used languages (shown first in pickers)
 */
export function getPopularLanguages() {
  const popularCodes = ['en', 'fa', 'ar', 'es', 'fr', 'de', 'zh', 'ja', 'ko', 'ru', 'pt', 'tr', 'hi', 'ur'];
  return AVAILABLE_LANGUAGES.filter(lang => popularCodes.includes(lang.code));
}

export default {
  translateText,
  identifyLanguage,
  isModelDownloaded,
  getLanguageModelsStatus,
  getMLKitName,
  getDisplayName,
  localCodeToMLKit,
  saveTargetLanguage,
  loadTargetLanguage,
  getPopularLanguages,
  AVAILABLE_LANGUAGES,
};
