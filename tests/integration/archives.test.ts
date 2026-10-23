import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, describe, it } from 'node:test';
import { createClient } from '@supabase/supabase-js';
import type { AppDatabase } from '../../src/lib/app-database.types';
import { toManilaDateKey } from '../../src/lib/dates';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const owner = createClient<AppDatabase>(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const outsider = createClient<AppDatabase>(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
let available = false;
let customerId: string;
let repairId: string;
let receiptId: string;
let savedSnapshot: unknown;
const marker = `QA Archive ${randomUUID().slice(0, 8)}`;

describe('archive migration', () => {
  before(async () => {
    assert.ifError((await owner.auth.signInWithPassword({ email: process.env.RT_QA_OWNER_EMAIL!, password: process.env.RT_QA_OWNER_PASSWORD! })).error);
    const probe = await owner.rpc('search_archived_repairs', { p_query: marker });
    if (probe.error?.code === 'PGRST202') return;
    assert.ifError(probe.error);
    available = true;
    assert.ifError((await outsider.auth.signInWithPassword({ email: process.env.RT_QA_OUTSIDER_EMAIL!, password: process.env.RT_QA_OUTSIDER_PASSWORD! })).error);
    const customer = await owner.from('customers').insert({ full_name: marker, contact_number: 'QA-ARCHIVE' }).select().single();
    assert.ifError(customer.error); customerId = customer.data!.id;
    const device = await owner.from('devices').insert({ customer_id: customerId, device_type: 'Laptop', brand: 'QA', model: marker }).select().single();
    assert.ifError(device.error);
    const repair = await owner.rpc('create_repair', {
      p_request_id: randomUUID(), p_customer_id: customerId, p_device_id: device.data!.id,
      p_reported_problem: marker, p_service_diagnosis: 'QA service', p_final_amount_centavos: 100,
    });
    assert.ifError(repair.error); repairId = repair.data!.id;
    const receipt = await owner.rpc('record_payment', { p_request_id: randomUUID(), p_repair_id: repairId, p_amount_centavos: 100, p_method: 'cash' });
    assert.ifError(receipt.error); receiptId = receipt.data!.id; savedSnapshot = receipt.data!.snapshot;
  });

  after(async () => { await owner.auth.signOut(); await outsider.auth.signOut(); });

  it('archives, searches, and restores without changing financial history', async (t) => {
    if (!available) return t.skip('Apply 20261023090000_signup_and_archives.sql first.');
    const today = toManilaDateKey();
    const before = await owner.rpc('report_summary', { p_start: today, p_end: today });
    assert.ifError(before.error);
    assert.ifError((await owner.rpc('set_record_archived', { p_kind: 'repair', p_id: repairId, p_archived: true })).error);
    const active = await owner.rpc('search_repairs', { p_query: marker });
    assert.ifError(active.error); assert.equal(active.data!.length, 0);
    const archived = await owner.rpc('search_archived_repairs', { p_query: marker });
    assert.ifError(archived.error); assert.equal(archived.data![0].id, repairId);
    const after = await owner.rpc('report_summary', { p_start: today, p_end: today });
    assert.ifError(after.error); assert.deepEqual(after.data, before.data);
    const receipt = await owner.from('receipts').select('snapshot').eq('id', receiptId).single();
    assert.ifError(receipt.error); assert.deepEqual(receipt.data!.snapshot, savedSnapshot);
    assert.ifError((await owner.rpc('set_record_archived', { p_kind: 'repair', p_id: repairId, p_archived: false })).error);
    const restored = await owner.rpc('search_repairs', { p_query: marker });
    assert.ifError(restored.error); assert.equal(restored.data![0].id, repairId);
  });

  it('denies cross-owner archive and restore', async (t) => {
    if (!available) return t.skip('Archive migration is not applied.');
    for (const archived of [true, false]) {
      assert.ok((await outsider.rpc('set_record_archived', { p_kind: 'repair', p_id: repairId, p_archived: archived })).error);
    }
    const hidden = await outsider.from('repair_transactions').select('*').eq('id', repairId);
    assert.ifError(hidden.error); assert.deepEqual(hidden.data, []);
  });

  it('protects active customer history and restores archived customers', async (t) => {
    if (!available) return t.skip('Archive migration is not applied.');
    assert.ok((await owner.rpc('set_record_archived', { p_kind: 'customer', p_id: customerId, p_archived: true })).error);
    for (const [from, to] of [['pending', 'in_progress'], ['in_progress', 'completed'], ['completed', 'released']] as const) {
      assert.ifError((await owner.rpc('change_repair_status', { p_repair_id: repairId, p_expected_status: from, p_to_status: to })).error);
    }
    assert.ifError((await owner.rpc('set_record_archived', { p_kind: 'customer', p_id: customerId, p_archived: true })).error);
    const active = await owner.rpc('search_customers', { p_query: marker });
    assert.ifError(active.error); assert.equal(active.data!.length, 0);
    const archived = await owner.rpc('search_archived_customers', { p_query: marker });
    assert.ifError(archived.error); assert.equal(archived.data![0].id, customerId);
    assert.ifError((await owner.rpc('set_record_archived', { p_kind: 'customer', p_id: customerId, p_archived: false })).error);
  });
});
