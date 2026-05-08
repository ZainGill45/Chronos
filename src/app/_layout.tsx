import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { Stack, router } from 'expo-router';
import React, { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { initDb } from '@/lib/db';
import {
  ensureAndroidChannel,
  ensureNotificationPermission,
  isHourlyPromptResponse,
  rescheduleHourlyNotifications,
} from '@/lib/notifications';
import { previousHourStart } from '@/lib/time';

function openLogForPreviousHour() {
  router.push({
    pathname: '/log',
    params: { hourStart: String(previousHourStart()) },
  });
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    let mounted = true;
    (async () => {
      await initDb();
      await ensureAndroidChannel();
      const granted = await ensureNotificationPermission();
      if (granted && mounted) {
        await rescheduleHourlyNotifications();
      }
      const last = await Notifications.getLastNotificationResponseAsync();
      if (mounted && isHourlyPromptResponse(last)) {
        openLogForPreviousHour();
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      if (!isHourlyPromptResponse(response)) return;
      openLogForPreviousHour();
    });
    return () => sub.remove();
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="log"
          options={{
            presentation: 'modal',
            title: 'Log hour',
          }}
        />
      </Stack>
    </ThemeProvider>
  );
}
