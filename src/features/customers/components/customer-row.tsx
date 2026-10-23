import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { PressableScale } from '@/components/ui/pressable-scale';
import { AppText } from '@/components/ui/text';
import { Colors, Radius, Shadow, Spacing } from '@/constants/theme';

import type { Customer } from '../api';
import { displayAddress, displayContact } from '@/lib/display';

export function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

export function CustomerRow({
  customer,
  onPress,
  selected,
  hint = 'Opens customer details',
}: {
  customer: Customer;
  onPress: () => void;
  selected?: boolean;
  hint?: string;
}) {
  return (
    <PressableScale
      pressedScale={0.985}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={selected !== undefined ? { selected } : undefined}
      accessibilityLabel={`${customer.full_name}, ${displayContact(customer.contact_number)}`}
      accessibilityHint={hint}
      style={[styles.row, Shadow.card, selected && styles.selected]}>
      <View style={[styles.avatar, selected && styles.avatarSelected]}>
        <AppText variant="label" tone={selected ? 'inverse' : 'brand'}>
          {initialsOf(customer.full_name)}
        </AppText>
      </View>
      <View style={styles.flex}>
        <AppText variant="bodyStrong" numberOfLines={1}>
          {customer.full_name}
        </AppText>
        <AppText variant="caption" tone="secondary" numberOfLines={1}>
          {displayContact(customer.contact_number)}
          {displayAddress(customer.address) ? ` · ${customer.address}` : ''}
        </AppText>
      </View>
      {selected ? (
        <Ionicons name="checkmark-circle" size={22} color={Colors.lavender} />
      ) : (
        <Ionicons name="chevron-forward" size={18} color={Colors.inkTertiary} />
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    minHeight: 64,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.surface,
  },
  selected: { borderColor: Colors.lavender, borderWidth: 1.5, backgroundColor: Colors.lavenderSoft },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarSelected: { backgroundColor: Colors.lavender },
});
