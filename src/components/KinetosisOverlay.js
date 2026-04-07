import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, Animated } from 'react-native';
import { Gyroscope } from 'expo-sensors';
import { useAppSettings } from '../context/AppSettingsContext';
import { useTheme } from '../context/ThemeContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const NUM_DOTS = 8;
const DOT_SIZE = 10;
const MAX_OFFSET = 30; // max pixels a dot moves from its base position
const DAMPING = 0.85; // smoothing factor

// Distribute dots around the screen edges/corners
const DOT_POSITIONS = [
  { x: SCREEN_WIDTH * 0.15, y: SCREEN_HEIGHT * 0.1 },
  { x: SCREEN_WIDTH * 0.85, y: SCREEN_HEIGHT * 0.1 },
  { x: SCREEN_WIDTH * 0.05, y: SCREEN_HEIGHT * 0.35 },
  { x: SCREEN_WIDTH * 0.95, y: SCREEN_HEIGHT * 0.35 },
  { x: SCREEN_WIDTH * 0.05, y: SCREEN_HEIGHT * 0.65 },
  { x: SCREEN_WIDTH * 0.95, y: SCREEN_HEIGHT * 0.65 },
  { x: SCREEN_WIDTH * 0.15, y: SCREEN_HEIGHT * 0.9 },
  { x: SCREEN_WIDTH * 0.85, y: SCREEN_HEIGHT * 0.9 },
];

export default function KinetosisOverlay() {
  const { reduceMotion } = useAppSettings();
  const { isDarkMode } = useTheme();
  const offsetX = useRef(new Animated.Value(0)).current;
  const offsetY = useRef(new Animated.Value(0)).current;
  const velocityRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!reduceMotion) return;

    Gyroscope.setUpdateInterval(50);
    const subscription = Gyroscope.addListener(({ x, y }) => {
      // Gyroscope gives rotation rate; integrate for position offset
      // y rotation = tilt left/right (moves dots horizontally)
      // x rotation = tilt forward/back (moves dots vertically)
      const vx = velocityRef.current.x * DAMPING + y * 8;
      const vy = velocityRef.current.y * DAMPING + x * 8;
      velocityRef.current = { x: vx, y: vy };

      const clampedX = Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, vx));
      const clampedY = Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, vy));

      offsetX.setValue(clampedX);
      offsetY.setValue(clampedY);
    });

    return () => subscription.remove();
  }, [reduceMotion]);

  if (!reduceMotion) return null;

  const dotColor = isDarkMode ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)';

  return (
    <View style={styles.container} pointerEvents="none">
      {DOT_POSITIONS.map((pos, i) => (
        <Animated.View
          key={i}
          style={[
            styles.dot,
            {
              backgroundColor: dotColor,
              left: pos.x - DOT_SIZE / 2,
              top: pos.y - DOT_SIZE / 2,
              transform: [
                { translateX: offsetX },
                { translateY: offsetY },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
  },
  dot: {
    position: 'absolute',
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
  },
});
