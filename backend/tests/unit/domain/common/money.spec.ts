import { Money } from '../../../../src/domain/common/Money';

describe('Money Value Object (Domain Unit Test)', () => {
  it('should create a valid Money instance with default currency EUR', () => {
    const money = Money.create(12.5);
    expect(money.amount).toBe(12.5);
    expect(money.currency).toBe('EUR');
    expect(money.toString()).toBe('12.50 EUR');
  });

  it('should round amounts to two decimal places', () => {
    const money = Money.create(10.556);
    expect(money.amount).toBe(10.56);
  });

  it('should throw an error on negative amounts', () => {
    expect(() => Money.create(-5)).toThrow('Money amount cannot be negative.');
  });

  it('should correctly add money of the same currency', () => {
    const m1 = Money.create(5.25);
    const m2 = Money.create(4.75);
    const sum = m1.add(m2);

    expect(sum.amount).toBe(10);
    expect(sum.currency).toBe('EUR');
  });

  it('should correctly subtract money and reject negative differences', () => {
    const m1 = Money.create(10);
    const m2 = Money.create(4);
    expect(m1.subtract(m2).amount).toBe(6);

    expect(() => m2.subtract(m1)).toThrow('Resulting money amount cannot be negative.');
  });

  it('should prevent operations between distinct currencies', () => {
    const eur = Money.create(10, 'EUR');
    const usd = Money.create(10, 'USD');

    expect(() => eur.add(usd)).toThrow('Cannot add money with different currencies');
    expect(() => eur.subtract(usd)).toThrow('Cannot subtract money with different currencies');
  });

  it('should multiply amount correctly', () => {
    const m = Money.create(3.5);
    const res = m.multiply(2);
    expect(res.amount).toBe(7);
  });
});