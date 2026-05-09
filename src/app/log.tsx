import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { type Entry, deleteEntry, getEntriesForDay, getEntry, upsertEntry } from '@/lib/db';
import {
  DEFAULT_NOTIFY_END,
  DEFAULT_NOTIFY_START,
  getNotifyWindow,
  type NotifyWindow,
} from '@/lib/settings';
import {
  HOUR_MS,
  formatDayLabel,
  formatHourRange,
  previousHourStart,
  startOfDay,
} from '@/lib/time';

type HourPickerTarget = 'start' | 'end' | null;

export default function LogScreen() {
  const params = useLocalSearchParams<{ hourStart?: string; pick?: string }>();
  const isPickMode = params.pick === '1';

  const fixedHourStart = useMemo(() => {
    const n = Number(params.hourStart);
    return Number.isFinite(n) && n > 0 ? n : previousHourStart();
  }, [params.hourStart]);

  const defaultHour = Math.max(0, new Date().getHours() - 1);
  const [pickedDayStart, setPickedDayStart] = useState(() => startOfDay(Date.now()));
  const [pickedStartHour, setPickedStartHour] = useState(defaultHour);
  const [pickedEndHour, setPickedEndHour] = useState(defaultHour);

  const [notifyWindow, setNotifyWindow] = useState<NotifyWindow>({
    startHour: DEFAULT_NOTIFY_START,
    endHour: DEFAULT_NOTIFY_END,
  });

  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [hourPickerTarget, setHourPickerTarget] = useState<HourPickerTarget>(null);
  const [dayEntries, setDayEntries] = useState<Entry[]>([]);

  const theme = useTheme();
  const [word, setWord] = useState('');
  const [loaded, setLoaded] = useState(isPickMode);
  const [saving, setSaving] = useState(false);
  const [hadExistingEntry, setHadExistingEntry] = useState(false);

  useEffect(() => {
    let active = true;
    getNotifyWindow().then((w) => {
      if (!active) return;
      setNotifyWindow(w);
      setPickedStartHour((h) => Math.min(Math.max(h, w.startHour), w.endHour));
      setPickedEndHour((h) => Math.min(Math.max(h, w.startHour), w.endHour));
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (isPickMode) return;
    let active = true;
    getEntry(fixedHourStart).then((entry) => {
      if (!active) return;
      setWord(entry?.word ?? '');
      setHadExistingEntry(entry != null);
      setLoaded(true);
    });
    return () => {
      active = false;
    };
  }, [fixedHourStart, isPickMode]);

  useEffect(() => {
    if (!isPickMode) return;
    let active = true;
    getEntriesForDay(pickedDayStart).then((rows) => {
      if (active) setDayEntries(rows);
    });
    return () => {
      active = false;
    };
  }, [pickedDayStart, isPickMode]);

  const sanitized = word.trim().split(/\s+/)[0] ?? '';

  const takenHours = useMemo(() => {
    const set = new Set<number>();
    for (const e of dayEntries) set.add(new Date(e.hourStart).getHours());
    return set;
  }, [dayEntries]);

  const hoursToSaveCount = useMemo(() => {
    if (!isPickMode) return 1;
    let n = 0;
    for (let h = pickedStartHour; h <= pickedEndHour; h++) {
      if (!takenHours.has(h)) n++;
    }
    return n;
  }, [isPickMode, pickedStartHour, pickedEndHour, takenHours]);

  const canSave =
    loaded && !saving && sanitized.length > 0 && (!isPickMode || hoursToSaveCount > 0);

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      if (isPickMode) {
        for (let h = pickedStartHour; h <= pickedEndHour; h++) {
          if (takenHours.has(h)) continue;
          await upsertEntry(pickedDayStart + h * HOUR_MS, sanitized);
        }
      } else {
        await upsertEntry(fixedHourStart, sanitized);
      }
      router.back();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert('Delete entry?', formatHourRange(fixedHourStart), [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteEntry(fixedHourStart);
          router.back();
        },
      },
    ]);
  };

  const handleDateChange = (event: DateTimePickerEvent, date?: Date) => {
    setDatePickerOpen(false);
    if (event.type === 'set' && date) {
      const next = startOfDay(date.getTime());
      const today = startOfDay(Date.now());
      if (next <= today) setPickedDayStart(next);
    }
  };

  const handleHourSelect = (h: number) => {
    if (hourPickerTarget === 'start') {
      setPickedStartHour(h);
      if (h > pickedEndHour) setPickedEndHour(h);
    } else if (hourPickerTarget === 'end') {
      setPickedEndHour(h);
      if (h < pickedStartHour) setPickedStartHour(h);
    }
    setHourPickerTarget(null);
  };

  const today = startOfDay(Date.now());

  const filteredHours = useMemo(
    () =>
      Array.from({ length: 24 }, (_, h) => h).filter(
        (h) =>
          h >= notifyWindow.startHour &&
          h <= notifyWindow.endHour &&
          pickedDayStart + h * HOUR_MS <= Date.now() &&
          !takenHours.has(h)
      ),
    [notifyWindow, pickedDayStart, takenHours]
  );

  const showDelete = !isPickMode && loaded && hadExistingEntry;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}>
          <View style={styles.body}>
            <ThemedText type="small" themeColor="textSecondary">
              Logging
            </ThemedText>

            {isPickMode ? (
              <>
                <View style={styles.pickRow}>
                  <Pressable
                    onPress={() => setDatePickerOpen(true)}
                    style={({ pressed }) => pressed && styles.pressed}>
                    <ThemedView type="backgroundElement" style={styles.pickPill}>
                      <ThemedText type="default">{formatDayLabel(pickedDayStart)}</ThemedText>
                    </ThemedView>
                  </Pressable>
                </View>
                <View style={styles.pickRow}>
                  <Pressable
                    onPress={() => setHourPickerTarget('start')}
                    style={({ pressed }) => pressed && styles.pressed}>
                    <ThemedView type="backgroundElement" style={styles.pickPill}>
                      <ThemedText type="small" themeColor="textSecondary">
                        Start
                      </ThemedText>
                      <ThemedText type="default">
                        {formatHourRange(pickedDayStart + pickedStartHour * HOUR_MS)}
                      </ThemedText>
                    </ThemedView>
                  </Pressable>
                  <Pressable
                    onPress={() => setHourPickerTarget('end')}
                    style={({ pressed }) => pressed && styles.pressed}>
                    <ThemedView type="backgroundElement" style={styles.pickPill}>
                      <ThemedText type="small" themeColor="textSecondary">
                        End
                      </ThemedText>
                      <ThemedText type="default">
                        {formatHourRange(pickedDayStart + pickedEndHour * HOUR_MS)}
                      </ThemedText>
                    </ThemedView>
                  </Pressable>
                </View>
                <ThemedText type="small" themeColor="textSecondary">
                  Will save {hoursToSaveCount} {hoursToSaveCount === 1 ? 'entry' : 'entries'}
                </ThemedText>
              </>
            ) : (
              <ThemedText type="subtitle">{formatHourRange(fixedHourStart)}</ThemedText>
            )}

            <ThemedText type="small" themeColor="textSecondary" style={styles.prompt}>
              In one word, what did you spend that hour on?
            </ThemedText>

            <ThemedView type="backgroundElement" style={styles.inputWrap}>
              <TextInput
                value={word}
                onChangeText={setWord}
                placeholder="e.g. running"
                placeholderTextColor={theme.textSecondary}
                style={[styles.input, { color: theme.text }]}
                autoFocus={!isPickMode}
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={24}
                returnKeyType="done"
                onSubmitEditing={handleSave}
              />
            </ThemedView>

            {isPickMode && hoursToSaveCount === 0 && (
              <ThemedText type="small" themeColor="textSecondary" style={styles.prompt}>
                Every hour in that range is already logged.
              </ThemedText>
            )}
          </View>

          <View style={styles.footer}>
            {showDelete && (
              <Pressable
                onPress={handleDelete}
                style={({ pressed }) => [styles.deleteWrap, pressed && styles.pressed]}>
                <ThemedView type="backgroundElement" style={styles.button}>
                  <ThemedText type="default" style={styles.deleteText}>
                    Delete
                  </ThemedText>
                </ThemedView>
              </Pressable>
            )}
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => pressed && styles.pressed}>
              <ThemedView type="backgroundElement" style={styles.button}>
                <ThemedText type="default" themeColor="textSecondary">
                  Cancel
                </ThemedText>
              </ThemedView>
            </Pressable>
            <Pressable
              onPress={handleSave}
              disabled={!canSave}
              style={({ pressed }) => [pressed && styles.pressed, !canSave && styles.disabled]}>
              <ThemedView type="backgroundSelected" style={styles.button}>
                <ThemedText type="default">{saving ? 'Saving...' : 'Save'}</ThemedText>
              </ThemedView>
            </Pressable>
          </View>
        </KeyboardAvoidingView>

        {datePickerOpen && Platform.OS !== 'web' && (
          <DateTimePicker
            value={new Date(pickedDayStart)}
            mode="date"
            maximumDate={new Date(today)}
            onChange={handleDateChange}
          />
        )}

        <Modal
          visible={hourPickerTarget !== null}
          animationType="slide"
          onRequestClose={() => setHourPickerTarget(null)}>
          <ThemedView style={styles.fullModal}>
            <SafeAreaView style={styles.fullModalSafe} edges={['top', 'bottom']}>
              <View style={styles.modalHeader}>
                <ThemedText type="subtitle" style={styles.modalTitle}>
                  {hourPickerTarget === 'start' ? 'Start hour' : 'End hour'}
                </ThemedText>
                <Pressable
                  onPress={() => setHourPickerTarget(null)}
                  hitSlop={16}
                  style={({ pressed }) => pressed && styles.pressed}>
                  <ThemedText type="subtitle" themeColor="textSecondary">
                    ✕
                  </ThemedText>
                </Pressable>
              </View>
              <FlatList
                data={filteredHours}
                keyExtractor={(h) => String(h)}
                contentContainerStyle={styles.hourList}
                renderItem={({ item: h }) => {
                  const ts = pickedDayStart + h * HOUR_MS;
                  const selected =
                    hourPickerTarget === 'start' ? h === pickedStartHour : h === pickedEndHour;
                  return (
                    <Pressable
                      onPress={() => handleHourSelect(h)}
                      style={({ pressed }) => [
                        styles.hourItem,
                        selected && { backgroundColor: theme.backgroundSelected },
                        pressed && styles.pressed,
                      ]}>
                      <ThemedText style={styles.hourText}>{formatHourRange(ts)}</ThemedText>
                      {selected && <ThemedText style={styles.hourCheck}>✓</ThemedText>}
                    </Pressable>
                  );
                }}
                ItemSeparatorComponent={() => <View style={styles.hourSeparator} />}
                ListEmptyComponent={
                  <ThemedText
                    type="default"
                    themeColor="textSecondary"
                    style={styles.hourEmpty}>
                    No available hours.
                  </ThemedText>
                }
              />
            </SafeAreaView>
          </ThemedView>
        </Modal>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  body: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    gap: Spacing.three,
  },
  pickRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    flexWrap: 'wrap',
  },
  pickPill: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.half,
  },
  prompt: {
    marginTop: Spacing.two,
  },
  inputWrap: {
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    marginTop: Spacing.three,
  },
  input: {
    fontSize: 24,
    lineHeight: 32,
    paddingVertical: Spacing.two,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.three,
  },
  button: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.three,
  },
  deleteWrap: {
    marginRight: 'auto',
  },
  deleteText: {
    color: '#e5484d',
  },
  pressed: {
    opacity: 0.6,
  },
  disabled: {
    opacity: 0.4,
  },
  fullModal: {
    flex: 1,
  },
  fullModalSafe: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.two,
  },
  modalTitle: {
    fontSize: 22,
    lineHeight: 28,
  },
  hourList: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.three,
  },
  hourItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.three,
  },
  hourText: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '500',
  },
  hourCheck: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '700',
    color: '#3c87f7',
  },
  hourSeparator: {
    height: 0,
  },
  hourEmpty: {
    textAlign: 'center',
    paddingVertical: Spacing.four,
  },
});
