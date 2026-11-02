import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * SafeStorage - A wrapper around AsyncStorage that provides graceful error handling
 * for mobile deployment while maintaining the same API as AsyncStorage
 * 
 * Features:
 * - Automatic data chunking for large datasets
 * - Size limit enforcement (2MB default per entry)
 * - Graceful error recovery
 */
export class SafeStorage {
  // Maximum size per AsyncStorage entry (2MB is the safe limit): Android reads
  // an entry through a 2MB window, counted in UTF-8 bytes
  static MAX_CHUNK_SIZE = 2 * 1024 * 1024; // 2MB in bytes

  // Characters per chunk: 90% of the limit at up to 3 bytes a character
  // (Farsi text takes 2, Chinese 3), so a chunk fits whatever the script
  static CHUNK_LENGTH = Math.floor((2 * 1024 * 1024 * 0.9) / 3);

  static async getItem(key) {
    try {
      // Try to get chunked data first
      const chunkInfo = await AsyncStorage.getItem(`${key}_chunks`);
      if (chunkInfo) {
        const { count } = JSON.parse(chunkInfo);
        let fullData = '';
        for (let i = 0; i < count; i++) {
          const chunk = await AsyncStorage.getItem(`${key}_chunk_${i}`);
          if (chunk) fullData += chunk;
        }
        return fullData || null;
      }
      // Fall back to regular get
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.warn(`SafeStorage.getItem failed for key "${key}":`, error);
      return null;
    }
  }

  static async setItem(key, value) {
    try {
      // Check if data needs chunking. Counted in characters, which spares
      // copying the whole value to native code as React Native's Blob did
      // to count its bytes
      if (value.length > this.CHUNK_LENGTH) {
        // Clear any existing chunks
        await this.clearChunks(key);

        // Split into chunks, never between the two halves of an emoji
        const chunks = [];
        for (let i = 0; i < value.length; ) {
          let end = Math.min(i + this.CHUNK_LENGTH, value.length);
          const last = value.charCodeAt(end - 1);
          if (end < value.length && last >= 0xd800 && last <= 0xdbff) end -= 1;
          chunks.push(value.substring(i, end));
          i = end;
        }
        
        // Save chunks
        for (let i = 0; i < chunks.length; i++) {
          await AsyncStorage.setItem(`${key}_chunk_${i}`, chunks[i]);
        }
        
        // Save chunk info
        await AsyncStorage.setItem(`${key}_chunks`, JSON.stringify({ count: chunks.length }));
        
        // Remove the main key if it exists
        await AsyncStorage.removeItem(key);
      } else {
        // Clear any existing chunks
        await this.clearChunks(key);
        
        // Save normally
        await AsyncStorage.setItem(key, value);
      }
      return true;
    } catch (error) {
      console.warn(`SafeStorage.setItem failed for key "${key}":`, error);
      return false;
    }
  }
  
  static async clearChunks(key) {
    try {
      const chunkInfo = await AsyncStorage.getItem(`${key}_chunks`);
      if (chunkInfo) {
        const { count } = JSON.parse(chunkInfo);
        for (let i = 0; i < count; i++) {
          await AsyncStorage.removeItem(`${key}_chunk_${i}`);
        }
        await AsyncStorage.removeItem(`${key}_chunks`);
      }
    } catch (error) {
      console.warn(`SafeStorage.clearChunks failed for key "${key}":`, error);
    }
  }

  static async removeItem(key) {
    try {
      // Clear any chunks first
      await this.clearChunks(key);
      // Then remove the main key
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
