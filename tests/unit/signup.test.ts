import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { signupSchema } from '../../src/features/validation';
import { displayContact, displayShopName } from '../../src/lib/display';

describe('public registration validation', () => {
  const valid = { fullName: 'Ana Reyes', shopName: 'Reyes Repairs', email: 'ana@example.com', password: 'repairtest123', confirmPassword: 'repairtest123' };
  it('requires names and matching strong passwords', () => {
    assert.ok(signupSchema.safeParse(valid).success);
    for (const changes of [{ fullName: ' ' }, { shopName: '' }, { email: 'bad' }, { password: 'short' }, { confirmPassword: 'different' }]) {
      assert.ok(!signupSchema.safeParse({ ...valid, ...changes }).success);
    }
    assert.equal(signupSchema.parse({ ...valid, fullName: ' Ana Reyes ' }).fullName, 'Ana Reyes');
  });
  it('hides known seed labels without changing real shop or contact values', () => {
    assert.equal(displayShopName('RepairTrack Demo Shop'), 'RepairTrack');
    assert.equal(displayShopName('Demo Electronics'), 'Demo Electronics');
    assert.equal(displayContact('DEMO-0001'), 'Contact not provided');
    assert.equal(displayContact('0917 123 4567'), '0917 123 4567');
  });
});
