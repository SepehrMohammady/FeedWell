import React, { useRef } from 'react';
import { View, PanResponder, StyleSheet } from 'react-native';

export default function VolumeSlider({ value = 0.5, onValueChange, trackColor = '#E0E0E0', activeTrackColor = '#A17F66', thumbColor = '#A17F66' }) {
  const containerRef = useRef(null);
  const layoutRef = useRef({ width: 0, x: 0 });

  const getValueFromPosition = (pageX) => {
    const { x, width } = layoutRef.current;
    if (width === 0) return value;
    const pos = (pageX - x) / width;
    return Math.max(0, Math.min(1, pos));
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const newValue = getValueFromPosition(evt.nativeEvent.pageX);
        onValueChange?.(newValue);
      },
      onPanResponderMove: (evt) => {
        const newValue = getValueFromPosition(evt.nativeEvent.pageX);
        onValueChange?.(newValue);
      },
    })
  ).current;

  const handleLayout = () => {
    if (containerRef.current) {
      containerRef.current.measure((x, y, width, height, pageX, pageY) => {
        layoutRef.current = { width, x: pageX };
      });
    }
  };

  const percentage = Math.max(0, Math.min(1, value)) * 100;

  return (
    <View
      ref={containerRef}
      style={styles.container}
      onLayout={handleLayout}
      {...panResponder.panHandlers}
    >
      <View style={[styles.track, { backgroundColor: trackColor }]}>
        <View style={[styles.activeTrack, { backgroundColor: activeTrackColor, width: `${percentage}%` }]} />
      </View>
      <View style={[styles.thumb, { backgroundColor: thumbColor, left: `${percentage}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 32,
    justifyContent: 'center',
    position: 'relative',
  },
  track: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  activeTrack: {
    height: '100%',
    borderRadius: 2,
  },
  thumb: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 9,
    marginLeft: -9,
    top: 7,
  },
});
