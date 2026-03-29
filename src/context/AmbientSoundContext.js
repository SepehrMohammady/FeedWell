import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AmbientSoundContext = createContext();

const STORAGE_KEY_SOUND = 'ambient_current_sound';
const STORAGE_KEY_VOLUME = 'ambient_volume';

export const AMBIENT_SOUNDS = [
  { id: 'brainwave', name: 'Brainwave Binaural', description: '10 Hz Alpha Waves', file: require('../../assets/Sounds/Brainwave Binaural (10 Hz Alpha Waves).mp3'), icon: 'pulse-outline' },
  { id: 'brown_noise', name: 'Brown Noise', description: 'Deep low-frequency noise', file: require('../../assets/Sounds/Brown Noise.mp3'), icon: 'radio-outline' },
  { id: 'cafe', name: 'Café Ambience', description: 'Coffee shop background', file: require('../../assets/Sounds/Café Ambience.mp3'), icon: 'cafe-outline' },
  { id: 'grey_noise', name: 'Grey Noise', description: 'Balanced frequency noise', file: require('../../assets/Sounds/Grey Noise.mp3'), icon: 'radio-outline' },
  { id: 'library', name: 'Library Ambience', description: 'Quiet library atmosphere', file: require('../../assets/Sounds/Library Ambience.mp3'), icon: 'library-outline' },
  { id: 'lofi', name: 'Lo-Fi Beats', description: 'Chill study beats', file: require('../../assets/Sounds/Lo-Fi Beats.mp3'), icon: 'musical-notes-outline' },
  { id: 'nature', name: 'Nature Ambience', description: 'Outdoor nature sounds', file: require('../../assets/Sounds/Nature Ambience.mp3'), icon: 'leaf-outline' },
  { id: 'pink_noise', name: 'Pink Noise', description: 'Balanced soothing noise', file: require('../../assets/Sounds/Pink Noise.mp3'), icon: 'radio-outline' },
  { id: 'white_noise', name: 'White Noise', description: 'Consistent background noise', file: require('../../assets/Sounds/White Noise.mp3'), icon: 'radio-outline' },
];

export function AmbientSoundProvider({ children }) {
  const soundRef = useRef(null);
  const [currentSoundId, setCurrentSoundId] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolumeState] = useState(0.5);
  const [isLoading, setIsLoading] = useState(false);

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
      if (savedVolume !== null) setVolumeState(parseFloat(savedVolume));
      if (savedSoundId !== null) setCurrentSoundId(savedSoundId);
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

      const { sound } = await Audio.Sound.createAsync(
        soundData.file,
        {
          shouldPlay: true,
          isLooping: true,
          volume: volume,
        }
      );

      soundRef.current = sound;
      setCurrentSoundId(soundId);
      setIsPlaying(true);

      // Save preference
      await AsyncStorage.setItem(STORAGE_KEY_SOUND, soundId);

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

  const value = {
    currentSound,
    currentSoundId,
    isPlaying,
    isLoading,
    volume,
    selectSound,
    togglePlayPause,
    stopSound,
    setVolume,
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
