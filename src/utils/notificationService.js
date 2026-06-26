import * as Notifications from 'expo-notifications';
import { Platform, AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { tStatic } from '../i18n';
import { SUPPORTED_LANGUAGES } from '../i18n/appLanguages';
import { APP_LANGUAGE_KEY, detectDeviceLanguage } from '../context/LanguageContext';

// 24 hours in seconds — remind user at the same time tomorrow
const REMINDER_DELAY_SECONDS = 24 * 3600;

// Resolve the app language outside React (notifications run without context).
async function resolveAppLanguage() {
  try {
    const saved = await AsyncStorage.getItem(APP_LANGUAGE_KEY);
    if (saved && SUPPORTED_LANGUAGES.includes(saved)) return saved;
  } catch (e) { /* ignore */ }
  return detectDeviceLanguage();
}

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Request notification permissions (required on Android 13+ and iOS)
 */
export async function requestNotificationPermissions() {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    if (existingStatus === 'granted') return true;

    // Android 16 (API 36) enforces strict Background Activity Launch (BAL) restrictions.
    // Requesting permissions while the Activity is not yet visible triggers a BAL block
    // on Samsung OneUI 8/8.5, which destroys the Activity and appears as a crash.
    // Only show the permission dialog when the app is confirmed active/foreground.
    if (AppState.currentState !== 'active') return false;

    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Error requesting notification permissions:', error);
    return false;
  }
}

/**
 * Schedule a reminder notification 24h from now.
 * Cancels any previously scheduled reminder first.
 */
export async function scheduleReminderNotification() {
  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) return;

    // Cancel previous reminder
    await cancelReminderNotification();

    const lang = await resolveAppLanguage();

    // Schedule new reminder
    await Notifications.scheduleNotificationAsync({
      content: {
        title: tStatic('notif.title', lang),
        body: tStatic('notif.body', lang),
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: REMINDER_DELAY_SECONDS,
        repeats: false,
      },
    });
  } catch (error) {
    console.error('Error scheduling reminder notification:', error);
  }
}

/**
 * Cancel any previously scheduled reminder notification
 */
export async function cancelReminderNotification() {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('Error cancelling reminder notification:', error);
  }
}

/**
 * Set up the notification channel for Android
 */
export async function setupNotificationChannel() {
  if (Platform.OS === 'android') {
    const lang = await resolveAppLanguage();
    await Notifications.setNotificationChannelAsync('reading-reminder', {
      name: tStatic('notif.channelName', lang),
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      sound: true,
    });
  }
}
