// Fonts offered in Settings > Reading Font, applied to the in-app article
// reader. Two kinds are mixed deliberately:
//
//  - Android's built-in families ('serif', 'sans-serif', ...) cost nothing in
//    app size and are always available.
//  - Three bundled open-licence faces chosen for reading rather than novelty:
//    Atkinson Hyperlegible (Braille Institute — designed so similar glyphs stay
//    distinguishable), Lora (a screen-tuned book serif), and OpenDyslexic
//    (weighted bottoms to reduce letter flipping). ~680 KB total, loaded from
//    assets/fonts — nothing is fetched at runtime, so this stays offline-safe.
//
// `label` is a proper noun and is never translated; `labelKey` entries are
// generic names and resolve through i18n.

export const READING_FONTS = [
  { key: 'system', labelKey: 'font.system', regular: null, bold: null },
  { key: 'serif', labelKey: 'font.serif', regular: 'serif', bold: 'serif' },
  { key: 'sans', labelKey: 'font.sans', regular: 'sans-serif', bold: 'sans-serif' },
  { key: 'condensed', labelKey: 'font.condensed', regular: 'sans-serif-condensed', bold: 'sans-serif-condensed' },
  { key: 'mono', labelKey: 'font.mono', regular: 'monospace', bold: 'monospace' },
  { key: 'atkinson', label: 'Atkinson Hyperlegible', regular: 'AtkinsonHyperlegible', bold: 'AtkinsonHyperlegible-Bold' },
  { key: 'lora', label: 'Lora', regular: 'Lora', bold: 'Lora' },
  { key: 'dyslexic', label: 'OpenDyslexic', regular: 'OpenDyslexic', bold: 'OpenDyslexic-Bold' },
];

export const DEFAULT_READING_FONT = 'system';

// Font files registered with expo-font at startup. Keys must match the
// `regular` / `bold` family names above.
export const BUNDLED_FONT_ASSETS = {
  AtkinsonHyperlegible: require('../../assets/fonts/AtkinsonHyperlegible-Regular.ttf'),
  'AtkinsonHyperlegible-Bold': require('../../assets/fonts/AtkinsonHyperlegible-Bold.ttf'),
  Lora: require('../../assets/fonts/Lora-Variable.ttf'),
  OpenDyslexic: require('../../assets/fonts/OpenDyslexic-Regular.otf'),
  'OpenDyslexic-Bold': require('../../assets/fonts/OpenDyslexic-Bold.otf'),
};

export function getReadingFont(key) {
  return READING_FONTS.find((f) => f.key === key) || READING_FONTS[0];
}

// Style fragment for body text in the chosen font. Returns {} for the system
// default so the platform font keeps applying.
export function readingFontStyle(key, { bold = false } = {}) {
  const font = getReadingFont(key);
  const family = bold ? font.bold : font.regular;
  return family ? { fontFamily: family } : {};
}
