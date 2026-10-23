import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/text';
import { Colors, Spacing } from '@/constants/theme';
import { formatDate } from '@/lib/dates';

import { LIFECYCLE, STATUS_LABEL, type RepairStatus } from '../status';

function stepIndex(status: RepairStatus): number {
  return LIFECYCLE.indexOf(status);
}

/** Compact four-node rail for list rows. */
export function MiniRail({ status }: { status: RepairStatus }) {
  const cancelled = status === 'cancelled';
  const current = stepIndex(status);
  return (
    <View style={styles.mini} accessible={false} importantForAccessibility="no-hide-descendants">
      {LIFECYCLE.map((step, i) => {
        const done = !cancelled && i <= current;
        const isCurrent = !cancelled && i === current;
        return (
          <View key={step} style={styles.miniItem}>
            {i > 0 ? <View style={[styles.miniLine, done && styles.lineDone]} /> : null}
            <View
              style={[
                styles.miniDot,
                done && styles.dotDone,
                isCurrent && styles.miniDotCurrent,
                cancelled && styles.dotCancelled,
              ]}
            />
          </View>
        );
      })}
    </View>
  );
}

type Stamps = Partial<Record<RepairStatus, string | null>>;

/** Full lifecycle stepper for Repair Details. */
export function LifecycleRail({ status, stamps }: { status: RepairStatus; stamps: Stamps }) {
  const cancelled = status === 'cancelled';
  const current = stepIndex(status);
  const summary = cancelled
    ? 'Repair cancelled'
    : `Step ${current + 1} of ${LIFECYCLE.length}: ${STATUS_LABEL[status]}`;

  return (
    <View accessible accessibilityLabel={summary} style={styles.rail}>
      <View style={styles.track}>
        {LIFECYCLE.map((step, i) => {
          const done = !cancelled && i < current;
          const isCurrent = !cancelled && i === current;
          return (
            <View key={step} style={styles.nodeCol}>
              {i > 0 ? <View style={[styles.line, styles.lineLeft, (done || isCurrent) && styles.lineDone]} /> : null}
              {i < LIFECYCLE.length - 1 ? <View style={[styles.line, styles.lineRight, done && styles.lineDone]} /> : null}
              <View
                style={[
                  styles.node,
                  done && styles.nodeDone,
                  isCurrent && styles.nodeCurrent,
                  cancelled && styles.nodeCancelled,
                ]}>
                {done ? (
                  <Ionicons name="checkmark" size={16} color={Colors.inkInverse} />
                ) : isCurrent ? (
                  <View style={styles.nodeCore} />
                ) : null}
              </View>
              <AppText
                variant="small"
                tone={isCurrent ? 'lavender' : done ? 'primary' : 'tertiary'}
                style={styles.nodeLabel}
                numberOfLines={2}>
                {STATUS_LABEL[step]}
              </AppText>
              <AppText variant="small" tone="tertiary" style={[styles.nodeLabel, styles.stamp]} numberOfLines={1}>
                {!cancelled && i <= current && stamps[step] ? formatDate(stamps[step]) : ' '}
              </AppText>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const NODE = 28;

const styles = StyleSheet.create({
  mini: { flexDirection: 'row', alignItems: 'center' },
  miniItem: { flexDirection: 'row', alignItems: 'center' },
  miniLine: { width: 16, height: 2, backgroundColor: Colors.borderStrong },
  miniDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.borderStrong },
  miniDotCurrent: { width: 14, height: 14, borderRadius: 7, backgroundColor: Colors.lavender, borderWidth: 2, borderColor: Colors.lavenderSoft },
  dotDone: { backgroundColor: Colors.primary },
  dotCancelled: { backgroundColor: Colors.borderStrong },
  lineDone: { backgroundColor: Colors.primary },

  rail: { paddingTop: Spacing.xs },
  track: { flexDirection: 'row' },
  nodeCol: { flex: 1, alignItems: 'center', gap: Spacing.xs },
  line: { position: 'absolute', top: NODE / 2 - 1, height: 2, backgroundColor: Colors.border },
  lineLeft: { left: 0, right: '50%' },
  lineRight: { left: '50%', right: 0 },
  node: {
    width: NODE,
    height: NODE,
    borderRadius: NODE / 2,
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeDone: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  nodeCurrent: { borderColor: Colors.lavender, backgroundColor: Colors.lavenderSoft, borderWidth: 3 },
  nodeCancelled: { borderColor: Colors.border, backgroundColor: Colors.background },
  nodeCore: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.lavender },
  nodeLabel: { textAlign: 'center', paddingHorizontal: 2 },
  stamp: { fontWeight: '400' },
});
