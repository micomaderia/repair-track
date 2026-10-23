import { useState } from 'react';
import { router } from 'expo-router';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/layout';
import { TextField } from '@/components/ui/text-field';
import { InlineError } from '@/components/ui/states';
import { useToast } from '@/components/ui/toast';
import { useSession } from '@/features/auth/session-provider';
import { supabase } from '@/lib/supabase';
import { toAppError } from '@/lib/errors';

export default function ChangePasswordScreen() {
  const { session } = useSession();
  const toast = useToast();
  const [current, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const save = async () => {
    if (busy || !session?.user.email) return;
    if (password.length < 8 || password.length > 128) return setError('Use 8–128 characters for your new password.');
    if (password !== confirm) return setError('Passwords do not match.');
    setBusy(true); setError(null);
    try {
      const verified = await supabase.auth.signInWithPassword({ email: session.user.email, password: current });
      if (verified.error) throw verified.error;
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      toast.show('Password updated'); router.back();
    } catch (e) { setError(toAppError(e).message); }
    finally { setBusy(false); }
  };
  return <Screen>
    <TextField label="Current password" value={current} onChangeText={setCurrent} secureTextEntry autoComplete="current-password" autoCapitalize="none" />
    <TextField label="New password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" autoCapitalize="none" maxLength={128} />
    <TextField label="Confirm password" value={confirm} onChangeText={setConfirm} secureTextEntry autoComplete="new-password" autoCapitalize="none" maxLength={128} />
    <InlineError message={error} />
    <Button label="Update password" loading={busy} onPress={save} />
  </Screen>;
}
