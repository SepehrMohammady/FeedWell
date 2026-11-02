import React from 'react';
import { StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { useTheme, makeStyles } from '../context/ThemeContext';
import { useTranslation } from '../context/LanguageContext';
import { TYPE, RADIUS, FONT, cardShadow } from './type';

// The selected segment's lift, light mode only
const SEGMENT_SHADOW = {
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.08,
  shadowRadius: 2,
  elevation: 1,
};

// The Calm Surfaces 3 pieces every screen shares, in the current colors
// (LedgerWell's set). FeedWell lays out right to left per component, so the
// pieces that align text take the direction too.
const build = ({ colors: c }, isRTL) => {
  const textAlign = isRTL ? 'right' : 'left';
  const writingDirection = isRTL ? 'rtl' : 'ltr';
  return {
    // Pages are transparent: the wash behind the whole app shows through
    page: { flex: 1, backgroundColor: 'transparent' },
    // Round header buttons: surface fill, no border
    roundButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: c.surface,
      alignItems: 'center',
      justifyContent: 'center',
      ...(c.amoled ? { borderWidth: 1, borderColor: c.cardBorder } : null),
    },
    card: { backgroundColor: c.surface, borderRadius: RADIUS.card, ...cardShadow(c) },
    tile: { backgroundColor: c.surface, borderRadius: RADIUS.tile, ...cardShadow(c) },
    // A card whose rows share it: 16 dp in from its sides, hairlines between rows
    listCard: {
      backgroundColor: c.surface,
      borderRadius: RADIUS.card,
      paddingHorizontal: 16,
      paddingVertical: 4,
      ...cardShadow(c),
    },
    divider: { height: StyleSheet.hairlineWidth, backgroundColor: c.border },
    sectionTitle: { ...TYPE.section, color: c.accentInk, textAlign, writingDirection },
    screenTitle: { ...TYPE.screenTitle, color: c.text, textAlign, writingDirection },
    title: { ...TYPE.title, color: c.text, textAlign, writingDirection },
    rowTitle: { ...TYPE.rowTitle, color: c.text, textAlign, writingDirection },
    body: { ...TYPE.body, color: c.text, textAlign, writingDirection },
    secondary: { ...TYPE.secondary, color: c.textSecondary, textAlign, writingDirection },
    // Secondary text straight on the page, where a glow of the wash can be
    secondaryOnWash: { ...TYPE.secondary, color: c.textSecondaryOnWash, textAlign, writingDirection },
    // Chips: unselected on the surface with a hairline, selected in the main fill
    chip: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      minHeight: 38,
      borderRadius: RADIUS.round,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
      paddingHorizontal: 14,
      paddingVertical: 7,
    },
    chipSelected: { backgroundColor: c.primary, borderColor: c.primary },
    chipLabel: { ...TYPE.label, color: c.text, textAlign: 'center' },
    chipLabelSelected: { fontFamily: FONT.semiBold, color: c.onPrimary },
    // Buttons: fully round; primary in the main fill, secondary in the main tint
    primaryButton: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      minHeight: 46,
      paddingHorizontal: 20,
      paddingVertical: 8,
      borderRadius: RADIUS.round,
      backgroundColor: c.primary,
    },
    primaryLabel: { ...TYPE.button, color: c.onPrimary, textAlign: 'center' },
    secondaryButton: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      minHeight: 46,
      paddingHorizontal: 20,
      paddingVertical: 8,
      borderRadius: RADIUS.round,
      backgroundColor: c.mainTint,
    },
    secondaryLabel: { ...TYPE.button, color: c.mainInk, textAlign: 'center' },
    // A red button, for what can't be undone
    dangerButton: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      minHeight: 46,
      paddingHorizontal: 20,
      paddingVertical: 8,
      borderRadius: RADIUS.round,
      backgroundColor: c.error,
    },
    dangerLabel: { ...TYPE.button, color: c.onError, textAlign: 'center' },
    // Leading icons in rows and tiles: an accent circle; red for what deletes
    iconCircle: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: c.accentTint,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconCircleError: { backgroundColor: c.errorTint },
    // Badges and counts: the accent tint with accent ink
    badge: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      gap: 4,
      borderRadius: RADIUS.round,
      backgroundColor: c.accentTint,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    badgeLabel: { ...TYPE.small, color: c.accentInk },
    // Sheets and dialogs over a 40% scrim
    scrim: { flex: 1, backgroundColor: c.overlay },
    sheet: { backgroundColor: c.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
    sheetHandle: {
      alignSelf: 'center',
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: c.outline,
      marginTop: 8,
    },
    dialog: { backgroundColor: c.surface, borderRadius: RADIUS.dialog },
    // Fields: fully round, on the surface with a hairline. Several lines of
    // text get a tile's corners instead.
    input: {
      ...TYPE.body,
      color: c.text,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: RADIUS.round,
      paddingHorizontal: 18,
      minHeight: 48,
      textAlign,
    },
    inputMultiline: { borderRadius: RADIUS.tile, paddingTop: 12, paddingBottom: 12 },
    // Segmented controls: a Surface 2 track, the selected segment raised
    segmentTrack: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      backgroundColor: c.surface2,
      borderRadius: RADIUS.round,
      padding: 4,
      gap: 2,
    },
    segment: {
      flex: 1,
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      minHeight: 36,
      paddingHorizontal: 10,
      borderRadius: RADIUS.round,
    },
    segmentRaised: { backgroundColor: c.surface3, ...(c.hasShadows ? SEGMENT_SHADOW : null) },
    segmentLabel: { ...TYPE.label, color: c.textSecondary },
    segmentLabelRaised: { fontFamily: FONT.semiBold, color: c.text },
    // Framed like the tab bar's selected tab, so on the surface with a hairline:
    // on Surface 2 the main tint all but vanishes
    segmentTrackFramed: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
    segmentFramed: { backgroundColor: c.mainTint },
    segmentLabelFramed: { fontFamily: FONT.semiBold, color: c.mainInk },
  };
};

/** The shared styles in the current colors and direction, built once per theme change */
export const useUi = () => {
  const { isRTL } = useTranslation();
  return useUiStyles(isRTL);
};
const useUiStyles = makeStyles(build);

/** A section title above a card: 13 SemiBold in accent ink, with an optional action at the end */
export function SectionTitle({ title, right, style }) {
  const ui = useUi();
  const { isRTL } = useTranslation();
  return (
    <View style={[styles.sectionRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }, style]}>
      <Text style={[ui.sectionTitle, styles.sectionText]}>{title}</Text>
      {right}
    </View>
  );
}

/** Children of fragments too, so a conditional group of rows still gets its hairlines */
const rowsOf = (children) =>
  React.Children.toArray(children).flatMap((child) =>
    React.isValidElement(child) && child.type === React.Fragment ? rowsOf(child.props.children) : [child]
  );

/** Rows sharing one card, with hairlines between them */
export function ListCard({ children, style }) {
  const ui = useUi();
  const rows = rowsOf(children);
  return (
    <View style={[ui.listCard, style]}>
      {rows.map((row, i) => (
        <React.Fragment key={i}>
          {i > 0 && <View style={ui.divider} />}
          {row}
        </React.Fragment>
      ))}
    </View>
  );
}

/**
 * A segmented control: a Surface 2 track with the selected segment raised off
 * it, or (framed) a surface track with a hairline and the selected
 * segment framed in the main tint, labelled in main ink
 */
export function Segmented({ options, value, onChange, style, labelStyle, framed = false }) {
  const ui = useUi();
  const { theme } = useTheme();
  return (
    <View style={[ui.segmentTrack, framed && ui.segmentTrackFramed, style]}>
      {options.map((option) => {
        const selected = option.value === value;
        const color = selected ? (framed ? theme.colors.mainInk : theme.colors.text) : theme.colors.textSecondary;
        return (
          <TouchableOpacity
            key={String(option.value)}
            style={[ui.segment, selected && (framed ? ui.segmentFramed : ui.segmentRaised)]}
            onPress={() => onChange(option.value)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
          >
            {option.icon?.(color)}
            <Text
              style={[ui.segmentLabel, labelStyle, selected && (framed ? ui.segmentLabelFramed : ui.segmentLabelRaised)]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

/** A switch: the track in Surface 2, the main color at half strength when on; the thumb in main ink, Outline when off */
export function ThemedSwitch({ value, onValueChange, disabled, accessibilityLabel }) {
  const { theme } = useTheme();
  return (
    <Switch
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel}
      trackColor={{ false: theme.colors.switchTrackOff, true: theme.colors.switchTrackOn }}
      thumbColor={value ? theme.colors.switchThumbOn : theme.colors.switchThumbOff}
    />
  );
}

const styles = StyleSheet.create({
  sectionRow: {
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 16,
    marginBottom: 8,
    marginHorizontal: 2,
  },
  sectionText: {
    flexShrink: 1,
  },
});
