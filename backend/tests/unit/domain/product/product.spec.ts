import { productFixture } from '../../../helpers/domain';
import { AllergenName } from '../../../../src/domain/allergen/AllergenName';
import { ComponentTypeName } from '../../../../src/domain/pizza/pizza-component-type/valueObjects';
import { CategoryName } from '../../../../src/domain/product/product-category/CategoryName';
import { Money } from '../../../../src/domain/common/Money';
describe('Product aggregate', () => {
	it('references aggregates by domain identities', () => {
		const product = productFixture();

		expect(product.sku.value).toBe('CHEESE');
		expect(product.category.value).toBe('Ingredients');
		expect(product.componentType?.value).toBe('Cheese');
	});

	it('adds/removes allergens by value and protects its collection', () => {
		const product = productFixture();

		product.addAllergen(AllergenName.create('Milk'));
		product.addAllergen(AllergenName.create('Milk'));

		expect(product.allergens.size).toBe(1);

		product.allergens.clear();
		expect(product.allergens.size).toBe(1);

		product.removeAllergen(AllergenName.create('Milk'));
		expect(product.allergens.size).toBe(0);
	});

	it('changes category, component type, price and availability through the root', () => {
		const product = productFixture();

		product.changeCategory(CategoryName.create('Food'));
		product.designateAsPizzaComponent(ComponentTypeName.create('Topping'));
		product.setDirectSellingPrice(Money.create(0));
		product.deactivate();

		expect(product.category.value).toBe('Food');
		expect(product.componentType?.value).toBe('Topping');
		expect(product.directSellingPrice?.amount).toBe(0);
		expect(product.active).toBe(false);

		product.activate();
		expect(product.active).toBe(true);
	});

	it('supports a product without a direct selling price', () => {
		const product = productFixture({
			directSellingPrice: null,
		});

		expect(product.directSellingPrice).toBeNull();
	});
});