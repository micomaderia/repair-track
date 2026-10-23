import { router } from 'expo-router';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card, InfoRow, Screen, Section } from '@/components/ui/layout';
import { InlineError } from '@/components/ui/states';
import { TextField } from '@/components/ui/text-field';
import { AppText } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import { Spacing } from '@/constants/theme';
import { useSession } from '@/features/auth/session-provider';
import { saveSettings } from '@/features/settings/api';
import { shopSettingsSchema, type ShopSettingsValues } from '@/features/validation';
import { displayShopName } from '@/lib/display';
import { toAppError } from '@/lib/errors';

export default function SettingsScreen() {
  const { session, profile, shop, signOut, refreshAccount } = useSession();
  const toast = useToast();
  const [error, setError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
    reset,
  } = useForm<ShopSettingsValues>({
    resolver: zodResolver(shopSettingsSchema),
    defaultValues: {
      displayName: profile?.display_name ?? '',
      shopName: displayShopName(shop?.shop_name),
      contactNumber: /^DEMO-/.test(shop?.contact_number ?? '') ? '' : shop?.contact_number ?? '',
      address: shop?.address ?? '',
      receiptFooter: shop?.receipt_footer === 'Demo receipt for presentation only. Thank you!' ? '' : shop?.receipt_footer ?? '',
    },
  });

  const submit = handleSubmit(async (values) => {
    if (!session) return;
    setError(null);
    try {
      await saveSettings(session.user.id, values);
      await refreshAccount();
      reset(values);
      toast.show('Settings saved');
    } catch (err) {
      setError(toAppError(err).message);
    }
  });

  return (
    <Screen>
      <Section title="Profile">
        <Card style={styles.gap}>
          <Controller
            control={control}
            name="displayName"
            render={({ field }) => (
              <TextField label="Full name" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={errors.displayName?.message} maxLength={120} hint="Shown on receipts as “Received by”." />
            )}
          />
          <InfoRow label="Email" value={session?.user.email ?? '—'} />
        </Card>
      </Section>

      <Section title="Shop">
        <Card style={styles.gap}>
          <AppText variant="caption" tone="tertiary">
            Used on new receipts. Receipts already issued keep the details they were printed with.
          </AppText>
          <Controller
            control={control}
            name="shopName"
            render={({ field }) => (
              <TextField label="Shop name" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={errors.shopName?.message} maxLength={120} />
            )}
          />
          <Controller
            control={control}
            name="contactNumber"
            render={({ field }) => (
              <TextField label="Contact number" optional value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={errors.contactNumber?.message} keyboardType="phone-pad" maxLength={32} />
            )}
          />
          <Controller
            control={control}
            name="address"
            render={({ field }) => (
              <TextField label="Address" optional value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={errors.address?.message} multiline maxLength={300} />
            )}
          />
          <Controller
            control={control}
            name="receiptFooter"
            render={({ field }) => (
              <TextField label="Receipt footer" optional value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={errors.receiptFooter?.message} multiline maxLength={300} placeholder="e.g. 30-day service warranty. Keep this receipt." />
            )}
          />
          <InlineError message={error} />
          <Button label="Save changes" onPress={submit} loading={isSubmitting} disabled={!isDirty} />
        </Card>
      </Section>

      <Section title="Account">
        <Button label="Change password" icon="key-outline" variant="outline" onPress={() => router.push('/change-password')} />
      </Section>
      <Section title="Data">
        <Button label="Archived Repairs" icon="archive-outline" variant="outline" onPress={() => router.push('/archives')} />
      </Section>
      <Section title="Session">
      <View style={styles.signOut}>
        <Button
          label="Sign out"
          icon="log-out-outline"
          variant="danger"
          loading={signingOut}
          onPress={async () => {
            setSigningOut(true);
            await signOut();
          }}
          testID="sign-out"
        />
        <AppText variant="caption" tone="tertiary" style={styles.center}>
          RepairTrack
        </AppText>
      </View>
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  gap: { gap: Spacing.lg },
  signOut: { gap: Spacing.md, marginTop: Spacing.sm },
  center: { textAlign: 'center' },
});
