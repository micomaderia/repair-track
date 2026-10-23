import type { PropsWithChildren } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, ReduceMotion } from 'react-native-reanimated';

import { Colors, MaxContentWidth, Motion, Radius, Spacing } from '@/constants/theme';

import { AppText } from './text';

type Props = PropsWithChildren<{
  visible: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  /** Prevent dismissal while a request is in flight. */
  busy?: boolean;
}>;

/** Bottom sheet for short confirmations and small forms. */
export function Sheet({ visible, title, description, onClose, busy, children }: Props) {
  const insets = useSafeAreaInsets();
  const close = () => {
    if (!busy) onClose();
  };
  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={close} statusBarTranslucent navigationBarTranslucent>
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Pressable style={styles.scrim} onPress={close} accessibilityRole="button" accessibilityLabel="Close" />
        <Animated.View
          key={String(visible)}
          entering={FadeInDown.duration(Motion.base).reduceMotion(ReduceMotion.System)}
          style={[styles.sheet, { paddingBottom: insets.bottom + Spacing.lg }]}
          accessibilityViewIsModal
          accessibilityLabel={title}>
          <View style={styles.handle} />
          <AppText variant="title" accessibilityRole="header">
            {title}
          </AppText>
          {description ? (
            <AppText variant="body" tone="secondary">
              {description}
            </AppText>
          ) : null}
          <ScrollView style={styles.scroll} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" bounces={false}>
            {children}
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: Colors.scrim },
  sheet: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
    gap: Spacing.sm,
    maxHeight: '92%',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.borderStrong,
    marginBottom: Spacing.md,
  },
  scroll: { flexGrow: 0 },
  body: { gap: Spacing.md, marginTop: Spacing.md, paddingBottom: Spacing.xs },
});
