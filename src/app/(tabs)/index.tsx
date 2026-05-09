import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DayTimeline } from '@/components/day-timeline';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { Entry, getEntriesForDay } from '@/lib/db';
import { addDays, DAY_MS, formatDayLabel, startOfDay } from '@/lib/time';

export default function TodayScreen() {
  const [dayStart, setDayStart] = useState(() => startOfDay(Date.now()));
  const [entries, setEntries] = useState<Entry[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getEntriesForDay(dayStart).then((rows) => {
        if (active) setEntries(rows);
      });
      return () => {
        active = false;
      };
    }, [dayStart])
  );

  const today = startOfDay(Date.now());
  const canGoForward = dayStart < today;

  const handlePressHour = (hourStart: number) => {
    router.push({ pathname: '/log', params: { hourStart: String(hourStart) } });
  };

  const handleDateChange = (event: DateTimePickerEvent, date?: Date) => {
    setPickerOpen(false);
    if (event.type === 'set' && date) {
      const next = startOfDay(date.getTime());
      if (next <= today) setDayStart(next);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Pressable
            onPress={() => setDayStart((d) => d - DAY_MS)}
            hitSlop={12}
            style={({ pressed }) => pressed && styles.pressed}>
            <ThemedText type="subtitle" style={styles.chevron}>
              {'‹'}
            </ThemedText>
          </Pressable>

          <Pressable
            onPress={() => setPickerOpen(true)}
            style={({ pressed }) => pressed && styles.pressed}>
            <ThemedText type="subtitle" style={styles.dayLabel}>
              {formatDayLabel(dayStart)}
            </ThemedText>
          </Pressable>

          <Pressable
            onPress={() => canGoForward && setDayStart((d) => addDays(d, 1))}
            disabled={!canGoForward}
            hitSlop={12}
            style={({ pressed }) => pressed && styles.pressed}>
            <ThemedText
              type="subtitle"
              themeColor={canGoForward ? 'text' : 'textSecondary'}
              style={styles.chevron}>
              {'›'}
            </ThemedText>
          </Pressable>
        </View>

        <View style={styles.timelineWrap}>
          <DayTimeline entries={entries} onPressHour={handlePressHour} />
        </View>

        {pickerOpen && Platform.OS !== 'web' && (
          <DateTimePicker
            value={new Date(dayStart)}
            mode="date"
            maximumDate={new Date(today)}
            onChange={handleDateChange}
          />
        )}
      </SafeAreaView>
    </ThemedView>
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
    gap: Spacing.three,
  },
  dayLabel: {
    textAlign: 'center',
  },
  chevron: {
    paddingHorizontal: Spacing.three,
  },
  pressed: {
    opacity: 0.6,
  },
  timelineWrap: {
    flex: 1,
  },
});
