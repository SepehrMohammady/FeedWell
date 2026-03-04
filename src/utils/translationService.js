// Hybrid Translation Service: Google Translate (online) + ML Kit (offline fallback)
// Primary: Google Translate free API — high quality, 100+ languages
// Fallback: ML Kit On-Device Translation — basic quality, works without internet

import FastTranslator from 'fast-mlkit-translate-text';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys
const TARGET_LANGUAGE_KEY = 'feedwell_translation_target_language';
const TRANSLATION_MODE_KEY = 'feedwell_translation_mode';

// Translation modes
export const TRANSLATION_MODES = {
  AUTO: 'auto',         // Online first, offline fallback
  ONLINE: 'online',     // Online only (Google Translate)
  OFFLINE: 'offline',   // Offline only (ML Kit)
};

/**
 * All available languages.
 * code: BCP-47 code (used for Google Translate & internal)
 * mlKitName: ML Kit name (used for offline translation)
 * displayName: User-facing name
 */
export const AVAILABLE_LANGUAGES = [
  { code: 'af', mlKitName: 'Afrikaans', displayName: 'Afrikaans' },
  { code: 'ar', mlKitName: 'Arabic', displayName: '\u0627\u0644\u0639\u0631\u0628\u064A\u0629 (Arabic)' },
  { code: 'be', mlKitName: 'Belarusian', displayName: '\u0411\u0435\u043B\u0430\u0440\u0443\u0441\u043A\u0430\u044F (Belarusian)' },
  { code: 'bg', mlKitName: 'Bulgarian', displayName: '\u0411\u044A\u043B\u0433\u0430\u0440\u0441\u043A\u0438 (Bulgarian)' },
  { code: 'bn', mlKitName: 'Bengali', displayName: '\u09AC\u09BE\u0982\u09B2\u09BE (Bengali)' },
  { code: 'ca', mlKitName: 'Catalan', displayName: 'Catal\u00E0 (Catalan)' },
  { code: 'cs', mlKitName: 'Czech', displayName: '\u010Ce\u0161tina (Czech)' },
  { code: 'cy', mlKitName: 'Welsh', displayName: 'Cymraeg (Welsh)' },
  { code: 'da', mlKitName: 'Danish', displayName: 'Dansk (Danish)' },
  { code: 'de', mlKitName: 'German', displayName: 'Deutsch (German)' },
  { code: 'el', mlKitName: 'Greek', displayName: '\u0395\u03BB\u03BB\u03B7\u03BD\u03B9\u03BA\u03AC (Greek)' },
  { code: 'en', mlKitName: 'English', displayName: 'English' },
  { code: 'eo', mlKitName: 'Esperanto', displayName: 'Esperanto' },
  { code: 'es', mlKitName: 'Spanish', displayName: 'Espa\u00F1ol (Spanish)' },
  { code: 'et', mlKitName: 'Estonian', displayName: 'Eesti (Estonian)' },
  { code: 'fa', mlKitName: 'Persian', displayName: '\u0641\u0627\u0631\u0633\u06CC (Persian)' },
  { code: 'fi', mlKitName: 'Finnish', displayName: 'Suomi (Finnish)' },
  { code: 'fr', mlKitName: 'French', displayName: 'Fran\u00E7ais (French)' },
  { code: 'ga', mlKitName: 'Irish', displayName: 'Gaeilge (Irish)' },
  { code: 'gl', mlKitName: 'Galician', displayName: 'Galego (Galician)' },
  { code: 'gu', mlKitName: 'Gujarati', displayName: '\u0A97\u0AC1\u0A9C\u0AB0\u0ABE\u0AA4\u0AC0 (Gujarati)' },
  { code: 'he', mlKitName: 'Hebrew', displayName: '\u05E2\u05D1\u05E8\u05D9\u05EA (Hebrew)' },
  { code: 'hi', mlKitName: 'Hindi', displayName: '\u0939\u093F\u0928\u094D\u0926\u0940 (Hindi)' },
  { code: 'hr', mlKitName: 'Croatian', displayName: 'Hrvatski (Croatian)' },
  { code: 'ht', mlKitName: 'Haitian Creole', displayName: 'Krey\u00F2l ayisyen (Haitian)' },
  { code: 'hu', mlKitName: 'Hungarian', displayName: 'Magyar (Hungarian)' },
  { code: 'id', mlKitName: 'Indonesian', displayName: 'Bahasa Indonesia' },
  { code: 'is', mlKitName: 'Icelandic', displayName: '\u00CDslenska (Icelandic)' },
  { code: 'it', mlKitName: 'Italian', displayName: 'Italiano (Italian)' },
  { code: 'ja', mlKitName: 'Japanese', displayName: '\u65E5\u672C\u8A9E (Japanese)' },
  { code: 'ka', mlKitName: 'Georgian', displayName: '\u10E5\u10D0\u10E0\u10D7\u10E3\u10DA\u10D8 (Georgian)' },
  { code: 'kn', mlKitName: 'Kannada', displayName: '\u0C95\u0CA8\u0CCD\u0CA8\u0CA1 (Kannada)' },
  { code: 'ko', mlKitName: 'Korean', displayName: '\uD55C\uAD6D\uC5B4 (Korean)' },
  { code: 'lt', mlKitName: 'Lithuanian', displayName: 'Lietuvi\u0173 (Lithuanian)' },
  { code: 'lv', mlKitName: 'Latvian', displayName: 'Latvie\u0161u (Latvian)' },
  { code: 'mk', mlKitName: 'Macedonian', displayName: '\u041C\u0430\u043A\u0435\u0434\u043E\u043D\u0441\u043A\u0438 (Macedonian)' },
  { code: 'mr', mlKitName: 'Marathi', displayName: '\u092E\u0930\u093E\u0920\u0940 (Marathi)' },
  { code: 'ms', mlKitName: 'Malay', displayName: 'Bahasa Melayu (Malay)' },
  { code: 'mt', mlKitName: 'Maltese', displayName: 'Malti (Maltese)' },
  { code: 'nl', mlKitName: 'Dutch', displayName: 'Nederlands (Dutch)' },
  { code: 'no', mlKitName: 'Norwegian', displayName: 'Norsk (Norwegian)' },
  { code: 'pl', mlKitName: 'Polish', displayName: 'Polski (Polish)' },
  { code: 'pt', mlKitName: 'Portuguese', displayName: 'Portugu\u00EAs (Portuguese)' },
  { code: 'ro', mlKitName: 'Romanian', displayName: 'Rom\u00E2n\u0103 (Romanian)' },
  { code: 'ru', mlKitName: 'Russian', displayName: '\u0420\u0443\u0441\u0441\u043A\u0438\u0439 (Russian)' },
  { code: 'sk', mlKitName: 'Slovak', displayName: 'Sloven\u010Dina (Slovak)' },
  { code: 'sl', mlKitName: 'Slovenian', displayName: 'Sloven\u0161\u010Dina (Slovenian)' },
  { code: 'sq', mlKitName: 'Albanian', displayName: 'Shqip (Albanian)' },
  { code: 'sv', mlKitName: 'Swedish', displayName: 'Svenska (Swedish)' },
  { code: 'sw', mlKitName: 'Swahili', displayName: 'Kiswahili (Swahili)' },
  { code: 'ta', mlKitName: 'Tamil', displayName: '\u0BA4\u0BAE\u0BBF\u0BB4\u0BCD (Tamil)' },
  { code: 'te', mlKitName: 'Telugu', displayName: '\u0C24\u0C46\u0C32\u0C41\u0C17\u0C41 (Telugu)' },
  { code: 'th', mlKitName: 'Thai', displayName: '\u0E44\u0E17\u0E22 (Thai)' },
  { code: 'tl', mlKitName: 'Tagalog', displayName: 'Tagalog (Filipino)' },
  { code: 'tr', mlKitName: 'Turkish', displayName: 'T\u00FCrk\u00E7e (Turkish)' },
  { code: 'uk', mlKitName: 'Ukrainian', displayName: '\u0423\u043A\u0440\u0430\u0457\u043D\u0441\u044C\u043A\u0430 (Ukrainian)' },
  { code: 'ur', mlKitName: 'Urdu', displayName: '\u0627\u0631\u062F\u0648 (Urdu)' },
  { code: 'vi', mlKitName: 'Vietnamese', displayName: 'Ti\u1EBFng Vi\u1EC7t (Vietnamese)' },
  { code: 'zh', mlKitName: 'Chinese', displayName: '\u4E2D\u6587 (Chinese)' },
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

export function getMLKitName(langCode) {
  return CODE_TO_MLKIT[langCode] || 'English';
}

export function getDisplayName(langCode) {
  return CODE_TO_DISPLAY[langCode] || langCode;
}

// --- Google Translate (Online) ---

async function translateOnline(text, sourceLang, targetLang, onProgress) {
  if (!text || text.trim().length === 0) return text;
  const MAX_CHARS = 4500;
  if (text.length <= MAX_CHARS) {
    if (onProgress) onProgress('Translating online...');
    return await googleTranslateRequest(text, sourceLang, targetLang);
  }
  const paragraphs = text.split(/\n\n+/);
  const translatedParagraphs = [];
  for (let i = 0; i < paragraphs.length; i++) {
    const paragraph = paragraphs[i];
    if (onProgress) onProgress('Translating online... (' + Math.round(((i+1)/paragraphs.length)*100) + '%)');
    if (paragraph.trim().length === 0) { translatedParagraphs.push(paragraph); continue; }
    if (paragraph.length > MAX_CHARS) {
      const sentences = paragraph.split(/(?<=[.!?\u0964\u3002\uFF01\uFF1F])\s+/);
      let batch = '';
      const results = [];
      for (const sentence of sentences) {
        if ((batch + ' ' + sentence).length > MAX_CHARS && batch.length > 0) {
          results.push(await googleTranslateRequest(batch, sourceLang, targetLang));
          batch = sentence;
        } else {
          batch += (batch ? ' ' : '') + sentence;
        }
      }
      if (batch.length > 0) results.push(await googleTranslateRequest(batch, sourceLang, targetLang));
      translatedParagraphs.push(results.join(' '));
    } else {
      translatedParagraphs.push(await googleTranslateRequest(paragraph, sourceLang, targetLang));
    }
  }
  return translatedParagraphs.join('\n\n');
}

async function googleTranslateRequest(text, sourceLang, targetLang) {
  const url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=' + sourceLang + '&tl=' + targetLang + '&dt=t&q=' + encodeURIComponent(text);
  const response = await fetch(url, { method: 'GET', headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!response.ok) throw new Error('Google Translate returned ' + response.status);
  const data = await response.json();
  if (!data || !data[0]) throw new Error('Unexpected response from Google Translate');
  let result = '';
  for (const segment of data[0]) {
    if (segment && segment[0]) result += segment[0];
  }
  return result;
}

async function detectLanguageOnline(text) {
  const sample = text.substring(0, 300);
  const url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=' + encodeURIComponent(sample);
  const response = await fetch(url, { method: 'GET', headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!response.ok) throw new Error('Language detection failed');
  const data = await response.json();
  return data[2] || 'en';
}

// --- ML Kit (Offline) ---

async function translateOffline(text, sourceLang, targetLang, onProgress) {
  if (!text || text.trim().length === 0) return text;
  const sourceMlKit = CODE_TO_MLKIT[sourceLang] || 'English';
  const targetMlKit = CODE_TO_MLKIT[targetLang] || 'English';
  if (sourceMlKit === targetMlKit) return text;
  if (onProgress) onProgress('Preparing offline models...');
  await FastTranslator.prepare({ source: sourceMlKit, target: targetMlKit, downloadIfNeeded: true });
  const MAX_CHUNK = 4000;
  if (text.length <= MAX_CHUNK) {
    if (onProgress) onProgress('Translating offline...');
    return await FastTranslator.translate(text);
  }
  const paragraphs = text.split(/\n\n+/);
  const translatedParagraphs = [];
  for (let i = 0; i < paragraphs.length; i++) {
    const paragraph = paragraphs[i];
    if (onProgress) onProgress('Translating offline... (' + Math.round(((i+1)/paragraphs.length)*100) + '%)');
    if (paragraph.trim().length === 0) { translatedParagraphs.push(paragraph); continue; }
    if (paragraph.length > MAX_CHUNK) {
      const sentences = paragraph.split(/(?<=[.!?\u0964\u3002\uFF01\uFF1F])\s+/);
      let batch = '';
      const results = [];
      for (const sentence of sentences) {
        if ((batch + ' ' + sentence).length > MAX_CHUNK && batch.length > 0) {
          await FastTranslator.prepare({ source: sourceMlKit, target: targetMlKit, downloadIfNeeded: false });
          results.push(await FastTranslator.translate(batch));
          batch = sentence;
        } else { batch += (batch ? ' ' : '') + sentence; }
      }
      if (batch.length > 0) {
        await FastTranslator.prepare({ source: sourceMlKit, target: targetMlKit, downloadIfNeeded: false });
        results.push(await FastTranslator.translate(batch));
      }
      translatedParagraphs.push(results.join(' '));
    } else {
      await FastTranslator.prepare({ source: sourceMlKit, target: targetMlKit, downloadIfNeeded: false });
      translatedParagraphs.push(await FastTranslator.translate(paragraph));
    }
  }
  return translatedParagraphs.join('\n\n');
}

// --- Hybrid Translate (Main API) ---

export async function translateText(text, sourceLangCode, targetLangCode, onProgress, mode = TRANSLATION_MODES.AUTO) {
  if (!text || text.trim().length === 0) return { text, method: 'none' };
  if (sourceLangCode === targetLangCode) return { text, method: 'none' };

  if (mode === TRANSLATION_MODES.OFFLINE) {
    if (onProgress) onProgress('Using offline translation...');
    const result = await translateOffline(text, sourceLangCode, targetLangCode, onProgress);
    return { text: result, method: 'offline' };
  }

  if (mode === TRANSLATION_MODES.ONLINE) {
    if (onProgress) onProgress('Using online translation...');
    const result = await translateOnline(text, sourceLangCode, targetLangCode, onProgress);
    return { text: result, method: 'online' };
  }

  // AUTO mode: try online first, fall back to offline
  try {
    if (onProgress) onProgress('Translating online...');
    const result = await translateOnline(text, sourceLangCode, targetLangCode, onProgress);
    return { text: result, method: 'online' };
  } catch (onlineError) {
    console.log('Online translation failed, falling back to offline:', onlineError.message);
  }

  try {
    if (onProgress) onProgress('Switching to offline translation...');
    const result = await translateOffline(text, sourceLangCode, targetLangCode, onProgress);
    return { text: result, method: 'offline' };
  } catch (offlineError) {
    throw new Error('Translation failed: ' + offlineError.message);
  }
}

// --- Language Detection ---

export async function identifyLanguage(text) {
  if (!text || text.length < 20) return null;
  try {
    const langCode = await detectLanguageOnline(text);
    console.log('Online language detection:', langCode);
    return langCode;
  } catch (error) {
    console.log('Online language detection failed:', error.message);
  }
  try {
    const sample = text.substring(0, 500);
    const mlKitResult = await FastTranslator.identifyLanguage(sample);
    console.log('ML Kit language identification:', mlKitResult);
    const code = MLKIT_TO_CODE[mlKitResult?.toLowerCase()];
    return code || null;
  } catch (error) {
    console.error('ML Kit language identification failed:', error);
    return null;
  }
}

export async function isModelDownloaded(mlKitName) {
  try { return await FastTranslator.isLanguageDownloaded(mlKitName); }
  catch (error) { console.error('Error checking model status:', error); return false; }
}

export async function downloadModel(mlKitName) {
  try {
    await FastTranslator.downloadLanguageModel(mlKitName);
    return true;
  } catch (error) {
    console.error('Error downloading model:', error);
    return false;
  }
}

export async function deleteModel(mlKitName) {
  try {
    await FastTranslator.deleteLanguageModel(mlKitName);
    return true;
  } catch (error) {
    console.error('Error deleting model:', error);
    return false;
  }
}

export async function getLanguageModelsStatus() {
  const results = [];
  for (const lang of AVAILABLE_LANGUAGES) {
    try {
      const downloaded = await FastTranslator.isLanguageDownloaded(lang.mlKitName);
      results.push({ ...lang, downloaded });
    } catch { results.push({ ...lang, downloaded: false }); }
  }
  return results;
}

// --- Settings Persistence ---

export function localCodeToMLKit(localCode) {
  if (!localCode) return 'en';
  if (localCode === 'rtl') return null;
  return CODE_TO_MLKIT[localCode] ? localCode : null;
}

export async function saveTargetLanguage(langCode) {
  try { await AsyncStorage.setItem(TARGET_LANGUAGE_KEY, langCode); }
  catch (error) { console.error('Error saving target language:', error); }
}

export async function loadTargetLanguage() {
  try { const saved = await AsyncStorage.getItem(TARGET_LANGUAGE_KEY); return saved || 'en'; }
  catch (error) { console.error('Error loading target language:', error); return 'en'; }
}

export async function saveTranslationMode(mode) {
  try { await AsyncStorage.setItem(TRANSLATION_MODE_KEY, mode); }
  catch (error) { console.error('Error saving translation mode:', error); }
}

export async function loadTranslationMode() {
  try { const saved = await AsyncStorage.getItem(TRANSLATION_MODE_KEY); return saved || TRANSLATION_MODES.AUTO; }
  catch (error) { console.error('Error loading translation mode:', error); return TRANSLATION_MODES.AUTO; }
}

export function getPopularLanguages() {
  const popularCodes = ['en', 'fa', 'ar', 'es', 'fr', 'de', 'zh', 'ja', 'ko', 'ru', 'pt', 'tr', 'hi', 'ur'];
  return AVAILABLE_LANGUAGES.filter(lang => popularCodes.includes(lang.code));
}

export default {
  translateText, identifyLanguage, isModelDownloaded, downloadModel, deleteModel, getLanguageModelsStatus,
  getMLKitName, getDisplayName, localCodeToMLKit, saveTargetLanguage, loadTargetLanguage,
  saveTranslationMode, loadTranslationMode, getPopularLanguages,
  AVAILABLE_LANGUAGES, TRANSLATION_MODES,
};
