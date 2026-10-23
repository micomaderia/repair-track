/**
 * Money is stored and transported as integer centavos. Parsing and formatting
 * work on strings so no floating-point arithmetic touches amounts.
 */

export const MAX_CENTAVOS = 999_999_999; // PHP 9,999,999.99

const AMOUNT_PATTERN = /^\d{1,7}(\.\d{0,2})?$/;

export type ParseResult = { ok: true; centavos: number } | { ok: false; reason: string };

/** Parses operator input like "1,250.5" into centavos (125050). */
export function parseAmount(input: string): ParseResult {
  const cleaned = input.replace(/[,\s₱]/g, '').replace(/^PHP/i, '');
  if (cleaned === '') return { ok: false, reason: 'Enter an amount.' };
  if (cleaned.startsWith('-')) return { ok: false, reason: 'Amount cannot be negative.' };
  if (/^\d+\.\d{3,}$/.test(cleaned)) return { ok: false, reason: 'Use at most two decimal places.' };
  if (!AMOUNT_PATTERN.test(cleaned)) return { ok: false, reason: 'Enter a valid amount, e.g. 1,250.00.' };

  const [whole, fraction = ''] = cleaned.split('.');
  const centavos = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(centavos) || centavos > MAX_CENTAVOS) {
    return { ok: false, reason: 'Amount is too large.' };
  }
  return { ok: true, centavos };
}

function groupThousands(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** 125050 -> "₱1,250.50" */
export function formatPeso(centavos: number | null | undefined): string {
  if (centavos === null || centavos === undefined || !Number.isFinite(centavos)) return '—';
  const negative = centavos < 0;
  const abs = Math.abs(Math.trunc(centavos));
  const whole = Math.floor(abs / 100).toString();
  const fraction = (abs % 100).toString().padStart(2, '0');
  return `${negative ? '-' : ''}₱${groupThousands(whole)}.${fraction}`;
}

/** 125050 -> "1250.50" for prefilling inputs. */
export function centavosToInput(centavos: number | null | undefined): string {
  if (centavos === null || centavos === undefined) return '';
  const whole = Math.floor(centavos / 100);
  const fraction = centavos % 100;
  return fraction === 0 ? String(whole) : `${whole}.${fraction.toString().padStart(2, '0')}`;
}
