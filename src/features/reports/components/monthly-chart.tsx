import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { MONTH_NAMES } from '@/lib/dates';
import { formatPeso } from '@/lib/money';

import type { MonthlyCollection } from '../api';

const CHART_HEIGHT = 110;

/**
 * Single-series column chart (one hue). Tap a column to read its value; the
 * month list below is the accessible table view.
 */
export function MonthlyChart({ data, currentMonth }: { data: MonthlyCollection[]; currentMonth: number | null }) {
  const [selected, setSelected] = useState<number | null>(currentMonth);
  const max = Math.max(...data.map((d) => d.collectionsCentavos), 0);
  const active = data.find((d) => d.month === selected) ?? null;

  return (
    <View style={styles.wrap}>
      <View style={styles.readout} accessibilityLiveRegion="polite">
        <AppText variant="caption" tone="secondary">
          {active ? MONTH_NAMES[active.month - 1] : 'Tap a month'}
        </AppText>
        <AppText variant="money">
          {active ? `${formatPeso(active.collectionsCentavos)} · ${active.paymentCount} ${active.paymentCount === 1 ? 'payment' : 'payments'}` : ' '}
        </AppText>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator accessibilityLabel="Monthly collections chart, swipe to view months">
      <View style={styles.plot}>
        <View style={[styles.gridLine, { top: 0 }]} />
        <View style={[styles.gridLine, { top: CHART_HEIGHT / 2 }]} />
        <View style={[styles.baseline, { top: CHART_HEIGHT }]} />
        {data.map((d) => {
          const h = max > 0 ? Math.max((d.collectionsCentavos / max) * CHART_HEIGHT, d.collectionsCentavos > 0 ? 4 : 0) : 0;
          const isSelected = d.month === selected;
          return (
            <Pressable
              key={d.month}
              onPress={() => setSelected(d.month)}
              accessibilityRole="button"
              accessibilityLabel={`${MONTH_NAMES[d.month - 1]}: ${formatPeso(d.collectionsCentavos)}`}
              accessibilityState={{ selected: isSelected }}
              style={styles.col}>
              <View style={styles.barArea}>
                <View
                  style={[
                    styles.bar,
                    { height: h, opacity: selected === null || isSelected ? 1 : 0.55 },
                  ]}
                />
              </View>
              <AppText
                variant="small"
                tone={d.month === currentMonth ? 'primary' : 'tertiary'}
                style={[styles.month, d.month === currentMonth && styles.current]}
                maxFontSizeMultiplier={1.2}>
                {MONTH_NAMES[d.month - 1].slice(0, 1)}
              </AppText>
            </Pressable>
          );
        })}
      </View>
      </ScrollView>
      <AppText variant="caption" tone="tertiary">
        Highest month: {formatPeso(max)}
        {currentMonth ? ' · Underlined: current month' : ''}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.md },
  readout: { gap: 2, minHeight: 44 },
  plot: { flexDirection: 'row', height: CHART_HEIGHT + 28, gap: 2 },
  gridLine: { position: 'absolute', left: 0, right: 0, height: StyleSheet.hairlineWidth, backgroundColor: Colors.border },
  baseline: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: Colors.borderStrong },
  col: { width: 48, alignItems: 'center', minHeight: 48 },
  barArea: { height: CHART_HEIGHT, width: '100%', justifyContent: 'flex-end', alignItems: 'center' },
  bar: { width: '62%', maxWidth: 22, backgroundColor: Colors.primary, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  month: { marginTop: Spacing.xs + 2, textAlign: 'center' },
  current: { textDecorationLine: 'underline', fontWeight: '700' },
});

export function StatusBars({
  rows,
}: {
  rows: { key: string; label: string; count: number; color: string; icon: React.ReactNode }[];
}) {
  const max = Math.max(...rows.map((r) => r.count), 1);
  return (
    <View style={{ gap: Spacing.md }}>
      {rows.map((r) => (
        <View key={r.key} style={barStyles.row} accessible accessibilityLabel={`${r.label}: ${r.count}`}>
          <View style={barStyles.labelCol}>
            {r.icon}
            <AppText variant="label" numberOfLines={1} style={{ flexShrink: 1 }}>
              {r.label}
            </AppText>
          </View>
          <View style={barStyles.track}>
            <View style={[barStyles.fill, { width: `${(r.count / max) * 100}%`, backgroundColor: r.color }]} />
          </View>
          <AppText variant="number" style={barStyles.count}>
            {r.count}
          </AppText>
        </View>
      ))}
    </View>
  );
}

const barStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  labelCol: { width: 116, flexDirection: 'row', alignItems: 'center', gap: Spacing.xs + 2 },
  track: { flex: 1, height: 10, borderRadius: Radius.pill, backgroundColor: Colors.background, overflow: 'hidden' },
  fill: { height: 10, borderRadius: Radius.pill },
  count: { width: 32, textAlign: 'right' },
});
