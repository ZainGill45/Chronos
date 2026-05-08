import React from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import { HourRow } from '@/components/hour-row';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { Entry } from '@/lib/db';

type Props = {
  entries: Entry[];
  onPressHour: (hourStart: number) => void;
};

export function DayTimeline({ entries, onPressHour }: Props) {
  return (
    <FlatList
      data={entries}
      keyExtractor={(e) => String(e.hourStart)}
      contentContainerStyle={
        entries.length === 0 ? styles.emptyContent : styles.content
      }
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      renderItem={({ item }) => (
        <HourRow hourStart={item.hourStart} word={item.word} onPress={onPressHour} />
      )}
      ListEmptyComponent={
        <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
          No entries for this day.
        </ThemedText>
      }
    />
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  emptyContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
  },
  emptyText: {
    textAlign: 'center',
  },
  separator: {
    height: Spacing.two,
  },
});
