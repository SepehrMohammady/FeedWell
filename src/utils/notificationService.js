import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const NOTIFICATION_ID_KEY = 'feedwell_reminder_notification_id';
const LAST_OPEN_KEY = 'feedwell_last_open_time';

// 23 hours and 45 minutes in seconds (resets every time the app is opened)
const REMINDER_DELAY_SECONDS = 23 * 3600 + 45 * 60;

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

    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Error requesting notification permissions:', error);
    return false;
  }
}

/**
 * Schedule a reminder notification 23h45m from now.
 * Cancels any previously scheduled reminder first.
 */
export async function scheduleReminderNotification() {
  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) return;

    // Cancel previous reminder
    await cancelReminderNotification();

    // Save current open time
    await AsyncStorage.setItem(LAST_OPEN_KEY, new Date().toISOString());

    // Schedule new reminder
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Time to Read! 📖',
        body: 'Your daily reading time is here. Open FeedWell and catch up on your feeds.',
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: REMINDER_DELAY_SECONDS,
        repeats: false,
      },
    });

    await AsyncStorage.setItem(NOTIFICATION_ID_KEY, notificationId);
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
    await AsyncStorage.removeItem(NOTIFICATION_ID_KEY);
  } catch (error) {
    console.error('Error cancelling reminder notification:', error);
  }
}

/**
 * Set up the notification channel for Android
 */
export async function setupNotificationChannel() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('reading-reminder', {
      name: 'Reading Reminder',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      sound: true,
    });
  }
}
