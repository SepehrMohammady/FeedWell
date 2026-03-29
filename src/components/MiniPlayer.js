import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Slider from './VolumeSlider';
import { useTheme } from '../context/ThemeContext';
import { useAmbientSound } from '../context/AmbientSoundContext';

export default function MiniPlayer() {
  const { theme } = useTheme();
  const { currentSound, isPlaying, isLoading, volume, togglePlayPause, stopSound, setVolume } = useAmbientSound();
  const [expanded, setExpanded] = useState(false);

  // Don't render if no sound is selected
  if (!currentSound && !isLoading) return null;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border }]}>
      <View style={styles.mainRow}>
        <TouchableOpacity style={styles.soundInfo} onPress={() => setExpanded(!expanded)}>
          <View style={[styles.iconContainer, { backgroundColor: theme.colors.primary + '20' }]}>
            <Ionicons name={currentSound?.icon || 'musical-note'} size={18} color={theme.colors.primary} />
          </View>
          <View style={styles.textContainer}>
            <Text style={[styles.soundName, { color: theme.colors.text }]} numberOfLines={1}>
              {currentSound?.name || 'Loading...'}
            </Text>
            {currentSound?.description && (
              <Text style={[styles.soundDesc, { color: theme.colors.textTertiary }]} numberOfLines={1}>
                {currentSound.description}
              </Text>
            )}
          </View>
          <Ionicons 
            name={expanded ? 'chevron-down' : 'chevron-up'} 
            size={16} 
            color={theme.colors.textTertiary} 
            style={styles.expandIcon}
          />
        </TouchableOpacity>

        <View style={styles.controls}>
          {isLoading ? (
            <ActivityIndicator size="small" color={theme.colors.primary} style={styles.controlButton} />
          ) : (
            <TouchableOpacity onPress={togglePlayPause} style={styles.controlButton}>
              <Ionicons 
                name={isPlaying ? 'pause' : 'play'} 
                size={24} 
                color={theme.colors.primary} 
              />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={stopSound} style={styles.controlButton}>
            <Ionicons name="close" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {expanded && (
        <View style={[styles.volumeRow, { borderTopColor: theme.colors.border }]}>
          <Ionicons name="volume-low" size={18} color={theme.colors.textSecondary} />
          <View style={styles.sliderContainer}>
            <Slider
              value={volume}
              onValueChange={setVolume}
              trackColor={theme.colors.border}
              activeTrackColor={theme.colors.primary}
              thumbColor={theme.colors.primary}
            />
          </View>
          <Ionicons name="volume-high" size={18} color={theme.colors.textSecondary} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  soundInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 34,
    height: 34,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
    marginLeft: 10,
  },
  soundName: {
    fontSize: 14,
    fontWeight: '600',
  },
  soundDesc: {
    fontSize: 11,
    marginTop: 1,
  },
  expandIcon: {
    marginLeft: 4,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  controlButton: {
    padding: 8,
  },
  volumeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
    paddingTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  sliderContainer: {
    flex: 1,
    height: 32,
    justifyContent: 'center',
  },
});
