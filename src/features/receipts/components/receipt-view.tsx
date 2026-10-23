import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/text';
import { Colors, Radius, Shadow, Spacing } from '@/constants/theme';
import { PAYMENT_METHOD_LABEL } from '@/features/repairs/status';
import { formatDateTime } from '@/lib/dates';
import { formatPeso } from '@/lib/money';

import type { ReceiptSnapshot } from '../snapshot';
import { receiptStatusLabel } from '../template';

/** On-screen receipt rendered from the same snapshot as the PDF. */
export function ReceiptView({ snapshot: s }: { snapshot: ReceiptSnapshot }) {
  const paid = s.paymentStatus === 'paid';
  const device = [s.device.deviceType, `${s.device.brand} ${s.device.model}`.trim()].filter(Boolean).join(' · ');
  return (
    <View style={[styles.paper, Shadow.raised]}>
      <View style={styles.head}>
        <Image source={require('@/assets/images/logo/repairtrack-logoname.png')} style={styles.logo} contentFit="contain" accessibilityLabel="RepairTrack" />
        <View style={styles.shop}>
          <AppText variant="label" style={styles.right}>
            {s.shop.name}
          </AppText>
          {s.shop.address ? (
            <AppText variant="caption" tone="secondary" style={styles.right}>
              {s.shop.address}
            </AppText>
          ) : null}
          {s.shop.contactNumber ? (
            <AppText variant="caption" tone="secondary" style={styles.right}>
              {s.shop.contactNumber}
            </AppText>
          ) : null}
        </View>
      </View>

      <View style={[styles.status, paid ? styles.statusPaid : styles.statusPartial]} accessibilityLabel={`Receipt status: ${receiptStatusLabel(s)}`}>
        <AppText variant="label" style={{ color: paid ? Colors.success : Colors.warning }}>
          {receiptStatusLabel(s)}
        </AppText>
      </View>

      <View style={styles.amount}>
        <AppText variant="caption" tone="secondary">Payment amount</AppText>
        <AppText variant="moneyLarge">{formatPeso(s.paymentAmountCentavos)}</AppText>
        <AppText variant="caption" tone={paid ? 'success' : 'secondary'}>
          {paid ? 'Balance settled' : `${formatPeso(s.balanceCentavos)} remaining`}
        </AppText>
      </View>

      <View style={styles.meta}>
        <Meta label="Receipt no." value={s.receiptNumber} />
        <Meta label="Repair no." value={s.transactionNumber} />
        <Meta label="Issued" value={formatDateTime(s.issuedAt)} />
      </View>

      <Block title="Customer">
        <AppText variant="bodyStrong">{s.customer.fullName}</AppText>
        {s.customer.contactNumber ? <AppText variant="caption" tone="secondary">{s.customer.contactNumber}</AppText> : null}
      </Block>
      <Block title="Device">
        <AppText variant="body">{device}</AppText>
      </Block>

      <Block title={s.serviceLabel}>
        <AppText variant="body">{s.serviceText || '—'}</AppText>
      </Block>

      <View style={styles.table}>
        <Line label="Estimated amount" value="Not recorded on receipt" />
        <Line label="Final repair amount" value={formatPeso(s.finalAmountCentavos)} />
        <Line label="Amount paid (this receipt)" value={formatPeso(s.paymentAmountCentavos)} strong />
        <Line label="Payment method" value={`${PAYMENT_METHOD_LABEL[s.paymentMethod]}${s.paymentReference ? ` · ${s.paymentReference}` : ''}`} />
        <Line label="Total paid to date" value={formatPeso(s.totalPaidCentavos)} />
        <Line label="Remaining balance" value={formatPeso(s.balanceCentavos)} />
      </View>

      <AppText variant="caption" tone="tertiary" style={styles.footer}>
        {s.shop.receiptFooter || 'Thank you for your payment.'}
        {s.operatorName ? `\nReceived by ${s.operatorName}` : ''}
      </AppText>
    </View>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaItem}>
      <AppText variant="caption" tone="tertiary">
        {label}
      </AppText>
      <AppText variant="label" style={styles.tabular} selectable>
        {value}
      </AppText>
    </View>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.block}>
      <AppText variant="small" tone="tertiary">
        {title}
      </AppText>
      {children}
    </View>
  );
}

function Line({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={[styles.line, strong && styles.lineStrong]}>
      <AppText variant={strong ? 'bodyStrong' : 'body'} tone={strong ? 'primary' : 'secondary'} style={styles.flex}>
        {label}
      </AppText>
      <AppText variant={strong ? 'money' : 'body'} style={[styles.tabular, styles.right]}>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  right: { textAlign: 'right' },
  tabular: { fontVariant: ['tabular-nums'] },
  paper: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    gap: Spacing.lg,
  },
  amount: { backgroundColor: Colors.background, borderRadius: Radius.md, padding: Spacing.lg, gap: 4 },
  head: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: Spacing.md, paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  logo: { width: 120, height: 39 },
  shop: { flex: 1, minWidth: 120, alignItems: 'flex-end' },
  status: { alignSelf: 'flex-start', paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs + 2, borderRadius: Radius.pill, borderWidth: 1 },
  statusPaid: { backgroundColor: Colors.successSoft, borderColor: '#8FCFAE' },
  statusPartial: { backgroundColor: Colors.warningSoft, borderColor: '#E8C77A' },
  meta: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  metaItem: { minWidth: '30%', flexGrow: 1 },
  block: { gap: 2, paddingBottom: Spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  table: { gap: 0 },
  line: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md, paddingVertical: Spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  lineStrong: { borderBottomWidth: 1.5 },
  footer: { textAlign: 'center' },
});
