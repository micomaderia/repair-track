import { setArchived } from '@/features/archives/api';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, ReduceMotion } from 'react-native-reanimated';

import { Button } from '@/components/ui/button';
import { Card, InfoRow, Screen, Section } from '@/components/ui/layout';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Sheet } from '@/components/ui/sheet';
import { ErrorState, InlineError, ListSkeleton } from '@/components/ui/states';
import { AppText } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import { Colors, Motion, Radius, Shadow, Spacing } from '@/constants/theme';
import {
  changeStatus,
  deviceSummary,
  getRepairHistory,
  getRepairOverview,
  paymentStatusOf,
  repairFacts,
  type RepairOverview,
} from '@/features/repairs/api';
import { PaymentBadge, StatusBadge } from '@/features/repairs/components/badges';
import { LifecycleRail } from '@/features/repairs/components/lifecycle-rail';
import { CancelSheet, EditDetailsSheet, FinalAmountSheet, ReleaseSheet } from '@/features/repairs/components/repair-sheets';
import {
  PAYMENT_METHOD_LABEL,
  STATUS_LABEL,
  canCancel,
  canEditFinalAmount,
  canRecordPayment,
  isTerminal,
  nextAction,
  type NextAction,
} from '@/features/repairs/status';
import { useResource } from '@/hooks/use-resource';
import { formatDate, formatDateTime } from '@/lib/dates';
import { toAppError } from '@/lib/errors';
import { formatPeso } from '@/lib/money';

type SheetName = 'edit' | 'final' | 'cancel' | 'release' | 'actions' | 'archive' | null;

const ACTION_COPY: Record<Exclude<NextAction['kind'], 'none'>, { title: string; body: string; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }> = {
  start: { title: 'Start the repair', body: 'Move this job to In Progress when you begin working on it.', label: 'Start repair', icon: 'play' },
  add_diagnosis: { title: 'Record the diagnosis', body: 'Write what you found and the service done. It is required before completing.', label: 'Add diagnosis', icon: 'create-outline' },
  set_final_amount: { title: 'Set the final amount', body: 'Agree the price with the customer. Payments can be taken once it is set.', label: 'Set final amount', icon: 'pricetag-outline' },
  complete: { title: 'Mark as completed', body: 'The work is done. The device waits for pickup and payment.', label: 'Mark completed', icon: 'checkmark-done' },
  record_payment: { title: 'Collect the balance', body: 'The device can be released once the balance is zero.', label: 'Record payment', icon: 'cash-outline' },
  release: { title: 'Release the device', body: 'Fully paid. Hand the device back to the customer.', label: 'Release device', icon: 'bag-check-outline' },
};

export default function RepairDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const toast = useToast();
  const [sheet, setSheet] = useState<SheetName>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const data = useResource(async () => {
    const [repair, history] = await Promise.all([getRepairOverview(id), getRepairHistory(id)]);
    return { repair, ...history };
  }, [id]);

  if (data.loading) {
    return (
      <Screen>
        <ListSkeleton rows={3} />
      </Screen>
    );
  }
  if (!data.data) {
    return <Screen>{data.error ? <ErrorState error={data.error} onRetry={data.reload} /> : null}</Screen>;
  }

  const { repair, events, payments, receipts } = data.data;
  const status = repair.status ?? 'pending';
  const facts = repairFacts(repair);
  const next = nextAction(facts);
  const paymentStatus = paymentStatusOf(repair);
  const receiptByPayment = new Map(receipts.map((r) => [r.payment_id, r]));

  const done = async (message: string) => {
    setSheet(null);
    toast.show(message);
    await data.reload();
  };

  const transition = async (to: 'in_progress' | 'completed', message: string) => {
    if (busy) return;
    setBusy(true);
    setActionError(null);
    try {
      await changeStatus(repair.id!, status, to);
      toast.show(message);
      await data.reload();
    } catch (err) {
      setActionError(toAppError(err).message);
      await data.reload();
    } finally {
      setBusy(false);
    }
  };

  const runNext = () => {
    switch (next.kind) {
      case 'start':
        return transition('in_progress', 'Repair started');
      case 'add_diagnosis':
        return setSheet('edit');
      case 'set_final_amount':
        return setSheet('final');
      case 'complete':
        return transition('completed', 'Repair marked completed');
      case 'record_payment':
        return router.push({ pathname: '/repairs/[id]/payment', params: { id } });
      case 'release':
        return setSheet('release');
    }
  };

  const showPaymentSecondary = canRecordPayment(facts) && next.kind !== 'record_payment';

  return (
    <Screen refreshing={data.refreshing} onRefresh={data.refresh}>
      <Stack.Screen options={{ headerRight: () => (
        <PressableScale onPress={() => { setActionError(null); setSheet('actions'); }} accessibilityRole="button" accessibilityLabel="Repair actions"
          style={{ width: 48, height: 48, justifyContent: 'center', alignItems: 'center' }}>
          <Ionicons name="ellipsis-horizontal" size={24} color={Colors.ink} />
        </PressableScale>
      ) }} />
      {repair.archived_at ? <AppText variant="label" tone="secondary">Archived repair</AppText> : null}
      <Animated.View entering={FadeInDown.duration(Motion.slow).reduceMotion(ReduceMotion.System)}>
        <TicketHeader repair={repair} />
      </Animated.View>

      <Card style={styles.gap}>
        <LifecycleRail
          status={status}
          stamps={{ pending: repair.received_at, in_progress: repair.started_at, completed: repair.completed_at, released: repair.released_at }}
        />
        {status === 'cancelled' ? (
          <View style={styles.cancelled}>
            <Ionicons name="close-circle" size={20} color={Colors.inkSecondary} />
            <View style={styles.flex}>
              <AppText variant="bodyStrong">Cancelled {formatDateTime(repair.cancelled_at)}</AppText>
              <AppText variant="body" tone="secondary">
                Reason: {repair.cancellation_reason}
              </AppText>
            </View>
          </View>
        ) : null}
      {next.kind !== 'none' ? (
        <View style={styles.nextBlock} accessibilityRole="summary">
          <View style={styles.nextHead}>
            <View style={styles.nextIcon}>
              <Ionicons name="arrow-forward" size={18} color={Colors.lavenderDeep} />
            </View>
            <AppText variant="headline" style={styles.flex} accessibilityRole="header">
              {ACTION_COPY[next.kind].title}
            </AppText>
          </View>
          <AppText variant="body" tone="secondary">
            {ACTION_COPY[next.kind].body}
          </AppText>
          <InlineError message={actionError} />
          <Button label={ACTION_COPY[next.kind].label} icon={ACTION_COPY[next.kind].icon} onPress={runNext} loading={busy} testID="next-action" />
          {showPaymentSecondary || canCancel(facts) ? (
            <View style={styles.secondaryRow}>
              {showPaymentSecondary ? (
                <Button
                  label="Record payment"
                  icon="cash-outline"
                  variant="tonal"
                  compact
                  style={styles.flex}
                  onPress={() => router.push({ pathname: '/repairs/[id]/payment', params: { id } })}
                />
              ) : null}
              {canCancel(facts) ? (
                <Button label="Cancel repair" variant="ghost" compact style={styles.flex} onPress={() => setSheet('cancel')} />
              ) : null}
            </View>
          ) : null}
        </View>
      ) : (
        <View style={styles.closed}>
          <Ionicons name={status === 'released' ? 'checkmark-circle' : 'archive-outline'} size={22} color={status === 'released' ? Colors.success : Colors.inkSecondary} />
          <AppText variant="body" style={styles.flex}>
            {next.reason} {status === 'released' ? `Released ${formatDateTime(repair.released_at)}.` : ''}
          </AppText>
        </View>
      )}
      </Card>

      <Section
        title="Money"
        action={
          canEditFinalAmount(facts) && repair.final_amount_centavos !== null ? (
            <Button label="Change amount" variant="ghost" compact onPress={() => setSheet('final')} />
          ) : undefined
        }>
        <Card>
          <InfoRow label="Estimate" value={repair.estimated_amount_centavos === null ? 'Not given' : formatPeso(repair.estimated_amount_centavos)} />
          <InfoRow label="Final amount" value={repair.final_amount_centavos === null ? 'Not set yet' : formatPeso(repair.final_amount_centavos)} strong />
          <InfoRow label="Total paid" value={formatPeso(repair.total_paid_centavos ?? 0)} />
          <InfoRow
            label="Balance"
            value={repair.balance_centavos === null ? '—' : formatPeso(repair.balance_centavos)}
            strong
            valueTone={(repair.balance_centavos ?? 0) > 0 ? 'danger' : repair.balance_centavos === 0 ? 'success' : undefined}
          />
          <View style={styles.badgeLine}>
            <AppText variant="body" tone="secondary">
              Payment status
            </AppText>
            <PaymentBadge status={paymentStatus} />
          </View>
        </Card>
      </Section>

      <Section
        title="Repair details"
        action={!isTerminal(status) ? <Button label="Edit" icon="create-outline" variant="ghost" compact onPress={() => setSheet('edit')} accessibilityLabel="Edit repair details" /> : undefined}>
        <Card style={styles.gapSm}>
          <TextBlock label="Reported problem" text={repair.reported_problem} />
          <TextBlock label="Service / diagnosis" text={repair.service_diagnosis} empty="Not recorded yet" />
          {repair.notes ? <TextBlock label="Notes" text={repair.notes} /> : null}
          <View style={styles.dates}>
            <InfoRow label="Date received" value={formatDateTime(repair.received_at)} />
            <InfoRow label="Expected release" value={repair.expected_release_date ? formatDate(repair.expected_release_date) : 'Not set'} />
            <InfoRow label="Completed" value={repair.completed_at ? formatDateTime(repair.completed_at) : '—'} />
            <InfoRow label="Released" value={repair.released_at ? formatDateTime(repair.released_at) : '—'} />
          </View>
        </Card>
      </Section>

      <Section title={`Payments & receipts (${payments.length})`}>
        {payments.length === 0 ? (
          <AppText variant="body" tone="secondary">
            {repair.final_amount_centavos === null
              ? 'Payments can be recorded once the final amount is set.'
              : repair.final_amount_centavos === 0
                ? 'No charge for this repair.'
                : 'No payments recorded yet.'}
          </AppText>
        ) : (
          <View style={styles.list}>
            {payments.map((p) => {
              const receipt = receiptByPayment.get(p.id);
              return (
                <PressableScale
                  key={p.id}
                  disabled={!receipt}
                  onPress={() => receipt && router.push({ pathname: '/receipts/[id]', params: { id: receipt.id } })}
                  accessibilityRole="button"
                  accessibilityLabel={`${formatPeso(p.amount_centavos)} by ${PAYMENT_METHOD_LABEL[p.method]} on ${formatDateTime(p.paid_at)}. Receipt ${receipt?.receipt_number ?? 'pending'}`}
                  accessibilityHint="Opens the receipt"
                  style={styles.payment}>
                  <View style={styles.receiptIcon}>
                    <Ionicons name="receipt-outline" size={20} color={Colors.primary} />
                  </View>
                  <View style={styles.flex}>
                    <AppText variant="money">{formatPeso(p.amount_centavos)}</AppText>
                    <AppText variant="caption" tone="secondary">
                      {PAYMENT_METHOD_LABEL[p.method]}
                      {p.reference ? ` · Ref ${p.reference}` : ''} · {formatDateTime(p.paid_at)}
                    </AppText>
                  </View>
                  <View style={styles.receiptRef}>
                    <AppText variant="small" tone="brand">
                      {receipt?.receipt_number}
                    </AppText>
                    <Ionicons name="chevron-forward" size={16} color={Colors.inkTertiary} />
                  </View>
                </PressableScale>
              );
            })}
          </View>
        )}
      </Section>

      <Section title="Status timeline">
        <Card style={styles.timeline}>
          {events.map((e, i) => (
            <View key={e.id} style={styles.event}>
              <View style={styles.eventRail}>
                <View style={[styles.eventDot, i === events.length - 1 && styles.eventDotLast]} />
                {i < events.length - 1 ? <View style={styles.eventLine} /> : null}
              </View>
              <View style={[styles.flex, styles.eventBody]}>
                <AppText variant="bodyStrong">{e.from_status ? `${STATUS_LABEL[e.from_status]} → ${STATUS_LABEL[e.to_status]}` : 'Repair created · Pending'}</AppText>
                <AppText variant="caption" tone="secondary">
                  {formatDateTime(e.changed_at)}
                  {e.reason ? ` · ${e.reason}` : ''}
                </AppText>
              </View>
            </View>
          ))}
        </Card>
      </Section>

      <EditDetailsSheet repair={repair} visible={sheet === 'edit'} onClose={() => setSheet(null)} onDone={done} />
      <Sheet visible={sheet === 'actions' || sheet === 'archive'}
        title={sheet === 'archive' ? `${repair.archived_at ? 'Restore' : 'Archive'} repair?` : 'Repair actions'}
        description={sheet === 'archive' ? 'Payment, receipt, and status history stay intact. Archived repairs can be restored from Settings.' : undefined}
        onClose={() => setSheet(null)} busy={busy}>
        {sheet === 'archive' ? <>
          <InlineError message={actionError} />
          <Button label={repair.archived_at ? 'Restore repair' : 'Archive repair'} loading={busy} onPress={async () => {
            setBusy(true); setActionError(null);
            try {
              await setArchived('repair', id, !repair.archived_at);
              await done(repair.archived_at ? 'Repair restored' : 'Repair archived');
            } catch (error) { setActionError(toAppError(error).message); }
            finally { setBusy(false); }
          }} />
          <Button label="Keep as is" variant="outline" disabled={busy} onPress={() => setSheet(null)} />
        </> : <>
          <Button label="View details" variant="ghost" onPress={() => setSheet(null)} />
          {!isTerminal(status) ? <Button label="Edit repair" icon="create-outline" variant="ghost" onPress={() => setSheet('edit')} /> : null}
          {next.kind !== 'none' ? <Button label={ACTION_COPY[next.kind].label} variant="tonal" onPress={() => { setSheet(null); runNext(); }} /> : null}
          <Button label={repair.archived_at ? 'Restore repair' : 'Archive repair'} icon="archive-outline" variant="ghost" onPress={() => setSheet('archive')} />
        </>}
      </Sheet>
      <FinalAmountSheet repair={repair} visible={sheet === 'final'} onClose={() => setSheet(null)} onDone={done} />
      <CancelSheet repair={repair} visible={sheet === 'cancel'} onClose={() => setSheet(null)} onDone={done} />
      <ReleaseSheet repair={repair} visible={sheet === 'release'} onClose={() => setSheet(null)} onDone={done} />
    </Screen>
  );
}

function TicketHeader({ repair }: { repair: RepairOverview }) {
  const status = repair.status ?? 'pending';
  const final = repair.final_amount_centavos;
  return (
    <View style={[styles.ticket, Shadow.raised]}>
      <View style={styles.ticketTop}>
        <View style={styles.flex}>
          <AppText variant="caption" tone="secondary">
            Repair no.
          </AppText>
          <AppText variant="title" tone="brand" selectable style={styles.number} accessibilityRole="header">
            {repair.transaction_number}
          </AppText>
        </View>
        <View style={styles.badgeCol}>
          <StatusBadge status={status} />
          {status !== 'cancelled' ? <PaymentBadge status={paymentStatusOf(repair)} /> : null}
        </View>
      </View>
      <PressableScale
        onPress={() => router.push({ pathname: '/customers/[id]', params: { id: repair.customer_id ?? '' } })}
        accessibilityRole="link"
        accessibilityLabel={`Customer ${repair.customer_name}. Opens customer details`}
        style={styles.customerLink}>
        <View style={styles.flex}>
          <AppText variant="headline" numberOfLines={1}>
            {repair.customer_name}
          </AppText>
          <AppText variant="body" tone="secondary" numberOfLines={2}>
            {deviceSummary(repair)}
          </AppText>
        </View>
        <Ionicons name="chevron-forward" size={18} color={Colors.inkTertiary} />
      </PressableScale>
      <View style={styles.notchRow}>
        <View style={[styles.notch, styles.notchLeft]} />
        <View style={styles.dash} />
        <View style={[styles.notch, styles.notchRight]} />
      </View>
      <View style={styles.moneyRow}>
        <MoneyCell label="Final" value={final === null ? 'Not set' : formatPeso(final)} />
        <MoneyCell label="Paid" value={formatPeso(repair.total_paid_centavos ?? 0)} />
        <MoneyCell
          label="Balance"
          value={repair.balance_centavos === null ? '—' : formatPeso(repair.balance_centavos)}
          tone={(repair.balance_centavos ?? 0) > 0 ? 'danger' : repair.balance_centavos === 0 ? 'success' : undefined}
        />
      </View>
    </View>
  );
}

function MoneyCell({ label, value, tone }: { label: string; value: string; tone?: 'danger' | 'success' }) {
  return (
    <View style={styles.moneyCell} accessible accessibilityLabel={`${label}: ${value}`}>
      <AppText variant="caption" tone="secondary">
        {label}
      </AppText>
      <AppText variant="money" tone={tone ?? 'primary'} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
        {value}
      </AppText>
    </View>
  );
}

function TextBlock({ label, text, empty = '—' }: { label: string; text: string | null; empty?: string }) {
  return (
    <View style={styles.textBlock}>
      <AppText variant="label" tone="secondary">
        {label}
      </AppText>
      <AppText variant="body" tone={text ? 'primary' : 'tertiary'} selectable>
        {text || empty}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gap: { gap: Spacing.lg },
  gapSm: { gap: Spacing.md },
  list: { gap: Spacing.sm },
  ticket: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    gap: Spacing.md,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  ticketTop: { flexDirection: 'row', gap: Spacing.md, alignItems: 'flex-start' },
  number: { fontVariant: ['tabular-nums'], letterSpacing: 0.3 },
  badgeCol: { gap: Spacing.xs, alignItems: 'flex-end' },
  customerLink: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, minHeight: 48 },
  notchRow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: -Spacing.lg, height: 18 },
  notch: { width: 18, height: 18, borderRadius: 9, backgroundColor: Colors.background },
  notchLeft: { marginLeft: -9 },
  notchRight: { marginRight: -9 },
  dash: { flex: 1, borderTopWidth: 1.5, borderStyle: 'dashed', borderColor: Colors.borderStrong, marginHorizontal: Spacing.sm },
  moneyRow: { flexDirection: 'row', gap: Spacing.sm },
  moneyCell: { flex: 1, gap: 2 },
  cancelled: { flexDirection: 'row', gap: Spacing.sm, padding: Spacing.md, borderRadius: Radius.md, backgroundColor: Colors.background },
  nextBlock: {
    gap: Spacing.md,
    paddingTop: Spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  nextHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  nextIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.lavenderSoft, alignItems: 'center', justifyContent: 'center' },
  secondaryRow: { flexDirection: 'row', gap: Spacing.sm },
  closed: { flexDirection: 'row', gap: Spacing.md, alignItems: 'center', padding: Spacing.md, borderRadius: Radius.md, backgroundColor: Colors.panel },
  badgeLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: Spacing.sm },
  textBlock: { gap: 2 },
  dates: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border, paddingTop: Spacing.sm },
  payment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    minHeight: 64,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  receiptIcon: { width: 40, height: 40, borderRadius: Radius.sm, backgroundColor: Colors.panel, alignItems: 'center', justifyContent: 'center' },
  receiptRef: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  timeline: { gap: 0, paddingVertical: Spacing.md },
  event: { flexDirection: 'row', gap: Spacing.md },
  eventRail: { width: 14, alignItems: 'center' },
  eventDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary, marginTop: 6 },
  eventDotLast: { backgroundColor: Colors.lavender, width: 12, height: 12, borderRadius: 6 },
  eventLine: { flex: 1, width: 2, backgroundColor: Colors.border, marginVertical: 2 },
  eventBody: { paddingBottom: Spacing.md },
});
