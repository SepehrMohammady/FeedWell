import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AmbientSoundContext = createContext();

const STORAGE_KEY_SOUND = 'ambient_current_sound';
const STORAGE_KEY_LAST_SOUND = 'ambient_last_sound';
const STORAGE_KEY_VOLUME = 'ambient_volume';
const STORAGE_KEY_VOLUMES_PER_SOUND = 'ambient_volumes_per_sound';
const STORAGE_KEY_AUTOPLAY = 'ambient_autoplay';

// name/description/info are i18n KEYS resolved via t() at render time (see MiniPlayer).
export const AMBIENT_SOUNDS = [
  { id: 'brown_noise', nameKey: 'sound.brown_noise.name', descKey: 'sound.brown_noise.desc', file: require('../../assets/Sounds/Brown Noise.mp3'), icon: 'radio-outline',
    info: { brainKey: 'sound.brown_noise.brain', studyKey: 'sound.brown_noise.study', focusKey: 'sound.level.high', distractKey: 'sound.level.veryLow' } },
  { id: 'grey_noise', nameKey: 'sound.grey_noise.name', descKey: 'sound.grey_noise.desc', file: require('../../assets/Sounds/Grey Noise.mp3'), icon: 'radio-outline',
    info: { brainKey: 'sound.grey_noise.brain', studyKey: 'sound.grey_noise.study', focusKey: 'sound.level.high', distractKey: 'sound.level.veryLow' } },
  { id: 'pink_noise', nameKey: 'sound.pink_noise.name', descKey: 'sound.pink_noise.desc', file: require('../../assets/Sounds/Pink Noise.mp3'), icon: 'radio-outline',
    info: { brainKey: 'sound.pink_noise.brain', studyKey: 'sound.pink_noise.study', focusKey: 'sound.level.high', distractKey: 'sound.level.veryLow' } },
  { id: 'white_noise', nameKey: 'sound.white_noise.name', descKey: 'sound.white_noise.desc', file: require('../../assets/Sounds/White Noise.mp3'), icon: 'radio-outline',
    info: { brainKey: 'sound.white_noise.brain', studyKey: 'sound.white_noise.study', focusKey: 'sound.level.mediumHigh', distractKey: 'sound.level.veryLow' } },
  { id: 'brainwave', nameKey: 'sound.brainwave.name', descKey: 'sound.brainwave.desc', file: require('../../assets/Sounds/Brainwave Binaural (10 Hz Alpha Waves).mp3'), icon: 'pulse-outline',
    info: { brainKey: 'sound.brainwave.brain', studyKey: 'sound.brainwave.study', focusKey: 'sound.level.high', distractKey: 'sound.level.low' } },
  { id: 'cafe', nameKey: 'sound.cafe.name', descKey: 'sound.cafe.desc', file: require('../../assets/Sounds/Café Ambience.mp3'), icon: 'cafe-outline',
    info: { brainKey: 'sound.cafe.brain', studyKey: 'sound.cafe.study', focusKey: 'sound.level.medium', distractKey: 'sound.level.medium' } },
  { id: 'library', nameKey: 'sound.library.name', descKey: 'sound.library.desc', file: require('../../assets/Sounds/Library Ambience.mp3'), icon: 'library-outline',
    info: { brainKey: 'sound.library.brain', studyKey: 'sound.library.study', focusKey: 'sound.level.mediumHigh', distractKey: 'sound.level.low' } },
  { id: 'lofi', nameKey: 'sound.lofi.name', descKey: 'sound.lofi.desc', file: require('../../assets/Sounds/Lo-Fi Beats.mp3'), icon: 'musical-notes-outline',
    info: { brainKey: 'sound.lofi.brain', studyKey: 'sound.lofi.study', focusKey: 'sound.level.medium', distractKey: 'sound.level.lowMedium' } },
  { id: 'nature', nameKey: 'sound.nature.name', descKey: 'sound.nature.desc', file: require('../../assets/Sounds/Nature Ambience.mp3'), icon: 'leaf-outline',
    info: { brainKey: 'sound.nature.brain', studyKey: 'sound.nature.study', focusKey: 'sound.level.medium', distractKey: 'sound.level.low' } },
];

export function AmbientSoundProvider({ children }) {
  const soundRef = useRef(null);
  const [currentSoundId, setCurrentSoundId] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolumeState] = useState(0.5);
  const [volumesPerSound, setVolumesPerSound] = useState({});
  const volumesPerSoundRef = useRef({});
  const [isLoading, setIsLoading] = useState(false);
  const [autoPlay, setAutoPlayState] = useState(false);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [lastSoundId, setLastSoundId] = useState(null);
  const autoPlayFiredRef = useRef(false);
  const currentSoundIdRef = useRef(null);

  // Keep refs in sync
  useEffect(() => {
    volumesPerSoundRef.current = volumesPerSound;
  }, [volumesPerSound]);
  useEffect(() => {
    currentSoundIdRef.current = currentSoundId;
  }, [currentSoundId]);

  // Configure audio mode on mount
  useEffect(() => {
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      staysActiveInBackground: true,
      playsInSilentModeIOS: true,
    });
    loadSavedPreferences();
    return () => {
      // Cleanup on unmount
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  const loadSavedPreferences = async () => {
    try {
      const savedVolume = await AsyncStorage.getItem(STORAGE_KEY_VOLUME);
      const savedSoundId = await AsyncStorage.getItem(STORAGE_KEY_SOUND);
      const savedAutoPlay = await AsyncStorage.getItem(STORAGE_KEY_AUTOPLAY);
      const savedLastSound = await AsyncStorage.getItem(STORAGE_KEY_LAST_SOUND);
      const savedVolumesPerSound = await AsyncStorage.getItem(STORAGE_KEY_VOLUMES_PER_SOUND);
      if (savedVolume !== null) setVolumeState(parseFloat(savedVolume));
      if (savedSoundId !== null) setCurrentSoundId(savedSoundId);
      if (savedAutoPlay !== null) setAutoPlayState(savedAutoPlay === 'true');
      if (savedLastSound !== null) setLastSoundId(savedLastSound);
      if (savedVolumesPerSound !== null) {
        const parsed = JSON.parse(savedVolumesPerSound);
        setVolumesPerSound(parsed);
        // If we have a saved sound, load its specific volume
        const soundToCheck = savedSoundId || savedLastSound;
        if (soundToCheck && parsed[soundToCheck] !== undefined) {
          setVolumeState(parsed[soundToCheck]);
        }
      }
    } catch (error) {
      console.error('Error loading ambient sound preferences:', error);
    }
  };

  const playSound = useCallback(async (soundId) => {
    const soundData = AMBIENT_SOUNDS.find(s => s.id === soundId);
    if (!soundData) return;

    setIsLoading(true);
    try {
      // Unload previous sound if any
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }

      // Use per-sound volume from ref (avoids stale closure), fallback to current volume
      const latestVolumes = volumesPerSoundRef.current;
      const soundVolume = latestVolumes[soundId] !== undefined ? latestVolumes[soundId] : volume;
      setVolumeState(soundVolume);

      const { sound } = await Audio.Sound.createAsync(
        soundData.file,
        {
          shouldPlay: true,
          isLooping: true,
          volume: soundVolume,
        }
      );

      soundRef.current = sound;
      setCurrentSoundId(soundId);
      setLastSoundId(soundId);
      setIsPlaying(true);

      // Save preference
      await AsyncStorage.setItem(STORAGE_KEY_SOUND, soundId);
      await AsyncStorage.setItem(STORAGE_KEY_LAST_SOUND, soundId);

      // Listen for playback status changes
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
          setIsPlaying(status.isPlaying);
        }
      });
    } catch (error) {
      console.error('Error playing sound:', error);
    } finally {
      setIsLoading(false);
    }
  }, [volume]);

  const togglePlayPause = useCallback(async () => {
    if (!soundRef.current) {
      // If we have a saved sound but no loaded instance, load and play it
      if (currentSoundId) {
        await playSound(currentSoundId);
      }
      return;
    }

    try {
      const status = await soundRef.current.getStatusAsync();
      if (status.isLoaded) {
        if (status.isPlaying) {
          await soundRef.current.pauseAsync();
        } else {
          await soundRef.current.playAsync();
        }
      }
    } catch (error) {
      console.error('Error toggling playback:', error);
    }
  }, [currentSoundId, playSound]);

  const stopSound = useCallback(async () => {
    try {
      if (soundRef.current) {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
      setIsPlaying(false);
      setCurrentSoundId(null);
      await AsyncStorage.removeItem(STORAGE_KEY_SOUND);
    } catch (error) {
      console.error('Error stopping sound:', error);
    }
  }, []);

  const setVolume = useCallback(async (newVolume) => {
    const clamped = Math.max(0, Math.min(1, newVolume));
    setVolumeState(clamped);
    try {
      if (soundRef.current) {
        await soundRef.current.setVolumeAsync(clamped);
      }
      await AsyncStorage.setItem(STORAGE_KEY_VOLUME, clamped.toString());
      // Save per-sound volume using ref for latest state
      const activeSoundId = currentSoundIdRef.current;
      if (activeSoundId) {
        const updated = { ...volumesPerSoundRef.current, [activeSoundId]: clamped };
        setVolumesPerSound(updated);
        await AsyncStorage.setItem(STORAGE_KEY_VOLUMES_PER_SOUND, JSON.stringify(updated));
      }
    } catch (error) {
      console.error('Error setting volume:', error);
    }
  }, []);

  const selectSound = useCallback(async (soundId) => {
    if (soundId === currentSoundId && isPlaying) {
      // Already playing this sound, just toggle
      await togglePlayPause();
      return;
    }
    await playSound(soundId);
  }, [currentSoundId, isPlaying, playSound, togglePlayPause]);

  const currentSound = AMBIENT_SOUNDS.find(s => s.id === currentSoundId) || null;

  const setAutoPlay = useCallback(async (enabled) => {
    setAutoPlayState(enabled);
    try {
      await AsyncStorage.setItem(STORAGE_KEY_AUTOPLAY, enabled.toString());
    } catch (error) {
      console.error('Error saving autoplay preference:', error);
    }
  }, []);

  // Auto-play last sound on app start if enabled (fires only once)
  useEffect(() => {
    if (autoPlayFiredRef.current) return;
    const soundToPlay = currentSoundId || lastSoundId;
    if (autoPlay && soundToPlay && !isPlaying && !soundRef.current) {
      autoPlayFiredRef.current = true;
      playSound(soundToPlay);
    }
  }, [autoPlay, currentSoundId, lastSoundId]);

  const value = {
    currentSound,
    currentSoundId,
    isPlaying,
    isLoading,
    volume,
    autoPlay,
    selectSound,
    togglePlayPause,
    stopSound,
    setVolume,
    setAutoPlay,
    showPlaylist,
    setShowPlaylist,
    sounds: AMBIENT_SOUNDS,
  };

  return (
    <AmbientSoundContext.Provider value={value}>
      {children}
    </AmbientSoundContext.Provider>
  );
}

export function useAmbientSound() {
  const context = useContext(AmbientSoundContext);
  if (!context) {
    throw new Error('useAmbientSound must be used within an AmbientSoundProvider');
  }
  return context;
}
