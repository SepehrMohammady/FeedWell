// i18n aggregator. Exposes the locale maps, a non-hook translation lookup
// (tStatic) for use outside React (e.g. background notifications), and the
// supported-language config.

import en from './locales/en';
import fa from './locales/fa';
import it from './locales/it';
import hi from './locales/hi';
import tr from './locales/tr';
import th from './locales/th';
import pl from './locales/pl';

export { APP_LANGUAGES, SUPPORTED_LANGUAGES, RTL_LANGUAGES, getAppLanguage } from './appLanguages';

export const MAPS = { en, fa, it, hi, tr, th, pl };

function interpolate(str, vars) {
  if (!vars || typeof str !== 'string') return str;
  return str.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? String(vars[k]) : m));
}

// Look up a key for a language, falling back to English, then the key itself.
export function tStatic(key, lang = 'en', vars) {
  const map = MAPS[lang] || MAPS.en;
  const raw = (map && map[key] != null) ? map[key]
    : (MAPS.en[key] != null ? MAPS.en[key] : key);
  return interpolate(raw, vars);
}

export function getMap(lang) {
  return MAPS[lang] || MAPS.en;
}
