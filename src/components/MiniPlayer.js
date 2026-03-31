import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ActivityIndicator,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Slider from './VolumeSlider';
import { useTheme } from '../context/ThemeContext';
import { useAmbientSound, AMBIENT_SOUNDS } from '../context/AmbientSoundContext';

export default function MiniPlayer() {
  const { theme } = useTheme();
  const { currentSound, currentSoundId, isPlaying, isLoading, volume, togglePlayPause, stopSound, setVolume, selectSound, showPlaylist, setShowPlaylist } = useAmbientSound();
  const [expanded, setExpanded] = useState(false);
  const [showSoundInfo, setShowSoundInfo] = useState(null);

  // Always render the playlist modal, but only render the player bar when a sound is selected
  const showPlayerBar = currentSound || isLoading;

  return (
    <>
    {showPlayerBar && (
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
          <TouchableOpacity onPress={() => setShowPlaylist(true)} style={styles.controlButton}>
            <Ionicons name="list" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
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
    )}

    {/* Sound Playlist Modal */}
    <Modal
      visible={showPlaylist}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowPlaylist(false)}
    >
      <View style={styles.playlistOverlay}>
        <View style={[styles.playlistContainer, { backgroundColor: theme.colors.surface }]}>
          <View style={[styles.playlistHeader, { borderBottomColor: theme.colors.border }]}>
            <Text style={[styles.playlistTitle, { color: theme.colors.text }]}>Ambient Sounds</Text>
            <TouchableOpacity onPress={() => setShowPlaylist(false)} style={styles.playlistClose}>
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.playlistScroll}>
            {AMBIENT_SOUNDS.map((sound) => {
              const isActive = currentSoundId === sound.id;
              const isCurrentlyPlaying = isActive && isPlaying;
              return (
                <TouchableOpacity
                  key={sound.id}
                  style={[styles.playlistItem, { borderBottomColor: theme.colors.border }, isActive && { backgroundColor: theme.colors.primary + '10' }]}
                  onPress={() => selectSound(sound.id)}
                >
                  <View style={[styles.playlistItemIcon, { backgroundColor: (isActive ? theme.colors.primary : theme.colors.textTertiary) + '20' }]}>
                    <Ionicons name={sound.icon} size={20} color={isActive ? theme.colors.primary : theme.colors.textTertiary} />
                  </View>
                  <View style={styles.playlistItemText}>
                    <Text style={[styles.playlistItemName, { color: isActive ? theme.colors.primary : theme.colors.text }]}>{sound.name}</Text>
                    <Text style={[styles.playlistItemDesc, { color: theme.colors.textTertiary }]}>{sound.description}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.playlistInfoButton}
                    onPress={() => setShowSoundInfo(sound)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="information-circle-outline" size={22} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                  {isActive && (
                    <Ionicons
                      name={isCurrentlyPlaying ? 'pause-circle' : 'play-circle'}
                      size={28}
                      color={theme.colors.primary}
                      style={{ marginLeft: 4 }}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>

    {/* Sound Info Modal */}
    <Modal
      visible={showSoundInfo !== null}
      animationType="fade"
      transparent={true}
      onRequestClose={() => setShowSoundInfo(null)}
    >
      <TouchableOpacity style={styles.infoOverlay} activeOpacity={1} onPress={() => setShowSoundInfo(null)}>
        <View style={[styles.infoContainer, { backgroundColor: theme.colors.surface }]}>
          {showSoundInfo && (
            <>
              <View style={styles.infoHeader}>
                <Ionicons name={showSoundInfo.icon} size={28} color={theme.colors.primary} />
                <Text style={[styles.infoTitle, { color: theme.colors.text }]}>{showSoundInfo.name}</Text>
                <TouchableOpacity
                  style={styles.infoCloseButton}
                  onPress={() => setShowSoundInfo(null)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close" size={22} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>
              <Text style={[styles.infoDescription, { color: theme.colors.textSecondary }]}>{showSoundInfo.description}</Text>
              
              <View style={[styles.infoSection, { borderTopColor: theme.colors.border }]}>
                <View style={styles.infoRow}>
                  <Ionicons name="bulb-outline" size={18} color={theme.colors.primary} />
                  <View style={styles.infoRowText}>
                    <Text style={[styles.infoLabel, { color: theme.colors.text }]}>Brain Effect</Text>
                    <Text style={[styles.infoValue, { color: theme.colors.textSecondary }]}>{showSoundInfo.info.brain}</Text>
                  </View>
                </View>
                <View style={styles.infoRow}>
                  <Ionicons name="book-outline" size={18} color={theme.colors.primary} />
                  <View style={styles.infoRowText}>
                    <Text style={[styles.infoLabel, { color: theme.colors.text }]}>Study & Reading</Text>
                    <Text style={[styles.infoValue, { color: theme.colors.textSecondary }]}>{showSoundInfo.info.study}</Text>
                  </View>
                </View>
                <View style={styles.infoRow}>
                  <Ionicons name="eye-outline" size={18} color={theme.colors.primary} />
                  <View style={styles.infoRowText}>
                    <Text style={[styles.infoLabel, { color: theme.colors.text }]}>Focus Level</Text>
                    <Text style={[styles.infoValue, { color: theme.colors.textSecondary }]}>{showSoundInfo.info.focus}</Text>
                  </View>
                </View>
                <View style={styles.infoRow}>
                  <Ionicons name="notifications-off-outline" size={18} color={theme.colors.primary} />
                  <View style={styles.infoRowText}>
                    <Text style={[styles.infoLabel, { color: theme.colors.text }]}>Distraction</Text>
                    <Text style={[styles.infoValue, { color: theme.colors.textSecondary }]}>{showSoundInfo.info.distract}</Text>
                  </View>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.infoPlayButton, { backgroundColor: theme.colors.primary }]}
                onPress={() => { selectSound(showSoundInfo.id); setShowSoundInfo(null); }}
              >
                <Ionicons name="play" size={18} color="#fff" />
                <Text style={styles.infoPlayButtonText}>Play {showSoundInfo.name}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </TouchableOpacity>
    </Modal>
    </>
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
    gap: 2,
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
  // Playlist modal styles
  playlistOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  playlistContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingBottom: 24,
  },
  playlistHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  playlistTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  playlistClose: {
    padding: 4,
  },
  playlistScroll: {
    paddingVertical: 8,
  },
  playlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  playlistItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playlistItemText: {
    flex: 1,
    marginLeft: 12,
  },
  playlistItemName: {
    fontSize: 15,
    fontWeight: '600',
  },
  playlistItemDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  playlistInfoButton: {
    padding: 8,
  },
  // Sound info modal styles
  infoOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  infoContainer: {
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 360,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  infoCloseButton: {
    marginLeft: 'auto',
    padding: 4,
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  infoDescription: {
    fontSize: 14,
    marginBottom: 16,
  },
  infoSection: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 16,
    gap: 14,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  infoRowText: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 13,
    lineHeight: 18,
  },
  infoPlayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  infoPlayButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
