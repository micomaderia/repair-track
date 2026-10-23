import type { Database } from '../../lib/database.types';

export type RepairStatus = Database['public']['Enums']['repair_status'];
export type PaymentMethod = Database['public']['Enums']['payment_method'];
export type PaymentStatus = 'not_set' | 'unpaid' | 'partial' | 'paid';

export const REPAIR_STATUSES: readonly RepairStatus[] = [
  'pending',
  'in_progress',
  'completed',
  'released',
  'cancelled',
];

/** The lifecycle rail, in order. Cancelled sits outside it. */
export const LIFECYCLE: readonly RepairStatus[] = ['pending', 'in_progress', 'completed', 'released'];

export const STATUS_LABEL: Record<RepairStatus, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
  released: 'Released',
  cancelled: 'Cancelled',
};

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  not_set: 'Amount not set',
  unpaid: 'Unpaid',
  partial: 'Partial',
  paid: 'Paid',
};

export const PAYMENT_METHODS: readonly PaymentMethod[] = ['cash', 'gcash', 'bank_transfer'];

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  cash: 'Cash',
  gcash: 'GCash',
  bank_transfer: 'Bank Transfer',
};

/** Allowed transitions; mirrors private.change_repair_status on the server. */
export const TRANSITIONS: Record<RepairStatus, readonly RepairStatus[]> = {
  pending: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed: ['released'],
  released: [],
  cancelled: [],
};

export function canTransition(from: RepairStatus, to: RepairStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function isTerminal(status: RepairStatus): boolean {
  return TRANSITIONS[status].length === 0;
}

export function toPaymentStatus(value: string | null | undefined): PaymentStatus {
  return value === 'unpaid' || value === 'partial' || value === 'paid' ? value : 'not_set';
}

export type RepairFacts = {
  status: RepairStatus;
  serviceDiagnosis: string | null;
  finalAmountCentavos: number | null;
  balanceCentavos: number | null;
  paymentCount: number;
};

export type NextAction =
  | { kind: 'start' }
  | { kind: 'add_diagnosis' }
  | { kind: 'set_final_amount' }
  | { kind: 'complete' }
  | { kind: 'record_payment' }
  | { kind: 'release' }
  | { kind: 'none'; reason: string };

/** The single next step the operator should take on a repair. */
export function nextAction(r: RepairFacts): NextAction {
  const hasDiagnosis = !!r.serviceDiagnosis?.trim();
  switch (r.status) {
    case 'pending':
      return { kind: 'start' };
    case 'in_progress':
      if (!hasDiagnosis) return { kind: 'add_diagnosis' };
      if (r.finalAmountCentavos === null) return { kind: 'set_final_amount' };
      return { kind: 'complete' };
    case 'completed':
      return (r.balanceCentavos ?? 0) > 0 ? { kind: 'record_payment' } : { kind: 'release' };
    case 'released':
      return { kind: 'none', reason: 'Device released to the customer.' };
    case 'cancelled':
      return { kind: 'none', reason: 'This repair was cancelled.' };
  }
}

export function canRecordPayment(r: RepairFacts): boolean {
  return (
    (r.status === 'pending' || r.status === 'in_progress' || r.status === 'completed') &&
    r.finalAmountCentavos !== null &&
    (r.balanceCentavos ?? 0) > 0
  );
}

export function canCancel(r: RepairFacts): boolean {
  return (r.status === 'pending' || r.status === 'in_progress') && r.paymentCount === 0;
}

export function canEditFinalAmount(r: RepairFacts): boolean {
  return (r.status === 'pending' || r.status === 'in_progress') && r.paymentCount === 0;
}
