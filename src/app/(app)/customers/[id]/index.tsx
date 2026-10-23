import { ArchiveAction } from '@/features/archives/components/archive-action';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card, Screen, Section } from '@/components/ui/layout';
import { PressableScale } from '@/components/ui/pressable-scale';
import { EmptyState, ErrorState, ListSkeleton } from '@/components/ui/states';
import { AppText } from '@/components/ui/text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { getCustomer, listDevices, type Device } from '@/features/customers/api';
import { initialsOf } from '@/features/customers/components/customer-row';
import { listCustomerRepairs } from '@/features/repairs/api';
import { RepairRow } from '@/features/repairs/components/repair-row';
import { useResource } from '@/hooks/use-resource';
import { displayAddress, displayContact } from '@/lib/display';

export default function CustomerDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const data = useResource(async () => {
    const [customer, devices, repairs] = await Promise.all([getCustomer(id), listDevices(id), listCustomerRepairs(id)]);
    return { customer, devices, repairs };
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

  const { customer, devices, repairs } = data.data;
  const repairCount = (deviceId: string) => repairs.filter((r) => r.device_id === deviceId).length;

  return (
    <Screen refreshing={data.refreshing} onRefresh={data.refresh}>
      <View style={{ alignItems: 'flex-end' }}><ArchiveAction kind="customer" id={id} archived={!!customer.archived_at} onDone={data.reload} /></View>
      <Card style={styles.profile}>
        <View style={styles.profileTop}>
          <View style={styles.avatar}>
            <AppText variant="headline" tone="brand">
              {initialsOf(customer.full_name)}
            </AppText>
          </View>
          <View style={styles.flex}>
            <AppText variant="title" accessibilityRole="header">
              {customer.full_name}
            </AppText>
            <View style={styles.line}>
              <Ionicons name="call-outline" size={16} color={Colors.inkSecondary} />
              <AppText variant="body" tone="secondary" selectable>
                {displayContact(customer.contact_number)}
              </AppText>
            </View>
            {displayAddress(customer.address) ? (
              <View style={styles.line}>
                <Ionicons name="location-outline" size={16} color={Colors.inkSecondary} />
                <AppText variant="body" tone="secondary" style={styles.flex}>
                  {customer.address}
                </AppText>
              </View>
            ) : null}
          </View>
        </View>
        <View style={styles.actions}>
          <Button
            label="Edit"
            icon="create-outline"
            variant="outline"
            compact
            style={styles.flex}
            onPress={() => router.push({ pathname: '/customers/[id]/edit', params: { id } })}
            accessibilityLabel="Edit customer"
          />
          <Button
            label="New repair"
            disabled={!!customer.archived_at}
            icon="add"
            compact
            style={styles.flex}
            onPress={() => router.push({ pathname: '/repairs/new', params: { customerId: id } })}
            accessibilityLabel={`New repair for ${customer.full_name}`}
          />
        </View>
      </Card>

      <Section
        title={`Devices (${devices.length})`}
        action={
          <Button
            label="Add device"
            icon="add"
            variant="ghost"
            compact
            onPress={() => router.push({ pathname: '/customers/[id]/devices/new', params: { id } })}
          />
        }>
        {devices.length === 0 ? (
          <EmptyState
            icon="laptop-outline"
            title="No devices yet"
            message="Add the laptop, desktop, or printer this customer brings in."
            actionLabel="Add device"
            onAction={() => router.push({ pathname: '/customers/[id]/devices/new', params: { id } })}
          />
        ) : (
          <View style={styles.list}>
            {devices.map((d) => (
              <DeviceCard key={d.id} device={d} repairs={repairCount(d.id)} customerId={id} archived={!!customer.archived_at} />
            ))}
          </View>
        )}
      </Section>

      <Section title={`Repair history (${repairs.length})`}>
        {repairs.length === 0 ? (
          <AppText variant="body" tone="secondary">
            No repairs recorded for this customer yet.
          </AppText>
        ) : (
          <View style={styles.list}>
            {repairs.map((r) => (
              <RepairRow key={r.id} repair={r} />
            ))}
          </View>
        )}
      </Section>
    </Screen>
  );
}

function DeviceCard({ device, repairs, customerId, archived }: { device: Device; repairs: number; customerId: string; archived: boolean }) {
  return (
    <View style={styles.device}>
      <View style={styles.deviceIcon}>
        <Ionicons name={/printer/i.test(device.device_type) ? 'print-outline' : /desktop|pc/i.test(device.device_type) ? 'desktop-outline' : 'laptop-outline'} size={22} color={Colors.primary} />
      </View>
      <View style={styles.flex}>
        <AppText variant="bodyStrong" numberOfLines={1}>
          {device.brand} {device.model}
        </AppText>
        <AppText variant="caption" tone="secondary" numberOfLines={1}>
          {device.device_type}
        </AppText>
        <AppText variant="caption" tone="tertiary">
          {repairs === 0 ? 'No repairs yet' : `${repairs} ${repairs === 1 ? 'repair' : 'repairs'}`}
        </AppText>
      </View>
      <PressableScale
        onPress={() => router.push({ pathname: '/devices/[id]/edit', params: { id: device.id } })}
        accessibilityRole="button"
        accessibilityLabel={`Edit ${device.brand} ${device.model}`}
        style={styles.iconBtn}>
        <Ionicons name="create-outline" size={20} color={Colors.inkSecondary} />
      </PressableScale>
      <PressableScale
        onPress={() => router.push({ pathname: '/repairs/new', params: { customerId, deviceId: device.id } })}
        accessibilityRole="button"
        disabled={archived}
        accessibilityState={{ disabled: archived }}
        accessibilityHint={archived ? 'Restore this customer before adding a repair' : undefined}
        accessibilityLabel={`New repair for ${device.brand} ${device.model}`}
        style={[styles.iconBtn, styles.iconBtnPrimary, archived && { opacity: 0.4 }]}>
        <Ionicons name="construct-outline" size={20} color={Colors.primaryPressed} />
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  profile: { gap: Spacing.lg },
  profileTop: { flexDirection: 'row', gap: Spacing.lg, alignItems: 'flex-start' },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  line: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs + 2, marginTop: 4 },
  actions: { flexDirection: 'row', gap: Spacing.md },
  list: { gap: Spacing.md },
  device: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    paddingLeft: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  deviceIcon: {
    width: 42,
    height: 42,
    borderRadius: Radius.sm,
    backgroundColor: Colors.panel,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtn: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  iconBtnPrimary: { backgroundColor: Colors.primarySoft },
});
