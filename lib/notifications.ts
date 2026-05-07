import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';
import { Platform } from 'react-native';

// Dev cadence — bump to 3600 before shipping.
export const PROMPT_INTERVAL_SECONDS = 60;

const ANDROID_CHANNEL_ID = 'chronos-prompts';
const HOURLY_PROMPT_ID = 'chronos-hourly-prompt';

const PROMPT_CONTENT = {
  title: 'What have you been up to?',
  body: 'Take a moment to log how you spent the last hour.',
  sound: 'default' as const,
};

// Without this, notifications fired while the app is foregrounded are silently swallowed.
export function configureForegroundHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export async function setupAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: 'Hourly prompts',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
  });
}

export async function requestPermissions(): Promise<boolean> {
  // expo-notifications 55 has a broken types-only dep on expo-modules-core,
  // so PermissionResponse fields don't surface on NotificationPermissionsStatus.
  // Runtime shape is fine — status is always present.
  const existing = (await Notifications.getPermissionsAsync()) as { status: string };
  if (existing.status === 'granted') return true;
  const result = (await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: true, allowSound: true },
  })) as { status: string };
  return result.status === 'granted';
}

export async function startHourlyPrompts(intervalSeconds: number = PROMPT_INTERVAL_SECONDS) {
  await Notifications.cancelScheduledNotificationAsync(HOURLY_PROMPT_ID).catch(() => {});
  await Notifications.scheduleNotificationAsync({
    identifier: HOURLY_PROMPT_ID,
    content: PROMPT_CONTENT,
    trigger: {
      type: SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: intervalSeconds,
      repeats: true,
      channelId: ANDROID_CHANNEL_ID,
    },
  });
}

export async function stopAllPrompts() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function sendTestPrompt(seconds: number = 5) {
  await Notifications.scheduleNotificationAsync({
    content: { ...PROMPT_CONTENT, body: `${PROMPT_CONTENT.body} (test)` },
    trigger: {
      type: SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds,
      repeats: false,
      channelId: ANDROID_CHANNEL_ID,
    },
  });
}

export async function getScheduledCount(): Promise<number> {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  return all.length;
}
