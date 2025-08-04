// Data Debugging Utility for FeedWell
// This utility helps diagnose data loss issues in AsyncStorage

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export const DataDiagnostics = {
  // Check all storage keys and their sizes
  async getAllStorageInfo() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      console.log('🔍 All AsyncStorage keys:', keys);
      
      const result = {
        keys: keys,
        data: {},
        totalSize: 0,
        timestamp: new Date().toISOString()
      };
      
      for (const key of keys) {
        try {
          const value = await AsyncStorage.getItem(key);
          // Calculate size in bytes (each character is roughly 1 byte in UTF-8)
          const size = value ? value.length : 0;
          const preview = value ? (value.length > 100 ? value.substring(0, 100) + '...' : value) : null;
          
          result.data[key] = {
            exists: !!value,
            size: size,
            sizeKB: Math.round(size / 1024 * 100) / 100,
            preview: preview,
            type: this.detectDataType(value)
          };
          
          result.totalSize += size;
          
          console.log(`📦 Key: ${key}`, {
            size: `${Math.round(size / 1024 * 100) / 100}KB`,
            exists: !!value,
            type: this.detectDataType(value)
          });
          
        } catch (keyError) {
          console.error(`❌ Error reading key ${key}:`, keyError);
          result.data[key] = { error: keyError.message };
        }
      }
      
      result.totalSizeKB = Math.round(result.totalSize / 1024 * 100) / 100;
      result.totalSizeMB = Math.round(result.totalSize / (1024 * 1024) * 100) / 100;
      
      console.log(`📊 Total storage used: ${result.totalSizeMB}MB (${result.totalSizeKB}KB)`);
      
      return result;
    } catch (error) {
      console.error('❌ Error getting storage info:', error);
      return { error: error.message };
    }
  },

  // Detect what type of data is stored
  detectDataType(value) {
    if (!value) return 'null';
    
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return `array[${parsed.length}]`;
      } else if (typeof parsed === 'object') {
        return `object{${Object.keys(parsed).length}}`;
      }
      return typeof parsed;
    } catch {
      return 'string';
    }
  },

  // Backup current data to console (for manual recovery)
  async backupToConsole() {
    try {
      console.log('🔄 Creating backup dump...');
      
      const feeds = await AsyncStorage.getItem('feeds');
      const articles = await AsyncStorage.getItem('articles');
      const readLater = await AsyncStorage.getItem('readLater');
      
      const backup = {
        timestamp: new Date().toISOString(),
        feeds: feeds ? JSON.parse(feeds) : null,
        articles: articles ? JSON.parse(articles) : null,
        readLater: readLater ? JSON.parse(readLater) : null
      };
      
      console.log('💾 BACKUP DATA - Copy this for recovery:', JSON.stringify(backup, null, 2));
      
      return backup;
    } catch (error) {
      console.error('❌ Error creating backup:', error);
      return null;
    }
  },

  // Check for potential AsyncStorage corruption
  async checkForCorruption() {
    console.log('🔍 Checking for data corruption...');
    
    const issues = [];
    
    try {
      // Check feeds
      const feedsData = await AsyncStorage.getItem('feeds');
      if (feedsData) {
        try {
          const feeds = JSON.parse(feedsData);
          if (!Array.isArray(feeds)) {
            issues.push('Feeds data is not an array');
          }
        } catch {
          issues.push('Feeds data is corrupted JSON');
        }
      }
      
      // Check articles
      const articlesData = await AsyncStorage.getItem('articles');
      if (articlesData) {
        try {
          const articles = JSON.parse(articlesData);
          if (!Array.isArray(articles)) {
            issues.push('Articles data is not an array');
          }
        } catch {
          issues.push('Articles data is corrupted JSON');
        }
      }
      
      console.log(issues.length > 0 ? '⚠️ Issues found:' : '✅ No corruption detected', issues);
      return issues;
      
    } catch (error) {
      console.error('❌ Error checking corruption:', error);
      return ['Error during corruption check: ' + error.message];
    }
  },

  // Log system information that might affect storage
  async logSystemInfo() {
    console.log('📱 System Storage Diagnostics:');
    console.log('- Platform:', Platform.OS);
    console.log('- Timestamp:', new Date().toISOString());
    
    // Check if AsyncStorage is available
    try {
      await AsyncStorage.setItem('__test__', 'test');
      await AsyncStorage.removeItem('__test__');
      console.log('✅ AsyncStorage is functional');
    } catch (error) {
      console.log('❌ AsyncStorage test failed:', error.message);
    }
  },

  // Run complete diagnostics
  async runFullDiagnostics() {
    console.log('🚀 Running Full Data Diagnostics...');
    console.log('=====================================');
    
    await this.logSystemInfo();
    console.log('');
    
    const corruption = await this.checkForCorruption();
    console.log('');
    
    const storageInfo = await this.getAllStorageInfo();
    console.log('');
    
    const backup = await this.backupToConsole();
    
    console.log('=====================================');
    console.log('✅ Full diagnostics completed');
    
    return {
      corruption,
      storageInfo,
      backup
    };
  }
};

// Add to window for easy console access (in development)
if (typeof window !== 'undefined') {
  window.DataDiagnostics = DataDiagnostics;
}

export default DataDiagnostics;
