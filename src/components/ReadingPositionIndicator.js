import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

// The thin line drawn between two articles in the feed list.
// - When it marks the saved reading position (isActive), tapping the bookmark
//   clears it.
// - Otherwise it offers two direct actions, so neither needs a confirmation
//   dialog: set the reading position here, or mark everything above as read.
export default function ReadingPositionIndicator({ onPress, onClear, onMarkAbove, isActive = false, style, positionLabel, markAboveLabel }) {
  const { theme } = useTheme();

  const styles = StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: 20,
      marginVertical: 2,
      paddingVertical: 4,
      ...style,
    },
    line: {
      flex: 1,
      height: 1,
      backgroundColor: isActive ? theme.colors.accent : theme.colors.border,
    },
    bullet: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: isActive ? theme.colors.accent : theme.colors.textSecondary,
      marginHorizontal: 6,
      justifyContent: 'center',
      alignItems: 'center',
    },
    // Slightly tighter gap so the pair reads as one control cluster.
    bulletPaired: {
      marginHorizontal: 3,
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.line} />
      <TouchableOpacity
        style={[styles.bullet, !isActive && onMarkAbove && styles.bulletPaired]}
        onPress={isActive ? onClear : onPress}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityRole="button"
        accessibilityLabel={positionLabel}
      >
        <Ionicons
          name="bookmark"
          size={12}
          color={isActive ? '#fff' : theme.colors.surface}
        />
      </TouchableOpacity>
      {!isActive && onMarkAbove && (
        <TouchableOpacity
          style={[styles.bullet, styles.bulletPaired]}
          onPress={onMarkAbove}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel={markAboveLabel}
        >
          <Ionicons name="checkmark-done" size={12} color={theme.colors.surface} />
        </TouchableOpacity>
      )}
      <View style={styles.line} />
    </View>
  );
}
