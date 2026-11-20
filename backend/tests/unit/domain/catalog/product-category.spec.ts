import { ProductCategory } from '../../../../src/domain/product/product-category/ProductCategory';
import { CategoryName } from '../../../../src/domain/product/product-category/CategoryName';
describe('ProductCategory name identity', () => {
	it('uses the name as its identity', () => { const value = ProductCategory.create({ name: CategoryName.create('Example'), description: 'Before' }); expect(value.name.value).toBe('Example'); });
	it('updates descriptions through the root', () => { const value = ProductCategory.create({ name: CategoryName.create('Example'), description: 'Before' }); value.updateDescription('After'); expect(value.description).toBe('After'); });
});
