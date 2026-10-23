import { ScrollView, StyleSheet } from 'react-native';

import { Colors, Radius, Spacing } from '@/constants/theme';

import { PressableScale } from './pressable-scale';
import { AppText } from './text';

export type ChipOption<T extends string> = { value: T; label: string };

/** Horizontally scrolling single-select filter chips. */
export function FilterChips<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
}: {
  options: readonly ChipOption<T>[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel: string;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}>
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <PressableScale
            key={o.value}
            onPress={() => onChange(o.value)}
            hitSlop={{ top: 4, bottom: 4 }}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            style={[styles.chip, selected && styles.chipSelected]}>
            <AppText variant="label" style={{ color: selected ? Colors.inkInverse : Colors.inkSecondary }}>
              {o.label}
            </AppText>
          </PressableScale>
        );
      })}
    </ScrollView>
  );
}

/** Inline segmented choice (e.g. payment method). */
export function ChoiceGroup<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: readonly ChipOption<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <ScrollView
      horizontal
      scrollEnabled={false}
      contentContainerStyle={styles.choiceRow}
      accessibilityRole="radiogroup"
      accessibilityLabel={label}>
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <PressableScale
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            style={[styles.choice, selected && styles.choiceSelected]}>
            <AppText variant="label" style={{ color: selected ? Colors.lavenderDeep : Colors.inkSecondary }}>
              {o.label}
            </AppText>
          </PressableScale>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: Spacing.sm, paddingVertical: Spacing.xs },
  chip: {
    minHeight: 40,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
  },
  chipSelected: { backgroundColor: Colors.ink, borderColor: Colors.ink },
  choiceRow: { gap: Spacing.sm, flexGrow: 1 },
  choice: {
    flexGrow: 1,
    minHeight: 48,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceSelected: { borderColor: Colors.lavender, backgroundColor: Colors.lavenderSoft },
});
