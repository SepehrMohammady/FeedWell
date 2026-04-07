import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useAppSettings } from '../context/AppSettingsContext';
import { useTheme } from '../context/ThemeContext';

/**
 * KinetosisOverlay - A fixed reference dot displayed on screen to help
 * reduce motion sickness (kinetosis) while scrolling/reading.
 * Similar to KineStop app and iOS "Reduce Motion" feature.
 * Shows a small, semi-transparent fixed dot that gives the brain
 * a stable reference point to reduce vestibular conflict.
 */
export default function KinetosisOverlay() {
  const { reduceMotion } = useAppSettings();
  const { isDarkMode } = useTheme();

  if (!reduceMotion) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      <View style={[
        styles.dot,
        { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.25)' }
      ]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
