import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Colors, Radius, Spacing, Type } from '@/constants/theme';

export function SearchField({
  value,
  onChangeText,
  placeholder,
  accessibilityLabel,
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  accessibilityLabel: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[styles.field, focused && styles.focused]}>
      <Ionicons name="search" size={20} color={Colors.inkTertiary} />
      <TextInput
        underlineColorAndroid="transparent"
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.inkTertiary}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="search"
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        selectionColor={Colors.primary}
        cursorColor={Colors.primary}
        maxFontSizeMultiplier={1.6}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={styles.input}
      />
      {value ? (
        <Pressable
          onPress={() => onChangeText('')}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          style={styles.clear}>
          <Ionicons name="close-circle" size={20} color={Colors.inkTertiary} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    minHeight: 50,
    paddingLeft: Spacing.md + 2,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  focused: { borderColor: Colors.focus },
  input: { flex: 1, minWidth: 0, borderWidth: 0, ...Type.body, color: Colors.ink, paddingVertical: Spacing.md, minHeight: 48, outlineWidth: 0 },
  clear: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
});
