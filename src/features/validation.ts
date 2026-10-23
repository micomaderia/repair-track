import { z } from 'zod';

import { isValidDateKey } from '../lib/dates';
import { parseAmount } from '../lib/money';

/** Shared form schemas. The database enforces the same limits. */

const required = (label: string, max: number) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required.`)
    .max(max, `${label} must be ${max} characters or fewer.`);

const optional = (label: string, max: number) =>
  z.string().trim().max(max, `${label} must be ${max} characters or fewer.`);

const contactNumber = z
  .string()
  .trim()
  .min(1, 'Contact number is required.')
  .max(32, 'Contact number must be 32 characters or fewer.')
  .regex(/^[0-9A-Za-z+()\-\s.]+$/, 'Use digits, spaces, +, -, or parentheses.');

/** Optional money field: '' means not given. */
export const optionalAmount = z.string().superRefine((value, ctx) => {
  if (value.trim() === '') return;
  const parsed = parseAmount(value);
  if (!parsed.ok) ctx.addIssue({ code: 'custom', message: parsed.reason });
});

export const requiredAmount = z.string().superRefine((value, ctx) => {
  const parsed = parseAmount(value);
  if (!parsed.ok) ctx.addIssue({ code: 'custom', message: parsed.reason });
});

export const positiveAmount = z.string().superRefine((value, ctx) => {
  const parsed = parseAmount(value);
  if (!parsed.ok) ctx.addIssue({ code: 'custom', message: parsed.reason });
  else if (parsed.centavos <= 0) ctx.addIssue({ code: 'custom', message: 'Amount must be greater than zero.' });
});

export function amountOrNull(value: string): number | null {
  if (value.trim() === '') return null;
  const parsed = parseAmount(value);
  return parsed.ok ? parsed.centavos : null;
}

const optionalDateKey = z
  .string()
  .trim()
  .refine((v) => v === '' || isValidDateKey(v), 'Use the format YYYY-MM-DD.');

export const loginSchema = z.object({
  email: z.string().trim().min(1, 'Email is required.').email('Enter a valid email address.'),
  password: z.string().min(1, 'Password is required.'),
});
export type LoginValues = z.infer<typeof loginSchema>;

export const signupSchema = loginSchema.extend({
  fullName: required('Full name', 120),
  shopName: required('Shop name', 120),
  password: z.string().min(8, 'Use at least 8 characters.').max(128, 'Use 128 characters or fewer.'),
  confirmPassword: z.string(),
}).refine((v) => v.password === v.confirmPassword, {
  path: ['confirmPassword'], message: 'Passwords do not match.',
});
export type SignupValues = z.infer<typeof signupSchema>;

export const customerSchema = z.object({
  fullName: required('Full name', 120),
  contactNumber,
  address: optional('Address', 300),
});
export type CustomerValues = z.infer<typeof customerSchema>;

export const deviceSchema = z.object({
  deviceType: required('Device type', 60),
  brand: required('Brand', 100),
  model: required('Model', 100),
  serialNumber: optional('Serial number', 120),
});
export type DeviceValues = z.infer<typeof deviceSchema>;

export const repairDetailsSchema = z
  .object({
    reportedProblem: required('Reported problem', 2000),
    serviceDiagnosis: optional('Service / diagnosis', 2000),
    estimatedAmount: optionalAmount,
    finalAmount: optionalAmount,
    receivedDate: z
      .string()
      .trim()
      .refine(isValidDateKey, 'Use the format YYYY-MM-DD.'),
    expectedReleaseDate: optionalDateKey,
    notes: optional('Notes', 2000),
  })
  .superRefine((v, ctx) => {
    if (v.expectedReleaseDate && isValidDateKey(v.receivedDate) && v.expectedReleaseDate < v.receivedDate) {
      ctx.addIssue({
        code: 'custom',
        path: ['expectedReleaseDate'],
        message: 'Expected release cannot be before the date received.',
      });
    }
  });
export type RepairDetailsValues = z.infer<typeof repairDetailsSchema>;

/** Validates a received date against "today" in Manila. */
export function receivedDateError(receivedDate: string, todayKey: string): string | null {
  if (!isValidDateKey(receivedDate)) return 'Use the format YYYY-MM-DD.';
  if (receivedDate > todayKey) return 'Date received cannot be in the future.';
  return null;
}

export const repairEditSchema = z.object({
  reportedProblem: required('Reported problem', 2000),
  serviceDiagnosis: optional('Service / diagnosis', 2000),
  estimatedAmount: optionalAmount,
  expectedReleaseDate: optionalDateKey,
  notes: optional('Notes', 2000),
});
export type RepairEditValues = z.infer<typeof repairEditSchema>;

export const finalAmountSchema = z.object({ finalAmount: requiredAmount });
export type FinalAmountValues = z.infer<typeof finalAmountSchema>;

export const cancelSchema = z.object({ reason: required('Reason', 500) });
export type CancelValues = z.infer<typeof cancelSchema>;

export const paymentSchema = z.object({
  amount: positiveAmount,
  method: z.enum(['cash', 'gcash', 'bank_transfer']),
  reference: optional('Reference', 100),
});
export type PaymentValues = z.infer<typeof paymentSchema>;

/** Payment amount check against the live balance (server re-checks under lock). */
export function paymentAmountError(amount: string, balanceCentavos: number): string | null {
  const parsed = parseAmount(amount);
  if (!parsed.ok) return parsed.reason;
  if (parsed.centavos <= 0) return 'Amount must be greater than zero.';
  if (parsed.centavos > balanceCentavos) return 'Amount is more than the remaining balance.';
  return null;
}

export const shopSettingsSchema = z.object({
  displayName: required('Full name', 120),
  shopName: required('Shop name', 120),
  contactNumber: optional('Contact number', 32),
  address: optional('Address', 300),
  receiptFooter: optional('Receipt footer', 300),
});
export type ShopSettingsValues = z.infer<typeof shopSettingsSchema>;

/** Empty string -> null for optional database columns. */
export function blankToNull(value: string | undefined | null): string | null {
  const trimmed = value?.trim() ?? '';
  return trimmed === '' ? null : trimmed;
}
