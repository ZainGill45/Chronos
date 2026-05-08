import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import * as Notifications from 'expo-notifications';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Linking, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import {
  ensureNotificationPermission,
  rescheduleHourlyNotifications,
  sendTestNotification,
} from '@/lib/notifications';
import {
  DEFAULT_NOTIFY_END,
  DEFAULT_NOTIFY_START,
  getNotifyWindow,
  setNotifyWindow,
} from '@/lib/settings';

type PickerKind = 'start' | 'end' | null;

function hourToDate(hour: number): Date {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  return d;
}

function formatHourLabel(hour: number): string {
  const d = hourToDate(hour);
  return d.toLocaleTimeString(undefined, { hour: 'numeric' });
}

export default function SettingsScreen() {
  const [startHour, setStartHour] = useState<number>(DEFAULT_NOTIFY_START);
  const [endHour, setEndHour] = useState<number>(DEFAULT_NOTIFY_END);
  const [picker, setPicker] = useState<PickerKind>(null);
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);

  useEffect(() => {
    getNotifyWindow().then((w) => {
      setStartHour(w.startHour);
      setEndHour(w.endHour);
    });
    Notifications.getPermissionsAsync().then((p) => setPermissionGranted(p.granted));
  }, []);

  const persist = useCallback(async (start: number, end: number) => {
    await setNotifyWindow({ startHour: start, endHour: end });
    await rescheduleHourlyNotifications({ startHour: start, endHour: end });
  }, []);

  const handlePickerChange = (event: DateTimePickerEvent, date?: Date) => {
    const which = picker;
    setPicker(null);
    if (event.type !== 'set' || !date || !which) return;
    const hour = date.getHours();
    if (which === 'start') {
      const next = Math.min(hour, endHour);
      setStartHour(next);
      persist(next, endHour);
    } else {
      const next = Math.max(hour, startHour);
      setEndHour(next);
      persist(startHour, next);
    }
  };

  const handleRequestPermission = async () => {
    const granted = await ensureNotificationPermission();
    setPermissionGranted(granted);
    if (granted) {
      await rescheduleHourlyNotifications({ startHour, endHour });
    } else {
      Alert.alert(
        'Notifications disabled',
        'Open system settings to enable notifications for Chronos.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open settings', onPress: () => Linking.openSettings() },
        ]
      );
    }
  };

  const handleTest = async () => {
    const granted = await ensureNotificationPermission();
    if (!granted) {
      Alert.alert('Need permission', 'Grant notification permission first.');
      return;
    }
    await sendTestNotification(60);
    Alert.alert('Test scheduled', 'A test notification will fire in ~60 seconds.');
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: BottomTabInset + Spacing.five },
          ]}>
          <ThemedText type="subtitle">Settings</ThemedText>

          <Section title="Notification window">
            <ThemedText type="small" themeColor="textSecondary">
              Chronos prompts you on the hour, every hour, between these times.
            </ThemedText>

            <Row
              label="Start"
              value={formatHourLabel(startHour)}
              onPress={() => setPicker('start')}
            />
            <Row
              label="End"
              value={formatHourLabel(endHour)}
              onPress={() => setPicker('end')}
            />
          </Section>

          <Section title="Permissions">
            <Row
              label="Notifications"
              value={
                permissionGranted == null
                  ? '...'
                  : permissionGranted
                    ? 'Granted'
                    : 'Not granted'
              }
              onPress={handleRequestPermission}
            />
            {Platform.OS === 'android' && (
              <ThemedText type="small" themeColor="textSecondary">
                On some Android devices, aggressive battery managers can delay scheduled
                notifications. If prompts are unreliable, allow Chronos to ignore battery
                optimization in system settings.
              </ThemedText>
            )}
          </Section>

          <Section title="Diagnostics">
            <Row label="Send test notification (60s)" onPress={handleTest} />
          </Section>
        </ScrollView>

        {picker && Platform.OS !== 'web' && (
          <DateTimePicker
            value={hourToDate(picker === 'start' ? startHour : endHour)}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            minuteInterval={30}
            onChange={handlePickerChange}
          />
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
        {title.toUpperCase()}
      </ThemedText>
      <ThemedView type="backgroundElement" style={styles.sectionBody}>
        {children}
      </ThemedView>
    </View>
  );
}

function Row({
  label,
  value,
  onPress,
}: {
  label: string;
  value?: string;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
      <View style={styles.row}>
        <ThemedText type="default">{label}</ThemedText>
        {value !== undefined && (
          <ThemedText type="default" themeColor="textSecondary">
            {value}
          </ThemedText>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  content: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    gap: Spacing.four,
  },
  section: {
    gap: Spacing.two,
  },
  sectionTitle: {
    paddingHorizontal: Spacing.two,
  },
  sectionBody: {
    borderRadius: Spacing.three,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.two,
  },
  pressed: {
    opacity: 0.6,
  },
});
