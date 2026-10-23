/** Turns Supabase/network errors into short operator-facing messages. */

type ErrorLike = { message?: string; code?: string; details?: string | null; status?: number; name?: string };

export type AppErrorKind = 'network' | 'session' | 'permission' | 'not_found' | 'conflict' | 'validation' | 'unknown';

export class AppError extends Error {
  kind: AppErrorKind;
  constructor(kind: AppErrorKind, message: string) {
    super(message);
    this.kind = kind;
  }
}

const CONSTRAINT_MESSAGES: Record<string, string> = {
  repair_expected_after_received: 'Expected release cannot be before the date received.',
  repair_completion_requirements: 'Completed repairs need a service/diagnosis and a final amount.',
  devices_owner_id_customer_id_fkey: 'That customer is no longer available.',
  repair_transactions_owner_id_customer_id_device_id_fkey: 'The selected device does not belong to the selected customer.',
};

export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  const e = (error ?? {}) as ErrorLike;
  const message = e.message ?? String(error ?? 'Something went wrong.');

  if (
    e.name === 'TypeError' ||
    /network request failed|failed to fetch|fetch failed|load failed|networkerror/i.test(message)
  ) {
    return new AppError('network', 'No connection. Check your internet and try again.');
  }
  if (e.code === 'PGRST301' || e.code === '28000' || /jwt expired|invalid jwt|refresh token/i.test(message)) {
    return new AppError('session', 'Your session expired. Sign in again.');
  }
  if (e.code === '42501') {
    return new AppError('permission', /immutable|not authorized/i.test(message) ? message : 'You do not have access to this record.');
  }
  if (e.code === 'PGRST116' || e.code === 'P0002') {
    return new AppError('not_found', 'This record could not be found.');
  }
  if (e.code === 'PT409' || e.code === '40001') return new AppError('conflict', message);
  for (const [constraint, friendly] of Object.entries(CONSTRAINT_MESSAGES)) {
    if (message.includes(constraint)) return new AppError('validation', friendly);
  }
  if (e.code === '23514' || e.code === '23503' || e.code === '22023' || e.code === '55000' || e.code === 'P0001') {
    return new AppError('validation', message);
  }
  return new AppError('unknown', message || 'Something went wrong. Try again.');
}

/** Throws the Supabase error (if any) and returns data. */
export function unwrap<T>(result: { data: T | null; error: unknown }): T {
  if (result.error) throw toAppError(result.error);
  return result.data as T;
}
