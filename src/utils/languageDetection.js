// Language detection and RTL support utilities

// RTL language codes
const RTL_LANGUAGES = [
  'ar',   // Arabic
  'fa',   // Persian/Farsi
  'he',   // Hebrew
  'ur',   // Urdu
  'yi',   // Yiddish
  'ku',   // Kurdish
  'ps',   // Pashto
  'sd',   // Sindhi
  'dv',   // Divehi
  'arc',  // Aramaic
  'syc',  // Classical Syriac
];

// RTL Unicode ranges
const RTL_UNICODE_RANGES = [
  [0x0590, 0x05FF], // Hebrew
  [0x0600, 0x06FF], // Arabic
  [0x0700, 0x074F], // Syriac
  [0x0750, 0x077F], // Arabic Supplement
  [0x0780, 0x07BF], // Thaana (Divehi)
  [0x08A0, 0x08FF], // Arabic Extended-A
  [0xFB1D, 0xFB4F], // Hebrew Presentation Forms
  [0xFB50, 0xFDFF], // Arabic Presentation Forms-A
  [0xFE70, 0xFEFF], // Arabic Presentation Forms-B
];

/**
 * Detect if a character is RTL
 */
export function isRTLCharacter(char) {
  const code = char.charCodeAt(0);
  return RTL_UNICODE_RANGES.some(([start, end]) => code >= start && code <= end);
}

/**
 * Detect if text contains RTL characters
 */
export function containsRTL(text) {
  if (!text) return false;
  
  // Check for RTL characters in the text
  for (let i = 0; i < text.length; i++) {
    if (isRTLCharacter(text[i])) {
      return true;
    }
  }
  
  return false;
}

/**
 * Calculate RTL percentage in text
 */
export function getRTLPercentage(text) {
  if (!text) return 0;
  
  let rtlCount = 0;
  let letterCount = 0;
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    // Only count letters (not spaces, punctuation, etc.)
    if (/\p{L}/u.test(char)) {
      letterCount++;
      if (isRTLCharacter(char)) {
        rtlCount++;
      }
    }
  }
  
  return letterCount > 0 ? (rtlCount / letterCount) * 100 : 0;
}

/**
 * Detect if text is primarily RTL
 */
export function isPrimaryRTL(text) {
  if (!text) return false;
  
  const rtlPercentage = getRTLPercentage(text);
  // Consider text RTL if more than 30% of letters are RTL
  return rtlPercentage > 30;
}

/**
 * Detect language based on text analysis
 */
export function detectLanguage(text) {
  if (!text) return { code: 'en', isRTL: false, confidence: 0 };
  
  const rtlPercentage = getRTLPercentage(text);
  const isRTL = rtlPercentage > 30;
  
  // Simple heuristic-based detection
  let detectedLang = 'en';
  let confidence = 0.5;
  
  if (isRTL) {
    // Arabic detection
    if (/[\u0600-\u06FF]/.test(text)) {
      detectedLang = 'ar';
      confidence = 0.8;
    }
    // Persian detection (has some unique characters)
    else if (/[\u067E\u0686\u0698\u06AF]/.test(text)) {
      detectedLang = 'fa';
      confidence = 0.8;
    }
    // Hebrew detection
    else if (/[\u0590-\u05FF]/.test(text)) {
      detectedLang = 'he';
      confidence = 0.8;
    }
    // Urdu detection (uses Arabic script but has some distinctions)
    else if (/[\u0679\u067A\u067B\u067D]/.test(text)) {
      detectedLang = 'ur';
      confidence = 0.7;
    }
    // General RTL fallback
    else {
      detectedLang = 'ar'; // Default to Arabic for RTL text
      confidence = 0.6;
    }
  }
  
  return {
    code: detectedLang,
    isRTL: isRTL,
    confidence: confidence,
    rtlPercentage: rtlPercentage
  };
}

/**
 * Get appropriate text direction for content
 */
export function getTextDirection(text) {
  const detection = detectLanguage(text);
  return detection.isRTL ? 'rtl' : 'ltr';
}

/**
 * Get appropriate text alignment for content
 */
export function getTextAlignment(text) {
  const detection = detectLanguage(text);
  return detection.isRTL ? 'right' : 'left';
}

/**
 * Language names mapping
 */
export const LANGUAGE_NAMES = {
  'ar': 'العربية',
  'fa': 'فارسی',
  'he': 'עברית',
  'ur': 'اردو',
  'en': 'English',
  'es': 'Español',
  'fr': 'Français',
  'de': 'Deutsch',
  'it': 'Italiano',
  'pt': 'Português',
  'ru': 'Русский',
  'zh': '中文',
  'ja': '日本語',
  'ko': '한국어',
  'hi': 'हिन्दी',
  'tr': 'Türkçe',
};

/**
 * Get display name for language code
 */
export function getLanguageName(languageCode) {
  return LANGUAGE_NAMES[languageCode] || languageCode.toUpperCase();
}
