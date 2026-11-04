// Each language's own digits, as the family writes them (LedgerWell's
// numberLocalization.ts, TuneWell's digits.ts): Persian digits in Farsi,
// Arabic-Indic digits in Arabic, Latin digits in the other 28. A point or a
// comma between two digits becomes the language's decimal or thousands mark
// (۱٫۵, ١٬٢٣٤). Done by hand, not through Intl: Hermes on Android has no full
// ICU.
//
// Kept as they are: version numbers, numbers inside feed titles and article
// text, and anything that leaves the app (the backup file, shared text). So a
// caller localizes the numbers it writes, never text it was given.

const LOCAL = {
  fa: { digits: '۰۱۲۳۴۵۶۷۸۹', decimal: '٫', group: '٬' },
  ar: { digits: '٠١٢٣٤٥٦٧٨٩', decimal: '٫', group: '٬' },
};

/** The language's ten digits ("٠١٢٣٤٥٦٧٨٩"), or null where it writes Latin ones */
export const digitsOf = (language) => (LOCAL[language] ? LOCAL[language].digits : null);

/** The Latin digits in `value` written as `language` writes them; other text stays as it is */
export function localDigits(value, language) {
  if (value === null || value === undefined) return value;
  const text = String(value);
  const local = LOCAL[language];
  if (!local) return text;
  return text
    .replace(/(\d)\.(?=\d)/g, `$1${local.decimal}`)
    .replace(/(\d),(?=\d)/g, `$1${local.group}`)
    .replace(/[0-9]/g, (d) => local.digits[d.charCodeAt(0) - 48]);
}
