import * as Notifications from 'expo-notifications';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  ensureNotificationPermission,
  openAppNotificationSettings,
  openBatteryOptimizationSettings,
  openExactAlarmSettings,
  rescheduleHourlyNotifications,
} from '@/lib/notifications';
import { setPermissionsAcknowledged } from '@/lib/settings';



type LearnMoreKey = 'notifications' | 'exactAlarm' | 'battery';

export default function PermissionsScreen() {
  const params = useLocalSearchParams<{ firstRun?: string }>();
  const isFirstRun = params.firstRun === '1';

  const [notifGranted, setNotifGranted] = useState<boolean | null>(null);
  const [exactAlarmAcknowledged, setExactAlarmAcknowledged] = useState(false);
  const [batteryAcknowledged, setBatteryAcknowledged] = useState(false);
  const [expanded, setExpanded] = useState<Record<LearnMoreKey, boolean>>({
    notifications: false,
    exactAlarm: false,
    battery: false,
  });

  const refreshNotifStatus = useCallback(async () => {
    const p = await Notifications.getPermissionsAsync();
    setNotifGranted(p.granted);
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshNotifStatus();
    }, [refreshNotifStatus])
  );

  const toggleExpanded = (key: LearnMoreKey) => {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleGrantNotifications = async () => {
    const granted = await ensureNotificationPermission();
    setNotifGranted(granted);
    if (granted) {
      await rescheduleHourlyNotifications();
    } else {
      Alert.alert(
        'Notifications disabled',
        'Open system settings to enable notifications for Chronos.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open settings', onPress: openAppNotificationSettings },
        ]
      );
    }
  };

  const handleContinue = async () => {
    await setPermissionsAcknowledged(true);
    router.replace('/');
  };

  const canContinue = notifGranted === true;
  const canDismiss = !isFirstRun;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.header}>
          {canDismiss ? (
            <Pressable
              onPress={() => router.back()}
              hitSlop={12}
              style={({ pressed }) => pressed && styles.pressed}>
              <ThemedText type="subtitle" style={styles.backChevron}>
                {'‹'}
              </ThemedText>
            </Pressable>
          ) : (
            <View style={styles.backChevronPlaceholder} />
          )}
          <ThemedText type="subtitle">Permissions</ThemedText>
          <View style={styles.backChevronPlaceholder} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText type="small" themeColor="textSecondary" style={styles.intro}>
            Chronos needs a few permissions so it can prompt you on the hour. Everything stays on
            this device — nothing is sent to a server.
          </ThemedText>

          <PermissionCard
            title="Notifications"
            subtitle="Required so Chronos can prompt you each hour."
            status={
              notifGranted == null ? 'unknown' : notifGranted ? 'granted' : 'notGranted'
            }
            actionLabel={notifGranted ? 'Open settings' : 'Grant'}
            onAction={notifGranted ? openAppNotificationSettings : handleGrantNotifications}
            expanded={expanded.notifications}
            onToggleExpand={() => toggleExpanded('notifications')}
            explainer={
              <ThemedText type="small" themeColor="textSecondary">
                Chronos schedules a local notification at the top of every hour during your wake
                window. We don&apos;t send anything to a server — entries stay on this device. If
                notifications are off, the app can&apos;t prompt you.
              </ThemedText>
            }
          />

          {Platform.OS === 'android' && (
            <>
              <PermissionCard
                title="Alarms & reminders"
                subtitle="Android 12+ needs this for hourly prompts to fire on time."
                status={exactAlarmAcknowledged ? 'acknowledged' : 'unverified'}
                actionLabel="Open settings"
                onAction={openExactAlarmSettings}
                acknowledged={exactAlarmAcknowledged}
                onAcknowledgeChange={setExactAlarmAcknowledged}
                expanded={expanded.exactAlarm}
                onToggleExpand={() => toggleExpanded('exactAlarm')}
                explainer={
                  <ThemedText type="small" themeColor="textSecondary">
                    On Android 12+, scheduled notifications need &quot;Alarms &amp; reminders&quot;
                    enabled or the OS will deliver them late or not at all. Tap the button above to
                    open the system page — toggle &quot;Allow&quot; for Chronos, then come back and
                    tick the box.
                  </ThemedText>
                }
              />

              <PermissionCard
                title="Ignore battery optimization"
                subtitle="Many Android phones kill background alarms unless you whitelist the app."
                status={batteryAcknowledged ? 'acknowledged' : 'unverified'}
                actionLabel="Open settings"
                onAction={openBatteryOptimizationSettings}
                acknowledged={batteryAcknowledged}
                onAcknowledgeChange={setBatteryAcknowledged}
                expanded={expanded.battery}
                onToggleExpand={() => toggleExpanded('battery')}
                explainer={
                  <View style={styles.explainerStack}>
                    <ThemedText type="small" themeColor="textSecondary">
                      Many Android phones aggressively kill background scheduled alarms to save
                      battery. Even with the system permission, you may need to whitelist Chronos
                      manually. Per-manufacturer paths:
                    </ThemedText>
                    <OemTip
                      brand="Samsung (One UI)"
                      path="Settings → Apps → Chronos → Battery → Unrestricted"
                    />
                    <OemTip
                      brand="Xiaomi / Redmi (MIUI / HyperOS)"
                      path="Settings → Apps → Chronos → Battery saver → No restrictions; also Autostart → enable"
                    />
                    <OemTip
                      brand="OnePlus / Oppo (OxygenOS / ColorOS)"
                      path="Battery → Battery optimization → Chronos → Don't optimize; Apps → Chronos → Manage notifications → Allow background activity"
                    />
                    <OemTip
                      brand="Huawei (EMUI)"
                      path="Settings → Apps → Chronos → Battery → Manage manually → enable Auto-launch, Secondary-launch, and Run in background"
                    />
                    <OemTip
                      brand="Stock Android / Pixel"
                      path="Settings → Apps → Chronos → Battery → Unrestricted"
                    />
                    <ThemedText type="small" themeColor="textSecondary">
                      The button above jumps to the battery-optimization list — find Chronos and
                      choose &quot;Don&apos;t optimize.&quot;
                    </ThemedText>
                  </View>
                }
              />
            </>
          )}

          {isFirstRun && (
            <View style={styles.continueWrap}>
              {!canContinue && (
                <ThemedText type="small" themeColor="textSecondary" style={styles.continueHint}>
                  Grant notification permission to continue.
                </ThemedText>
              )}
              <Pressable
                onPress={handleContinue}
                disabled={!canContinue}
                style={({ pressed }) => [
                  pressed && styles.pressed,
                  !canContinue && styles.disabled,
                ]}>
                <ThemedView type="backgroundSelected" style={styles.continueButton}>
                  <ThemedText type="default">Continue</ThemedText>
                </ThemedView>
              </Pressable>
            </View>
          )}

          {Platform.OS === 'ios' && (
            <ThemedText
              type="small"
              themeColor="textSecondary"
              style={styles.platformNote}>
              The other permission cards only appear on Android.
            </ThemedText>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

type PermissionStatus = 'granted' | 'notGranted' | 'unknown' | 'acknowledged' | 'unverified';

type PermissionCardProps = {
  title: string;
  subtitle: string;
  status: PermissionStatus;
  actionLabel: string;
  onAction: () => void | Promise<void>;
  expanded: boolean;
  onToggleExpand: () => void;
  explainer: React.ReactNode;
  acknowledged?: boolean;
  onAcknowledgeChange?: (next: boolean) => void;
};

function PermissionCard({
  title,
  subtitle,
  status,
  actionLabel,
  onAction,
  expanded,
  onToggleExpand,
  explainer,
  acknowledged,
  onAcknowledgeChange,
}: PermissionCardProps) {
  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <View style={styles.cardHeader}>
        <ThemedText type="default" style={styles.cardTitle}>
          {title}
        </ThemedText>
        <StatusPill status={status} />
      </View>
      <ThemedText type="small" themeColor="textSecondary">
        {subtitle}
      </ThemedText>
      <Pressable
        onPress={onAction}
        style={({ pressed }) => pressed && styles.pressed}>
        <ThemedView type="backgroundSelected" style={styles.actionButton}>
          <ThemedText type="default">{actionLabel}</ThemedText>
        </ThemedView>
      </Pressable>
      {onAcknowledgeChange && (
        <Pressable
          onPress={() => onAcknowledgeChange(!acknowledged)}
          style={({ pressed }) => [styles.checkboxRow, pressed && styles.pressed]}>
          <View style={[styles.checkbox, acknowledged && styles.checkboxChecked]}>
            {acknowledged && <ThemedText style={styles.checkboxMark}>✓</ThemedText>}
          </View>
          <ThemedText type="small">I&apos;ve allowed this</ThemedText>
        </Pressable>
      )}
      <Pressable
        onPress={onToggleExpand}
        style={({ pressed }) => [styles.learnMoreRow, pressed && styles.pressed]}>
        <ThemedText type="small" themeColor="textSecondary">
          {expanded ? '▾ Hide details' : '▸ Learn more'}
        </ThemedText>
      </Pressable>
      {expanded && <View style={styles.explainer}>{explainer}</View>}
    </ThemedView>
  );
}

function StatusPill({ status }: { status: PermissionStatus }) {
  const theme = useTheme();
  const { label, color, background } = (() => {
    switch (status) {
      case 'granted':
        return { label: 'Granted', color: '#1f7a3a', background: '#d6f3df' };
      case 'notGranted':
        return { label: 'Not granted', color: '#a52a2a', background: '#fbe1e1' };
      case 'acknowledged':
        return { label: 'Confirmed', color: '#1f7a3a', background: '#d6f3df' };
      case 'unverified':
        return { label: 'Unverified', color: theme.textSecondary, background: theme.backgroundSelected };
      case 'unknown':
      default:
        return { label: '...', color: theme.textSecondary, background: theme.backgroundSelected };
    }
  })();
  return (
    <View style={[styles.pill, { backgroundColor: background }]}>
      <ThemedText type="small" style={[styles.pillText, { color }]}>
        {label}
      </ThemedText>
    </View>
  );
}

function OemTip({ brand, path }: { brand: string; path: string }) {
  return (
    <View style={styles.oemTip}>
      <ThemedText type="small" style={styles.oemBrand}>
        {brand}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {path}
      </ThemedText>
    </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
  },
  backChevron: {
    paddingHorizontal: Spacing.two,
  },
  backChevronPlaceholder: {
    width: 32,
  },
  content: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.five,
    gap: Spacing.three,
  },
  intro: {
    marginBottom: Spacing.one,
  },
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  cardTitle: {
    fontWeight: '600',
    flexShrink: 1,
  },
  pill: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: Spacing.three,
  },
  pillText: {
    fontWeight: '600',
  },
  actionButton: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
    alignSelf: 'flex-start',
    marginTop: Spacing.one,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#7a7e85',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#3c87f7',
    borderColor: '#3c87f7',
  },
  checkboxMark: {
    color: '#ffffff',
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
  },
  learnMoreRow: {
    paddingVertical: Spacing.one,
  },
  explainer: {
    paddingTop: Spacing.one,
  },
  explainerStack: {
    gap: Spacing.two,
  },
  oemTip: {
    gap: 2,
  },
  oemBrand: {
    fontWeight: '700',
  },
  continueWrap: {
    marginTop: Spacing.three,
    gap: Spacing.two,
    alignItems: 'flex-end',
  },
  continueHint: {
    alignSelf: 'flex-end',
  },
  continueButton: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.five,
    borderRadius: Spacing.three,
  },
  platformNote: {
    marginTop: Spacing.two,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
  disabled: {
    opacity: 0.4,
  },
});
