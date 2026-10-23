/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { parseReceiptSnapshot } from '../../src/features/receipts/snapshot';
import { escapeHtml, receiptStatusLabel, renderReceiptHtml } from '../../src/features/receipts/template';
import {
  canCancel,
  canEditFinalAmount,
  canRecordPayment,
  canTransition,
  isTerminal,
  nextAction,
  type RepairFacts,
} from '../../src/features/repairs/status';
import {
  customerSchema,
  deviceSchema,
  paymentAmountError,
  paymentSchema,
  receivedDateError,
  repairDetailsSchema,
} from '../../src/features/validation';

const facts = (over: Partial<RepairFacts>): RepairFacts => ({
  status: 'pending',
  serviceDiagnosis: null,
  finalAmountCentavos: null,
  balanceCentavos: null,
  paymentCount: 0,
  ...over,
});

describe('repair lifecycle', () => {
  it('allows only forward transitions and cancellation from open states', () => {
    assert.ok(canTransition('pending', 'in_progress'));
    assert.ok(canTransition('in_progress', 'completed'));
    assert.ok(canTransition('completed', 'released'));
    assert.ok(canTransition('pending', 'cancelled'));
    assert.ok(canTransition('in_progress', 'cancelled'));
    assert.ok(!canTransition('pending', 'completed'), 'no skipping');
    assert.ok(!canTransition('completed', 'in_progress'), 'no going back');
    assert.ok(!canTransition('completed', 'cancelled'));
    assert.ok(!canTransition('released', 'cancelled'));
    assert.ok(isTerminal('released') && isTerminal('cancelled'));
  });

  it('derives the single next action', () => {
    assert.equal(nextAction(facts({})).kind, 'start');
    assert.equal(nextAction(facts({ status: 'in_progress' })).kind, 'add_diagnosis');
    assert.equal(nextAction(facts({ status: 'in_progress', serviceDiagnosis: 'SSD' })).kind, 'set_final_amount');
    assert.equal(nextAction(facts({ status: 'in_progress', serviceDiagnosis: 'SSD', finalAmountCentavos: 0, balanceCentavos: 0 })).kind, 'complete');
    assert.equal(nextAction(facts({ status: 'completed', finalAmountCentavos: 100, balanceCentavos: 50 })).kind, 'record_payment');
    assert.equal(nextAction(facts({ status: 'completed', finalAmountCentavos: 100, balanceCentavos: 0 })).kind, 'release');
    assert.equal(nextAction(facts({ status: 'released' })).kind, 'none');
  });

  it('guards payment, cancellation, and final-amount edits', () => {
    assert.ok(!canRecordPayment(facts({ status: 'in_progress' })), 'needs a final amount');
    assert.ok(canRecordPayment(facts({ status: 'in_progress', finalAmountCentavos: 500, balanceCentavos: 500 })));
    assert.ok(!canRecordPayment(facts({ status: 'released', finalAmountCentavos: 500, balanceCentavos: 0 })));
    assert.ok(!canRecordPayment(facts({ status: 'completed', finalAmountCentavos: 0, balanceCentavos: 0 })), 'zero-cost needs no payment');
    assert.ok(!canCancel(facts({ status: 'in_progress', paymentCount: 1 })));
    assert.ok(!canEditFinalAmount(facts({ status: 'in_progress', paymentCount: 1 })), 'frozen after first payment');
  });
});

describe('form validation', () => {
  it('requires customer name and contact; address optional', () => {
    assert.ok(customerSchema.safeParse({ fullName: 'A', contactNumber: '0917 000 0000', address: '' }).success);
    assert.ok(!customerSchema.safeParse({ fullName: '  ', contactNumber: '1', address: '' }).success);
    assert.ok(!customerSchema.safeParse({ fullName: 'A', contactNumber: 'call me!', address: '' }).success);
    assert.ok(!customerSchema.safeParse({ fullName: 'x'.repeat(121), contactNumber: '1', address: '' }).success);
  });

  it('requires device type, brand, and model', () => {
    assert.ok(deviceSchema.safeParse({ deviceType: 'Laptop', brand: 'Acer', model: 'Aspire 5', serialNumber: '' }).success);
    assert.ok(!deviceSchema.safeParse({ deviceType: 'Laptop', brand: '', model: 'X', serialNumber: '' }).success);
  });

  it('validates repair amounts and dates', () => {
    const base = { reportedProblem: 'No power', serviceDiagnosis: '', estimatedAmount: '', finalAmount: '', receivedDate: '2026-10-22', expectedReleaseDate: '', notes: '' };
    assert.ok(repairDetailsSchema.safeParse(base).success);
    assert.ok(!repairDetailsSchema.safeParse({ ...base, estimatedAmount: '-1' }).success);
    assert.ok(!repairDetailsSchema.safeParse({ ...base, estimatedAmount: '1.999' }).success);
    assert.ok(!repairDetailsSchema.safeParse({ ...base, expectedReleaseDate: '2026-10-21' }).success);
    assert.ok(!repairDetailsSchema.safeParse({ ...base, reportedProblem: '' }).success);
    assert.equal(receivedDateError('2026-10-23', '2026-10-22'), 'Date received cannot be in the future.');
    assert.equal(receivedDateError('2026-10-22', '2026-10-22'), null);
  });

  it('rejects zero, negative, and over-balance payments', () => {
    assert.ok(!paymentSchema.safeParse({ amount: '0', method: 'cash', reference: '' }).success);
    assert.ok(!paymentSchema.safeParse({ amount: '-10', method: 'cash', reference: '' }).success);
    assert.ok(!paymentSchema.safeParse({ amount: '10', method: 'paypal', reference: '' }).success);
    assert.equal(paymentAmountError('3000.01', 300000), 'Amount is more than the remaining balance.');
    assert.equal(paymentAmountError('3000', 300000), null);
  });
});

const rawSnapshot = {
  template_version: 1,
  receipt_number: 'RC-2026-0001',
  transaction_number: 'RT-2026-0005',
  issued_at: '2026-10-22T02:00:00Z',
  shop: { name: 'Demo <Shop>', contact_number: null, address: 'Bucot', receipt_footer: null },
  operator_name: 'Owner',
  customer: { full_name: 'Bea "B" Navarro', contact_number: 'DEMO-0005' },
  device: { device_type: 'Laptop', brand: 'HP', model: 'Pavilion 14', serial_number: 'DEMO-A05' },
  service_label: 'Service / Diagnosis',
  service_text: 'Board repair\n<script>alert(1)</script>',
  final_amount_centavos: 500000,
  payment_amount_centavos: 200000,
  total_paid_centavos: 200000,
  balance_centavos: 300000,
  payment_method: 'gcash',
  payment_reference: 'GC123',
  payment_status: 'partial',
};

describe('receipts', () => {
  it('parses a stored snapshot and labels partial payments', () => {
    const s = parseReceiptSnapshot(rawSnapshot);
    if (!s) throw new Error('snapshot did not parse');
    assert.equal(s.paymentStatus, 'partial');
    assert.equal(receiptStatusLabel(s), 'Partial Payment');
    assert.equal(receiptStatusLabel({ ...s, paymentStatus: 'paid' }), 'Paid');
    assert.equal(parseReceiptSnapshot({ receipt_number: 'x' }), null);
  });

  it('renders escaped, complete receipt HTML', () => {
    const s = parseReceiptSnapshot(rawSnapshot)!;
    const html = renderReceiptHtml(s, null);
    assert.ok(!html.includes('<script>alert(1)</script>'));
    assert.ok(html.includes('&lt;script&gt;'));
    assert.ok(html.includes('Demo &lt;Shop&gt;'));
    assert.ok(html.includes('Bea &quot;B&quot; Navarro'));
    for (const text of ['RC-2026-0001', 'RT-2026-0005', '₱5,000.00', '₱2,000.00', '₱3,000.00', 'GCash', 'Partial Payment']) {
      assert.ok(html.includes(text), `missing ${text}`);
    }
    assert.equal(escapeHtml(`a&b'`), 'a&amp;b&#39;');
  });
});
