// Inter, built into the app (android/app/src/main/assets/fonts, stored
// uncompressed). On Android a font from the assets picks its weight only
// through its own family name, so styles name the weight's family here and
// never set fontWeight: a bold fontWeight on Inter text falls back to Roboto.
// Regular is every text's default (utils/defaultFont).
export const FONT = {
  regular: 'Inter-Regular',
  medium: 'Inter-Medium',
  semiBold: 'Inter-SemiBold',
  bold: 'Inter-Bold',
};

// Text by role, the same sizes in every ProjectWell app. Android's own font
// size applies on top.
export const TYPE = {
  screenTitle: { fontFamily: FONT.bold, fontSize: 26, letterSpacing: -0.5 },
  title: { fontFamily: FONT.semiBold, fontSize: 16.5 }, // Card, sheet and dialog titles
  section: { fontFamily: FONT.semiBold, fontSize: 13 }, // Section titles, in accent ink
  rowTitle: { fontFamily: FONT.semiBold, fontSize: 14.5 },
  body: { fontFamily: FONT.regular, fontSize: 14 },
  secondary: { fontFamily: FONT.regular, fontSize: 12.5 }, // In the secondary text color
  button: { fontFamily: FONT.semiBold, fontSize: 13.5 },
  label: { fontFamily: FONT.medium, fontSize: 13 }, // Chips and segments
  small: { fontFamily: FONT.medium, fontSize: 11 }, // Badges, swatch names
  count: { fontFamily: FONT.semiBold, fontVariant: ['tabular-nums'] }, // Counts line up
};

// Corners: cards and sheets 18, tiles 16, dialogs 20; buttons, chips and
// fields are fully round.
export const RADIUS = { card: 18, tile: 16, dialog: 20, round: 999 };

// The faint shadow under cards and tiles, light mode only.
export const CARD_SHADOW = {
  shadowColor: '#281E32',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.07,
  shadowRadius: 6,
  elevation: 2,
};

// A card's shadow, or border, in the current mode: a faint shadow in light,
// nothing in dark, and in AMOLED (black cards on a black page) the hairline
// that keeps cards apart.
export const cardShadow = (colors) => {
  if (colors.hasShadows) return CARD_SHADOW;
  if (colors.amoled) return { borderWidth: 1, borderColor: colors.cardBorder };
  return {};
};
