import Ionicons from '@expo/vector-icons/Ionicons';
import { zodResolver } from '@hookform/resolvers/zod';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { BackHandler, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';

import { Button } from '@/components/ui/button';
import { Card, Divider, InfoRow, Screen } from '@/components/ui/layout';
import { PressableScale } from '@/components/ui/pressable-scale';
import { SearchField } from '@/components/ui/search-field';
import { EmptyState, ErrorState, InlineError, ListSkeleton } from '@/components/ui/states';
import { TextField } from '@/components/ui/text-field';
import { AppText } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import { Colors, Motion, Radius, Spacing } from '@/constants/theme';
import {
  createCustomer,
  createDevice,
  getCustomer,
  listDevices,
  searchCustomers,
  type Customer,
  type Device,
} from '@/features/customers/api';
import { CustomerRow } from '@/features/customers/components/customer-row';
import { CustomerForm, DeviceForm } from '@/features/customers/components/forms';
import { createRepair } from '@/features/repairs/api';
import {
  amountOrNull,
  blankToNull,
  receivedDateError,
  repairDetailsSchema,
  type RepairDetailsValues,
} from '@/features/validation';
import { useDebouncedValue } from '@/hooks/use-paged-search';
import { useResource } from '@/hooks/use-resource';
import { addDays, formatDate, manilaDateTimeToIso, toManilaDateKey } from '@/lib/dates';
import { toAppError } from '@/lib/errors';
import { formatPeso } from '@/lib/money';
import { newRequestId } from '@/lib/request-id';

const STEPS = ['Customer', 'Device', 'Details', 'Review'] as const;
type Step = 0 | 1 | 2 | 3;

export default function NewRepairScreen() {
  const params = useLocalSearchParams<{ customerId?: string; deviceId?: string }>();
  const toast = useToast();
  const [step, setStep] = useState<Step>(0);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [device, setDevice] = useState<Device | null>(null);
  // One idempotency key per intake: retries after a timeout never create a second repair.
  const [requestId] = useState(newRequestId);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const today = toManilaDateKey();

  const form = useForm<RepairDetailsValues>({
    resolver: zodResolver(repairDetailsSchema),
    defaultValues: {
      reportedProblem: '',
      serviceDiagnosis: '',
      estimatedAmount: '',
      finalAmount: '',
      receivedDate: today,
      expectedReleaseDate: '',
      notes: '',
    },
  });

  // Preselect from Customer Details.
  useEffect(() => {
    if (!params.customerId) return;
    let cancelled = false;
    (async () => {
      try {
        const c = await getCustomer(params.customerId!);
        if (cancelled) return;
        if (c.archived_at) {
          setSaveError('Restore this customer from Settings before adding a repair.');
          return;
        }
        setCustomer(c);
        if (params.deviceId) {
          const devices = await listDevices(c.id);
          const d = devices.find((x) => x.id === params.deviceId) ?? null;
          if (cancelled) return;
          setDevice(d);
          setStep(d ? 2 : 1);
        } else {
          setStep(1);
        }
      } catch {
        // Fall back to manual selection.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params.customerId, params.deviceId]);

  // Android back steps backwards through the flow before leaving it.
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        if (step > 0 && !saving) {
          setStep((s) => (s - 1) as Step);
          return true;
        }
        return false;
      });
      return () => sub.remove();
    }, [step, saving]),
  );

  const goDetails = form.handleSubmit(() => {
    const receivedError = receivedDateError(form.getValues('receivedDate'), today);
    if (receivedError) {
      form.setError('receivedDate', { message: receivedError });
      return;
    }
    setStep(3);
  });

  const save = async () => {
    if (!customer || !device || saving) return;
    const v = form.getValues();
    setSaving(true);
    setSaveError(null);
    try {
      const repair = await createRepair({
        requestId,
        customerId: customer.id,
        deviceId: device.id,
        reportedProblem: v.reportedProblem.trim(),
        serviceDiagnosis: blankToNull(v.serviceDiagnosis),
        estimatedAmountCentavos: amountOrNull(v.estimatedAmount),
        finalAmountCentavos: amountOrNull(v.finalAmount),
        receivedAt: v.receivedDate === today ? null : manilaDateTimeToIso(v.receivedDate, 9),
        expectedReleaseDate: blankToNull(v.expectedReleaseDate),
        notes: blankToNull(v.notes),
      });
      toast.show(`${repair.transaction_number} created`);
      router.replace({ pathname: '/repairs/[id]', params: { id: repair.id } });
    } catch (err) {
      setSaveError(toAppError(err).message);
      setSaving(false);
    }
  };

  return (
    <Screen
      footer={
        step === 3 ? (
          <View style={styles.footerRow}>
            <Button label="Back" variant="outline" onPress={() => setStep(2)} disabled={saving} style={styles.footerBack} />
            <Button label="Save repair" icon="checkmark" onPress={save} loading={saving} style={styles.flex} testID="repair-save" />
          </View>
        ) : step === 2 ? (
          <View style={styles.footerRow}>
            <Button label="Back" variant="outline" onPress={() => setStep(1)} style={styles.footerBack} />
            <Button label="Review" icon="arrow-forward" onPress={goDetails} style={styles.flex} testID="repair-review" />
          </View>
        ) : undefined
      }>
      <Stack.Screen options={{ headerLeft: step > 0 ? () => (
        <PressableScale onPress={() => setStep((s) => (s - 1) as Step)} disabled={saving}
          accessibilityRole="button" accessibilityLabel="Previous step"
          style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="arrow-back" size={24} color={Colors.ink} />
        </PressableScale>
      ) : undefined }} />
      <StepHeader step={step} />
      {step !== 3 ? <InlineError message={saveError} /> : null}

      <Animated.View key={step} entering={FadeIn.duration(Motion.base).reduceMotion(ReduceMotion.System)} style={styles.stepBody}>
        {step === 0 ? (
          <CustomerStep
            selected={customer}
            onSelect={(c) => {
              setSaveError(null);
              if (c.id !== customer?.id) setDevice(null);
              setCustomer(c);
              setStep(1);
            }}
          />
        ) : step === 1 && customer ? (
          <DeviceStep
            customer={customer}
            selected={device}
            onChangeCustomer={() => setStep(0)}
            onSelect={(d) => {
              setDevice(d);
              setStep(2);
            }}
          />
        ) : step === 2 ? (
          <DetailsStep form={form} today={today} />
        ) : step === 3 && customer && device ? (
          <ReviewStep customer={customer} device={device} values={form.getValues()} error={saveError} onEdit={setStep} />
        ) : null}
      </Animated.View>
    </Screen>
  );
}

function StepHeader({ step }: { step: Step }) {
  return (
    <View style={styles.stepHeader} accessible accessibilityLabel={`Step ${step + 1} of 4: ${STEPS[step]}`}>
      <View style={styles.segments}>
        {STEPS.map((label, i) => (
          <View key={label} style={styles.stepLabel}>
            <View style={[styles.segment, i <= step && styles.segmentDone, i === step && styles.segmentCurrent]} />
            <AppText variant="small" tone={i === step ? 'lavender' : 'secondary'}>{label}</AppText>
          </View>
        ))}
      </View>
      <AppText variant="title">{['Who is the customer?', 'Which device?', 'What needs fixing?', 'Review and save'][step]}</AppText>
    </View>
  );
}

function CustomerStep({ selected, onSelect }: { selected: Customer | null; onSelect: (c: Customer) => void }) {
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const debounced = useDebouncedValue(query.trim(), 300);
  const results = useResource(() => searchCustomers(debounced, 0, 20), [debounced]);

  if (creating) {
    return (
      <Card style={styles.gap}>
        <AppText variant="headline">New customer</AppText>
        <CustomerForm
          defaultValues={{ fullName: /\d/.test(query) ? '' : query.trim() }}
          submitLabel="Save and continue"
          onCancel={() => setCreating(false)}
          onSubmit={async (values) => onSelect(await createCustomer(values))}
        />
      </Card>
    );
  }

  return (
    <View style={styles.gap}>
      <SearchField value={query} onChangeText={setQuery} placeholder="Search name or contact number" accessibilityLabel="Search customers" />
      <Button label="New customer" icon="person-add-outline" variant="tonal" onPress={() => setCreating(true)} testID="new-customer-inline" />
      {results.loading ? (
        <ListSkeleton rows={3} />
      ) : results.error && !results.data ? (
        <ErrorState error={results.error} onRetry={results.reload} />
      ) : results.data?.length === 0 ? (
        <EmptyState
          icon="person-outline"
          title={debounced ? 'No matching customers' : 'No customers yet'}
          message={debounced ? 'Add them as a new customer to continue.' : 'Add the first customer to continue.'}
        />
      ) : (
        <View style={styles.list}>
          {results.data?.map((c) => (
            <CustomerRow key={c.id} customer={c} selected={selected?.id === c.id} hint="Selects this customer" onPress={() => onSelect(c)} />
          ))}
        </View>
      )}
    </View>
  );
}

function DeviceStep({
  customer,
  selected,
  onSelect,
  onChangeCustomer,
}: {
  customer: Customer;
  selected: Device | null;
  onSelect: (d: Device) => void;
  onChangeCustomer: () => void;
}) {
  const devices = useResource(() => listDevices(customer.id), [customer.id]);
  const [creating, setCreating] = useState(false);
  const noDevices = devices.data?.length === 0;

  return (
    <View style={styles.gap}>
      <PressableScale onPress={onChangeCustomer} accessibilityRole="button" accessibilityLabel={`Customer ${customer.full_name}. Change customer`} style={styles.selectedChip}>
        <Ionicons name="person" size={16} color={Colors.lavenderDeep} />
        <AppText variant="label" tone="lavender" style={styles.flex} numberOfLines={1}>
          {customer.full_name}
        </AppText>
        <AppText variant="label" tone="brand">
          Change
        </AppText>
      </PressableScale>

      {devices.loading ? (
        <ListSkeleton rows={2} />
      ) : devices.error && !devices.data ? (
        <ErrorState error={devices.error} onRetry={devices.reload} />
      ) : creating || noDevices ? (
        <Card style={styles.gap}>
          <AppText variant="headline">{noDevices ? 'Add their device' : 'New device'}</AppText>
          <DeviceForm
            submitLabel="Save and continue"
            onCancel={noDevices ? undefined : () => setCreating(false)}
            onSubmit={async (values) => onSelect(await createDevice(customer.id, values))}
          />
        </Card>
      ) : (
        <>
          <View style={styles.list}>
            {devices.data?.map((d) => {
              const isSel = selected?.id === d.id;
              return (
                <PressableScale
                  key={d.id}
                  onPress={() => onSelect(d)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSel }}
                  accessibilityLabel={`${d.device_type}, ${d.brand} ${d.model}`}
                  style={[styles.option, isSel && styles.optionSelected]}>
                  <Ionicons name="laptop-outline" size={22} color={isSel ? Colors.lavenderDeep : Colors.primary} />
                  <View style={styles.flex}>
                    <AppText variant="bodyStrong">
                      {d.brand} {d.model}
                    </AppText>
                    <AppText variant="caption" tone="secondary">
                      {d.device_type}
                    </AppText>
                  </View>
                  <Ionicons name={isSel ? 'checkmark-circle' : 'chevron-forward'} size={20} color={isSel ? Colors.lavender : Colors.inkTertiary} />
                </PressableScale>
              );
            })}
          </View>
          <Button label="New device" icon="add" variant="tonal" onPress={() => setCreating(true)} testID="new-device-inline" />
        </>
      )}
    </View>
  );
}

function DetailsStep({ form, today }: { form: ReturnType<typeof useForm<RepairDetailsValues>>; today: string }) {
  const {
    control,
    setValue,
    formState: { errors },
  } = form;
  const received = useWatch({ control, name: 'receivedDate' });
  const expected = useWatch({ control, name: 'expectedReleaseDate' });

  return (
    <View style={styles.gap}>
      <Controller
        control={control}
        name="reportedProblem"
        render={({ field }) => (
          <TextField
            label="Reported problem"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={errors.reportedProblem?.message}
            multiline
            maxLength={2000}
            placeholder="What the customer says is wrong"
            testID="repair-problem"
          />
        )}
      />
      <Controller
        control={control}
        name="serviceDiagnosis"
        render={({ field }) => (
          <TextField
            label="Service / diagnosis"
            optional
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={errors.serviceDiagnosis?.message}
            multiline
            maxLength={2000}

          />
        )}
      />
      <View style={styles.row2}>
        <View style={styles.flex}>
          <Controller
            control={control}
            name="estimatedAmount"
            render={({ field }) => (
              <TextField label="Estimate" optional prefix="₱" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={errors.estimatedAmount?.message} keyboardType="decimal-pad" placeholder="0.00" testID="repair-estimate" />
            )}
          />
        </View>
        <View style={styles.flex}>
          <Controller
            control={control}
            name="finalAmount"
            render={({ field }) => (
              <TextField label="Final amount" optional prefix="₱" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={errors.finalAmount?.message} keyboardType="decimal-pad" placeholder="0.00" />
            )}
          />
        </View>
      </View>
      <AppText variant="caption" tone="tertiary" style={styles.tight}>
        Set the final amount only when the price is agreed. It locks after the first payment.
      </AppText>

      <DateField
        label="Date received"
        value={received}
        error={errors.receivedDate?.message}
        onChange={(v) => setValue('receivedDate', v, { shouldValidate: true })}
        presets={[
          { label: 'Today', value: today },
          { label: 'Yesterday', value: addDays(today, -1) },
        ]}
      />
      <DateField
        label="Expected release"
        optional
        value={expected}
        error={errors.expectedReleaseDate?.message}
        onChange={(v) => setValue('expectedReleaseDate', v, { shouldValidate: true })}
        presets={[
          { label: 'None', value: '' },
          { label: '+1 day', value: addDays(received || today, 1) },
          { label: '+3 days', value: addDays(received || today, 3) },
          { label: '+1 week', value: addDays(received || today, 7) },
        ]}
      />

      <Controller
        control={control}
        name="notes"
        render={({ field }) => (
          <TextField label="Notes" optional value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={errors.notes?.message} multiline maxLength={2000} placeholder="Accessories left, passwords, condition" />
        )}
      />
    </View>
  );
}

function DateField({
  label,
  value,
  onChange,
  presets,
  error,
  optional,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  presets: { label: string; value: string }[];
  error?: string;
  optional?: boolean;
}) {
  return (
    <View style={styles.dateField}>
      <TextField
        label={label}
        optional={optional}
        value={value}
        onChangeText={onChange}
        error={error}
        placeholder="YYYY-MM-DD"
        keyboardType="numbers-and-punctuation"
        maxLength={10}
        hint={value && !error ? formatDate(value) : undefined}
      />
      <View style={styles.presets}>
        {presets.map((p) => (
          <Button
            key={p.label}
            label={p.label}
            compact
            variant={p.value === value ? 'tonal' : 'outline'}
            onPress={() => onChange(p.value)}
            accessibilityLabel={`${label}: ${p.label}`}
          />
        ))}
      </View>
    </View>
  );
}

function ReviewStep({ customer, device, values, error, onEdit }: { customer: Customer; device: Device; values: RepairDetailsValues; error: string | null; onEdit: (step: Step) => void }) {
  const estimate = amountOrNull(values.estimatedAmount);
  const final = amountOrNull(values.finalAmount);
  return (
    <View style={styles.gap}>
      <InlineError message={error} />
      <View style={styles.presets}>
        <Button label="Edit customer" variant="ghost" compact onPress={() => onEdit(0)} />
        <Button label="Edit device" variant="ghost" compact onPress={() => onEdit(1)} />
        <Button label="Edit details" variant="ghost" compact onPress={() => onEdit(2)} />
      </View>
      <Card style={styles.reviewCard}>
        <InfoRow label="Customer" value={customer.full_name} />
        <InfoRow label="Contact" value={customer.contact_number} />
        <InfoRow label="Device" value={`${device.device_type} · ${device.brand} ${device.model}`} />
        <Divider />
        <AppText variant="label" tone="secondary">
          Reported problem
        </AppText>
        <AppText variant="body">{values.reportedProblem}</AppText>
        {values.serviceDiagnosis.trim() ? (
          <>
            <AppText variant="label" tone="secondary" style={styles.mt}>
              Service / diagnosis
            </AppText>
            <AppText variant="body">{values.serviceDiagnosis}</AppText>
          </>
        ) : null}
        <Divider />
        <InfoRow label="Estimate" value={estimate === null ? 'Not given' : formatPeso(estimate)} />
        <InfoRow label="Final amount" value={final === null ? 'Not set yet' : formatPeso(final)} />
        <InfoRow label="Date received" value={formatDate(values.receivedDate)} />
        <InfoRow label="Expected release" value={values.expectedReleaseDate ? formatDate(values.expectedReleaseDate) : 'Not set'} />
        {values.notes.trim() ? <InfoRow label="Notes" value={values.notes} /> : null}
      </Card>
      <AppText variant="caption" tone="tertiary">
        The repair number is assigned when you save. The repair starts as Pending.
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gap: { gap: Spacing.lg },
  tight: { marginTop: -Spacing.sm },
  mt: { marginTop: Spacing.sm },
  list: { gap: Spacing.md },
  stepBody: { gap: Spacing.lg },
  stepHeader: { gap: Spacing.xs },
  segments: { flexDirection: 'row', gap: Spacing.xs + 2, marginBottom: Spacing.xs },
  stepLabel: { flex: 1, gap: 6 },
  segment: { height: 4, borderRadius: 3, backgroundColor: Colors.panelStrong },
  segmentDone: { backgroundColor: Colors.primary },
  segmentCurrent: { backgroundColor: Colors.lavender },
  row2: { flexDirection: 'row', gap: Spacing.md },
  dateField: { gap: Spacing.sm },
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  selectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    minHeight: 48,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.md,
    backgroundColor: Colors.lavenderSoft,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    minHeight: 64,
    padding: Spacing.md,
    paddingLeft: Spacing.lg,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  optionSelected: { borderColor: Colors.lavender, borderWidth: 1.5, backgroundColor: Colors.lavenderSoft },
  reviewCard: { gap: Spacing.xs },
  footerRow: { flexDirection: 'row', gap: Spacing.md, width: '100%', maxWidth: 640 },
  footerBack: { minWidth: 96 },
});
