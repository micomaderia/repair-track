import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Stack } from 'expo-router';
import { Platform, Pressable } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { Colors, Type } from '@/constants/theme';

// Deep links into a detail screen still get the tabs underneath, so Back works.
export const unstable_settings = { initialRouteName: '(tabs)' };

export default function AppLayout() {
  const reducedMotion = useReducedMotion();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.background },
        headerShadowVisible: false,
        headerTintColor: Colors.ink,
        headerTitleStyle: { ...Type.title, color: Colors.ink },
        // A web deep link has no history; give it a way back to Home.
        headerLeft:
          Platform.OS === 'web'
            ? ({ canGoBack }) => (
                <Pressable
                  onPress={() => (canGoBack ? router.back() : router.replace('/'))}
                  accessibilityRole="button"
                  accessibilityLabel={canGoBack ? 'Go back' : 'Go to Home'}
                  style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center', marginLeft: -8 }}>
                  <Ionicons name="arrow-back" size={24} color={Colors.ink} />
                </Pressable>
              )
            : undefined,
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: { backgroundColor: Colors.background },
        animation: reducedMotion ? 'none' : 'slide_from_right',
        animationDuration: 220,
      }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="repairs/new" options={{ title: 'New repair', animation: reducedMotion ? 'none' : 'slide_from_bottom' }} />
      <Stack.Screen name="repairs/[id]/index" options={{ title: 'Repair Details' }} />
      <Stack.Screen name="repairs/[id]/payment" options={{ title: 'Record payment', animation: reducedMotion ? 'none' : 'slide_from_bottom' }} />
      <Stack.Screen name="receipts/[id]" options={{ title: 'Receipt', animation: reducedMotion ? 'none' : 'fade' }} />
      <Stack.Screen name="customers/new" options={{ title: 'Add customer' }} />
      <Stack.Screen name="customers/[id]/index" options={{ title: 'Customer' }} />
      <Stack.Screen name="customers/[id]/edit" options={{ title: 'Edit customer' }} />
      <Stack.Screen name="customers/[id]/devices/new" options={{ title: 'Add device' }} />
      <Stack.Screen name="devices/[id]/edit" options={{ title: 'Edit device' }} />
      <Stack.Screen name="archives" options={{ title: 'Archived records' }} />
      <Stack.Screen name="change-password" options={{ title: 'Change password' }} />
      <Stack.Screen name="settings" options={{ title: 'Settings' }} />
    </Stack>
  );
}
