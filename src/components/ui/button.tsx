import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { ActivityIndicator, StyleSheet, View, type AccessibilityState, type StyleProp, type ViewStyle } from 'react-native';

import { Colors, Radius, Spacing, TouchTarget, Type } from '@/constants/theme';

import { PressableScale } from './pressable-scale';
import { AppText } from './text';

type Variant = 'primary' | 'tonal' | 'outline' | 'ghost' | 'danger';

const palette: Record<Variant, { bg: string; fg: string; border?: string }> = {
  primary: { bg: Colors.primary, fg: Colors.inkInverse },
  tonal: { bg: Colors.primarySoft, fg: Colors.primaryPressed },
  outline: { bg: Colors.surface, fg: Colors.ink, border: Colors.borderStrong },
  ghost: { bg: 'transparent', fg: Colors.primary },
  danger: { bg: Colors.dangerSoft, fg: Colors.danger },
};

export type ButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  icon?: ComponentProps<typeof Ionicons>['name'];
  loading?: boolean;
  disabled?: boolean;
  /** Text read by screen readers when the label alone is ambiguous. */
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityState?: AccessibilityState;
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
  testID?: string;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  loading = false,
  disabled = false,
  accessibilityLabel,
  accessibilityHint,
  accessibilityState,
  style,
  compact = false,
  testID,
}: ButtonProps) {
  const p = palette[variant];
  const inactive = disabled || loading;
  return (
    <PressableScale
      testID={testID}
      onPress={inactive ? undefined : onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ ...accessibilityState, disabled: inactive, busy: loading }}
      style={[
        styles.base,
        compact && styles.compact,
        { backgroundColor: p.bg, borderColor: p.border ?? 'transparent' },
        inactive && !loading && styles.disabled,
        style,
      ]}>
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator size="small" color={p.fg} />
        ) : icon ? (
          <Ionicons name={icon} size={compact ? 18 : 20} color={p.fg} />
        ) : null}
        <AppText variant="label" style={[styles.label, { color: p.fg }]} numberOfLines={1}>
          {label}
        </AppText>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.xl,
    justifyContent: 'center',
    borderWidth: 1,
  },
  compact: {
    minHeight: TouchTarget,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.sm + 2,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  label: {
    ...Type.label,
    fontSize: 15,
  },
  disabled: {
    opacity: 0.45,
  },
});
