import React from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { formatHourRange } from '@/lib/time';

type Props = {
  hourStart: number;
  word: string;
  onPress: (hourStart: number) => void;
};

export function HourRow({ hourStart, word, onPress }: Props) {
  return (
    <Pressable
      onPress={() => onPress(hourStart)}
      style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}>
      <ThemedView type="backgroundSelected" style={styles.row}>
        <ThemedText type="small" themeColor="textSecondary" style={styles.range}>
          {formatHourRange(hourStart)}
        </ThemedText>
        <ThemedText type="default" style={styles.word}>
          {word}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    width: '100%',
  },
  pressed: {
    opacity: 0.6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.three,
    gap: Spacing.three,
  },
  range: {
    minWidth: 110,
  },
  word: {
    flex: 1,
    textAlign: 'right',
  },
});
