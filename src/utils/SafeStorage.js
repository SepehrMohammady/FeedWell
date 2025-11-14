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
  // Maximum size per AsyncStorage entry (2MB is the safe limit)
  static MAX_CHUNK_SIZE = 2 * 1024 * 1024; // 2MB in bytes
  
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
      // Check if data needs chunking
      const dataSize = new Blob([value]).size;
      
      if (dataSize > this.MAX_CHUNK_SIZE) {
        // Clear any existing chunks
        await this.clearChunks(key);
        
        // Split into chunks
        const chunkSize = Math.floor(this.MAX_CHUNK_SIZE * 0.9); // 90% to be safe
        const chunks = [];
        for (let i = 0; i < value.length; i += chunkSize) {
          chunks.push(value.substring(i, i + chunkSize));
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
