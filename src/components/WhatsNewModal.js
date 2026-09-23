import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from '../context/LanguageContext';
import { WHATS_NEW_RELEASES } from '../config/whatsNew';

// One-time "What's New" popup shown after the app is updated to a new version.
// It lists the last two releases (see config/whatsNew.js).
export default function WhatsNewModal({ visible, onClose, onTakeTour }) {
  const { theme } = useTheme();
  const { t, isRTL } = useTranslation();

  const rowDir = isRTL ? 'row-reverse' : 'row';
  const textAlign = isRTL ? 'right' : 'left';

  const Feature = ({ icon, title, body }) => (
    <View style={[styles.feature, { flexDirection: rowDir }]}>
      <View style={[styles.featureIcon, { backgroundColor: theme.colors.primary + '1A' }]}>
        <Ionicons name={icon} size={20} color={theme.colors.primary} />
      </View>
      <View style={styles.featureText}>
        <Text style={[styles.featureTitle, { color: theme.colors.text, textAlign }]}>{title}</Text>
        <Text style={[styles.featureBody, { color: theme.colors.textSecondary, textAlign }]}>{body}</Text>
      </View>
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <View style={[styles.header, { backgroundColor: theme.colors.primary + '14' }]}>
            <Ionicons name="sparkles" size={28} color={theme.colors.primary} />
            <Text style={[styles.title, { color: theme.colors.text }]}>{t('whatsNew.title')}</Text>
          </View>

          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
            {WHATS_NEW_RELEASES.map((release, i) => (
              <View key={release.version} style={i > 0 && [styles.release, { borderTopColor: theme.colors.border }]}>
                <Text style={[styles.releaseVersion, { color: theme.colors.primary, textAlign }]}>
                  {t('whatsNew.version', { version: release.version })}
                </Text>
                {release.items.map((item) => (
                  <Feature key={item.body} icon={item.icon} title={t(item.title)} body={t(item.body)} />
                ))}
              </View>
            ))}
          </ScrollView>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: theme.colors.primary }]}
              onPress={onTakeTour}
            >
              <Text style={styles.primaryBtnText}>{t('whatsNew.takeTour')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryBtn} onPress={onClose}>
              <Text style={[styles.secondaryBtnText, { color: theme.colors.textSecondary }]}>
                {t('common.gotIt')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 20,
    overflow: 'hidden',
    maxHeight: '85%',
  },
  header: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginTop: 8,
  },
  body: {
    paddingHorizontal: 20,
  },
  bodyContent: {
    paddingVertical: 16,
  },
  release: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 16,
  },
  releaseVersion: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 14,
  },
  feature: {
    alignItems: 'flex-start',
    marginBottom: 18,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 12,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 3,
  },
  featureBody: {
    fontSize: 14,
    lineHeight: 20,
  },
  actions: {
    padding: 16,
    paddingTop: 4,
  },
  primaryBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryBtn: {
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  secondaryBtnText: {
    fontSize: 15,
    fontWeight: '500',
  },
})
