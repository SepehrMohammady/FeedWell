import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, Animated } from 'react-native';
import { Gyroscope } from 'expo-sensors';
import { useAppSettings } from '../context/AppSettingsContext';
import { useTheme } from '../context/ThemeContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const DOT_SIZE = 10;
const MAX_OFFSET = 30;
const DAMPING = 0.85;

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
  const animX = useRef(new Animated.Value(0)).current;
  const animY = useRef(new Animated.Value(0)).current;
  const velocityRef = useRef({ x: 0, y: 0 });
  const runningAnimRef = useRef(null);

  useEffect(() => {
    if (!reduceMotion) return;

    Gyroscope.setUpdateInterval(16); // ~60 fps input sampling
    const subscription = Gyroscope.addListener(({ x, y }) => {
      const vx = velocityRef.current.x * DAMPING + y * 8;
      const vy = velocityRef.current.y * DAMPING + x * 8;
      velocityRef.current = { x: vx, y: vy };

      const clampedX = Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, vx));
      const clampedY = Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, vy));

      // Stop any running animation before starting new one
      if (runningAnimRef.current) {
        runningAnimRef.current.stop();
      }

      // Use spring animation with native driver for smooth interpolation
      runningAnimRef.current = Animated.parallel([
        Animated.spring(animX, {
          toValue: clampedX,
          useNativeDriver: true,
          stiffness: 150,
          damping: 15,
          mass: 0.5,
        }),
        Animated.spring(animY, {
          toValue: clampedY,
          useNativeDriver: true,
          stiffness: 150,
          damping: 15,
          mass: 0.5,
        }),
      ]);
      runningAnimRef.current.start();
    });

    return () => {
      subscription.remove();
      if (runningAnimRef.current) {
        runningAnimRef.current.stop();
      }
    };
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
                { translateX: animX },
                { translateY: animY },
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
