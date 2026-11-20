import { StockQuantity } from '../../../../src/domain/stock/StockQuantity';
describe('StockQuantity replacement', () => {
	it('adds, subtracts and compares quantities', () => { const quantity = StockQuantity.create(5); expect(quantity.add(StockQuantity.create(2)).units).toBe(7); expect(quantity.subtract(StockQuantity.create(2)).units).toBe(3); expect(quantity.isGreaterThanOrEqual(StockQuantity.create(5))).toBe(true); });
	it.each([-1, 1.5, NaN, Infinity])('rejects invalid quantity %p', value => { expect(() => StockQuantity.create(value)).toThrow(); });
	it('rejects underflow and overflow', () => { expect(() => StockQuantity.create(1).subtract(StockQuantity.create(2))).toThrow(); expect(() => StockQuantity.create(Number.MAX_SAFE_INTEGER).add(StockQuantity.create(1))).toThrow(); });
});
