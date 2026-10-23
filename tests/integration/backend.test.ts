/// <reference types="node" />
/**
 * Live backend tests against the RepairTrack Supabase project.
 *
 * Requires (git-ignored) .env.local and .env.test.local:
 *   EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
 *   RT_QA_OWNER_EMAIL/PASSWORD (active fixture owner, isolated test shop),
 *   RT_QA_OUTSIDER_EMAIL/PASSWORD (authenticated account with no shop access).
 * Records are created under the QA fixture owner only; remove them with
 * private.purge_fixture_owner(<qa owner id>) from a trusted SQL session.
 */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, describe, it } from 'node:test';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '../../src/lib/database.types';
import { toManilaDateKey } from '../../src/lib/dates';

type Client = SupabaseClient<Database>;

const URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const KEY = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const QA = { email: process.env.RT_QA_OWNER_EMAIL!, password: process.env.RT_QA_OWNER_PASSWORD! };
const OUTSIDER = { email: process.env.RT_QA_OUTSIDER_EMAIL!, password: process.env.RT_QA_OUTSIDER_PASSWORD! };
const RUN = randomUUID().slice(0, 8).toUpperCase();

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
  };
}

function client(storage = memoryStorage()): Client {
  return createClient<Database>(URL, KEY, { auth: { storage, persistSession: true, autoRefreshToken: false } });
}

async function signedIn(creds: { email: string; password: string }, storage = memoryStorage()) {
  const c = client(storage);
  const { error } = await c.auth.signInWithPassword(creds);
  assert.ifError(error);
  return c;
}

function expectError(result: { error: unknown }, pattern?: RegExp) {
  assert.ok(result.error, 'expected the request to be rejected');
  if (pattern) assert.match((result.error as { message: string }).message, pattern);
}

let owner: Client;
let ownerId: string;

before(async () => {
  for (const [k, v] of Object.entries({ URL, KEY, ...QA, outsider: OUTSIDER.email })) {
    if (!v) throw new Error(`Missing test configuration: ${k}`);
  }
  owner = await signedIn(QA);
  ownerId = (await owner.auth.getUser()).data.user!.id;
});

after(async () => {
  await owner?.auth.signOut();
});

describe('authentication', () => {
  it('rejects an invalid password', async () => {
    const { error } = await client().auth.signInWithPassword({ email: QA.email, password: 'wrong-password' });
    expectError({ error }, /invalid login credentials/i);
  });

  it('restores a persisted session and signs out', async () => {
    const storage = memoryStorage();
    const first = await signedIn(QA, storage);
    const restored = client(storage);
    const { data } = await restored.auth.getSession();
    assert.ok(data.session, 'session restored from storage');
    const user = await restored.auth.getUser();
    assert.equal(user.data.user?.email, QA.email);

    await restored.auth.signOut();
    assert.equal((await restored.auth.getSession()).data.session, null);
    // The revoked refresh token can no longer mint sessions.
    const refreshed = await first.auth.refreshSession();
    expectError(refreshed);
  });
});

describe('security', () => {
  it('denies anonymous access to tables and RPCs', async () => {
    const anon = client();
    expectError(await anon.from('customers').select('id'), /permission denied/i);
    expectError(await anon.from('payments').select('id'), /permission denied/i);
    expectError(await anon.rpc('dashboard_summary'), /permission denied/i);
    expectError(
      await anon.rpc('record_payment', { p_request_id: randomUUID(), p_repair_id: randomUUID(), p_amount_centavos: 100, p_method: 'cash' }),
      /permission denied/i,
    );
  });

  it('gives an unrelated authenticated account no shop data and no writes', async () => {
    const outsider = await signedIn(OUTSIDER);
    for (const table of ['customers', 'devices', 'repair_transactions', 'payments', 'receipts', 'shop_settings'] as const) {
      const { data, error } = await outsider.from(table).select('*').limit(5);
      assert.ifError(error);
      assert.equal(data?.length, 0, `${table} must be hidden`);
    }
    expectError(await outsider.from('customers').insert({ full_name: 'Intruder', contact_number: 'X' }));
    expectError(await outsider.rpc('dashboard_summary').then((r) => (r.data?.[0]?.pending_count ? { error: null } : { error: 'empty' })));
    expectError(await outsider.rpc('create_repair', { p_request_id: randomUUID(), p_customer_id: randomUUID(), p_device_id: randomUUID(), p_reported_problem: 'x' }), /not authorized/i);
    expectError(await outsider.from('profiles').insert({ id: (await outsider.auth.getUser()).data.user!.id, display_name: 'x', is_active: true }));
    await outsider.auth.signOut();
  });

  it('never trusts client ownership and blocks protected writes', async () => {
    expectError(await owner.from('customers').insert({ full_name: 'Spoof', contact_number: '1', owner_id: randomUUID() }), /permission denied/i);
    expectError(await owner.from('profiles').update({ is_active: false }).eq('id', ownerId), /permission denied/i);
    expectError(
      await owner.from('repair_transactions').insert({
        owner_id: ownerId, customer_id: randomUUID(), device_id: randomUUID(), transaction_number: 'RT-0', request_id: randomUUID(), reported_problem: 'x',
      }),
      /permission denied/i,
    );
    expectError(await owner.from('payments').insert({ owner_id: ownerId, repair_id: randomUUID(), amount_centavos: 1, method: 'cash', recorded_by: ownerId, request_id: randomUUID() }), /permission denied/i);
  });
});

describe('customers, devices, repairs, payments', () => {
  let customerA: string;
  let customerB: string;
  let laptop: string;
  let printer: string;
  let deviceB: string;
  let repairId: string;
  let repairNumber: string;
  const today = toManilaDateKey();
  let reportBefore: { total: number; collections: number };

  before(async () => {
    const r = await owner.rpc('report_summary', { p_start: today, p_end: today });
    assert.ifError(r.error);
    reportBefore = { total: r.data![0].total_count, collections: r.data![0].collections_centavos };
  });

  it('creates and edits customers; names need not be unique', async () => {
    const a = await owner.from('customers').insert({ full_name: `QA Customer ${RUN}`, contact_number: 'QA-0001' }).select().single();
    assert.ifError(a.error);
    assert.equal(a.data!.owner_id, ownerId, 'owner comes from the session');
    customerA = a.data!.id;
    const dup = await owner.from('customers').insert({ full_name: `QA Customer ${RUN}`, contact_number: 'QA-0001' }).select().single();
    assert.ifError(dup.error);
    customerB = dup.data!.id;
    const edit = await owner.from('customers').update({ address: 'Test Lane' }).eq('id', customerA).select().single();
    assert.equal(edit.data?.address, 'Test Lane');
    expectError(await owner.from('customers').insert({ full_name: '   ', contact_number: 'QA' }), /check constraint/i);
    expectError(await owner.from('customers').delete().eq('id', customerA).select().then((r) => (r.data?.length ? { error: null } : { error: 'no delete' })));
  });

  it('supports several devices per customer and blocks reassignment', async () => {
    const d1 = await owner.from('devices').insert({ customer_id: customerA, device_type: 'Laptop', brand: 'Acer', model: `QA ${RUN}`, serial_number: `SN-${RUN}` }).select().single();
    const d2 = await owner.from('devices').insert({ customer_id: customerA, device_type: 'Printer', brand: 'Canon', model: 'PIXMA' }).select().single();
    const d3 = await owner.from('devices').insert({ customer_id: customerB, device_type: 'Desktop', brand: 'ASUS', model: 'Tower' }).select().single();
    assert.ifError(d1.error || d2.error || d3.error);
    laptop = d1.data!.id;
    printer = d2.data!.id;
    deviceB = d3.data!.id;
    const list = await owner.from('devices').select('id').eq('customer_id', customerA);
    assert.equal(list.data?.length, 2);
    expectError(await owner.from('devices').update({ customer_id: customerB }).eq('id', laptop), /permission denied/i);
  });

  it('rejects linking a device to a different customer', async () => {
    expectError(
      await owner.rpc('create_repair', { p_request_id: randomUUID(), p_customer_id: customerA, p_device_id: deviceB, p_reported_problem: 'Mismatch' }),
      /does not belong/i,
    );
  });

  it('creates a repair with a server number, idempotently', async () => {
    const requestId = randomUUID();
    const args = { p_request_id: requestId, p_customer_id: customerA, p_device_id: laptop, p_reported_problem: 'No power', p_estimated_amount_centavos: 150000 };
    const first = await owner.rpc('create_repair', args);
    assert.ifError(first.error);
    repairId = first.data!.id;
    repairNumber = first.data!.transaction_number;
    assert.match(repairNumber, /^RT-\d{4}-\d{4,}$/);
    assert.equal(first.data!.status, 'pending');

    const retry = await owner.rpc('create_repair', args);
    assert.equal(retry.data?.id, repairId, 'same request id returns the same repair');
    expectError(await owner.rpc('create_repair', { ...args, p_reported_problem: 'Different' }), /already used/i);
    expectError(await owner.rpc('create_repair', { ...args, p_request_id: randomUUID(), p_received_at: new Date(Date.now() + 86_400_000).toISOString() }), /future/i);

    const history = await owner.from('repair_status_history').select('*').eq('repair_id', repairId);
    assert.equal(history.data?.length, 1);
    assert.equal(history.data?.[0].to_status, 'pending');
  });

  it('allocates unique numbers under concurrency and keeps repeat repairs per device', async () => {
    const results = await Promise.all(
      Array.from({ length: 6 }, (_, i) =>
        owner.rpc('create_repair', { p_request_id: randomUUID(), p_customer_id: customerA, p_device_id: i % 2 ? printer : laptop, p_reported_problem: `Parallel ${i}` }),
      ),
    );
    results.forEach((r) => assert.ifError(r.error));
    const numbers = results.map((r) => r.data!.transaction_number);
    assert.equal(new Set([...numbers, repairNumber]).size, 7, 'all numbers unique');
    const onLaptop = await owner.from('repair_transactions').select('id').eq('device_id', laptop);
    assert.ok((onLaptop.data?.length ?? 0) >= 4, 'device has repeat repair history');
  });

  it('enforces the status workflow', async () => {
    expectError(await owner.rpc('change_repair_status', { p_repair_id: repairId, p_expected_status: 'pending', p_to_status: 'completed' }), /cannot move/i);
    expectError(await owner.rpc('change_repair_status', { p_repair_id: repairId, p_expected_status: 'in_progress', p_to_status: 'completed' }), /changed since/i);
    const start = await owner.rpc('change_repair_status', { p_repair_id: repairId, p_expected_status: 'pending', p_to_status: 'in_progress' });
    assert.ifError(start.error);
    assert.ok(start.data!.started_at);
    const dupe = await owner.rpc('change_repair_status', { p_repair_id: repairId, p_expected_status: 'pending', p_to_status: 'in_progress' });
    assert.ifError(dupe.error);
    const history = await owner.from('repair_status_history').select('id').eq('repair_id', repairId);
    assert.equal(history.data?.length, 2, 'duplicate submit adds no history');

    expectError(await owner.rpc('change_repair_status', { p_repair_id: repairId, p_expected_status: 'in_progress', p_to_status: 'completed' }), /diagnosis/i);
    expectError(await owner.from('repair_transactions').update({ status: 'released' }).eq('id', repairId), /permission denied/i);
  });

  it('requires a final amount before payments and validates payment amounts', async () => {
    const pay = (amount: number, requestId = randomUUID()) =>
      owner.rpc('record_payment', { p_request_id: requestId, p_repair_id: repairId, p_amount_centavos: amount, p_method: 'cash' });
    expectError(await pay(1000), /final amount/i);

    assert.ifError((await owner.rpc('set_final_amount', { p_repair_id: repairId, p_final_amount_centavos: 500000 })).error);
    expectError(await pay(0), /greater than zero/i);
    expectError(await pay(-500), /greater than zero/i);
    expectError(await pay(500001), /exceeds/i);
  });

  it('records a partial payment with an immutable partial receipt and freezes the amount', async () => {
    const requestId = randomUUID();
    const r1 = await owner.rpc('record_payment', { p_request_id: requestId, p_repair_id: repairId, p_amount_centavos: 200000, p_method: 'gcash', p_reference: 'GC-QA' });
    assert.ifError(r1.error);
    const receipt = r1.data!;
    assert.match(receipt.receipt_number, /^RC-\d{4}-\d{4,}$/);
    const snap = receipt.snapshot as Record<string, unknown>;
    assert.equal(snap.payment_status, 'partial');
    assert.equal(snap.balance_centavos, 300000);
    assert.equal(snap.total_paid_centavos, 200000);
    assert.equal(snap.transaction_number, repairNumber);

    const retry = await owner.rpc('record_payment', { p_request_id: requestId, p_repair_id: repairId, p_amount_centavos: 200000, p_method: 'gcash' });
    assert.equal(retry.data?.id, receipt.id, 'retry returns the same receipt');
    const payments = await owner.from('payments').select('id').eq('repair_id', repairId);
    assert.equal(payments.data?.length, 1, 'no duplicate payment');

    expectError(await owner.rpc('set_final_amount', { p_repair_id: repairId, p_final_amount_centavos: 400000 }), /locked/i);
    expectError(await owner.from('payments').update({ amount_centavos: 1 }).eq('repair_id', repairId), /permission denied/i);
    expectError(await owner.from('receipts').delete().eq('id', receipt.id), /permission denied/i);
    expectError(await owner.rpc('change_repair_status', { p_repair_id: repairId, p_expected_status: 'in_progress', p_to_status: 'cancelled', p_reason: 'test' }), /cannot be cancelled/i);

    const overview = await owner.from('repair_overview').select('*').eq('id', repairId).single();
    assert.equal(overview.data?.payment_status, 'partial');
    assert.equal(overview.data?.balance_centavos, 300000);
  });

  it('lets exactly one of two concurrent full-balance payments succeed', async () => {
    const attempt = () => owner.rpc('record_payment', { p_request_id: randomUUID(), p_repair_id: repairId, p_amount_centavos: 300000, p_method: 'cash' });
    const [a, b] = await Promise.all([attempt(), attempt()]);
    const ok = [a, b].filter((r) => !r.error);
    const failed = [a, b].filter((r) => r.error);
    assert.equal(ok.length, 1, 'one payment posts');
    assert.equal(failed.length, 1, 'the other is rejected');
    assert.match(failed[0].error!.message, /exceeds/i);
    const snap = ok[0].data!.snapshot as Record<string, unknown>;
    assert.equal(snap.payment_status, 'paid');
    assert.equal(snap.balance_centavos, 0);

    const overview = await owner.from('repair_overview').select('*').eq('id', repairId).single();
    assert.equal(overview.data?.total_paid_centavos, 500000);
    assert.equal(overview.data?.payment_status, 'paid');
  });

  it('keeps issued receipts unchanged after customer edits', async () => {
    await owner.from('customers').update({ full_name: `Renamed ${RUN}` }).eq('id', customerA);
    const receipts = await owner.from('receipts').select('*').eq('repair_id', repairId).order('issued_at');
    assert.equal(receipts.data?.length, 2, 'one receipt per payment');
    for (const r of receipts.data!) {
      assert.equal((r.snapshot as { customer: { full_name: string } }).customer.full_name, `QA Customer ${RUN}`);
    }
    assert.equal((receipts.data![0].snapshot as Record<string, unknown>).payment_status, 'partial', 'first receipt still partial');
  });

  it('completes, then releases only when settled, storing the release time', async () => {
    await owner.rpc('update_repair_details', { p_repair_id: repairId, p_reported_problem: 'No power', p_service_diagnosis: 'Replaced DC jack', p_estimated_amount_centavos: 150000 });
    const done = await owner.rpc('change_repair_status', { p_repair_id: repairId, p_expected_status: 'in_progress', p_to_status: 'completed' });
    assert.ifError(done.error);
    assert.ok(done.data!.completed_at);
    const released = await owner.rpc('change_repair_status', { p_repair_id: repairId, p_expected_status: 'completed', p_to_status: 'released' });
    assert.ifError(released.error);
    assert.ok(released.data!.released_at, 'release timestamp stored');
    expectError(await owner.rpc('change_repair_status', { p_repair_id: repairId, p_expected_status: 'released', p_to_status: 'cancelled', p_reason: 'x' }), /cannot move/i);
    expectError(await owner.rpc('record_payment', { p_request_id: randomUUID(), p_repair_id: repairId, p_amount_centavos: 1, p_method: 'cash' }), /released or cancelled/i);
  });

  it('blocks releasing an unpaid repair; allows a zero-cost release', async () => {
    const unpaid = await owner.rpc('create_repair', { p_request_id: randomUUID(), p_customer_id: customerB, p_device_id: deviceB, p_reported_problem: 'Unpaid case' });
    const id = unpaid.data!.id;
    await owner.rpc('change_repair_status', { p_repair_id: id, p_expected_status: 'pending', p_to_status: 'in_progress' });
    await owner.rpc('update_repair_details', { p_repair_id: id, p_reported_problem: 'Unpaid case', p_service_diagnosis: 'Fixed' });
    await owner.rpc('set_final_amount', { p_repair_id: id, p_final_amount_centavos: 100000 });
    await owner.rpc('change_repair_status', { p_repair_id: id, p_expected_status: 'in_progress', p_to_status: 'completed' });
    expectError(await owner.rpc('change_repair_status', { p_repair_id: id, p_expected_status: 'completed', p_to_status: 'released' }), /remaining balance/i);

    const free = await owner.rpc('create_repair', { p_request_id: randomUUID(), p_customer_id: customerB, p_device_id: deviceB, p_reported_problem: 'Free check', p_service_diagnosis: 'Cleaned fan', p_final_amount_centavos: 0 });
    const fid = free.data!.id;
    await owner.rpc('change_repair_status', { p_repair_id: fid, p_expected_status: 'pending', p_to_status: 'in_progress' });
    await owner.rpc('change_repair_status', { p_repair_id: fid, p_expected_status: 'in_progress', p_to_status: 'completed' });
    const rel = await owner.rpc('change_repair_status', { p_repair_id: fid, p_expected_status: 'completed', p_to_status: 'released' });
    assert.ifError(rel.error);
  });

  it('cancels with a reason and keeps cancelled terminal', async () => {
    const r = await owner.rpc('create_repair', { p_request_id: randomUUID(), p_customer_id: customerB, p_device_id: deviceB, p_reported_problem: 'Will cancel' });
    const id = r.data!.id;
    expectError(await owner.rpc('change_repair_status', { p_repair_id: id, p_expected_status: 'pending', p_to_status: 'cancelled' }), /reason/i);
    const c = await owner.rpc('change_repair_status', { p_repair_id: id, p_expected_status: 'pending', p_to_status: 'cancelled', p_reason: 'Customer declined' });
    assert.ifError(c.error);
    assert.equal(c.data!.cancellation_reason, 'Customer declined');
    expectError(await owner.rpc('change_repair_status', { p_repair_id: id, p_expected_status: 'cancelled', p_to_status: 'in_progress' }), /cannot move/i);
  });

  it('searches by number, customer, device, serial, and status', async () => {
    const byNumber = await owner.rpc('search_repairs', { p_query: repairNumber });
    assert.ok(byNumber.data?.some((r) => r.id === repairId));
    const byCustomer = await owner.rpc('search_repairs', { p_query: `renamed ${RUN}` });
    assert.ok(byCustomer.data?.some((r) => r.id === repairId), 'case-insensitive customer match');
    const bySerial = await owner.rpc('search_repairs', { p_query: `SN-${RUN}` });
    assert.ok(bySerial.data?.some((r) => r.id === repairId));
    const byModel = await owner.rpc('search_repairs', { p_query: `QA ${RUN}`, p_status: 'released' });
    assert.deepEqual(byModel.data?.map((r) => r.id), [repairId]);
    const wildcard = await owner.rpc('search_repairs', { p_query: '%' });
    assert.equal(wildcard.data?.length, 0, 'wildcards are literal');
    const paged = await owner.rpc('search_repairs', { p_limit: 2, p_offset: 0 });
    assert.equal(paged.data?.length, 2);
    const all = await owner.rpc('search_customers', { p_query: 'QA-0001' });
    assert.ok((all.data?.length ?? 0) >= 2);
    assert.ok(all.data!.every((c) => c.owner_id === ownerId), 'only own records');
  });

  it('reconciles reports and monthly collections without double counting', async () => {
    const r = await owner.rpc('report_summary', { p_start: today, p_end: today });
    assert.ifError(r.error);
    const s = r.data![0];
    assert.equal(s.collections_centavos - reportBefore.collections, 500000, 'collections = payments posted in this run');
    assert.equal(s.total_count - reportBefore.total, 10, 'ten repairs received in this run');

    const monthly = await owner.rpc('monthly_collections', { p_year: Number(today.slice(0, 4)) });
    assert.equal(monthly.data?.length, 12);
    const month = monthly.data!.find((m) => m.month === Number(today.slice(5, 7)))!;
    const paidRows = await owner.from('payments').select('amount_centavos, paid_at');
    const sum = paidRows.data!
      .filter((p) => toManilaDateKey(new Date(p.paid_at)).slice(0, 7) === today.slice(0, 7))
      .reduce((t, p) => t + p.amount_centavos, 0);
    assert.equal(month.collections_centavos, sum, 'monthly total matches raw payments');
    const previous = monthly.data!.find((m) => m.month === (Number(today.slice(5, 7)) === 1 ? 12 : Number(today.slice(5, 7)) - 1))!;
    assert.ok(previous.collections_centavos >= 0);

    const dash = await owner.rpc('dashboard_summary');
    assert.equal(dash.data![0].collected_this_month_centavos, sum, 'dashboard equals monthly report');
    expectError(await owner.rpc('report_summary', { p_start: today, p_end: '2000-01-01' }), /valid date range/i);
  });
});
