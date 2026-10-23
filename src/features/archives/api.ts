import { supabase } from '@/lib/supabase';
import { unwrap } from '@/lib/errors';

export type ArchiveKind = 'repair' | 'customer';
export async function setArchived(kind: ArchiveKind, id: string, archived: boolean) {
  unwrap(await supabase.rpc('set_record_archived', { p_kind: kind, p_id: id, p_archived: archived }));
}

export async function listArchived(kind: ArchiveKind, query: string, offset = 0) {
  // Search locally within each server-filtered page is avoided: the database
  // filters before pagination, so every archived record remains searchable.
  if (kind === 'customer') {
    const rows = unwrap(await supabase.rpc('search_archived_customers', { p_query: query, p_offset: offset, p_limit: 25 }));
    return rows.map((r) => ({ id: r.id, title: r.full_name, detail: r.contact_number }));
  }
  const rows = unwrap(await supabase.rpc('search_archived_repairs', { p_query: query, p_offset: offset, p_limit: 25 }));
  return rows.map((r) => ({ id: r.id!, title: r.transaction_number!, detail: [r.customer_name, r.brand, r.model].filter(Boolean).join(' · ') }));
}
