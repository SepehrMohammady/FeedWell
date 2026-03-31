import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AmbientSoundContext = createContext();

const STORAGE_KEY_SOUND = 'ambient_current_sound';
const STORAGE_KEY_LAST_SOUND = 'ambient_last_sound';
const STORAGE_KEY_VOLUME = 'ambient_volume';
const STORAGE_KEY_AUTOPLAY = 'ambient_autoplay';

export const AMBIENT_SOUNDS = [
  { id: 'brainwave', name: 'Brainwave Binaural', description: '10 Hz Alpha Waves', file: require('../../assets/Sounds/Brainwave Binaural (10 Hz Alpha Waves).mp3'), icon: 'pulse-outline',
    info: { brain: 'Stimulates alpha brainwaves (8-12 Hz) associated with relaxed alertness', study: 'Enhances focus during study sessions by promoting flow state', focus: 'High', distract: 'Low' } },
  { id: 'brown_noise', name: 'Brown Noise', description: 'Deep low-frequency noise', file: require('../../assets/Sounds/Brown Noise.mp3'), icon: 'radio-outline',
    info: { brain: 'Masks distracting sounds with deep, rumbling frequencies', study: 'Great for deep work and concentration in noisy environments', focus: 'High', distract: 'Very Low' } },
  { id: 'cafe', name: 'Café Ambience', description: 'Coffee shop background', file: require('../../assets/Sounds/Café Ambience.mp3'), icon: 'cafe-outline',
    info: { brain: 'Moderate ambient noise (70 dB) boosts creative thinking', study: 'Ideal for creative tasks, brainstorming, and light reading', focus: 'Medium', distract: 'Medium' } },
  { id: 'grey_noise', name: 'Grey Noise', description: 'Balanced frequency noise', file: require('../../assets/Sounds/Grey Noise.mp3'), icon: 'radio-outline',
    info: { brain: 'Psychoacoustically balanced — perceived as equally loud across all frequencies', study: 'Good for extended reading sessions without ear fatigue', focus: 'High', distract: 'Very Low' } },
  { id: 'library', name: 'Library Ambience', description: 'Quiet library atmosphere', file: require('../../assets/Sounds/Library Ambience.mp3'), icon: 'library-outline',
    info: { brain: 'Subtle ambient cues promote a studious mindset', study: 'Creates a mental "study environment" even at home', focus: 'Medium-High', distract: 'Low' } },
  { id: 'lofi', name: 'Lo-Fi Beats', description: 'Chill study beats', file: require('../../assets/Sounds/Lo-Fi Beats.mp3'), icon: 'musical-notes-outline',
    info: { brain: 'Repetitive melodies reduce cognitive load and anxiety', study: 'Popular for study sessions — maintains steady pace without distraction', focus: 'Medium', distract: 'Low-Medium' } },
  { id: 'nature', name: 'Nature Ambience', description: 'Outdoor nature sounds', file: require('../../assets/Sounds/Nature Ambience.mp3'), icon: 'leaf-outline',
    info: { brain: 'Natural sounds reduce cortisol and promote relaxation', study: 'Helps with stress recovery during reading breaks', focus: 'Medium', distract: 'Low' } },
  { id: 'pink_noise', name: 'Pink Noise', description: 'Balanced soothing noise', file: require('../../assets/Sounds/Pink Noise.mp3'), icon: 'radio-outline',
    info: { brain: 'Enhances deep sleep and memory consolidation', study: 'Excellent for memorization tasks and long study sessions', focus: 'High', distract: 'Very Low' } },
  { id: 'white_noise', name: 'White Noise', description: 'Consistent background noise', file: require('../../assets/Sounds/White Noise.mp3'), icon: 'radio-outline',
    info: { brain: 'Equal energy across all frequencies — strong masking effect', study: 'Best for blocking out unpredictable environmental noise', focus: 'Medium-High', distract: 'Very Low' } },
];

export function AmbientSoundProvider({ children }) {
  const soundRef = useRef(null);
  const [currentSoundId, setCurrentSoundId] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolumeState] = useState(0.5);
  const [isLoading, setIsLoading] = useState(false);
  const [autoPlay, setAutoPlayState] = useState(false);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [lastSoundId, setLastSoundId] = useState(null);

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
      if (savedVolume !== null) setVolumeState(parseFloat(savedVolume));
      if (savedSoundId !== null) setCurrentSoundId(savedSoundId);
      if (savedAutoPlay !== null) setAutoPlayState(savedAutoPlay === 'true');
      if (savedLastSound !== null) setLastSoundId(savedLastSound);
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

  // Auto-play last sound on app start if enabled
  useEffect(() => {
    const soundToPlay = currentSoundId || lastSoundId;
    if (autoPlay && soundToPlay && !isPlaying && !soundRef.current) {
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
