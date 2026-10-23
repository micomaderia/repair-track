import { zodResolver } from '@hookform/resolvers/zod';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { ChoiceGroup } from '@/components/ui/chips';
import { Card, InfoRow, Screen } from '@/components/ui/layout';
import { ErrorState, InlineError, ListSkeleton } from '@/components/ui/states';
import { TextField } from '@/components/ui/text-field';
import { AppText } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { getRepairOverview, recordPayment, repairFacts } from '@/features/repairs/api';
import { PAYMENT_METHOD_LABEL, PAYMENT_METHODS, canRecordPayment, type PaymentMethod } from '@/features/repairs/status';
import { amountOrNull, blankToNull, paymentAmountError, paymentSchema, type PaymentValues } from '@/features/validation';
import { useResource } from '@/hooks/use-resource';
import { formatDateTime } from '@/lib/dates';
import { toAppError } from '@/lib/errors';
import { centavosToInput, formatPeso } from '@/lib/money';
import { newRequestId } from '@/lib/request-id';

const METHOD_OPTIONS = PAYMENT_METHODS.map((m) => ({ value: m, label: PAYMENT_METHOD_LABEL[m] }));

export default function RecordPaymentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const toast = useToast();
  const repair = useResource(() => getRepairOverview(id), [id]);
  // Stable idempotency key: a retry after a timeout returns the same payment and receipt.
  const [requestId] = useState(newRequestId);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    setValue,
    setError,
    formState: { errors },
  } = useForm<PaymentValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: { amount: '', method: 'cash', reference: '' },
  });
  const amount = useWatch({ control, name: 'amount' });
  const method = useWatch({ control, name: 'method' });

  if (repair.loading) {
    return (
      <Screen>
        <ListSkeleton rows={2} />
      </Screen>
    );
  }
  if (!repair.data) {
    return <Screen>{repair.error ? <ErrorState error={repair.error} onRetry={repair.reload} /> : null}</Screen>;
  }

  const r = repair.data;
  const balance = r.balance_centavos ?? 0;
  const allowed = canRecordPayment(repairFacts(r));
  const amountCentavos = amountOrNull(amount);
  const remainingAfter = amountCentavos !== null ? balance - amountCentavos : null;

  const submit = handleSubmit(async (values) => {
    if (submitting) return;
    const amountError = paymentAmountError(values.amount, balance);
    if (amountError) {
      setError('amount', { message: amountError });
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const receipt = await recordPayment({
        requestId,
        repairId: id,
        amountCentavos: amountOrNull(values.amount)!,
        method: values.method,
        reference: blankToNull(values.reference),
      });
      toast.show(`Payment recorded · ${receipt.receipt_number}`);
      router.replace({ pathname: '/receipts/[id]', params: { id: receipt.id, fresh: '1' } });
    } catch (err) {
      setSubmitError(toAppError(err).message);
      setSubmitting(false);
      void repair.reload();
    }
  });

  return (
    <Screen
      footer={
        allowed ? (
          <Button
            label={amountCentavos ? `Record ${formatPeso(amountCentavos)} · ${PAYMENT_METHOD_LABEL[method]}` : 'Record payment'}
            icon="checkmark"
            onPress={submit}
            loading={submitting}
            style={styles.full}
            testID="payment-submit"
          />
        ) : undefined
      }>
      <Card style={styles.summary}>
        <AppText variant="number" tone="brand">
          {r.transaction_number}
        </AppText>
        <AppText variant="bodyStrong">
          {r.customer_name} · {r.brand} {r.model}
        </AppText>
        <View style={styles.moneyRows}>
          <InfoRow label="Final amount" value={formatPeso(r.final_amount_centavos)} />
          <InfoRow label="Total paid" value={formatPeso(r.total_paid_centavos ?? 0)} />
          <View style={styles.balanceRow} accessible accessibilityLabel={`Remaining balance: ${formatPeso(balance)}`}>
            <AppText variant="bodyStrong">Remaining balance</AppText>
            <AppText variant="moneyLarge" tone={balance > 0 ? 'danger' : 'success'}>
              {formatPeso(balance)}
            </AppText>
          </View>
        </View>
      </Card>

      {!allowed ? (
        <InlineError
          message={
            r.final_amount_centavos === null
              ? 'Set the final amount before recording a payment.'
              : balance <= 0
                ? 'This repair is fully paid.'
                : 'Payments cannot be added to released or cancelled repairs.'
          }
        />
      ) : (
        <View style={styles.form}>
          <InlineError message={submitError} />
          <Controller
            control={control}
            name="amount"
            render={({ field }) => (
              <TextField
                label="Payment amount"
                prefix="₱"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={errors.amount?.message}
                keyboardType="decimal-pad"
                placeholder="0.00"
                hint={
                  remainingAfter !== null && remainingAfter >= 0
                    ? remainingAfter === 0
                      ? 'Pays the balance in full.'
                      : `Partial payment · ${formatPeso(remainingAfter)} will remain.`
                    : undefined
                }
                testID="payment-amount"
              />
            )}
          />
          <Button
            label={`Pay full balance · ${formatPeso(balance)}`}
            variant="tonal"
            compact
            onPress={() => setValue('amount', centavosToInput(balance), { shouldValidate: true })}
          />
          <View style={styles.field}>
            <AppText variant="label" tone="secondary">
              Payment method
            </AppText>
            <Controller
              control={control}
              name="method"
              render={({ field }) => (
                <ChoiceGroup<PaymentMethod> label="Payment method" options={METHOD_OPTIONS} value={field.value} onChange={field.onChange} />
              )}
            />
          </View>
          <Controller
            control={control}
            name="reference"
            render={({ field }) => (
              <TextField
                label="Reference"
                optional
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={errors.reference?.message}
                autoCapitalize="characters"
                maxLength={100}
                hint={method === 'cash' ? undefined : `${PAYMENT_METHOD_LABEL[method]} reference number, if any`}
              />
            )}
          />
          <View style={styles.when}>
            <AppText variant="label" tone="secondary">
              Payment date & time
            </AppText>
            <AppText variant="body">{formatDateTime(new Date())}</AppText>
            <AppText variant="caption" tone="tertiary">
              Recorded with the server time when you save. Posted payments can&apos;t be edited, so check the amount first.
            </AppText>
          </View>
        </View>
      )}
    </Screen>
  );
}


const styles = StyleSheet.create({
  full: { width: '100%', maxWidth: 640 },
  summary: { gap: Spacing.xs },
  moneyRows: { marginTop: Spacing.sm },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  form: { gap: Spacing.lg },
  field: { gap: Spacing.xs + 2 },
  when: { gap: 2, padding: Spacing.md, borderRadius: Radius.md, backgroundColor: Colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: Colors.border },
});
