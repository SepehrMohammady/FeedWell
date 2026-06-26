// App UI languages (distinct from the article-translation languages in
// translationService.js). nativeLabel is shown in the language picker.

export const APP_LANGUAGES = [
  { code: 'en', nativeLabel: 'English',  englishLabel: 'English',  isRTL: false },
  { code: 'fa', nativeLabel: 'فارسی',   englishLabel: 'Persian',  isRTL: true  },
  { code: 'it', nativeLabel: 'Italiano', englishLabel: 'Italian',  isRTL: false },
  { code: 'hi', nativeLabel: 'हिन्दी',    englishLabel: 'Hindi',    isRTL: false },
  { code: 'tr', nativeLabel: 'Türkçe',  englishLabel: 'Turkish',  isRTL: false },
  { code: 'th', nativeLabel: 'ไทย',     englishLabel: 'Thai',     isRTL: false },
  { code: 'pl', nativeLabel: 'Polski',   englishLabel: 'Polish',   isRTL: false },
];

export const SUPPORTED_LANGUAGES = APP_LANGUAGES.map((l) => l.code);
export const RTL_LANGUAGES = APP_LANGUAGES.filter((l) => l.isRTL).map((l) => l.code);

export function getAppLanguage(code) {
  return APP_LANGUAGES.find((l) => l.code === code) || APP_LANGUAGES[0];
}
