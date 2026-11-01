import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, makeStyles } from '../context/ThemeContext';

// The thin line drawn between two articles in the feed list.
// - When it marks the saved reading position (isActive), tapping the bookmark
//   clears it.
// - Otherwise it offers two direct actions, so neither needs a confirmation
//   dialog: set the reading position here, or mark everything above as read.
// It sits inside the list's card, where it is also the divider between rows.
export default function ReadingPositionIndicator({ onPress, onClear, onMarkAbove, isActive = false, style, positionLabel, markAboveLabel }) {
  const { theme } = useTheme();
  const styles = useStyles();
  const iconColor = isActive ? theme.colors.onAccentFill : theme.colors.textSecondary;

  return (
    <View style={[styles.container, style]}>
      <View style={[styles.line, isActive && styles.lineActive]} />
      <TouchableOpacity
        style={[styles.bullet, isActive && styles.bulletActive, !isActive && onMarkAbove && styles.bulletPaired]}
        onPress={isActive ? onClear : onPress}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityRole="button"
        accessibilityLabel={positionLabel}
      >
        <Ionicons name="bookmark" size={12} color={iconColor} />
      </TouchableOpacity>
      {!isActive && onMarkAbove && (
        <TouchableOpacity
          style={[styles.bullet, styles.bulletPaired]}
          onPress={onMarkAbove}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel={markAboveLabel}
        >
          <Ionicons name="checkmark-done" size={12} color={iconColor} />
        </TouchableOpacity>
      )}
      <View style={[styles.line, isActive && styles.lineActive]} />
    </View>
  );
}

// Built once per theme: one line sits between every two rows of the list.
const useStyles = makeStyles(({ colors: c }) => ({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginVertical: 2,
    paddingVertical: 4,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: c.border,
  },
  // The saved reading position is what to notice: the accent
  lineActive: {
    backgroundColor: c.accentInk,
  },
  bullet: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: c.surface2,
    marginHorizontal: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bulletActive: {
    backgroundColor: c.accentFill,
  },
  // The two icons are separate actions, so they need real separation: at 6px
  // apart their 8px hitSlop regions overlapped and a tap in between landed on
  // whichever won the responder race. 10px each side leaves a 20px gap, so
  // the touch targets stay clear of each other.
  bulletPaired: {
    marginHorizontal: 10,
  },
}));
