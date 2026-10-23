import { Text, type TextProps } from 'react-native';

import { Colors, Type, type TypeVariant } from '@/constants/theme';

export type TextTone = 'primary' | 'secondary' | 'tertiary' | 'inverse' | 'brand' | 'danger' | 'success' | 'lavender';

const toneColor: Record<TextTone, string> = {
  primary: Colors.ink,
  secondary: Colors.inkSecondary,
  tertiary: Colors.inkTertiary,
  inverse: Colors.inkInverse,
  brand: Colors.primary,
  danger: Colors.danger,
  success: Colors.success,
  lavender: Colors.lavenderDeep,
};

type Props = TextProps & { variant?: TypeVariant; tone?: TextTone };

export function AppText({ variant = 'body', tone = 'primary', style, maxFontSizeMultiplier = 1.6, ...rest }: Props) {
  return (
    <Text
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      style={[Type[variant], { color: toneColor[tone] }, style]}
      {...rest}
    />
  );
}
