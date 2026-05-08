import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

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

export async function rescheduleHourlyNotifications(window?: NotifyWindow): Promise<void> {
  const w = window ?? (await getNotifyWindow());
  await Notifications.cancelAllScheduledNotificationsAsync();

  const { startHour, endHour } = w;
  if (startHour > endHour) return;

  for (let h = startHour; h <= endHour; h++) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Chronos',
        body: 'What did you spend the last hour on? (one word)',
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
