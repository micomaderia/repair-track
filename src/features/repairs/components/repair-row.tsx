import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { PressableScale } from '@/components/ui/pressable-scale';
import { AppText } from '@/components/ui/text';
import { Colors, Radius, Shadow, Spacing } from '@/constants/theme';
import { formatDate } from '@/lib/dates';
import { formatPeso } from '@/lib/money';

import { deviceSummary, paymentStatusOf, type RepairOverview } from '../api';
import { STATUS_LABEL, PAYMENT_STATUS_LABEL } from '../status';
import { StatusBadge } from './badges';


/** Ticket-style repair row: number, customer, device, rail, money. */
export function RepairRow({ repair }: { repair: RepairOverview }) {
  const status = repair.status ?? 'pending';
  const paymentStatus = paymentStatusOf(repair);
  const money =
    repair.final_amount_centavos === null
      ? repair.estimated_amount_centavos !== null
        ? `Est. ${formatPeso(repair.estimated_amount_centavos)}`
        : 'No amount yet'
      : (repair.balance_centavos ?? 0) > 0
        ? `${formatPeso(repair.balance_centavos)} due`
        : formatPeso(repair.final_amount_centavos);

  const a11y = [
    `Repair ${repair.transaction_number}`,
    repair.customer_name,
    deviceSummary(repair),
    `Status ${STATUS_LABEL[status]}`,
    `Payment ${PAYMENT_STATUS_LABEL[paymentStatus]}`,
    money,
    `Received ${formatDate(repair.received_at)}`,
  ].join(', ');

  return (
    <PressableScale
      pressedScale={0.985}
      onPress={() => router.push({ pathname: '/repairs/[id]', params: { id: repair.id ?? '' } })}
      accessibilityRole="button"
      accessibilityLabel={a11y}
      accessibilityHint="Opens repair details"
      style={[styles.card, Shadow.card]}>
      <View style={styles.top}>
        <AppText variant="number" tone="brand">
          {repair.transaction_number}
        </AppText>
        <AppText variant="caption" tone="tertiary">
          {formatDate(repair.received_at)}
        </AppText>
      </View>
      <View style={styles.middle}>
        <View style={styles.flex}>
          <AppText variant="bodyStrong" numberOfLines={1}>
            {repair.customer_name}
          </AppText>
          <AppText variant="caption" tone="secondary" numberOfLines={1}>
            {deviceSummary(repair)}
          </AppText>
        </View>
        <Ionicons name="chevron-forward" size={18} color={Colors.inkTertiary} />
      </View>
      <View style={styles.bottom}>
        <View style={styles.badges}>
          <StatusBadge status={status} />

        </View>
        <AppText variant="label" tone={paymentStatus === 'unpaid' || paymentStatus === 'partial' ? 'primary' : 'secondary'}>
          {money}
        </AppText>
      </View>

    </PressableScale>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md + 2,
    paddingBottom: Spacing.md + 2,
    gap: Spacing.sm,
    overflow: 'hidden',
  },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  middle: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  bottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.sm, flexWrap: 'wrap' },
  badges: { flexDirection: 'row', gap: Spacing.xs + 2, flexWrap: 'wrap', flexShrink: 1 },
});
