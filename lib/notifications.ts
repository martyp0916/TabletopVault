/**
 * Notifications Utility
 *
 * Handles push notifications for goal deadlines.
 * Premium feature only.
 */
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PaintingGoal } from '@/types/database';

// Storage key for notification IDs
const NOTIFICATION_IDS_KEY = '@tabletopvault_notification_ids';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Request notification permissions
 * Returns true if permissions are granted
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  // Notifications don't work on simulators/emulators
  if (!Device.isDevice) {
    console.log('Notifications require a physical device');
    return false;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Notification permissions not granted');
    return false;
  }

  // Configure Android channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('goal-deadlines', {
      name: 'Goal Deadlines',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#991b1b',
    });
  }

  return true;
}

/**
 * Check if notifications are enabled
 */
export async function areNotificationsEnabled(): Promise<boolean> {
  if (!Device.isDevice) return false;

  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted';
}

/**
 * Get stored notification IDs mapping (goalId -> notificationId)
 */
async function getNotificationIds(): Promise<Record<string, string>> {
  try {
    const stored = await AsyncStorage.getItem(NOTIFICATION_IDS_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

/**
 * Save notification IDs mapping
 */
async function saveNotificationIds(ids: Record<string, string>): Promise<void> {
  try {
    await AsyncStorage.setItem(NOTIFICATION_IDS_KEY, JSON.stringify(ids));
  } catch (error) {
    console.error('Failed to save notification IDs:', error);
  }
}

/**
 * Schedule a notification for a goal deadline
 * Schedules notification for the morning of the deadline (9 AM)
 */
export async function scheduleGoalDeadlineNotification(goal: PaintingGoal): Promise<string | null> {
  if (!goal.deadline || goal.is_completed) {
    return null;
  }

  const deadlineDate = new Date(goal.deadline);

  // Set notification for 9 AM on the deadline day
  const notificationDate = new Date(deadlineDate);
  notificationDate.setHours(9, 0, 0, 0);

  // Don't schedule if the notification time has already passed
  if (notificationDate <= new Date()) {
    return null;
  }

  try {
    // Cancel any existing notification for this goal
    await cancelGoalNotification(goal.id);

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Goal Deadline Today!',
        body: `"${goal.title}" is due today. You're at ${goal.current_count}/${goal.target_count}. Keep painting!`,
        data: { goalId: goal.id },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: notificationDate,
      },
    });

    // Store the notification ID
    const ids = await getNotificationIds();
    ids[goal.id] = notificationId;
    await saveNotificationIds(ids);

    return notificationId;
  } catch (error) {
    console.error('Failed to schedule notification:', error);
    return null;
  }
}

/**
 * Schedule a reminder notification 1 day before the deadline
 */
export async function scheduleGoalReminderNotification(goal: PaintingGoal): Promise<string | null> {
  if (!goal.deadline || goal.is_completed) {
    return null;
  }

  const deadlineDate = new Date(goal.deadline);

  // Set reminder for 9 AM, 1 day before deadline
  const reminderDate = new Date(deadlineDate);
  reminderDate.setDate(reminderDate.getDate() - 1);
  reminderDate.setHours(9, 0, 0, 0);

  // Don't schedule if the reminder time has already passed
  if (reminderDate <= new Date()) {
    return null;
  }

  try {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Goal Deadline Tomorrow!',
        body: `"${goal.title}" is due tomorrow. You're at ${goal.current_count}/${goal.target_count}.`,
        data: { goalId: goal.id, type: 'reminder' },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: reminderDate,
      },
    });

    // Store with a different key for reminders
    const ids = await getNotificationIds();
    ids[`${goal.id}_reminder`] = notificationId;
    await saveNotificationIds(ids);

    return notificationId;
  } catch (error) {
    console.error('Failed to schedule reminder notification:', error);
    return null;
  }
}

/**
 * Schedule all notifications for a goal (deadline + reminder)
 */
export async function scheduleAllGoalNotifications(goal: PaintingGoal): Promise<void> {
  await scheduleGoalDeadlineNotification(goal);
  await scheduleGoalReminderNotification(goal);
}

/**
 * Cancel notifications for a specific goal
 */
export async function cancelGoalNotification(goalId: string): Promise<void> {
  try {
    const ids = await getNotificationIds();

    // Cancel main deadline notification
    if (ids[goalId]) {
      await Notifications.cancelScheduledNotificationAsync(ids[goalId]);
      delete ids[goalId];
    }

    // Cancel reminder notification
    const reminderKey = `${goalId}_reminder`;
    if (ids[reminderKey]) {
      await Notifications.cancelScheduledNotificationAsync(ids[reminderKey]);
      delete ids[reminderKey];
    }

    await saveNotificationIds(ids);
  } catch (error) {
    console.error('Failed to cancel notification:', error);
  }
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllNotifications(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    await AsyncStorage.removeItem(NOTIFICATION_IDS_KEY);
  } catch (error) {
    console.error('Failed to cancel all notifications:', error);
  }
}

/**
 * Get all scheduled notifications (for debugging)
 */
export async function getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
  return Notifications.getAllScheduledNotificationsAsync();
}

/**
 * Add listener for notification responses (when user taps notification)
 */
export function addNotificationResponseListener(
  callback: (response: Notifications.NotificationResponse) => void
): Notifications.EventSubscription {
  return Notifications.addNotificationResponseReceivedListener(callback);
}

/**
 * Add listener for notifications received while app is in foreground
 */
export function addNotificationReceivedListener(
  callback: (notification: Notifications.Notification) => void
): Notifications.EventSubscription {
  return Notifications.addNotificationReceivedListener(callback);
}
