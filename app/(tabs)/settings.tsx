import { Alert, Pressable, StyleSheet, View } from 'react-native';

import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import {
  PROMPT_INTERVAL_SECONDS,
  getScheduledCount,
  sendTestPrompt,
  startHourlyPrompts,
  stopAllPrompts,
} from '@/lib/notifications';

export default function SettingsScreen() {
  const handleStart = async () => {
    await startHourlyPrompts();
    Alert.alert('Prompts started', `You'll be prompted every ${PROMPT_INTERVAL_SECONDS} seconds.`);
  };

  const handleStop = async () => {
    await stopAllPrompts();
    Alert.alert('Prompts stopped');
  };

  const handleTest = async () => {
    await sendTestPrompt(5);
    Alert.alert('Test prompt scheduled', 'Will fire in 5 seconds.');
  };

  const handleStatus = async () => {
    const count = await getScheduledCount();
    Alert.alert('Scheduled prompts', `${count} currently scheduled.`);
  };

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#D0D0D0', dark: '#353636' }}
      headerImage={
        <IconSymbol
          size={310}
          color="#808080"
          name="gear"
          style={styles.headerImage}
        />
      }>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Settings</ThemedText>
      </ThemedView>
      <ThemedText>Adjust everything and anything about this app right here.</ThemedText>

      <ThemedText type="subtitle" style={styles.sectionTitle}>Prompts</ThemedText>
      <ThemedText style={styles.helper}>
        Cadence: every {PROMPT_INTERVAL_SECONDS} seconds (dev mode).
      </ThemedText>

      <View style={styles.buttonGroup}>
        <Pressable style={styles.button} onPress={handleStart}>
          <ThemedText style={styles.buttonText}>Start hourly prompts</ThemedText>
        </Pressable>
        <Pressable style={[styles.button, styles.secondary]} onPress={handleStop}>
          <ThemedText style={styles.buttonText}>Stop all prompts</ThemedText>
        </Pressable>
        <Pressable style={[styles.button, styles.tertiary]} onPress={handleTest}>
          <ThemedText style={styles.buttonText}>Send test prompt (5s)</ThemedText>
        </Pressable>
        <Pressable style={[styles.button, styles.tertiary]} onPress={handleStatus}>
          <ThemedText style={styles.buttonText}>Check scheduled count</ThemedText>
        </Pressable>
      </View>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  headerImage: {
    color: '#FFFFFF',
    bottom: -90,
    left: -30,
    position: 'absolute',
  },
  titleContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  sectionTitle: {
    marginTop: 24,
  },
  helper: {
    opacity: 0.7,
    marginBottom: 8,
  },
  buttonGroup: {
    gap: 10,
  },
  button: {
    backgroundColor: '#0a7ea4',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  secondary: {
    backgroundColor: '#a0522d',
  },
  tertiary: {
    backgroundColor: '#555',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
