/**
 * Shop dates follow Asia/Manila (UTC+8, no daylight saving). These helpers do
 * the offset math explicitly so results never depend on the device time zone.
 */

const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

type LocalParts = { year: number; month: number; day: number; hour: number; minute: number };

function manilaParts(instant: Date): LocalParts {
  const shifted = new Date(instant.getTime() + MANILA_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
  };
}

const pad = (n: number) => n.toString().padStart(2, '0');

/** "YYYY-MM-DD" for the Manila calendar day containing `instant`. */
export function toManilaDateKey(instant: Date = new Date()): string {
  const p = manilaParts(instant);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

export function isValidDateKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

/** Adds whole days to a date key. */
export function addDays(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

/** Manila wall-clock time on `dateKey` as an ISO instant. */
export function manilaDateTimeToIso(dateKey: string, hour = 9, minute = 0): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, hour, minute) - MANILA_OFFSET_MS).toISOString();
}

function parse(value: string | Date): Date {
  if (value instanceof Date) return value;
  // Date-only values are calendar days, not instants.
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date(manilaDateTimeToIso(value, 12));
  return new Date(value);
}

/** "Oct 22, 2026" */
export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const p = manilaParts(parse(value));
  return `${MONTHS[p.month - 1]} ${p.day}, ${p.year}`;
}

/** "Oct 22, 2026, 3:05 PM" */
export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const p = manilaParts(parse(value));
  const hour12 = p.hour % 12 === 0 ? 12 : p.hour % 12;
  return `${MONTHS[p.month - 1]} ${p.day}, ${p.year}, ${hour12}:${pad(p.minute)} ${p.hour < 12 ? 'AM' : 'PM'}`;
}

export type DateRange = { start: string; end: string; label: string };

export function monthRange(year: number, month: number): DateRange {
  const start = `${year}-${pad(month)}-01`;
  const end = addDays(month === 12 ? `${year + 1}-01-01` : `${year}-${pad(month + 1)}-01`, -1);
  return { start, end, label: `${MONTH_NAMES[month - 1]} ${year}` };
}

export function currentManilaYearMonth(now: Date = new Date()): { year: number; month: number } {
  const p = manilaParts(now);
  return { year: p.year, month: p.month };
}

export type ReportPeriod = 'this_month' | 'last_month' | 'this_year' | 'last_30_days';

export function periodRange(period: ReportPeriod, now: Date = new Date()): DateRange {
  const { year, month } = currentManilaYearMonth(now);
  const today = toManilaDateKey(now);
  switch (period) {
    case 'this_month':
      return { ...monthRange(year, month), end: today };
    case 'last_month':
      return month === 1 ? monthRange(year - 1, 12) : monthRange(year, month - 1);
    case 'this_year':
      return { start: `${year}-01-01`, end: today, label: `${year} to date` };
    case 'last_30_days':
      return { start: addDays(today, -29), end: today, label: 'Last 30 days' };
  }
}
