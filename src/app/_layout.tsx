import { SplashScreen, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { BrandSplash } from '@/components/brand-splash';
import { ToastProvider } from '@/components/ui/toast';
import { Colors } from '@/constants/theme';
import { SessionProvider, useSession } from '@/features/auth/session-provider';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SessionProvider>
        <ToastProvider>
          <StatusBar style="dark" />
          <RootNavigator />
        </ToastProvider>
      </SessionProvider>
    </SafeAreaProvider>
  );
}

function RootNavigator() {
  const { status, restoreError, retryRestore } = useSession();

  useEffect(() => {
    if (status !== 'loading') SplashScreen.hide();
  }, [status]);

  // Never render protected screens until the stored session is resolved.
  if (status === 'loading' || status === 'restore_failed') {
    return <BrandSplash error={status === 'restore_failed' ? restoreError : null} onRetry={retryRestore} />;
  }

  const signedIn = status === 'signed_in';
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.background } }}>
      <Stack.Protected guard={signedIn} redirectTo="/login">
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={!signedIn} redirectTo="/">
        <Stack.Screen name="login" options={{ animation: 'fade' }} />
      </Stack.Protected>
    </Stack>
  );
}
