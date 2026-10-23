import { unwrap } from '@/lib/errors';
import { supabase } from '@/lib/supabase';

export type DashboardSummary = {
  pending: number;
  inProgress: number;
  completed: number;
  collectedThisMonthCentavos: number;
  monthStart: string;
};

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const rows = unwrap(await supabase.rpc('dashboard_summary'));
  const r = rows[0];
  return {
    pending: r?.pending_count ?? 0,
    inProgress: r?.in_progress_count ?? 0,
    completed: r?.completed_count ?? 0,
    collectedThisMonthCentavos: r?.collected_this_month_centavos ?? 0,
    monthStart: r?.month_start ?? '',
  };
}

export type ReportSummary = {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  released: number;
  cancelled: number;
  collectionsCentavos: number;
  paymentCount: number;
};

export async function getReportSummary(start: string, end: string): Promise<ReportSummary> {
  const rows = unwrap(await supabase.rpc('report_summary', { p_start: start, p_end: end }));
  const r = rows[0];
  return {
    total: r?.total_count ?? 0,
    pending: r?.pending_count ?? 0,
    inProgress: r?.in_progress_count ?? 0,
    completed: r?.completed_count ?? 0,
    released: r?.released_count ?? 0,
    cancelled: r?.cancelled_count ?? 0,
    collectionsCentavos: r?.collections_centavos ?? 0,
    paymentCount: r?.payment_count ?? 0,
  };
}

export type MonthlyCollection = { month: number; collectionsCentavos: number; paymentCount: number };

export async function getMonthlyCollections(year: number): Promise<MonthlyCollection[]> {
  const rows = unwrap(await supabase.rpc('monthly_collections', { p_year: year }));
  return rows.map((r) => ({ month: r.month, collectionsCentavos: r.collections_centavos, paymentCount: r.payment_count }));
}
