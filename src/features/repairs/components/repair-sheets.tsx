import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { InlineError } from '@/components/ui/states';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import {
  amountOrNull,
  blankToNull,
  cancelSchema,
  finalAmountSchema,
  repairEditSchema,
  type CancelValues,
  type FinalAmountValues,
  type RepairEditValues,
} from '@/features/validation';
import { formatDate, isValidDateKey } from '@/lib/dates';
import { toAppError } from '@/lib/errors';
import { centavosToInput, formatPeso } from '@/lib/money';

import { changeStatus, setFinalAmount, updateRepairDetails, type RepairOverview } from '../api';

type SheetProps = { repair: RepairOverview; visible: boolean; onClose: () => void; onDone: (message: string) => void };

function Actions({ onClose, busy, label, onSubmit, variant = 'primary' }: { onClose: () => void; busy: boolean; label: string; onSubmit: () => void; variant?: 'primary' | 'danger' }) {
  return (
    <View style={styles.actions}>
      <Button label="Back" variant="outline" onPress={onClose} disabled={busy} style={styles.flex} />
      <Button label={label} variant={variant} onPress={onSubmit} loading={busy} style={styles.flex} />
    </View>
  );
}

export function EditDetailsSheet({ repair, visible, onClose, onDone }: SheetProps) {
  const [error, setError] = useState<string | null>(null);
  const estimateLocked = repair.final_amount_centavos !== null;
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RepairEditValues>({
    resolver: zodResolver(repairEditSchema),
    values: {
      reportedProblem: repair.reported_problem ?? '',
      serviceDiagnosis: repair.service_diagnosis ?? '',
      estimatedAmount: centavosToInput(repair.estimated_amount_centavos),
      expectedReleaseDate: repair.expected_release_date ?? '',
      notes: repair.notes ?? '',
    },
    resetOptions: { keepDirtyValues: true },
  });

  const submit = handleSubmit(async (v) => {
    setError(null);
    try {
      await updateRepairDetails(repair.id!, {
        reportedProblem: v.reportedProblem.trim(),
        serviceDiagnosis: blankToNull(v.serviceDiagnosis),
        estimatedAmountCentavos: estimateLocked ? repair.estimated_amount_centavos : amountOrNull(v.estimatedAmount),
        expectedReleaseDate: blankToNull(v.expectedReleaseDate),
        notes: blankToNull(v.notes),
      });
      onDone('Repair details saved');
    } catch (err) {
      setError(toAppError(err).message);
    }
  });

  return (
    <Sheet visible={visible} title="Edit repair details" onClose={onClose} busy={isSubmitting}>
      <InlineError message={error} />
      <Controller
        control={control}
        name="serviceDiagnosis"
        render={({ field }) => (
          <TextField
            label="Service / diagnosis"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={errors.serviceDiagnosis?.message}
            multiline
            maxLength={2000}
            placeholder="What you found and what you did"
            hint={repair.status === 'in_progress' ? 'Required before the repair can be completed.' : undefined}
            testID="edit-diagnosis"
          />
        )}
      />
      <Controller
        control={control}
        name="reportedProblem"
        render={({ field }) => (
          <TextField label="Reported problem" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={errors.reportedProblem?.message} multiline maxLength={2000} />
        )}
      />
      <View style={styles.row}>
        <View style={styles.flex}>
          <Controller
            control={control}
            name="estimatedAmount"
            render={({ field }) => (
              <TextField
                label="Estimate"
                optional
                prefix="₱"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={errors.estimatedAmount?.message}
                keyboardType="decimal-pad"
                editable={!estimateLocked}
                hint={estimateLocked ? 'Locked after final amount' : undefined}
              />
            )}
          />
        </View>
        <View style={styles.flex}>
          <Controller
            control={control}
            name="expectedReleaseDate"
            render={({ field }) => (
              <TextField
                label="Expected release"
                optional
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={errors.expectedReleaseDate?.message}
                placeholder="YYYY-MM-DD"
                maxLength={10}
                keyboardType="numbers-and-punctuation"
                hint={field.value && isValidDateKey(field.value) ? formatDate(field.value) : undefined}
              />
            )}
          />
        </View>
      </View>
      <Controller
        control={control}
        name="notes"
        render={({ field }) => (
          <TextField label="Notes" optional value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={errors.notes?.message} maxLength={2000} />
        )}
      />
      <Actions onClose={onClose} busy={isSubmitting} label="Save" onSubmit={submit} />
    </Sheet>
  );
}

export function FinalAmountSheet({ repair, visible, onClose, onDone }: SheetProps) {
  const [error, setError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FinalAmountValues>({
    resolver: zodResolver(finalAmountSchema),
    values: { finalAmount: centavosToInput(repair.final_amount_centavos ?? repair.estimated_amount_centavos) },
    resetOptions: { keepDirtyValues: true },
  });

  const submit = handleSubmit(async (v) => {
    setError(null);
    const centavos = amountOrNull(v.finalAmount);
    if (centavos === null) return;
    try {
      await setFinalAmount(repair.id!, centavos);
      onDone(`Final amount set to ${formatPeso(centavos)}`);
    } catch (err) {
      setError(toAppError(err).message);
    }
  });

  return (
    <Sheet
      visible={visible}
      title="Set final amount"
      description="This is what the customer pays. Enter 0 for a free service. It locks after the first payment or once the repair is completed."
      onClose={onClose}
      busy={isSubmitting}>
      <InlineError message={error} />
      <Controller
        control={control}
        name="finalAmount"
        render={({ field }) => (
          <TextField
            label="Final amount"
            prefix="₱"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={errors.finalAmount?.message}
            keyboardType="decimal-pad"
            placeholder="0.00"
            autoFocus
            hint={repair.estimated_amount_centavos !== null ? `Estimate was ${formatPeso(repair.estimated_amount_centavos)}` : undefined}
            testID="final-amount"
          />
        )}
      />
      <Actions onClose={onClose} busy={isSubmitting} label="Set amount" onSubmit={submit} />
    </Sheet>
  );
}

export function CancelSheet({ repair, visible, onClose, onDone }: SheetProps) {
  const [error, setError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CancelValues>({ resolver: zodResolver(cancelSchema), defaultValues: { reason: '' } });

  const submit = handleSubmit(async (v) => {
    setError(null);
    try {
      await changeStatus(repair.id!, repair.status!, 'cancelled', v.reason.trim());
      onDone(`${repair.transaction_number} cancelled`);
    } catch (err) {
      setError(toAppError(err).message);
    }
  });

  return (
    <Sheet
      visible={visible}
      title="Cancel this repair?"
      description="Cancelled repairs stay in the history but can't be reopened."
      onClose={onClose}
      busy={isSubmitting}>
      <InlineError message={error} />
      <Controller
        control={control}
        name="reason"
        render={({ field }) => (
          <TextField
            label="Reason"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={errors.reason?.message}
            placeholder="e.g. Customer declined the quote"
            maxLength={500}
          />
        )}
      />
      <Actions onClose={onClose} busy={isSubmitting} label="Cancel repair" variant="danger" onSubmit={submit} />
    </Sheet>
  );
}

export function ReleaseSheet({ repair, visible, onClose, onDone }: SheetProps) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await changeStatus(repair.id!, 'completed', 'released');
      onDone('Device released to customer');
    } catch (err) {
      setError(toAppError(err).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet
      visible={visible}
      title="Release the device?"
      description={`Hand the ${repair.brand} ${repair.model} back to ${repair.customer_name}. The release time is recorded and the repair is closed.`}
      onClose={onClose}
      busy={busy}>
      <InlineError message={error} />
      <Actions onClose={onClose} busy={busy} label="Release device" onSubmit={submit} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', gap: Spacing.md },
  actions: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.xs },
});
