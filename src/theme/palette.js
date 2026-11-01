// The app's colors for every combination of main color, accent color, dark
// mode and AMOLED black, in Calm Surfaces 3, the look the ProjectWell apps
// share. Plain calculation with no React, so every combination can be checked
// on its own (LedgerWell's palette, with FeedWell's colors).
//
// Two soft colors on a neutral base. The main color is what you tap: buttons,
// the selected tab, switches, links. The accent is what you should notice:
// section titles, icon circles, badges, counts. Everything else is neutral.
// Red, green and amber are only for state (errors, warnings, success).

// The colors both pickers offer, in the order Settings has always listed them:
// a saved `paletteIndex` (the main color) keeps meaning the same color.
export const COLOR_THEMES = [
  { key: 'warmBeige', nameKey: 'color.warmBeige', light: '#A17F66', dark: '#CDADA0' },
  { key: 'sage', nameKey: 'color.sage', light: '#5A8A6A', dark: '#8AC4A0' },
  { key: 'sky', nameKey: 'color.sky', light: '#4A7BA7', dark: '#80AECE' },
  { key: 'lavender', nameKey: 'color.lavender', light: '#7B6BA8', dark: '#A898C8' },
  { key: 'rose', nameKey: 'color.rose', light: '#A8606A', dark: '#D6A0A8' },
];

const LAVENDER = 3;

// Every ProjectWell app starts in Warm Beige with a Lavender accent. A color
// someone picked is saved and kept; the defaults are never saved.
export const DEFAULT_MAIN_COLOR = 0;

// Until someone picks an accent, it follows the main color: Lavender, or Warm
// Beige when the main color is Lavender.
export const accentFor = (main) => (main === LAVENDER ? 0 : LAVENDER);

export const isColorIndex = (value) => Number.isInteger(value) && value >= 0 && value < COLOR_THEMES.length;

// Color math

const hexToRgb = (hex) => {
  const value = hex.replace('#', '');
  const full = value.length === 3 ? value.split('').map((c) => c + c).join('') : value.slice(0, 6);
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
};

const rgbToHex = (rgb) =>
  '#' + rgb.map((c) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, '0')).join('').toUpperCase();

// `amount` of `b` blended into `a` in sRGB, like CSS color-mix: 0 gives a, 1 gives b.
export const mix = (a, b, amount) => {
  const x = hexToRgb(a);
  const y = hexToRgb(b);
  return rgbToHex(x.map((c, i) => c + (y[i] - c) * amount));
};

// The color with an alpha channel, as #RRGGBBAA.
export const withAlpha = (hex, alpha) =>
  hex.slice(0, 7) + Math.round(alpha * 255).toString(16).padStart(2, '0').toUpperCase();

// Relative luminance and contrast ratio as WCAG defines them.
export const luminance = (hex) => {
  const [r, g, b] = hexToRgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

export const contrast = (a, b) => {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
};

const WHITE = '#FFFFFF';
const INK = '#1C1C1E';

// White or near-black, whichever reads better on the color.
export const readableOn = (background) =>
  contrast(WHITE, background) >= contrast(INK, background) ? WHITE : INK;

// Moves a color toward `toward`, a fortieth at a time, until it reaches the
// wanted contrast with every color in `against` at once. One nudge from the
// original rather than one per background, so nothing compounds; the spec's
// table of derived tones comes out this way, the same as in the other apps.
export const ensureContrastOnAll = (color, against, ratio, toward) => {
  for (let step = 0; step < 40; step++) {
    const result = mix(color, toward, step / 40);
    if (against.every((bg) => contrast(result, bg) >= ratio)) return result;
  }
  return toward;
};

// A color that carries a label (a button, a chip) and the label's color. Mid
// tones reach 4.5:1 with neither white nor black, so the fill is shaded away
// from its label just enough. White labels win when a slight shade gets there;
// otherwise a near-black label, which usually leaves the color as it is.
export const fillWithText = (color) => {
  const shade = (on) => {
    for (let step = 0; step <= 20; step++) {
      const fill = mix(color, on === WHITE ? INK : WHITE, step / 20);
      if (contrast(on, fill) >= 4.5) return { fill, on, step };
    }
    return { fill: color, on, step: 99 };
  };
  const light = shade(WHITE);
  const dark = shade(INK);
  return light.step <= 3 || light.step <= dark.step ? light : dark;
};

// The neutral base (spec section 3).
const LIGHT_BASE = {
  background: '#F6F5F3',
  surface: '#FFFFFF',
  surface2: '#EFEDE9',
  surface3: '#FFFFFF',
  text: '#22272C',
  textSecondary: '#5C6469',
  border: '#E8E5E1',
  outline: '#898784',
};

const DARK_BASE = {
  background: '#101214',
  surface: '#1B1E21',
  surface2: '#26292D',
  surface3: '#33373B',
  text: '#ECEDEE',
  textSecondary: '#A6ADB3',
  border: '#2E3237',
  outline: '#6E7377',
};

// AMOLED keeps FeedWell's black cards: the page and the cards are both pure
// black, so a lifted border is what separates the cards.
const AMOLED_BASE = {
  ...DARK_BASE,
  background: '#000000',
  surface: '#000000',
  surface2: '#1A1A1D',
  surface3: '#27282B',
  border: '#2A2A2C',
};

// State colors (spec section 3): positive, negative and warning.
const STATE = {
  light: { success: '#366E4D', error: '#9A4D3C', warning: '#946116' },
  dark: { success: '#7FC79A', error: '#E8917C', warning: '#E2B566' },
};

// Built once per combination and reused, so a colors object keeps its identity
// between renders and styles can be cached against it.
const built = new Map();

export function buildColors(isDark, mainIndex, accentIndex, amoled) {
  const mainPick = isColorIndex(mainIndex) ? mainIndex : DEFAULT_MAIN_COLOR;
  const accentPick = isColorIndex(accentIndex) ? accentIndex : accentFor(mainPick);
  const black = isDark && amoled;
  const cacheKey = `${isDark ? (black ? 'amoled' : 'dark') : 'light'}:${mainPick}:${accentPick}`;
  const cached = built.get(cacheKey);
  if (cached) return cached;

  const base = !isDark ? LIGHT_BASE : black ? AMOLED_BASE : DARK_BASE;
  const main = isDark ? COLOR_THEMES[mainPick].dark : COLOR_THEMES[mainPick].light;
  const accent = isDark ? COLOR_THEMES[accentPick].dark : COLOR_THEMES[accentPick].light;

  const mainFill = fillWithText(main);
  const accentFill = fillWithText(accent);
  const mainTint = mix(base.surface, main, 0.16);
  const accentTint = mix(base.surface, accent, 0.2);
  const summaryStart = mix(base.surface, main, 0.13);
  const summaryEnd = mix(base.surface, accent, 0.22);

  // Text keeps 4.5:1 on everything it sits on: one nudge toward the text color
  // from the spec's mix, until it reads on all of them at once.
  const readable = (color, ...against) => ensureContrastOnAll(color, against, 4.5, base.text);
  const mainInk = readable(mix(base.text, main, 0.78), base.background, base.surface, mainTint);
  const accentInk = readable(
    mix(base.text, accent, 0.72),
    base.background,
    base.surface,
    accentTint,
    summaryStart,
    summaryEnd
  );
  const textSecondary = readable(base.textSecondary, base.background, base.surface, base.surface2);

  const glow = isDark ? [0.32, 0.3, 0.2] : [0.38, 0.36, 0.26];
  const wash = black
    ? null
    : {
        main: mix(base.background, main, glow[0]),
        accent: mix(base.background, accent, glow[1]),
        faint: mix(base.background, main, glow[2]),
      };

  const state = isDark ? STATE.dark : STATE.light;

  const colors = {
    isDark,
    amoled: black,
    background: base.background,
    surface: base.surface,
    card: base.surface,
    surface2: base.surface2,
    surface3: base.surface3,
    text: base.text,
    textSecondary,
    // Earlier versions had a third, lighter text tone; it failed 4.5:1, so
    // whatever used it now takes the secondary tone.
    textTertiary: textSecondary,
    // Secondary text straight on the page, which can sit on a glow of the wash
    textSecondaryOnWash: wash
      ? readable(textSecondary, base.background, wash.main, wash.accent, wash.faint)
      : textSecondary,
    border: base.border,
    // AMOLED cards are as black as the page: a hairline in the border color
    // keeps them apart. Elsewhere cards need no border.
    cardBorder: black ? base.border : 'transparent',
    outline: base.outline,
    // Disabled controls and their labels
    disabled: base.outline,

    // The main color: what you tap
    primary: mainFill.fill, // The main fill: primary buttons, the selected chip, the add button
    onPrimary: mainFill.on, // The label or icon on it
    mainInk, // Text and icons in the main color
    mainTint, // Secondary buttons, the selected tab's frame, selected rows

    // The accent: what you should notice
    accentFill: accentFill.fill,
    onAccentFill: accentFill.on,
    accentInk, // Section titles, icons in icon circles, counts
    accent: accentInk,
    accentTint, // Icon circles, badges

    summaryStart,
    summaryEnd,
    summaryTextSecondary: readable(textSecondary, summaryStart, summaryEnd),

    // The background wash: three round glows over the background. None in
    // AMOLED black, where the page stays pure black.
    wash,

    // State colors, readable as text on the page and on cards; the label on
    // them as a fill; a faint tint behind their icons
    success: state.success,
    onSuccess: readableOn(state.success),
    successTint: mix(base.surface, state.success, 0.14),
    error: state.error,
    onError: readableOn(state.error),
    errorTint: mix(base.surface, state.error, 0.14),
    warning: state.warning,
    onWarning: readableOn(state.warning),
    warningTint: mix(base.surface, state.warning, 0.14),

    // A switch (as in LedgerWell): when on, the main fill at half strength
    // under a main ink thumb; when off, Surface 2 under an Outline thumb.
    switchTrackOn: withAlpha(mainFill.fill, 0.5),
    switchTrackOff: base.surface2,
    switchThumbOn: mainInk,
    switchThumbOff: base.outline,

    overlay: 'rgba(0, 0, 0, 0.4)',
    scrim: isDark ? 'rgba(0, 0, 0, 0.78)' : 'rgba(0, 0, 0, 0.72)',
    hasShadows: !isDark,
    tabBarBackground: withAlpha(base.surface, 0.88),
    tabBarActiveTint: mainInk,
    tabBarActiveBackground: mainTint,
    tabBarInactiveTint: textSecondary,
    statusBarStyle: isDark ? 'light' : 'dark',
  };
  built.set(cacheKey, colors);
  return colors;
}
