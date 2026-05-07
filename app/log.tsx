import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { router } from 'expo-router';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';

export default function LogScreen() {
  const [activity, setActivity] = useState('');
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({}, 'icon');

  const submit = () => {
    const trimmed = activity.trim();
    if (!trimmed) return;
    // TODO: persist to SQLite once storage layer is in place.
    console.log('logged activity:', trimmed, 'at', new Date().toISOString());
    router.back();
  };

  const canSubmit = activity.trim().length > 0;

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">What did you do?</ThemedText>
      <ThemedText style={styles.subtitle}>For the past hour.</ThemedText>
      <TextInput
        style={[styles.input, { color: textColor, borderColor }]}
        value={activity}
        onChangeText={setActivity}
        placeholder="e.g. coding, reading, lunch..."
        placeholderTextColor={borderColor}
        autoFocus
        multiline
      />
      <View style={styles.buttons}>
        <Pressable
          onPress={() => router.back()}
          style={[styles.button, styles.cancelButton, { borderColor }]}
        >
          <ThemedText style={styles.buttonText}>Cancel</ThemedText>
        </Pressable>
        <Pressable
          onPress={submit}
          disabled={!canSubmit}
          style={[styles.button, styles.submitButton, !canSubmit && styles.disabled]}
        >
          <ThemedText style={[styles.buttonText, styles.submitText]}>Log</ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    gap: 16,
  },
  subtitle: {
    opacity: 0.7,
    fontSize: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    minHeight: 120,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    borderWidth: 1,
  },
  submitButton: {
    backgroundColor: '#0a7ea4',
  },
  disabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontWeight: '600',
  },
  submitText: {
    color: '#fff',
  },
});
