import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, type ComponentProps } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { Colors, Radius, Spacing } from '@/constants/theme';
import type { AppError } from '@/lib/errors';

import { Button } from './button';
import { AppText } from './text';

type IconName = ComponentProps<typeof Ionicons>['name'];

export function EmptyState({
  icon,
  title,
  message,
  actionLabel,
  onAction,
}: {
  icon: IconName;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.center} accessibilityRole="summary">
      <View style={styles.iconWell}>
        <Ionicons name={icon} size={28} color={Colors.primary} />
      </View>
      <AppText variant="headline" style={styles.textCenter}>
        {title}
      </AppText>
      {message ? (
        <AppText variant="body" tone="secondary" style={styles.textCenter}>
          {message}
        </AppText>
      ) : null}
      {actionLabel && onAction ? <Button label={actionLabel} onPress={onAction} variant="tonal" compact /> : null}
    </View>
  );
}

const ERROR_ICON: Record<AppError['kind'], IconName> = {
  network: 'cloud-offline-outline',
  session: 'lock-closed-outline',
  permission: 'lock-closed-outline',
  not_found: 'search-outline',
  conflict: 'refresh-outline',
  validation: 'alert-circle-outline',
  unknown: 'alert-circle-outline',
};

const ERROR_TITLE: Record<AppError['kind'], string> = {
  network: 'You are offline',
  session: 'Session expired',
  permission: 'No access',
  not_found: 'Not found',
  conflict: 'Out of date',
  validation: 'Could not load',
  unknown: 'Something went wrong',
};

export function ErrorState({ error, onRetry }: { error: AppError; onRetry?: () => void }) {
  return (
    <View style={styles.center} accessibilityRole="alert">
      <View style={[styles.iconWell, styles.errorWell]}>
        <Ionicons name={ERROR_ICON[error.kind]} size={28} color={Colors.danger} />
      </View>
      <AppText variant="headline" style={styles.textCenter}>
        {ERROR_TITLE[error.kind]}
      </AppText>
      <AppText variant="body" tone="secondary" style={styles.textCenter}>
        {error.message}
      </AppText>
      {onRetry && error.kind !== 'not_found' ? (
        <Button label="Try again" icon="refresh" onPress={onRetry} variant="tonal" compact />
      ) : null}
    </View>
  );
}

/** Inline banner for mutation failures; keeps the form visible. */
export function InlineError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <View style={styles.banner} accessibilityRole="alert" accessibilityLiveRegion="assertive">
      <Ionicons name="alert-circle" size={20} color={Colors.danger} />
      <AppText variant="body" tone="danger" style={styles.flex}>
        {message}
      </AppText>
    </View>
  );
}

/** Soft pulsing placeholder; static under Reduce Motion. */
export function Skeleton({ style }: { style?: StyleProp<ViewStyle> }) {
  const reduceMotion = useReducedMotion();
  const opacity = useSharedValue(0.6);
  useEffect(() => {
    if (!reduceMotion) opacity.set(withRepeat(withTiming(1, { duration: 700 }), -1, true));
  }, [opacity, reduceMotion]);
  const animated = useAnimatedStyle(() => ({ opacity: opacity.get() }));
  return <Animated.View style={[styles.skeleton, animated, style]} />;
}

export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <View style={styles.list} accessibilityLabel="Loading" accessibilityRole="progressbar">
      {Array.from({ length: rows }, (_, i) => (
        <View key={i} style={styles.skeletonRow}>
          <Skeleton style={{ width: '40%', height: 14 }} />
          <Skeleton style={{ width: '75%', height: 18 }} />
          <Skeleton style={{ width: '55%', height: 14 }} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.huge, paddingHorizontal: Spacing.xl },
  textCenter: { textAlign: 'center' },
  iconWell: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.panel,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  errorWell: { backgroundColor: Colors.dangerSoft },
  banner: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'flex-start',
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.dangerSoft,
  },
  skeleton: { backgroundColor: Colors.skeleton, borderRadius: 8 },
  list: { gap: Spacing.md },
  skeletonRow: {
    gap: Spacing.sm,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface,
  },
});
