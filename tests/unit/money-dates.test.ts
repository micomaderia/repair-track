/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  addDays,
  formatDate,
  formatDateTime,
  isValidDateKey,
  manilaDateTimeToIso,
  monthRange,
  periodRange,
  toManilaDateKey,
} from '../../src/lib/dates';
import { centavosToInput, formatPeso, parseAmount } from '../../src/lib/money';

describe('parseAmount', () => {
  it('parses pesos into exact centavos', () => {
    assert.deepEqual(parseAmount('1250'), { ok: true, centavos: 125000 });
    assert.deepEqual(parseAmount('1,250.5'), { ok: true, centavos: 125050 });
    assert.deepEqual(parseAmount('₱ 0.10'), { ok: true, centavos: 10 });
    assert.deepEqual(parseAmount('0'), { ok: true, centavos: 0 });
    assert.deepEqual(parseAmount('9999999.99'), { ok: true, centavos: 999999999 });
  });

  it('avoids floating point drift', () => {
    const r = parseAmount('0.29');
    assert.equal(r.ok && r.centavos, 29);
    const s = parseAmount('1234567.89');
    assert.equal(s.ok && s.centavos, 123456789);
  });

  it('rejects negative, malformed, too precise, and too large input', () => {
    assert.equal(parseAmount('-5').ok, false);
    assert.equal(parseAmount('').ok, false);
    assert.equal(parseAmount('abc').ok, false);
    assert.equal(parseAmount('1.234').ok, false);
    assert.equal(parseAmount('10000000').ok, false);
    assert.equal(parseAmount('1e5').ok, false);
  });
});

describe('formatPeso', () => {
  it('formats centavos with grouping', () => {
    assert.equal(formatPeso(0), '₱0.00');
    assert.equal(formatPeso(5), '₱0.05');
    assert.equal(formatPeso(125050), '₱1,250.50');
    assert.equal(formatPeso(999999999), '₱9,999,999.99');
    assert.equal(formatPeso(null), '—');
  });

  it('round-trips through the input format', () => {
    assert.equal(centavosToInput(125050), '1250.50');
    assert.equal(centavosToInput(300000), '3000');
    const back = parseAmount(centavosToInput(123405));
    assert.equal(back.ok && back.centavos, 123405);
  });
});

describe('Manila dates', () => {
  it('uses the Manila calendar day regardless of device zone', () => {
    // 2026-10-31 17:30 UTC is 2026-11-01 01:30 in Manila.
    assert.equal(toManilaDateKey(new Date('2026-10-31T17:30:00Z')), '2026-11-01');
    assert.equal(toManilaDateKey(new Date('2026-10-31T15:59:59Z')), '2026-10-31');
  });

  it('converts Manila wall time to UTC', () => {
    assert.equal(manilaDateTimeToIso('2026-10-22', 9), '2026-10-22T01:00:00.000Z');
  });

  it('formats dates and times in Manila', () => {
    assert.equal(formatDate('2026-10-22T16:30:00Z'), 'Oct 23, 2026');
    assert.equal(formatDateTime('2026-10-22T07:05:00Z'), 'Oct 22, 2026, 3:05 PM');
    assert.equal(formatDate('2026-02-01'), 'Feb 1, 2026');
  });

  it('validates and shifts date keys', () => {
    assert.equal(isValidDateKey('2026-02-29'), false);
    assert.equal(isValidDateKey('2028-02-29'), true);
    assert.equal(isValidDateKey('2026-13-01'), false);
    assert.equal(addDays('2026-12-31', 1), '2027-01-01');
    assert.equal(addDays('2026-03-01', -1), '2026-02-28');
  });

  it('builds inclusive month and period ranges', () => {
    assert.deepEqual(monthRange(2026, 2), { start: '2026-02-01', end: '2026-02-28', label: 'February 2026' });
    assert.equal(monthRange(2026, 12).end, '2026-12-31');
    const now = new Date('2026-01-15T03:00:00Z');
    assert.deepEqual(periodRange('last_month', now), { start: '2025-12-01', end: '2025-12-31', label: 'December 2025' });
    assert.equal(periodRange('this_month', now).end, '2026-01-15');
    assert.equal(periodRange('last_30_days', now).start, '2025-12-17');
  });
});
