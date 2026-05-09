import * as Notifications from 'expo-notifications';
import { Linking, Platform } from 'react-native';

import { getNotifyWindow, NotifyWindow } from './settings';

export const HOURLY_PROMPT_KIND = 'hourly-prompt';
export const ANDROID_CHANNEL_ID = 'hourly-prompt';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: 'Hourly prompt',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    enableVibrate: true,
    showBadge: false,
  });
}

export async function ensureNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const next = await Notifications.requestPermissionsAsync();
  return next.granted;
}

export async function openExactAlarmSettings(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    await Linking.sendIntent('android.settings.REQUEST_SCHEDULE_EXACT_ALARM');
  } catch {
    await Linking.openSettings();
  }
}

export async function openBatteryOptimizationSettings(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    await Linking.sendIntent('android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS');
  } catch {
    await Linking.openSettings();
  }
}

export async function openAppNotificationSettings(): Promise<void> {
  await Linking.openSettings();
}

export async function rescheduleHourlyNotifications(window?: NotifyWindow): Promise<void> {
  const w = window ?? (await getNotifyWindow());
  await Notifications.cancelAllScheduledNotificationsAsync();

  const { startHour, endHour } = w;
  if (startHour + 1 > endHour) return;

  for (let h = startHour + 1; h <= endHour; h++) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Chronos',
        body: 'What did you spend the last hour on? (up to 3 words)',
        data: { kind: HOURLY_PROMPT_KIND },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: h,
        minute: 0,
        channelId: ANDROID_CHANNEL_ID,
      },
    });
  }
}

export async function sendTestNotification(seconds = 60): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Chronos test',
      body: 'If you see this, hourly prompts will work.',
      data: { kind: HOURLY_PROMPT_KIND },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds,
      repeats: false,
      channelId: ANDROID_CHANNEL_ID,
    },
  });
}

export function isHourlyPromptResponse(
  response: Notifications.NotificationResponse | null
): boolean {
  if (!response) return false;
  return response.notification.request.content.data?.kind === HOURLY_PROMPT_KIND;
}
