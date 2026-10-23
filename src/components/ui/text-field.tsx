import { useState, type ComponentRef, type ReactNode, type Ref } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { Colors, Radius, Spacing, Type } from '@/constants/theme';

import { AppText } from './text';

type Props = Omit<TextInputProps, 'style'> & {
  label: string;
  error?: string;
  hint?: string;
  optional?: boolean;
  prefix?: string;
  /** Trailing control inside the field, e.g. a visibility toggle. */
  accessory?: ReactNode;
  ref?: Ref<ComponentRef<typeof TextInput>>;
};

/** Persistent-label input with inline error and hint text. */
export function TextField({ label, error, hint, optional, prefix, accessory, multiline, editable = true, ref, onFocus, onBlur, ...rest }: Props) {
  const [focused, setFocused] = useState(false);
  const borderColor = error ? Colors.danger : focused ? Colors.focus : Colors.border;

  return (
    <View style={styles.wrap}>
      <AppText variant="label" tone="secondary" nativeID={`${label}-label`}>
        {label}
        {optional ? <AppText variant="caption" tone="tertiary">  Optional</AppText> : null}
      </AppText>
      <View
        style={[
          styles.field,
          multiline && styles.multiline,
          { borderColor },
          !editable && styles.readonly,
        ]}>
        {prefix ? (
          <AppText variant="bodyStrong" tone="secondary" style={styles.prefix}>
            {prefix}
          </AppText>
        ) : null}
        <TextInput
          underlineColorAndroid="transparent"
          ref={ref}
          accessibilityLabel={label}
          accessibilityHint={error ?? hint}
          editable={editable}
          multiline={multiline}
          placeholderTextColor={Colors.inkTertiary}
          selectionColor={Colors.primary}
          cursorColor={Colors.primary}
          textAlignVertical={multiline ? 'top' : 'center'}
          maxFontSizeMultiplier={1.6}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[styles.input, multiline && styles.inputMultiline]}
          {...rest}
        />
        {accessory}
      </View>
      {error ? (
        <AppText variant="caption" tone="danger" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : hint ? (
        <AppText variant="caption" tone="tertiary">
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.xs + 2 },
  field: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md + 2,
    borderWidth: 1.5,
  },
  multiline: { alignItems: 'flex-start', minHeight: 104, paddingVertical: Spacing.sm },
  readonly: { backgroundColor: Colors.background },
  prefix: { marginRight: Spacing.xs },
  input: {
    flex: 1,
    ...Type.body,
    color: Colors.ink,
    paddingVertical: Spacing.md,
    minHeight: 48,
    // The field border carries focus; suppress the browser's inner outline on web.
    outlineWidth: 0,
    borderWidth: 0,
    minWidth: 0,
  },
  inputMultiline: { minHeight: 88, paddingTop: Spacing.sm },
});
