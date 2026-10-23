import Ionicons from '@expo/vector-icons/Ionicons';
import { useState, type ReactNode, type Dispatch, type SetStateAction } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { FilterChips, type ChipOption } from '@/components/ui/chips';
import { Card, Screen, Section } from '@/components/ui/layout';
import { PressableScale } from '@/components/ui/pressable-scale';
import { ErrorState, InlineError, Skeleton } from '@/components/ui/states';
import { AppText } from '@/components/ui/text';
import { Colors, Spacing } from '@/constants/theme';
import { STATUS_LOOK } from '@/features/repairs/components/badges';
import { STATUS_LABEL, type RepairStatus } from '@/features/repairs/status';
import { getMonthlyCollections, getReportSummary } from '@/features/reports/api';
import { MonthlyChart, StatusBars } from '@/features/reports/components/monthly-chart';
import { useResource } from '@/hooks/use-resource';
import { currentManilaYearMonth, formatDate, isValidDateKey, periodRange, toManilaDateKey, type ReportPeriod, type DateRange } from '@/lib/dates';
import { formatPeso } from '@/lib/money';

const PERIODS: readonly ChipOption<ReportPeriod | 'custom'>[] = [
  { value: 'this_month', label: 'This month' },
  { value: 'last_month', label: 'Last month' },
  { value: 'last_30_days', label: 'Last 30 days' },
  { value: 'custom', label: 'Custom' },
];

export default function ReportsScreen() {
  const [period, setPeriod] = useState<ReportPeriod | 'custom'>('this_month');
  const now = currentManilaYearMonth();
  const [year, setYear] = useState(now.year);
  const initial = periodRange('this_month');
  const [custom, setCustom] = useState({ start: initial.start, end: initial.end, label: 'Custom' });
  const [start, setStart] = useState(initial.start);
  const [end, setEnd] = useState(initial.end);
  const [rangeError, setRangeError] = useState<string | null>(null);
  const range = period === 'custom' ? custom : periodRange(period);
  const applyCustom = () => {
    if (!isValidDateKey(start) || !isValidDateKey(end)) return setRangeError('Use YYYY-MM-DD for both dates.');
    if (start > end) return setRangeError('End date must be on or after start date.');
    if (end > toManilaDateKey()) return setRangeError('End date cannot be in the future.');
    if (Number(start.slice(0, 4)) < 2000) return setRangeError('Choose a date from 2000 onward.');
    setRangeError(null); setCustom({ start, end, label: 'Custom' });
  };

  const filters = (<View style={styles.periodBlock}>
        <FilterChips options={PERIODS} value={period} onChange={setPeriod} accessibilityLabel="Report period" />
        {period === 'custom' ? <View style={styles.gap}>
          <TextField label="From" value={start} onChangeText={setStart} placeholder="YYYY-MM-DD" maxLength={10} keyboardType="numbers-and-punctuation" />
          <TextField label="To" value={end} onChangeText={setEnd} placeholder="YYYY-MM-DD" maxLength={10} keyboardType="numbers-and-punctuation" />
          <InlineError message={rangeError} />
          <Button label="Apply dates" variant="tonal" compact onPress={applyCustom} />
        </View> : null}
        <AppText variant="caption" tone="secondary">
          {range.label} · {formatDate(range.start)} – {formatDate(range.end)} (Manila time)
        </AppText>
      </View>);
  return <ReportsContent key={range.start + '/' + range.end + '/' + year} range={range} year={year} setYear={setYear} now={now} filters={filters} />;
}

function ReportsContent({ range, year, setYear, now, filters }: {
  range: DateRange; year: number; setYear: Dispatch<SetStateAction<number>>;
  now: { year: number; month: number }; filters: ReactNode;
}) {
  const summary = useResource(() => getReportSummary(range.start, range.end), [range.start, range.end]);
  const monthly = useResource(() => getMonthlyCollections(year), [year]);

  const s = summary.data;
  const statusRows = (['pending', 'in_progress', 'completed', 'released', 'cancelled'] as RepairStatus[]).map((st) => ({
    key: st,
    label: STATUS_LABEL[st],
    count: s ? { pending: s.pending, in_progress: s.inProgress, completed: s.completed, released: s.released, cancelled: s.cancelled }[st] : 0,
    color: STATUS_LOOK[st].fg,
    icon: <Ionicons name={STATUS_LOOK[st].icon} size={16} color={STATUS_LOOK[st].fg} />,
  }));
  const yearTotal = monthly.data?.reduce((sum, m) => sum + m.collectionsCentavos, 0) ?? 0;

  return (
    <Screen
      withTabBar
      withTopInset
      refreshing={summary.refreshing || monthly.refreshing}
      onRefresh={() => {
        void summary.refresh();
        void monthly.refresh();
      }}>
      <AppText variant="title" accessibilityRole="header">
        Reports
      </AppText>

      {filters}

      {summary.error && !s ? (
        <ErrorState error={summary.error} onRetry={summary.reload} />
      ) : (
        <>
          <Card style={styles.collect}>
            <AppText variant="label" tone="secondary">
              Collections
            </AppText>
            {s ? (
              <AppText variant="moneyLarge" style={styles.big}>
                {formatPeso(s.collectionsCentavos)}
              </AppText>
            ) : (
              <Skeleton style={{ width: 160, height: 32 }} />
            )}
            <AppText variant="caption" tone="secondary">
              {s ? `${s.paymentCount} ${s.paymentCount === 1 ? 'payment' : 'payments'} received. ` : ''}

            </AppText>
          </Card>

          <View style={styles.metrics}>
            <Card style={styles.metric}><AppText variant="caption" tone="secondary">Total Repairs</AppText><AppText variant="title">{s?.total ?? '—'}</AppText></Card>
            <Card style={styles.metric}><AppText variant="caption" tone="secondary">Completed / Released</AppText><AppText variant="title">{s ? s.completed + s.released : '—'}</AppText></Card>
          </View>
          <Section title="Repair status">
            <Card style={styles.gap}>
              <StatusBars rows={statusRows} />
              <AppText variant="caption" tone="tertiary">
                Current status of repairs received in this period, including cancelled ones.
              </AppText>
            </Card>
          </Section>
        </>
      )}

      <Section
        title="Monthly collections"
        action={
          <View style={styles.yearStepper}>
            <PressableScale onPress={() => setYear((y) => y - 1)} accessibilityRole="button" accessibilityLabel="Previous year" style={styles.stepBtn}>
              <Ionicons name="chevron-back" size={20} color={Colors.ink} />
            </PressableScale>
            <AppText variant="number" accessibilityLabel={`Year ${year}`}>
              {year}
            </AppText>
            <PressableScale
              onPress={() => setYear((y) => y + 1)}
              disabled={year >= now.year}
              accessibilityRole="button"
              accessibilityLabel="Next year"
              accessibilityState={{ disabled: year >= now.year }}
              style={[styles.stepBtn, year >= now.year && styles.stepDisabled]}>
              <Ionicons name="chevron-forward" size={20} color={Colors.ink} />
            </PressableScale>
          </View>
        }>
        <Card style={styles.gap}>
          {monthly.error && !monthly.data ? (
            <ErrorState error={monthly.error} onRetry={monthly.reload} />
          ) : monthly.data ? (
            <>
              <View style={styles.totalRow}>
                <AppText variant="body" tone="secondary">
                  Total for {year}
                </AppText>
                <AppText variant="money">{formatPeso(yearTotal)}</AppText>
              </View>
              <MonthlyChart key={year} data={monthly.data} currentMonth={year === now.year ? now.month : null} />
            </>
          ) : (
            <Skeleton style={{ height: 200 }} />
          )}
        </Card>
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  metric: { flex: 1, minWidth: 120, gap: Spacing.sm },
  periodBlock: { gap: Spacing.sm },
  collect: { gap: Spacing.xs, backgroundColor: Colors.panel, borderColor: Colors.panelStrong },
  big: { fontSize: 28, lineHeight: 36 },
  gap: { gap: Spacing.md },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  yearStepper: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  stepBtn: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  stepDisabled: { opacity: 0.3 },
});
