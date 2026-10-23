import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { InlineError } from '@/components/ui/states';
import { TextField } from '@/components/ui/text-field';
import { Sheet } from '@/components/ui/sheet';
import { Spacing } from '@/constants/theme';
import { customerSchema, deviceSchema, type CustomerValues, type DeviceValues } from '@/features/validation';
import { toAppError } from '@/lib/errors';

type FormProps<T> = {
  defaultValues?: Partial<T>;
  submitLabel: string;
  onSubmit: (values: T) => Promise<void>;
  onCancel?: () => void;
};

/** Values stay in the form after a failed save so nothing is retyped. */
export function CustomerForm({ defaultValues, submitLabel, onSubmit, onCancel }: FormProps<CustomerValues>) {
  const [error, setError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CustomerValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: { fullName: '', contactNumber: '', address: '', ...defaultValues },
  });

  const submit = handleSubmit(async (values) => {
    setError(null);
    try {
      await onSubmit(values);
    } catch (err) {
      setError(toAppError(err).message);
    }
  });

  return (
    <View style={styles.form}>
      <InlineError message={error} />
      <Controller
        control={control}
        name="fullName"
        render={({ field }) => (
          <TextField label="Full name" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={errors.fullName?.message} autoCapitalize="words" autoComplete="name" maxLength={120} testID="customer-name" />
        )}
      />
      <Controller
        control={control}
        name="contactNumber"
        render={({ field }) => (
          <TextField
            label="Contact number"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={errors.contactNumber?.message}
            keyboardType="phone-pad"
            autoComplete="tel"
            maxLength={32}
            hint="Mobile or landline, e.g. 0917 123 4567"
            testID="customer-contact"
          />
        )}
      />
      <Controller
        control={control}
        name="address"
        render={({ field }) => (
          <TextField label="Address" optional value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={errors.address?.message} autoCapitalize="words" maxLength={300} testID="customer-address" />
        )}
      />
      <View style={styles.actions}>
        {onCancel ? <Button label="Cancel" variant="outline" onPress={onCancel} style={styles.flex} disabled={isSubmitting} /> : null}
        <Button label={submitLabel} onPress={submit} loading={isSubmitting} style={styles.flex} testID="customer-submit" />
      </View>
    </View>
  );
}

const DEVICE_TYPES = ['Laptop', 'Desktop', 'Phone', 'Tablet', 'Printer', 'Monitor'];

export function DeviceForm({ defaultValues, submitLabel, onSubmit, onCancel }: FormProps<DeviceValues>) {
  const [error, setError] = useState<string | null>(null);
  const [choosingBrand, setChoosingBrand] = useState(false);
  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<DeviceValues>({
    resolver: zodResolver(deviceSchema),
    defaultValues: { deviceType: '', brand: '', model: '', serialNumber: '', ...defaultValues },
  });
  const deviceType = useWatch({ control, name: 'deviceType' });

  const submit = handleSubmit(async (values) => {
    setError(null);
    try {
      await onSubmit(values);
    } catch (err) {
      setError(toAppError(err).message);
    }
  });

  return (
    <View style={styles.form}>
      <InlineError message={error} />
      <AppText variant="label" tone="secondary">Device type</AppText>
      {errors.deviceType ? <AppText variant="caption" tone="danger">{errors.deviceType.message}</AppText> : null}
      <View style={styles.quick} accessibilityLabel="Common device types">
        {DEVICE_TYPES.map((t) => (
          <Button
            key={t}
            label={t}
            compact
            variant={deviceType === t ? 'tonal' : 'outline'}
            onPress={() => setValue('deviceType', t, { shouldValidate: true })}
            accessibilityLabel={`Device type ${t}`}
            accessibilityState={{ selected: deviceType === t }}
          />
        ))}
      </View>
      <Controller
        control={control}
        name="brand"
        render={({ field }) => (
          <View style={{ gap: Spacing.sm }}>
            <TextField label="Brand" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={errors.brand?.message} autoCapitalize="words" maxLength={100} testID="device-brand" />
            <Button label="Choose brand" icon="chevron-down" variant="ghost" compact onPress={() => setChoosingBrand(true)} />
          </View>
        )}
      />
      <Controller
        control={control}
        name="model"
        render={({ field }) => (
          <TextField label="Model" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={errors.model?.message} maxLength={100} testID="device-model" />
        )}
      />
      <Sheet visible={choosingBrand} title="Choose brand" description="Choose a brand, or type any brand in the field." onClose={() => setChoosingBrand(false)}>
        <View style={styles.quick}>
          {['Acer', 'Apple', 'ASUS', 'Brother', 'Canon', 'Dell', 'Epson', 'HP', 'Huawei', 'Lenovo', 'MSI', 'Samsung', 'Xiaomi'].map((brand) => (
            <Button key={brand} label={brand} variant="outline" compact onPress={() => {
              setValue('brand', brand, { shouldValidate: true }); setChoosingBrand(false);
            }} />
          ))}
        </View>
      </Sheet>
      <View style={styles.actions}>
        {onCancel ? <Button label="Cancel" variant="outline" onPress={onCancel} style={styles.flex} disabled={isSubmitting} /> : null}
        <Button label={submitLabel} onPress={submit} loading={isSubmitting} style={styles.flex} testID="device-submit" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  form: { gap: Spacing.lg },
  quick: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: -Spacing.xs },
  actions: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.xs },
});
