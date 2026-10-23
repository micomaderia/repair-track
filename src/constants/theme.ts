import { Platform, type TextStyle, type ViewStyle } from 'react-native';

/**
 * RepairTrack design tokens. Light theme only (v1).
 * Navy ink on near-white, one primary blue, lavender reserved for the raised
 * New Repair action, selection, and the active lifecycle node.
 */
export const Colors = {
  background: '#F4F6FC',
  surface: '#FFFFFF',
  panel: '#E9EFFD',
  panelStrong: '#DCE5FB',
  lavenderSoft: '#EEEAFE',
  neutralSoft: '#ECEEF5',

  ink: '#13204A',
  inkSecondary: '#46527A',
  inkTertiary: '#5F6A8E',
  inkInverse: '#FFFFFF',

  primary: '#2753E0',
  primaryPressed: '#1D43BE',
  primarySoft: '#E3EAFF',
  lavender: '#7A68EE',
  lavenderDeep: '#5440CF',

  border: '#DCE2F2',
  borderStrong: '#BFC9E6',
  focus: '#2753E0',

  danger: '#BE2638',
  dangerSoft: '#FDE8EB',
  success: '#157347',
  successSoft: '#E0F4E9',
  warning: '#875300',
  warningSoft: '#FFF1D2',

  scrim: 'rgba(19, 32, 74, 0.38)',
  skeleton: '#E4E9F6',
} as const;

export const Spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
} as const;

export const Radius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 26,
  pill: 999,
} as const;

/** Minimum interactive size (Android 48dp, iOS 44pt). */
export const TouchTarget = 48;

export const MaxContentWidth = 640;

const fontFamily = Platform.select({ ios: 'System', android: 'sans-serif', default: undefined });
const mediumFamily = Platform.select({ android: 'sans-serif-medium', default: fontFamily });

const tabular: TextStyle = { fontVariant: ['tabular-nums'] };

export const Type = {
  display: { fontFamily, fontSize: 28, lineHeight: 34, fontWeight: '700', letterSpacing: -0.4 },
  title: { fontFamily, fontSize: 22, lineHeight: 28, fontWeight: '700', letterSpacing: -0.2 },
  headline: { fontFamily: mediumFamily, fontSize: 18, lineHeight: 24, fontWeight: '600' },
  body: { fontFamily, fontSize: 16, lineHeight: 23, fontWeight: '400' },
  bodyStrong: { fontFamily: mediumFamily, fontSize: 16, lineHeight: 23, fontWeight: '600' },
  label: { fontFamily: mediumFamily, fontSize: 14, lineHeight: 19, fontWeight: '600' },
  caption: { fontFamily, fontSize: 13, lineHeight: 18, fontWeight: '400' },
  small: { fontFamily: mediumFamily, fontSize: 12, lineHeight: 16, fontWeight: '600' },
  money: { fontFamily: mediumFamily, fontSize: 16, lineHeight: 22, fontWeight: '600', ...tabular },
  moneyLarge: { fontFamily, fontSize: 26, lineHeight: 32, fontWeight: '700', letterSpacing: -0.3, ...tabular },
  number: { fontFamily: mediumFamily, fontSize: 15, lineHeight: 20, fontWeight: '700', letterSpacing: 0.2, ...tabular },
} satisfies Record<string, TextStyle>;

export type TypeVariant = keyof typeof Type;

export const Shadow = {
  card: { boxShadow: '0px 4px 14px rgba(27, 42, 107, 0.07)' },
  raised: { boxShadow: '0px 8px 22px rgba(27, 42, 107, 0.12)' },
  action: { boxShadow: '0px 8px 18px rgba(84, 64, 207, 0.34)' },
} satisfies Record<string, ViewStyle>;

/** Motion budget: 120–220ms, ease-out, no long staggers. */
export const Motion = {
  fast: 120,
  base: 180,
  slow: 220,
} as const;
