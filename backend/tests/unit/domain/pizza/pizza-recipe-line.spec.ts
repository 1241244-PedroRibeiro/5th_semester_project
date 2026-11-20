import { RecipeLine } from '../../../../src/domain/pizza/RecipeLine';
import { Sku } from '../../../../src/domain/product/Sku';
describe('RecipeLine', () => {
	it('references components by SKU only', () => { const line = new RecipeLine(Sku.create('CHEESE'), 2); expect(line.componentSku.value).toBe('CHEESE'); expect(line.defaultQuantity).toBe(2); });
	it.each([0, -1, 1.5, NaN])('rejects invalid quantity %p', quantity => { expect(() => new RecipeLine(Sku.create('CHEESE'), quantity)).toThrow(); });
});
