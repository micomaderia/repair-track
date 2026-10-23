import type { AppDatabase } from '@/lib/app-database.types';
import type { Tables } from '@/lib/database.types';
import { unwrap } from '@/lib/errors';
import { supabase } from '@/lib/supabase';

import type { PaymentMethod, RepairFacts, RepairStatus } from './status';
import { toPaymentStatus } from './status';

export type RepairOverview = AppDatabase['public']['Views']['repair_overview']['Row'];
export type RepairRow = Tables<'repair_transactions'>;
export type StatusEvent = Tables<'repair_status_history'>;
export type Payment = Tables<'payments'>;
export type ReceiptRow = Tables<'receipts'>;

export const REPAIR_PAGE_SIZE = 25;

export async function searchRepairs(params: {
  query?: string;
  status?: RepairStatus | null;
  offset?: number;
  limit?: number;
}): Promise<RepairOverview[]> {
  return unwrap(
    await supabase.rpc('search_repairs', {
      p_query: params.query ?? '',
      p_status: params.status ?? undefined,
      p_limit: params.limit ?? REPAIR_PAGE_SIZE,
      p_offset: params.offset ?? 0,
    }),
  );
}

export async function listCustomerRepairs(customerId: string): Promise<RepairOverview[]> {
  return unwrap(
    await supabase
      .from('repair_overview')
      .select('*')
      .eq('customer_id', customerId)
      .order('received_at', { ascending: false })
      .limit(50),
  );
}

export async function getRepairOverview(id: string): Promise<RepairOverview> {
  return unwrap(await supabase.from('repair_overview').select('*').eq('id', id).single());
}

export async function getRepairHistory(id: string): Promise<{
  events: StatusEvent[];
  payments: Payment[];
  receipts: ReceiptRow[];
}> {
  const [events, payments, receipts] = await Promise.all([
    supabase.from('repair_status_history').select('*').eq('repair_id', id).order('changed_at', { ascending: true }),
    supabase.from('payments').select('*').eq('repair_id', id).order('paid_at', { ascending: true }),
    supabase.from('receipts').select('*').eq('repair_id', id).order('issued_at', { ascending: true }),
  ]);
  return { events: unwrap(events), payments: unwrap(payments), receipts: unwrap(receipts) };
}

export type CreateRepairInput = {
  requestId: string;
  customerId: string;
  deviceId: string;
  reportedProblem: string;
  serviceDiagnosis: string | null;
  estimatedAmountCentavos: number | null;
  finalAmountCentavos: number | null;
  receivedAt: string | null;
  expectedReleaseDate: string | null;
  notes: string | null;
};

export async function createRepair(input: CreateRepairInput): Promise<RepairRow> {
  return unwrap(
    await supabase.rpc('create_repair', {
      p_request_id: input.requestId,
      p_customer_id: input.customerId,
      p_device_id: input.deviceId,
      p_reported_problem: input.reportedProblem,
      p_service_diagnosis: input.serviceDiagnosis ?? undefined,
      p_estimated_amount_centavos: input.estimatedAmountCentavos ?? undefined,
      p_final_amount_centavos: input.finalAmountCentavos ?? undefined,
      p_received_at: input.receivedAt ?? undefined,
      p_expected_release_date: input.expectedReleaseDate ?? undefined,
      p_notes: input.notes ?? undefined,
    }),
  );
}

export async function updateRepairDetails(
  id: string,
  input: {
    reportedProblem: string;
    serviceDiagnosis: string | null;
    estimatedAmountCentavos: number | null;
    expectedReleaseDate: string | null;
    notes: string | null;
  },
): Promise<RepairRow> {
  return unwrap(
    await supabase.rpc('update_repair_details', {
      p_repair_id: id,
      p_reported_problem: input.reportedProblem,
      p_service_diagnosis: input.serviceDiagnosis ?? undefined,
      p_estimated_amount_centavos: input.estimatedAmountCentavos ?? undefined,
      p_expected_release_date: input.expectedReleaseDate ?? undefined,
      p_notes: input.notes ?? undefined,
    }),
  );
}

export async function setFinalAmount(id: string, centavos: number): Promise<RepairRow> {
  return unwrap(await supabase.rpc('set_final_amount', { p_repair_id: id, p_final_amount_centavos: centavos }));
}

export async function changeStatus(
  id: string,
  expected: RepairStatus,
  to: RepairStatus,
  reason?: string,
): Promise<RepairRow> {
  return unwrap(
    await supabase.rpc('change_repair_status', {
      p_repair_id: id,
      p_expected_status: expected,
      p_to_status: to,
      p_reason: reason,
    }),
  );
}

export async function recordPayment(input: {
  requestId: string;
  repairId: string;
  amountCentavos: number;
  method: PaymentMethod;
  reference: string | null;
}): Promise<ReceiptRow> {
  return unwrap(
    await supabase.rpc('record_payment', {
      p_request_id: input.requestId,
      p_repair_id: input.repairId,
      p_amount_centavos: input.amountCentavos,
      p_method: input.method,
      p_reference: input.reference ?? undefined,
    }),
  );
}

export function repairFacts(r: RepairOverview): RepairFacts {
  return {
    status: r.status ?? 'pending',
    serviceDiagnosis: r.service_diagnosis,
    finalAmountCentavos: r.final_amount_centavos,
    balanceCentavos: r.balance_centavos,
    paymentCount: r.payment_count ?? 0,
  };
}

export function paymentStatusOf(r: RepairOverview) {
  return toPaymentStatus(r.payment_status);
}

export function deviceSummary(r: Pick<RepairOverview, 'device_type' | 'brand' | 'model'>): string {
  return [r.device_type, [r.brand, r.model].filter(Boolean).join(' ')].filter(Boolean).join(' · ');
}
