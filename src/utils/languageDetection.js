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

// Non-RTL script Unicode ranges for language detection
const SCRIPT_RANGES = {
  cjk: [[0x4E00, 0x9FFF], [0x3400, 0x4DBF], [0x20000, 0x2A6DF]], // CJK Unified Ideographs
  hiragana: [[0x3040, 0x309F]],
  katakana: [[0x30A0, 0x30FF]],
  hangul: [[0xAC00, 0xD7AF], [0x1100, 0x11FF], [0x3130, 0x318F]],
  cyrillic: [[0x0400, 0x04FF], [0x0500, 0x052F]],
  greek: [[0x0370, 0x03FF]],
  thai: [[0x0E00, 0x0E7F]],
  devanagari: [[0x0900, 0x097F]],
  bengali: [[0x0980, 0x09FF]],
  tamil: [[0x0B80, 0x0BFF]],
  telugu: [[0x0C00, 0x0C7F]],
  georgian: [[0x10A0, 0x10FF]],
  armenian: [[0x0530, 0x058F]],
};

function countScriptChars(text, ranges) {
  let count = 0;
  for (let i = 0; i < Math.min(text.length, 2000); i++) {
    const code = text.codePointAt(i);
    if (code > 0xFFFF) i++; // skip surrogate pair
    for (const [start, end] of ranges) {
      if (code >= start && code <= end) { count++; break; }
    }
  }
  return count;
}

/**
 * Detect language based on text analysis (enhanced with multi-script support)
 */
export function detectLanguage(text) {
  if (!text) return { code: 'en', isRTL: false, confidence: 0 };
  
  const rtlPercentage = getRTLPercentage(text);
  const isRTL = rtlPercentage > 30;
  
  let detectedLang = null;
  let confidence = 0;
  
  if (isRTL) {
    // Persian detection (check for Persian-specific characters first)
    if (/[\u067E\u0686\u0698\u06AF\u06A9\u06CC]/.test(text)) {
      detectedLang = 'fa';
      confidence = 0.9;
    }
    else if (/[\u0627-\u064A]/.test(text)) {
      const persianIndicators = (text.match(/[\u067E\u0686\u0698\u06AF\u06A9\u06CC]/g) || []).length;
      const arabicIndicators = (text.match(/[\u0629\u0649\u064A\u0642\u0630\u0636\u0638]/g) || []).length;
      
      if (persianIndicators > 0 || text.includes('می') || text.includes('که') || text.includes('است')) {
        detectedLang = 'fa';
        confidence = 0.85;
      } else if (arabicIndicators > persianIndicators) {
        detectedLang = 'ar';
        confidence = 0.8;
      } else {
        detectedLang = 'ar';
        confidence = 0.6;
      }
    }
    else if (/[\u0590-\u05FF]/.test(text)) {
      detectedLang = 'he';
      confidence = 0.8;
    }
    else if (/[\u0679\u067A\u067B\u067D]/.test(text)) {
      detectedLang = 'ur';
      confidence = 0.7;
    }
    else if (/[\u0600-\u06FF]/.test(text)) {
      detectedLang = 'ar';
      confidence = 0.75;
    }
  }
  
  // Non-RTL script detection
  if (!detectedLang) {
    const sample = text.slice(0, 2000);
    
    // Japanese: has Hiragana or Katakana (CJK alone could be Chinese)
    const jpCount = countScriptChars(sample, [...SCRIPT_RANGES.hiragana, ...SCRIPT_RANGES.katakana]);
    if (jpCount > 5) {
      detectedLang = 'ja';
      confidence = 0.9;
    }
    
    // Korean: Hangul characters
    if (!detectedLang) {
      const koCount = countScriptChars(sample, SCRIPT_RANGES.hangul);
      if (koCount > 5) {
        detectedLang = 'ko';
        confidence = 0.9;
      }
    }
    
    // Chinese: CJK ideographs without Japanese kana
    if (!detectedLang) {
      const cjkCount = countScriptChars(sample, SCRIPT_RANGES.cjk);
      if (cjkCount > 10) {
        detectedLang = 'zh';
        confidence = 0.85;
      }
    }
    
    // Cyrillic (Russian most common)
    if (!detectedLang) {
      const cyCount = countScriptChars(sample, SCRIPT_RANGES.cyrillic);
      if (cyCount > 10) {
        // Ukrainian-specific characters: ґ(0x0491), є(0x0454), і(0x0456), ї(0x0457)
        if (/[\u0491\u0454\u0456\u0457]/.test(sample)) {
          detectedLang = 'uk';
          confidence = 0.8;
        } else {
          detectedLang = 'ru';
          confidence = 0.8;
        }
      }
    }
    
    // Greek
    if (!detectedLang) {
      const elCount = countScriptChars(sample, SCRIPT_RANGES.greek);
      if (elCount > 10) { detectedLang = 'el'; confidence = 0.85; }
    }
    
    // Thai
    if (!detectedLang) {
      const thCount = countScriptChars(sample, SCRIPT_RANGES.thai);
      if (thCount > 10) { detectedLang = 'th'; confidence = 0.85; }
    }
    
    // Devanagari (Hindi)
    if (!detectedLang) {
      const hiCount = countScriptChars(sample, SCRIPT_RANGES.devanagari);
      if (hiCount > 10) { detectedLang = 'hi'; confidence = 0.85; }
    }
    
    // Bengali
    if (!detectedLang) {
      const bnCount = countScriptChars(sample, SCRIPT_RANGES.bengali);
      if (bnCount > 10) { detectedLang = 'bn'; confidence = 0.85; }
    }
    
    // Latin-script language detection using common word patterns
    if (!detectedLang) {
      const lower = sample.toLowerCase();
      // Spanish
      if (/\b(el|los|las|del|una|con|por|para|como|más|pero|esto|esta|tiene|puede|donde|sobre|entre|cuando|también|después|siempre|porque)\b/.test(lower)) {
        detectedLang = 'es'; confidence = 0.7;
      }
      // French
      else if (/\b(les|des|une|dans|pour|avec|sur|pas|plus|est|sont|fait|mais|cette|comme|peut|tout|aussi|bien|même|alors|après|entre)\b/.test(lower) && /[àâçéèêëïîôùûüÿœæ]/.test(lower)) {
        detectedLang = 'fr'; confidence = 0.7;
      }
      // German
      else if (/\b(der|die|das|und|ist|ein|eine|den|dem|auf|für|mit|sich|des|nicht|von|als|auch|noch|nach|nur|über|aber|kann|wenn|werden)\b/.test(lower) && /[äöüß]/.test(lower)) {
        detectedLang = 'de'; confidence = 0.7;
      }
      // Portuguese
      else if (/\b(uma|não|com|para|como|mais|por|mas|dos|das|tem|são|foi|pelo|pela|isso|esta|esse|pode|muito|também|quando|sobre|depois|ainda)\b/.test(lower) && /[ãõçáéíóú]/.test(lower)) {
        detectedLang = 'pt'; confidence = 0.7;
      }
      // Italian
      else if (/\b(gli|nel|per|con|una|del|dei|che|non|sono|più|alla|anche|come|questo|questa|può|tutto|stato|fatto|molto|ancora|dopo|prima)\b/.test(lower) && /[àèéìíîòóùú]/.test(lower)) {
        detectedLang = 'it'; confidence = 0.7;
      }
      // Turkish
      else if (/\b(bir|bu|ve|ile|için|olan|var|çok|gibi|daha|kadar|sonra|ancak|olarak|yapı|gelen|olan|ama|hem|bazı)\b/.test(lower) && /[çğıöşü]/.test(lower)) {
        detectedLang = 'tr'; confidence = 0.7;
      }
      // Dutch
      else if (/\b(het|een|van|dat|met|zijn|voor|niet|ook|maar|nog|wel|kan|moet|deze|heeft|werd|veel|door|bij|naar|hebben|worden)\b/.test(lower)) {
        detectedLang = 'nl'; confidence = 0.65;
      }
    }
  }
  
  // Default to English if nothing else detected
  if (!detectedLang) {
    detectedLang = 'en';
    confidence = 0.3; // Low confidence — we didn't actually detect English
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
  'uk': 'Українська',
  'nl': 'Nederlands',
  'el': 'Ελληνικά',
  'th': 'ไทย',
  'bn': 'বাংলা',
  'vi': 'Tiếng Việt',
};

/**
 * Get display name for language code
 */
export function getLanguageName(languageCode) {
  return LANGUAGE_NAMES[languageCode] || languageCode.toUpperCase();
}
