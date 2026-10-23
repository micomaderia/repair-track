import { Image } from 'expo-image';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';

import { Button } from '@/components/ui/button';
import { AppText } from '@/components/ui/text';
import { Colors, Motion, Spacing } from '@/constants/theme';

/** Launch screen while the saved session is restored; offers retry on failure. */
export function BrandSplash({ error, onRetry }: { error: string | null; onRetry: () => void }) {
  return (
    <View style={styles.root}>
      <Image
        source={require('@/assets/images/logo/repairtrack-logo.png')}
        style={styles.mark}
        contentFit="contain"
        accessibilityLabel="RepairTrack"
      />
      {error ? (
        <Animated.View entering={FadeIn.duration(Motion.base).reduceMotion(ReduceMotion.System)} style={styles.error}>
          <AppText variant="headline" style={styles.center}>
            Could not open RepairTrack
          </AppText>
          <AppText variant="body" tone="secondary" style={styles.center}>
            {error}
          </AppText>
          <Button label="Try again" icon="refresh" onPress={onRetry} />
        </Animated.View>
      ) : (
        <ActivityIndicator color={Colors.primary} accessibilityLabel="Loading" />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xxl,
    padding: Spacing.xxl,
  },
  mark: { width: 150, height: 151 },
  error: { gap: Spacing.md, alignItems: 'stretch', maxWidth: 360, width: '100%' },
  center: { textAlign: 'center' },
});
