import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { FadeInDown, ReduceMotion } from 'react-native-reanimated';

import { Screen, Section } from '@/components/ui/layout';
import { PressableScale } from '@/components/ui/pressable-scale';
import { EmptyState, ErrorState, ListSkeleton, Skeleton } from '@/components/ui/states';
import { AppText } from '@/components/ui/text';
import { Colors, Motion, Shadow, Spacing } from '@/constants/theme';
import { deviceSummary, paymentStatusOf, searchRepairs, type RepairOverview } from '@/features/repairs/api';
import { STATUS_LOOK, StatusBadge } from '@/features/repairs/components/badges';
import { STATUS_LABEL, PAYMENT_STATUS_LABEL, type RepairStatus } from '@/features/repairs/status';
import { getDashboardSummary, type DashboardSummary } from '@/features/reports/api';
import { useResource } from '@/hooks/use-resource';
import { formatDate } from '@/lib/dates';
import { formatPeso } from '@/lib/money';

const enter = (delay = 0) => FadeInDown.duration(Motion.base).delay(delay).reduceMotion(ReduceMotion.System);

export default function HomeScreen() {
  const home = useResource(
    async () => {
      const [summary, recent] = await Promise.all([getDashboardSummary(), searchRepairs({ limit: 5 })]);
      return { summary, recent };
    },
    [],
  );

  return (
    <Screen withTabBar withTopInset refreshing={home.refreshing} onRefresh={home.refresh}>
      <View style={styles.header}>
        <Image source={require('@/assets/images/logo/repairtrack-logoname.png')} style={styles.wordmark}
          contentFit="contain" accessibilityLabel="RepairTrack" accessibilityRole="header" />
        <PressableScale onPress={() => router.push('/settings')} accessibilityRole="button"
          accessibilityLabel="Settings" style={styles.settings}>
          <Ionicons name="settings-outline" size={22} color={Colors.ink} />
        </PressableScale>
      </View>

      {home.error && !home.data ? <ErrorState error={home.error} onRetry={home.reload} /> : <>
        <Animated.View entering={enter()}>
          <FeatureBanner summary={home.data?.summary} />
        </Animated.View>

        <View style={styles.statusRow} accessibilityLabel="Repair status overview">
          <StageCard status="pending" count={home.data?.summary.pending} delay={20} />
          <StageCard status="in_progress" count={home.data?.summary.inProgress} delay={40} />
          <StageCard status="completed" count={home.data?.summary.completed} delay={60} />
        </View>

        <Section title="Recent Repairs" action={
          <PressableScale onPress={() => router.navigate('/repairs')} accessibilityRole="link"
            accessibilityLabel="View all repairs" style={styles.link}>
            <AppText variant="label" tone="brand">View All</AppText>
            <Ionicons name="arrow-forward" size={16} color={Colors.primary} />
          </PressableScale>
        }>
          {home.loading ? <ListSkeleton rows={3} /> : home.data?.recent.length === 0 ? <EmptyState
            icon="construct-outline" title="No repairs yet" message="Your recent repairs will appear here."
            actionLabel="Start a repair" onAction={() => router.push('/repairs/new')} /> : <View style={styles.list}>
            {home.data?.recent.map((repair, i) => <Animated.View key={repair.id} entering={enter(i * 20)}>
              <RecentRepairCard repair={repair} />
            </Animated.View>)}
          </View>}
        </Section>
      </>}
    </Screen>
  );
}

function FeatureBanner({ summary }: { summary?: DashboardSummary }) {
  const { fontScale } = useWindowDimensions();
  const active = summary ? summary.pending + summary.inProgress + summary.completed : undefined;
  return <View style={styles.banner}>
    <View style={styles.bannerDecoration} pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants">
      <View style={styles.orbitOuter} /><View style={styles.orbitInner} /><View style={styles.bannerHighlight} />
    </View>
    <View style={styles.bannerTop}>
      <View style={styles.bannerCopy}>
        <AppText variant="title" style={styles.bannerTitle} accessibilityRole="header">Keep Devices Running Smoothly</AppText>
        <AppText variant="caption" style={styles.bannerSubtitle}>Track repairs and manage your shop in one place.</AppText>
      </View>
      {fontScale < 1.3 ? <View style={styles.deviceArt} pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants">
        <View style={styles.deviceTile}><Ionicons name="laptop-outline" size={54} color="#FFFFFF" /></View>
        <View style={styles.toolTile}><Ionicons name="build" size={22} color="#FFFFFF" /></View>
        <View style={styles.serviceDot}><Ionicons name="checkmark" size={13} color="#163D79" /></View>
      </View> : null}
    </View>
    <View style={[styles.bannerMetrics, fontScale >= 1.3 && styles.bannerMetricsStack]}>
      <View style={styles.metric} accessible accessibilityLabel={`Active repairs: ${active ?? 'loading'}`}>
        <View style={styles.metricLabel}>
          <Ionicons name="construct-outline" size={15} color="#E2E8FF" />
          <AppText variant="small" style={styles.metricCaption}>Active Repairs</AppText>
        </View>
        {active === undefined ? <Skeleton style={styles.metricSkeleton} /> : <AppText variant="moneyLarge" style={styles.metricNumber}>{active}</AppText>}
      </View>
      <View style={[styles.metricDivider, fontScale >= 1.3 && styles.metricDividerHorizontal]} />
      <View style={[styles.metric, styles.collections]} accessible
        accessibilityLabel={`Collected this month: ${summary ? formatPeso(summary.collectedThisMonthCentavos) : 'loading'}`}>
        <View style={styles.metricLabel}>
          <Ionicons name="wallet-outline" size={15} color="#E2E8FF" />
          <AppText variant="small" style={styles.metricCaption}>Collected This Month</AppText>
        </View>
        {summary ? <AppText variant="moneyLarge" adjustsFontSizeToFit minimumFontScale={0.75} numberOfLines={1} style={[styles.metricNumber, styles.collectionNumber]}>{formatPeso(summary.collectedThisMonthCentavos)}</AppText> : <Skeleton style={[styles.metricSkeleton, { width: 110 }]} />}
      </View>
    </View>
  </View>;
}

function StageCard({ status, count, delay }: { status: RepairStatus; count?: number; delay: number }) {
  const look = STATUS_LOOK[status];
  return <Animated.View entering={enter(delay)} style={styles.statusCell}>
    <PressableScale onPress={() => router.navigate({ pathname: '/repairs', params: { status } })}
      accessibilityRole="button" accessibilityLabel={`${STATUS_LABEL[status]}: ${count ?? 'loading'} repairs`}
      style={[styles.statusCard, { backgroundColor: look.bg }]}>
      <View style={[styles.statusDecoration, { borderColor: look.fg }]} pointerEvents="none" />
      <Ionicons name={look.icon} size={20} color={look.fg} />
      <AppText variant="small" style={[styles.statusLabel, { color: look.fg }]}>{STATUS_LABEL[status]}</AppText>
      {count === undefined ? <Skeleton style={{ width: 35, height: 28 }} /> : <AppText variant="title" style={[styles.statusCount, { color: look.fg }]}>{count}</AppText>}
    </PressableScale>
  </Animated.View>;
}

function RecentRepairCard({ repair }: { repair: RepairOverview }) {
  const status = repair.status ?? 'pending';
  const paymentStatus = paymentStatusOf(repair);
  const money = repair.final_amount_centavos === null
    ? repair.estimated_amount_centavos !== null ? `Est. ${formatPeso(repair.estimated_amount_centavos)}` : null
    : (repair.balance_centavos ?? 0) > 0 ? `${formatPeso(repair.balance_centavos)} due` : formatPeso(repair.final_amount_centavos);
  const label = [repair.transaction_number, repair.customer_name, deviceSummary(repair), STATUS_LABEL[status],
    PAYMENT_STATUS_LABEL[paymentStatus], money, `Received ${formatDate(repair.received_at)}`].filter(Boolean).join(', ');
  return <PressableScale onPress={() => router.push({ pathname: '/repairs/[id]', params: { id: repair.id ?? '' } })}
    pressedScale={0.985} accessibilityRole="button" accessibilityLabel={label} accessibilityHint="Opens repair details"
    style={[styles.repairCard, Shadow.card]}>
    <View style={styles.repairTop}>
      <AppText variant="number" tone="brand" style={styles.repairId}>{repair.transaction_number}</AppText>
      <StatusBadge status={status} />
    </View>
    <View style={styles.repairIdentity}>
      <View style={styles.flex}>
        <AppText variant="bodyStrong" numberOfLines={1}>{repair.customer_name}</AppText>
        <AppText variant="caption" tone="secondary" numberOfLines={1}>{deviceSummary(repair)}</AppText>
      </View>
      <Ionicons name="chevron-forward" size={19} color={Colors.inkTertiary} />
    </View>
    <View style={styles.repairFoot}>
      <AppText variant="caption" tone="tertiary">{formatDate(repair.received_at)}</AppText>
      {money ? <AppText variant="label" style={styles.repairAmount}>{money}</AppText> : null}
    </View>
  </PressableScale>;
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 50, gap: Spacing.lg },
  wordmark: { width: 174, height: 54, maxWidth: '72%' },
  settings: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' },
  banner: {
    backgroundColor: '#2446BD', backgroundImage: 'linear-gradient(120deg, #173DAB 0%, #3459D7 52%, #6B3EC1 100%)',
    borderRadius: 24, padding: Spacing.xl, gap: Spacing.xl, overflow: 'hidden',
  },
  bannerDecoration: { ...StyleSheet.absoluteFill },
  orbitOuter: { position: 'absolute', width: 232, height: 232, borderRadius: 116, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', right: -82, top: -80 },
  orbitInner: { position: 'absolute', width: 166, height: 166, borderRadius: 83, borderWidth: 24, borderColor: 'rgba(255,255,255,0.04)', right: -49, top: -47 },
  bannerHighlight: { position: 'absolute', width: 180, height: 180, borderRadius: 90, right: -90, bottom: -115, backgroundColor: 'rgba(215,195,255,0.10)' },
  bannerTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  bannerCopy: { flex: 1, minWidth: 0, gap: Spacing.sm },
  bannerTitle: { color: '#FFFFFF', fontSize: 22, lineHeight: 28 },
  bannerSubtitle: { color: '#E2E8FF', lineHeight: 19 },
  deviceArt: { width: 72, height: 100, alignItems: 'center', justifyContent: 'center' },
  deviceTile: { width: 78, height: 78, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.13)', transform: [{ rotate: '-9deg' }], alignItems: 'center', justifyContent: 'center' },
  toolTile: { position: 'absolute', right: -4, bottom: 2, width: 38, height: 38, borderRadius: 13, backgroundColor: '#8A67DF', transform: [{ rotate: '10deg' }], justifyContent: 'center', alignItems: 'center' },
  serviceDot: { position: 'absolute', left: -5, top: 4, width: 23, height: 23, borderRadius: 12, backgroundColor: '#CEEFEE', justifyContent: 'center', alignItems: 'center' },
  bannerMetrics: { flexDirection: 'row', alignItems: 'stretch', gap: Spacing.md, borderRadius: 16, backgroundColor: 'rgba(12,25,85,0.24)', padding: Spacing.md },
  bannerMetricsStack: { flexDirection: 'column' },
  metricDividerHorizontal: { width: '100%', height: 1 },
  metric: { flex: 1, minWidth: 0, gap: Spacing.sm, justifyContent: 'space-between' },
  collections: { flex: 1.55 },
  metricLabel: { flexDirection: 'row', alignItems: 'flex-start', gap: 5 },
  metricCaption: { color: '#E2E8FF', flex: 1, minWidth: 0, fontWeight: '500' },
  metricNumber: { color: '#FFFFFF', fontSize: 26, lineHeight: 33 },
  collectionNumber: { fontSize: 21, lineHeight: 33, flexShrink: 1 },
  metricDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.20)' },
  metricSkeleton: { width: 42, height: 30, opacity: 0.4 },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  statusCell: { flex: 1, minWidth: 88 },
  statusCard: { flex: 1, padding: Spacing.md, borderRadius: 16, minHeight: 112, gap: Spacing.sm, overflow: 'hidden' },
  statusDecoration: { position: 'absolute', width: 74, height: 74, borderRadius: 37, right: -40, top: -29, borderWidth: 12, opacity: 0.07 },
  statusLabel: { fontSize: 12, lineHeight: 17 },
  statusCount: { fontVariant: ['tabular-nums'], fontSize: 26, lineHeight: 31 },
  link: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 48, paddingLeft: Spacing.sm },
  list: { gap: Spacing.md },
  repairCard: { backgroundColor: Colors.surface, borderRadius: 16, padding: Spacing.lg, gap: 10 },
  repairTop: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
  repairId: { flexShrink: 1 },
  repairIdentity: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  repairFoot: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
  repairAmount: { fontVariant: ['tabular-nums'] },
});
