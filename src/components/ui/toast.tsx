import Ionicons from '@expo/vector-icons/Ionicons';
import { createContext, use, useCallback, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown, ReduceMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, MaxContentWidth, Motion, Radius, Shadow, Spacing } from '@/constants/theme';

import { AppText } from './text';

type Toast = { id: number; message: string; tone: 'success' | 'error' };
type ToastApi = { show: (message: string, tone?: Toast['tone']) => void };

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const api = use(ToastContext);
  if (!api) throw new Error('useToast must be used inside <ToastProvider>.');
  return api;
}

/** Snackbar-style transient confirmation shown above the tab bar. */
export function ToastProvider({ children }: PropsWithChildren) {
  const [toast, setToast] = useState<Toast | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();

  const show = useCallback((message: string, tone: Toast['tone'] = 'success') => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ id: Date.now(), message, tone });
    AccessibilityInfo.announceForAccessibility(message);
    timer.current = setTimeout(() => setToast(null), 3200);
  }, []);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const api = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext value={api}>
      {children}
      <View pointerEvents="none" style={[styles.host, { bottom: insets.bottom + 96 }]}>
        {toast ? (
          <Animated.View
            key={toast.id}
            entering={FadeInDown.duration(Motion.base).reduceMotion(ReduceMotion.System)}
            exiting={FadeOutDown.duration(Motion.fast).reduceMotion(ReduceMotion.System)}
            style={[styles.toast, Shadow.raised]}>
            <Ionicons
              name={toast.tone === 'success' ? 'checkmark-circle' : 'alert-circle'}
              size={20}
              color={toast.tone === 'success' ? '#8FE3B5' : '#FFB4BE'}
            />
            <AppText variant="label" tone="inverse" style={styles.text}>
              {toast.message}
            </AppText>
          </Animated.View>
        ) : null}
      </View>
    </ToastContext>
  );
}

const styles = StyleSheet.create({
  host: { position: 'absolute', left: Spacing.lg, right: Spacing.lg, alignItems: 'center' },
  toast: {
    width: '100%',
    maxWidth: MaxContentWidth,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.ink,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  text: { flex: 1 },
});
