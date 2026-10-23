import type { PropsWithChildren, ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, MaxContentWidth, Radius, Shadow, Spacing } from '@/constants/theme';

import { AppText } from './text';

/** Space reserved under tab screens for the floating tab bar. */
export const TAB_BAR_SPACE = 104;

type ScreenProps = PropsWithChildren<{
  /** Adds bottom room for the tab bar. */
  withTabBar?: boolean;
  /** Pads the top safe area (tab screens without a native header). */
  withTopInset?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  footer?: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
}>;

/** Scrollable, keyboard-safe screen body. */
export function Screen({ children, withTabBar, withTopInset, refreshing, onRefresh, footer, contentStyle }: ScreenProps) {
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}>
      <ScrollView
        style={styles.flex}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={[
          styles.content,
          { paddingTop: (withTopInset ? insets.top : 0) + Spacing.lg },
          { paddingBottom: (withTabBar ? TAB_BAR_SPACE + insets.bottom : footer ? Spacing.lg : insets.bottom + Spacing.xxl) },
          contentStyle,
        ]}
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={Colors.primary} colors={[Colors.primary]} />
          ) : undefined
        }>
        <View style={styles.inner}>{children}</View>
      </ScrollView>
      {footer ? <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.md }]}>{footer}</View> : null}
    </KeyboardAvoidingView>
  );
}

export function Card({ children, style, flat }: PropsWithChildren<{ style?: StyleProp<ViewStyle>; flat?: boolean }>) {
  return <View style={[styles.card, !flat && Shadow.card, style]}>{children}</View>;
}

export function Section({
  title,
  action,
  children,
  style,
}: PropsWithChildren<{ title: string; action?: ReactNode; style?: StyleProp<ViewStyle> }>) {
  return (
    <View style={[styles.section, style]}>
      <View style={styles.sectionHeader}>
        <AppText variant="headline" accessibilityRole="header">
          {title}
        </AppText>
        {action}
      </View>
      {children}
    </View>
  );
}

/** Label/value line used in detail cards. */
export function InfoRow({ label, value, strong, valueTone }: { label: string; value: ReactNode; strong?: boolean; valueTone?: 'danger' | 'success' }) {
  return (
    <View style={styles.infoRow}>
      <AppText variant="body" tone="secondary" style={styles.infoLabel}>
        {label}
      </AppText>
      {typeof value === 'string' ? (
        <AppText variant={strong ? 'money' : 'body'} tone={valueTone ?? 'primary'} style={styles.infoValue}>
          {value}
        </AppText>
      ) : (
        value
      )}
    </View>
  );
}

export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.divider, style]} />;
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: Spacing.lg, alignItems: 'center' },
  inner: { width: '100%', maxWidth: MaxContentWidth, gap: Spacing.xl },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    backgroundColor: Colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    alignItems: 'center',
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
  },
  section: { gap: Spacing.md },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 32 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: Spacing.lg, paddingVertical: Spacing.xs + 2 },
  infoLabel: { flexShrink: 0, maxWidth: '50%' },
  infoValue: { flex: 1, textAlign: 'right' },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: Colors.border, marginVertical: Spacing.sm },
});
