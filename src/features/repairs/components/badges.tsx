import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';

import { AppText } from '@/components/ui/text';
import { Colors, Motion, Radius, Spacing } from '@/constants/theme';

import { PAYMENT_STATUS_LABEL, STATUS_LABEL, type PaymentStatus, type RepairStatus } from '../status';

type IconName = ComponentProps<typeof Ionicons>['name'];
type Look = { fg: string; bg: string; icon: IconName };

export const STATUS_LOOK: Record<RepairStatus, Look> = {
  pending: { fg: Colors.warning, bg: Colors.warningSoft, icon: 'time-outline' },
  in_progress: { fg: Colors.primaryPressed, bg: Colors.primarySoft, icon: 'construct-outline' },
  completed: { fg: Colors.lavenderDeep, bg: Colors.lavenderSoft, icon: 'checkmark-done-outline' },
  released: { fg: Colors.success, bg: Colors.successSoft, icon: 'bag-check-outline' },
  cancelled: { fg: Colors.inkSecondary, bg: Colors.neutralSoft, icon: 'close-circle-outline' },
};

const PAYMENT_LOOK: Record<PaymentStatus, Look> = {
  not_set: { fg: Colors.inkSecondary, bg: Colors.neutralSoft, icon: 'remove-circle-outline' },
  unpaid: { fg: Colors.danger, bg: Colors.dangerSoft, icon: 'alert-circle-outline' },
  partial: { fg: Colors.warning, bg: Colors.warningSoft, icon: 'pie-chart-outline' },
  paid: { fg: Colors.success, bg: Colors.successSoft, icon: 'checkmark-circle-outline' },
};

function Badge({ look, label, a11y }: { look: Look; label: string; a11y: string }) {
  return (
    <Animated.View
      key={label}
      entering={FadeIn.duration(Motion.base).reduceMotion(ReduceMotion.System)}
      style={[styles.badge, { backgroundColor: look.bg }]}
      accessible
      accessibilityLabel={a11y}>
      <Ionicons name={look.icon} size={14} color={look.fg} />
      <AppText variant="small" style={{ color: look.fg }} numberOfLines={1}>
        {label}
      </AppText>
    </Animated.View>
  );
}

export function StatusBadge({ status }: { status: RepairStatus }) {
  return <Badge look={STATUS_LOOK[status]} label={STATUS_LABEL[status]} a11y={`Repair status: ${STATUS_LABEL[status]}`} />;
}

export function PaymentBadge({ status }: { status: PaymentStatus }) {
  return (
    <Badge look={PAYMENT_LOOK[status]} label={PAYMENT_STATUS_LABEL[status]} a11y={`Payment: ${PAYMENT_STATUS_LABEL[status]}`} />
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.pill,
  },
});
