import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { APP_VERSION } from '../config/version';

export default function SimpleHomeScreen({ navigation }) {
  const handleAddFeed = () => {
    Alert.alert('Add Feed', 'This will open the Add Feed screen');
  };

  const handleMyFeeds = () => {
    Alert.alert('My Feeds', 'This will show your RSS feeds');
  };

  const handleReadLater = () => {
    Alert.alert('Read Later', 'This will show your saved articles');
  };

  const handleSettings = () => {
    Alert.alert('Settings', 'This will open the Settings screen');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>FeedWell</Text>
        <Text style={styles.subtitle}>RSS Reader</Text>
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.button} onPress={handleAddFeed}>
            <Ionicons name="add" size={24} color="#007AFF" />
            <Text style={styles.buttonText}>Add Feed</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.button} onPress={handleMyFeeds}>
            <Ionicons name="list" size={24} color="#007AFF" />
            <Text style={styles.buttonText}>My Feeds</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.button} onPress={handleReadLater}>
            <Ionicons name="bookmark" size={24} color="#007AFF" />
            <Text style={styles.buttonText}>Read Later</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.button} onPress={handleSettings}>
            <Ionicons name="settings" size={24} color="#007AFF" />
            <Text style={styles.buttonText}>Settings</Text>
          </TouchableOpacity>
        </View>
        
        <Text style={styles.version}>Version {APP_VERSION.fullVersion}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 40,
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 300,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginVertical: 8,
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonText: {
    fontSize: 16,
    marginLeft: 12,
    color: '#333',
  },
  version: {
    fontSize: 14,
    color: '#999',
    marginTop: 40,
  },
});
