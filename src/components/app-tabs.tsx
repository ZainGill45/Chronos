import { Tabs, TabList, TabSlot, TabTrigger, TabTriggerSlotProps } from 'expo-router/ui';
import { router } from 'expo-router';
import React from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { BottomTabInset, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const ICON_SIZE = 24;

export default function AppTabs() {
  return (
    <Tabs style={styles.root}>
      <TabSlot />
      <TabList asChild>
        <BottomBar>
          <TabTrigger name="today" href="/" asChild>
            <TabItem icon={require('@/assets/images/tabIcons/home.png')}>Today</TabItem>
          </TabTrigger>
          <PlusButton />
          <TabTrigger name="settings" href="/settings" asChild>
            <TabItem icon={require('@/assets/images/tabIcons/explore.png')}>Settings</TabItem>
          </TabTrigger>
        </BottomBar>
      </TabList>
    </Tabs>
  );
}

function BottomBar({ children }: { children: React.ReactNode }) {
  return (
    <ThemedView type="backgroundElement" style={styles.bar}>
      {children}
    </ThemedView>
  );
}

type TabItemProps = TabTriggerSlotProps & {
  icon: number;
};

function TabItem({ icon, children, isFocused, ...props }: TabItemProps) {
  const theme = useTheme();
  const color = isFocused ? theme.text : theme.textSecondary;
  return (
    <Pressable {...props} style={({ pressed }) => [styles.slot, pressed && styles.pressed]}>
      <Image source={icon} style={[styles.icon, { tintColor: color }]} resizeMode="contain" />
      <ThemedText type="small" themeColor={isFocused ? 'text' : 'textSecondary'}>
        {children}
      </ThemedText>
    </Pressable>
  );
}

function PlusButton() {
  const handlePress = () => {
    router.push({ pathname: '/log', params: { pick: '1' } });
  };
  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [styles.slot, pressed && styles.pressed]}>
      <View style={styles.plusCircle}>
        <ThemedText type="subtitle" style={styles.plusGlyph}>
          +
        </ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  bar: {
    flexDirection: 'row',
    height: BottomTabInset,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.two,
  },
  slot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.half,
    height: '100%',
  },
  icon: {
    width: ICON_SIZE,
    height: ICON_SIZE,
  },
  plusCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#3c87f7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusGlyph: {
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '600',
    color: '#ffffff',
  },
  pressed: {
    opacity: 0.6,
  },
});
