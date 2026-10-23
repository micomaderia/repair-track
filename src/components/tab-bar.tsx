import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import type { ComponentProps } from 'react';
import { useEffect, useState } from 'react';
import { Keyboard, Platform, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressableScale } from '@/components/ui/pressable-scale';
import { AppText } from '@/components/ui/text';
import { Colors, MaxContentWidth, Motion, Radius, Shadow, Spacing } from '@/constants/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

const TABS: Record<string, { label: string; icon: IconName; iconActive: IconName }> = {
  index: { label: 'Home', icon: 'home-outline', iconActive: 'home' },
  repairs: { label: 'Repairs', icon: 'construct-outline', iconActive: 'construct' },
  customers: { label: 'Customers', icon: 'people-outline', iconActive: 'people' },
  reports: { label: 'Reports', icon: 'bar-chart-outline', iconActive: 'bar-chart' },
};

/** Home | Repairs | + | Customers | Reports. The + is an action, not a tab. */
export function AppTabBar({ state, emitter, navigateToTab }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const keyboardOpen = useKeyboardOpen();
  const routes = state.routes.filter((r) => r.name in TABS);
  const left = routes.slice(0, 2);
  const right = routes.slice(2);

  const renderTab = (route: (typeof routes)[number]) => {
    const focused = state.routes[state.index]?.key === route.key;
    const meta = TABS[route.name];
    return (
      <TabButton
        key={route.key}
        label={meta.label}
        icon={focused ? meta.iconActive : meta.icon}
        focused={focused}
        onPress={() => {
          const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigateToTab(route.key);
        }}
      />
    );
  };

  // Android resizes the window for the keyboard; keep the bar out of the way.
  if (keyboardOpen) return null;

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, Spacing.sm) }]} pointerEvents="box-none">
      <View style={[styles.bar, Shadow.raised]} accessibilityRole="tablist">
        {left.map(renderTab)}
        <View style={styles.centerSlot}>
          <PressableScale
            pressedScale={0.92}
            onPress={() => router.push('/repairs/new')}
            accessibilityRole="button"
            accessibilityLabel="New repair"
            accessibilityHint="Starts a new repair intake"
            style={[styles.action, Shadow.action]}>
            <Ionicons name="add" size={30} color={Colors.inkInverse} />
          </PressableScale>
        </View>
        {right.map(renderTab)}
      </View>
    </View>
  );
}

function useKeyboardOpen(): boolean {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const show = Keyboard.addListener('keyboardDidShow', () => setOpen(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setOpen(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return open;
}

function TabButton({ label, icon, focused, onPress }: { label: string; icon: IconName; focused: boolean; onPress: () => void }) {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(focused ? 1 : 0);
  useEffect(() => {
    progress.set(reduceMotion ? (focused ? 1 : 0) : withTiming(focused ? 1 : 0, { duration: Motion.base }));
  }, [focused, progress, reduceMotion]);

  const pill = useAnimatedStyle(() => ({
    opacity: progress.get(),
    transform: [{ scaleX: 0.6 + progress.get() * 0.4 }],
  }));

  return (
    <PressableScale
      pressedScale={0.94}
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: focused }}
      style={styles.tab}>
      <View style={styles.iconWrap}>
        <Animated.View style={[styles.pill, pill]} />
        <Ionicons name={icon} size={22} color={focused ? Colors.primaryPressed : Colors.inkTertiary} />
      </View>
      <AppText
        variant="small"
        maxFontSizeMultiplier={1.3}
        numberOfLines={1}
        style={{ color: focused ? Colors.ink : Colors.inkTertiary }}>
        {label}
      </AppText>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: Spacing.md, alignItems: 'center' },
  bar: {
    width: '100%',
    maxWidth: MaxContentWidth,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xs + 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 56, gap: 2 },
  iconWrap: { width: 48, height: 30, alignItems: 'center', justifyContent: 'center' },
  pill: { ...StyleSheet.absoluteFill, borderRadius: Radius.pill, backgroundColor: Colors.primarySoft },
  centerSlot: { width: 60, alignItems: 'center' },
  action: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginTop: -30,
    backgroundColor: Colors.lavender,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: Colors.background,
  },
});
