import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * SafeStorage - A wrapper around AsyncStorage that provides graceful error handling
 * for mobile deployment while maintaining the same API as AsyncStorage
 */
export class SafeStorage {
  static async getItem(key) {
    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.warn(`SafeStorage.getItem failed for key "${key}":`, error);
      return null;
    }
  }

  static async setItem(key, value) {
    try {
      await AsyncStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.warn(`SafeStorage.setItem failed for key "${key}":`, error);
      return false;
    }
  }

  static async removeItem(key) {
    try {
      await AsyncStorage.removeItem(key);
      return true;
    } catch (error) {
      console.warn(`SafeStorage.removeItem failed for key "${key}":`, error);
      return false;
    }
  }

  static async getAllKeys() {
    try {
      return await AsyncStorage.getAllKeys();
    } catch (error) {
      console.warn('SafeStorage.getAllKeys failed:', error);
      return [];
    }
  }

  static async clear() {
    try {
      await AsyncStorage.clear();
      return true;
    } catch (error) {
      console.warn('SafeStorage.clear failed:', error);
      return false;
    }
  }
}
