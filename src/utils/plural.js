import { MAPS } from '../i18n';

// Counted words: the form a language uses for a number ("a year", "2 years",
// and in Russian "2 года" but "5 лет"). A counted string has its forms under
// the CLDR names, <key>_zero, _one, _two, _few, _many and _other, each
// language giving the ones it needs, as LedgerWell's catalogs do. The rules
// are written out because Hermes has no Intl.PluralRules; they are CLDR's
// cardinal rules for whole numbers, the only numbers counted this way.

export function pluralCategory(language, n) {
  const i = Math.floor(Math.abs(n));
  const n10 = i % 10;
  const n100 = i % 100;
  switch (language) {
    case 'ar':
      if (i === 0) return 'zero';
      if (i === 1) return 'one';
      if (i === 2) return 'two';
      if (n100 >= 3 && n100 <= 10) return 'few';
      if (n100 >= 11 && n100 <= 99) return 'many';
      return 'other';
    case 'he':
      if (i === 1) return 'one';
      if (i === 2) return 'two';
      return 'other';
    case 'ru':
    case 'uk':
      if (n10 === 1 && n100 !== 11) return 'one';
      if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return 'few';
      return 'many';
    case 'pl':
      if (i === 1) return 'one';
      if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return 'few';
      return 'many';
    case 'cs':
      if (i === 1) return 'one';
      if (i >= 2 && i <= 4) return 'few';
      return 'other';
    case 'ro':
      // few: 0, and 2 to 19 after the hundreds (101 and 119 too: "101 ani")
      if (i === 1) return 'one';
      if (i === 0 || (n100 >= 1 && n100 <= 19)) return 'few';
      return 'other';
    case 'fr':
    case 'pt':
    case 'hi':
    case 'fa':
      return i === 0 || i === 1 ? 'one' : 'other';
    case 'tl':
      return n10 === 4 || n10 === 6 || n10 === 9 ? 'other' : 'one';
    case 'ja':
    case 'ko':
    case 'zh':
    case 'th':
    case 'vi':
    case 'id':
      return 'other';
    default:
      // English, German, Dutch, Swedish, Danish, Finnish, Italian, Spanish,
      // Greek, Hungarian, Turkish, Swahili
      return i === 1 ? 'one' : 'other';
  }
}

/**
 * The key of a counted string for this number: the language's own form when
 * it has one, else its "other" form, else English's form for the number.
 */
export function countedKey(key, n, language) {
  const own = MAPS[language] || MAPS.en;
  const form = `${key}_${pluralCategory(language, n)}`;
  if (own[form] != null) return form;
  if (own[`${key}_other`] != null) return `${key}_other`;
  return `${key}_${pluralCategory('en', n)}`;
}
