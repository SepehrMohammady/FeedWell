import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Slider from './VolumeSlider';
import { useTheme, makeStyles } from '../context/ThemeContext';
import { useTranslation } from '../context/LanguageContext';
import { useAmbientSound, AMBIENT_SOUNDS } from '../context/AmbientSoundContext';
import { useUi } from '../theme/ui';
import { DragSheet, SheetDragArea } from './DragSheet';
import { FONT, TYPE, RADIUS } from '../theme/type';

export default function MiniPlayer() {
  const { theme } = useTheme();
  const colors = theme.colors;
  const { t, isRTL } = useTranslation();
  const insets = useSafeAreaInsets();
  const ui = useUi();
  const styles = useStyles(isRTL);
  const { currentSound, currentSoundId, isPlaying, isLoading, volume, togglePlayPause, stopSound, setVolume, selectSound, showPlaylist, setShowPlaylist } = useAmbientSound();
  const [expanded, setExpanded] = useState(false);
  const [showSoundInfo, setShowSoundInfo] = useState(null);

  // Always render the playlist modal, but only render the player bar when a sound is selected
  const showPlayerBar = currentSound || isLoading;

  const infoRows = showSoundInfo ? [
    { icon: 'bulb-outline', label: t('miniPlayer.brainEffect'), value: t(showSoundInfo.info.brainKey) },
    { icon: 'book-outline', label: t('miniPlayer.studyReading'), value: t(showSoundInfo.info.studyKey) },
    { icon: 'eye-outline', label: t('miniPlayer.focusLevel'), value: t(showSoundInfo.info.focusKey) },
    { icon: 'notifications-off-outline', label: t('miniPlayer.distraction'), value: t(showSoundInfo.info.distractKey) },
  ] : [];

  return (
    <>
    {showPlayerBar && (
    <View style={styles.container}>
      <View style={styles.mainRow}>
        <TouchableOpacity style={styles.soundInfo} onPress={() => setExpanded(!expanded)}>
          <View style={styles.iconContainer}>
            <Ionicons name={currentSound?.icon || 'musical-note'} size={18} color={colors.accentInk} />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.soundName} numberOfLines={1}>
              {currentSound ? t(currentSound.nameKey) : t('common.loading')}
            </Text>
            {currentSound?.descKey && (
              <Text style={styles.soundDesc} numberOfLines={1}>
                {t(currentSound.descKey)}
              </Text>
            )}
          </View>
          <Ionicons
            name={expanded ? 'chevron-down' : 'chevron-up'}
            size={16}
            color={colors.textSecondary}
            style={styles.expandIcon}
          />
        </TouchableOpacity>

        <View style={styles.controls}>
          <TouchableOpacity onPress={() => setShowPlaylist(true)} style={styles.controlButton}>
            <Ionicons name="list" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          {isLoading ? (
            <ActivityIndicator size="small" color={colors.mainInk} style={styles.controlButton} />
          ) : (
            <TouchableOpacity onPress={togglePlayPause} style={styles.controlButton}>
              <Ionicons
                name={isPlaying ? 'pause' : 'play'}
                size={24}
                color={colors.mainInk}
              />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={stopSound} style={styles.controlButton}>
            <Ionicons name="close" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {expanded && (
        <View style={styles.volumeRow}>
          <Ionicons name="volume-low" size={18} color={colors.textSecondary} />
          <View style={styles.sliderContainer}>
            <Slider
              value={volume}
              onValueChange={setVolume}
              trackColor={colors.surface2}
              activeTrackColor={colors.primary}
              thumbColor={colors.primary}
            />
          </View>
          <Ionicons name="volume-high" size={18} color={colors.textSecondary} />
        </View>
      )}
    </View>
    )}

    {/* Sound Playlist Modal */}
    <Modal
      visible={showPlaylist}
      animationType="slide"
      transparent={true}
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={() => setShowPlaylist(false)}
    >
      {/* Closes with its X, a tap above it, a drag down on its top, or Back */}
      <View style={styles.playlistOverlay}>
        <DragSheet
          onClose={() => setShowPlaylist(false)}
          style={[ui.sheet, styles.playlistContainer, { paddingBottom: Math.max(insets.bottom, 12) + 12 }]}
        >
          <SheetDragArea>
            <View style={ui.sheetHandle} />
            <View style={styles.playlistHeader}>
              <Text style={styles.playlistTitle}>{t('miniPlayer.playlistTitle')}</Text>
              <TouchableOpacity
                onPress={() => setShowPlaylist(false)}
                style={styles.playlistClose}
                accessibilityLabel={t('common.close')}
              >
                <Ionicons name="close" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>
          </SheetDragArea>
          <ScrollView style={styles.playlistScroll}>
            {AMBIENT_SOUNDS.map((sound) => {
              const isActive = currentSoundId === sound.id;
              const isCurrentlyPlaying = isActive && isPlaying;
              return (
                <TouchableOpacity
                  key={sound.id}
                  style={[styles.playlistItem, isActive && styles.playlistItemActive]}
                  onPress={() => selectSound(sound.id)}
                >
                  <View style={[styles.playlistItemIcon, isActive && styles.playlistItemIconActive]}>
                    <Ionicons name={sound.icon} size={20} color={isActive ? colors.accentInk : colors.textSecondary} />
                  </View>
                  <View style={styles.playlistItemText}>
                    <Text style={[styles.playlistItemName, isActive && styles.playlistItemNameActive]}>{t(sound.nameKey)}</Text>
                    <Text style={styles.playlistItemDesc}>{t(sound.descKey)}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.playlistInfoButton}
                    onPress={() => setShowSoundInfo(sound)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="information-circle-outline" size={22} color={colors.textSecondary} />
                  </TouchableOpacity>
                  {isActive && (
                    <Ionicons
                      name={isCurrentlyPlaying ? 'pause-circle' : 'play-circle'}
                      size={28}
                      color={colors.mainInk}
                      style={styles.playlistPlayIcon}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </DragSheet>
      </View>
    </Modal>

    {/* Sound Info Modal */}
    <Modal
      visible={showSoundInfo !== null}
      animationType="fade"
      transparent={true}
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={() => setShowSoundInfo(null)}
    >
      <TouchableOpacity style={styles.infoOverlay} activeOpacity={1} onPress={() => setShowSoundInfo(null)}>
        <View style={[ui.dialog, styles.infoContainer]}>
          {showSoundInfo && (
            <>
              <View style={styles.infoHeader}>
                <View style={ui.iconCircle}>
                  <Ionicons name={showSoundInfo.icon} size={20} color={colors.accentInk} />
                </View>
                <Text style={styles.infoTitle}>{t(showSoundInfo.nameKey)}</Text>
                <TouchableOpacity
                  style={styles.infoCloseButton}
                  onPress={() => setShowSoundInfo(null)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close" size={22} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
              <Text style={styles.infoDescription}>{t(showSoundInfo.descKey)}</Text>

              <View style={styles.infoSection}>
                {infoRows.map((row) => (
                  <View key={row.icon} style={styles.infoRow}>
                    <Ionicons name={row.icon} size={18} color={colors.accentInk} />
                    <View style={styles.infoRowText}>
                      <Text style={styles.infoLabel}>{row.label}</Text>
                      <Text style={styles.infoValue}>{row.value}</Text>
                    </View>
                  </View>
                ))}
              </View>
              <TouchableOpacity
                style={[ui.primaryButton, styles.infoPlayButton]}
                onPress={() => { selectSound(showSoundInfo.id); setShowSoundInfo(null); }}
              >
                <Ionicons name="play" size={18} color={colors.onPrimary} />
                <Text style={ui.primaryLabel}>{t('miniPlayer.playSound', { name: t(showSoundInfo.nameKey) })}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </TouchableOpacity>
    </Modal>
    </>
  );
}

// Built once per theme and direction (Calm Surfaces 3). The player docks on
// top of the tab bar, so it takes the bar's surface and hairline.
const useStyles = makeStyles(({ colors: c }, isRTL) => {
  const row = isRTL ? 'row-reverse' : 'row';
  const textAlign = isRTL ? 'right' : 'left';
  const writingDirection = isRTL ? 'rtl' : 'ltr';
  return {
    container: {
      backgroundColor: c.tabBarBackground,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
    },
    mainRow: {
      flexDirection: row,
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    soundInfo: {
      flex: 1,
      flexDirection: row,
      alignItems: 'center',
    },
    // The sound playing: an accent circle
    iconContainer: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: c.accentTint,
      justifyContent: 'center',
      alignItems: 'center',
    },
    textContainer: {
      flex: 1,
      marginLeft: isRTL ? 0 : 10,
      marginRight: isRTL ? 10 : 0,
    },
    soundName: {
      fontFamily: FONT.semiBold,
      fontSize: 14,
      color: c.text,
      textAlign,
      writingDirection,
    },
    soundDesc: {
      ...TYPE.small,
      fontFamily: FONT.regular,
      color: c.textSecondary,
      marginTop: 1,
      textAlign,
      writingDirection,
    },
    expandIcon: {
      marginLeft: isRTL ? 0 : 4,
      marginRight: isRTL ? 4 : 0,
    },
    controls: {
      flexDirection: row,
      alignItems: 'center',
      gap: 2,
    },
    controlButton: {
      padding: 8,
    },
    volumeRow: {
      flexDirection: row,
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingBottom: 8,
      paddingTop: 4,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
      gap: 8,
    },
    sliderContainer: {
      flex: 1,
      height: 32,
      justifyContent: 'center',
    },
    // The sounds sheet
    playlistOverlay: {
      flex: 1,
      backgroundColor: c.overlay,
      justifyContent: 'flex-end',
    },
    playlistContainer: {
      maxHeight: '70%',
    },
    playlistHeader: {
      flexDirection: row,
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 8,
    },
    playlistTitle: {
      ...TYPE.title,
      color: c.text,
      textAlign,
      writingDirection,
    },
    playlistClose: {
      padding: 4,
    },
    playlistScroll: {
      paddingVertical: 4,
    },
    playlistItem: {
      flexDirection: row,
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    // The sound in use: the main tint, its name in main ink
    playlistItemActive: {
      backgroundColor: c.mainTint,
    },
    playlistItemIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: c.surface2,
      justifyContent: 'center',
      alignItems: 'center',
    },
    playlistItemIconActive: {
      backgroundColor: c.accentTint,
    },
    playlistItemText: {
      flex: 1,
      marginLeft: isRTL ? 0 : 12,
      marginRight: isRTL ? 12 : 0,
    },
    playlistItemName: {
      fontFamily: FONT.semiBold,
      fontSize: 15,
      color: c.text,
      textAlign,
      writingDirection,
    },
    playlistItemNameActive: {
      color: c.mainInk,
    },
    playlistItemDesc: {
      ...TYPE.secondary,
      fontSize: 12,
      color: c.textSecondary,
      marginTop: 2,
      textAlign,
      writingDirection,
    },
    playlistInfoButton: {
      padding: 8,
    },
    playlistPlayIcon: {
      marginLeft: isRTL ? 0 : 4,
      marginRight: isRTL ? 4 : 0,
    },
    // A sound's details: a dialog
    infoOverlay: {
      flex: 1,
      backgroundColor: c.overlay,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    infoContainer: {
      padding: 20,
      width: '100%',
      maxWidth: 360,
      ...(c.hasShadows
        ? { elevation: 8, shadowColor: '#000000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.16, shadowRadius: 12 }
        : c.amoled ? { borderWidth: 1, borderColor: c.cardBorder } : null),
    },
    infoHeader: {
      flexDirection: row,
      alignItems: 'center',
      gap: 12,
      marginBottom: 10,
    },
    infoCloseButton: {
      padding: 4,
      marginLeft: isRTL ? 0 : 'auto',
      marginRight: isRTL ? 'auto' : 0,
    },
    infoTitle: {
      ...TYPE.title,
      fontSize: 18,
      flexShrink: 1,
      color: c.text,
      textAlign,
      writingDirection,
    },
    infoDescription: {
      ...TYPE.body,
      color: c.textSecondary,
      marginBottom: 16,
      textAlign,
      writingDirection,
    },
    infoSection: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
      paddingTop: 16,
      gap: 14,
    },
    infoRow: {
      flexDirection: row,
      alignItems: 'flex-start',
      gap: 12,
    },
    infoRowText: {
      flex: 1,
    },
    infoLabel: {
      fontFamily: FONT.semiBold,
      fontSize: 13,
      color: c.text,
      marginBottom: 2,
      textAlign,
      writingDirection,
    },
    infoValue: {
      ...TYPE.body,
      fontSize: 13,
      lineHeight: 18,
      color: c.textSecondary,
      textAlign,
      writingDirection,
    },
    infoPlayButton: {
      marginTop: 20,
      borderRadius: RADIUS.round,
    },
  };
});
