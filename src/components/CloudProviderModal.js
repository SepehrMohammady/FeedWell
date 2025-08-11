import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const CloudProviderModal = ({ visible, onClose, onSelectProvider, theme }) => {
  const providers = [
    {
      id: 'GOOGLE_DRIVE',
      name: 'Google Drive',
      icon: 'logo-google',
      color: '#4285F4',
      description: 'Backup to your Google Drive'
    },
    {
      id: 'ONEDRIVE', 
      name: 'OneDrive',
      icon: 'cloud-outline',
      color: '#0078D4',
      description: 'Backup to Microsoft OneDrive'
    },
    {
      id: 'DROPBOX',
      name: 'Dropbox',
      icon: 'cube-outline',
      color: '#0061FF',
      description: 'Backup to your Dropbox'
    }
  ];

  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    modal: {
      backgroundColor: theme.colors.background,
      borderRadius: 16,
      padding: 24,
      width: '100%',
      maxWidth: 400,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    header: {
      alignItems: 'center',
      marginBottom: 24,
    },
    title: {
      fontSize: 20,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
    providerList: {
      marginBottom: 20,
    },
    providerButton: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderRadius: 12,
      backgroundColor: theme.colors.card,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    providerIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 16,
    },
    providerInfo: {
      flex: 1,
    },
    providerName: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 2,
    },
    providerDescription: {
      fontSize: 13,
      color: theme.colors.textSecondary,
    },
    comingSoonBadge: {
      backgroundColor: theme.colors.primary,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
    },
    comingSoonText: {
      fontSize: 12,
      color: '#fff',
      fontWeight: '600',
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
    },
    cancelButton: {
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 8,
    },
    cancelButtonText: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      fontWeight: '600',
    },
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Select Cloud Provider</Text>
            <Text style={styles.subtitle}>
              Choose where to backup your feeds and settings
            </Text>
          </View>

          <View style={styles.providerList}>
            {providers.map((provider) => (
              <TouchableOpacity
                key={provider.id}
                style={styles.providerButton}
                onPress={() => onSelectProvider(provider.id)}
              >
                <View style={[styles.providerIcon, { backgroundColor: provider.color + '20' }]}>
                  <Ionicons
                    name={provider.icon}
                    size={24}
                    color={provider.color}
                  />
                </View>
                <View style={styles.providerInfo}>
                  <Text style={styles.providerName}>{provider.name}</Text>
                  <Text style={styles.providerDescription}>{provider.description}</Text>
                </View>
                <View style={styles.comingSoonBadge}>
                  <Text style={styles.comingSoonText}>Soon</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

export default CloudProviderModal;
