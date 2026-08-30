// App UI languages (distinct from the article-translation languages in
// translationService.js). nativeLabel is shown in the language picker.

// Sorted alphabetically by English name (standard ordering for the picker).
export const APP_LANGUAGES = [
  { code: 'ar', nativeLabel: 'العربية',  englishLabel: 'Arabic',     isRTL: true  },
  { code: 'zh', nativeLabel: '中文',     englishLabel: 'Chinese',    isRTL: false },
  { code: 'nl', nativeLabel: 'Nederlands', englishLabel: 'Dutch',    isRTL: false },
  { code: 'en', nativeLabel: 'English',  englishLabel: 'English',    isRTL: false },
  { code: 'fa', nativeLabel: 'فارسی',   englishLabel: 'Farsi',      isRTL: true  },
  { code: 'tl', nativeLabel: 'Filipino', englishLabel: 'Filipino',  isRTL: false },
  { code: 'fr', nativeLabel: 'Français', englishLabel: 'French',     isRTL: false },
  { code: 'de', nativeLabel: 'Deutsch',  englishLabel: 'German',     isRTL: false },
  { code: 'hi', nativeLabel: 'हिन्दी',    englishLabel: 'Hindi',      isRTL: false },
  { code: 'id', nativeLabel: 'Bahasa Indonesia', englishLabel: 'Indonesian', isRTL: false },
  { code: 'it', nativeLabel: 'Italiano', englishLabel: 'Italian',    isRTL: false },
  { code: 'ja', nativeLabel: '日本語',   englishLabel: 'Japanese',   isRTL: false },
  { code: 'ko', nativeLabel: '한국어',   englishLabel: 'Korean',     isRTL: false },
  { code: 'pl', nativeLabel: 'Polski',   englishLabel: 'Polish',     isRTL: false },
  { code: 'pt', nativeLabel: 'Português', englishLabel: 'Portuguese', isRTL: false },
  { code: 'ro', nativeLabel: 'Română',   englishLabel: 'Romanian',   isRTL: false },
  { code: 'ru', nativeLabel: 'Русский',  englishLabel: 'Russian',    isRTL: false },
  { code: 'es', nativeLabel: 'Español',  englishLabel: 'Spanish',    isRTL: false },
  { code: 'sw', nativeLabel: 'Kiswahili', englishLabel: 'Swahili',   isRTL: false },
  { code: 'th', nativeLabel: 'ไทย',     englishLabel: 'Thai',       isRTL: false },
  { code: 'tr', nativeLabel: 'Türkçe',  englishLabel: 'Turkish',    isRTL: false },
  { code: 'uk', nativeLabel: 'Українська', englishLabel: 'Ukrainian', isRTL: false },
  { code: 'vi', nativeLabel: 'Tiếng Việt', englishLabel: 'Vietnamese', isRTL: false },
];

export const SUPPORTED_LANGUAGES = APP_LANGUAGES.map((l) => l.code);
export const RTL_LANGUAGES = APP_LANGUAGES.filter((l) => l.isRTL).map((l) => l.code);

export function getAppLanguage(code) {
  return APP_LANGUAGES.find((l) => l.code === code) || APP_LANGUAGES[0];
}
