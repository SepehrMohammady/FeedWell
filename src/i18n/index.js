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
import es from './locales/es';
import zh from './locales/zh';
import ar from './locales/ar';
import pt from './locales/pt';
import id from './locales/id';
import ru from './locales/ru';
import ja from './locales/ja';
import fr from './locales/fr';
import de from './locales/de';
import vi from './locales/vi';
import ko from './locales/ko';
import uk from './locales/uk';
import nl from './locales/nl';
import tl from './locales/tl';
import sw from './locales/sw';
import ro from './locales/ro';
import cs from './locales/cs';
import el from './locales/el';
import hu from './locales/hu';
import he from './locales/he';
import sv from './locales/sv';
import da from './locales/da';
import fi from './locales/fi';

export { APP_LANGUAGES, SUPPORTED_LANGUAGES, RTL_LANGUAGES, getAppLanguage } from './appLanguages';

export const MAPS = { en, fa, it, hi, tr, th, pl, es, zh, ar, pt, id, ru, ja, fr, de, vi, ko, uk, nl, tl, sw, ro, cs, el, hu, he, sv, da, fi };

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
