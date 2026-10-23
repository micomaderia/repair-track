import Ionicons from '@expo/vector-icons/Ionicons';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';

import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/layout';
import { AppText } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { InlineError } from '@/components/ui/states';
import { Colors, Motion, Radius, Spacing } from '@/constants/theme';
import { useSession } from '@/features/auth/session-provider';
import { loginSchema, signupSchema, type SignupValues } from '@/features/validation';
import { toAppError } from '@/lib/errors';

export default function LoginScreen() {
  const [signup, setSignup] = useState(false);
  return (
    <Screen withTopInset contentStyle={styles.background}>
      <StatusBar style="light" />
      <View style={styles.heading}>
        <AppText variant="title" style={styles.white} accessibilityRole="header">
          {signup ? 'Create your account' : 'Welcome back'}
        </AppText>
        <AppText variant="body" style={styles.subtitle}>
          {signup ? 'Start managing customers and repairs' : 'Sign in to manage your repairs'}
        </AppText>
      </View>
      <View style={styles.sheet}>
        <View style={styles.segments} accessibilityRole="tablist">
          {['Sign In', 'Sign Up'].map((label, i) => (
            <Pressable key={label} onPress={() => setSignup(i === 1)} accessibilityRole="tab"
              accessibilityState={{ selected: signup === (i === 1) }}
              style={[styles.segment, signup === (i === 1) && styles.selected]}>
              <AppText variant="label" tone={signup === (i === 1) ? 'brand' : 'secondary'}>{label}</AppText>
            </Pressable>
          ))}
        </View>
        <Animated.View key={String(signup)} entering={FadeIn.duration(Motion.base).reduceMotion(ReduceMotion.System)}>
          <AuthForm signup={signup} />
        </Animated.View>
      </View>
    </Screen>
  );
}

function AuthForm({ signup }: { signup: boolean }) {
  const { signIn, signUp, notice } = useSession();
  const [shown, setShown] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // A common shape keeps field state typed; sign-in validates only its own fields.
  const schema = signup ? signupSchema : loginSchema.extend({
    fullName: z.string(),
    shopName: z.string(),
    confirmPassword: signupSchema.shape.confirmPassword,
  });
  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<SignupValues>({
    resolver: zodResolver(schema), defaultValues: { fullName: '', shopName: '', email: '', password: '', confirmPassword: '' },
  });
  const submit = handleSubmit(async (v) => {
    setError(null);
    try {
      if (signup) await signUp(v.email, v.password, v.fullName, v.shopName);
      else await signIn(v.email, v.password);
    } catch (e) { setError(toAppError(e).message); }
  });
  const fields = [
    ...(signup ? [{ name: 'fullName', label: 'Full name' }, { name: 'shopName', label: 'Shop name' }] as const : []),
    { name: 'email', label: 'Email address' }, { name: 'password', label: 'Password' },
    ...(signup ? [{ name: 'confirmPassword', label: 'Confirm password' }] as const : []),
  ] as const;
  return <View style={styles.form}>
    {notice && !error && !signup ? <AppText variant="caption" accessibilityRole="alert">{notice}</AppText> : null}
    <InlineError message={error} />
    {fields.map(({ name, label }) => {
      const password = name === 'password' || name === 'confirmPassword';
      return <Controller key={name} control={control} name={name} render={({ field }) => <TextField
        label={label} value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={errors[name]?.message}
        secureTextEntry={password && !shown} autoCapitalize={password || name === 'email' ? 'none' : 'words'}
        autoCorrect={false} keyboardType={name === 'email' ? 'email-address' : 'default'}
        autoComplete={password ? signup ? 'new-password' : 'current-password' : name === 'email' ? 'email' : name === 'fullName' ? 'name' : 'off'}
        maxLength={password ? 128 : name === 'email' ? 254 : 120} testID={`${signup ? 'signup' : 'login'}-${name}`}
        onSubmitEditing={password ? () => submit() : undefined}
        accessory={name === 'password' ? <Pressable onPress={() => setShown(!shown)} accessibilityRole="button" accessibilityLabel={shown ? 'Hide password' : 'Show password'} style={styles.eye}>
          <Ionicons name={shown ? 'eye-off-outline' : 'eye-outline'} size={22} color={Colors.inkSecondary} />
        </Pressable> : undefined}
      />} />;
    })}
    <Button label={signup ? 'Create account' : 'Sign in'} onPress={submit} loading={isSubmitting} testID={signup ? 'signup-submit' : 'login-submit'} />
  </View>;
}

const styles = StyleSheet.create({
  background: { flexGrow: 1, backgroundColor: Colors.ink },
  heading: { gap: Spacing.sm, paddingHorizontal: Spacing.sm, paddingTop: Spacing.xxxl, paddingBottom: Spacing.lg },
  white: { color: Colors.inkInverse, fontSize: 28, lineHeight: 36 },
  subtitle: { color: '#D4DCFA' },
  sheet: { backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: Spacing.xl, gap: Spacing.xl },
  segments: { flexDirection: 'row', backgroundColor: Colors.background, borderRadius: Radius.md, padding: 4 },
  segment: { flex: 1, minHeight: 48, justifyContent: 'center', alignItems: 'center', borderRadius: Radius.sm },
  selected: { backgroundColor: Colors.primarySoft },
  form: { gap: Spacing.lg },
  eye: { width: 48, height: 48, justifyContent: 'center', alignItems: 'center', marginRight: -8 },
});
