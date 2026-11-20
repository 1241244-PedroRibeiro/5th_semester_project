import { PredefinedPizza } from '../../../../src/domain/pizza/PredefinedPizza';
import { PredefinedPizzaId } from '../../../../src/domain/pizza/PredefinedPizzaId';
import { RecipeLine } from '../../../../src/domain/pizza/RecipeLine';
import { Sku } from '../../../../src/domain/product/Sku';
import { PizzaSizeName } from '../../../../src/domain/pizza/PizzaSizeName';
describe('PredefinedPizza per-size aggregate', () => {
	const props = () => ({ id: new PredefinedPizzaId(Sku.create('PIZZA'), PizzaSizeName.create('Large')), recipeName: 'Pizza', recipe: new Set([new RecipeLine(Sku.create('CHEESE'), 1)]) });
	it('uses a composite identity and owns its recipe', () => { const input = props(), pizza = PredefinedPizza.create(input); input.recipe.clear(); pizza.recipe.clear(); expect(pizza.recipe.size).toBe(1); expect(pizza.id.pizzaSize.value).toBe('Large'); });
	it('modifies quantities and lines through the root', () => { const pizza = PredefinedPizza.create(props()); pizza.addRecipeLine(Sku.create('DOUGH'), 1); pizza.changeQuantity(Sku.create('CHEESE'), 2); pizza.removeRecipeLine(Sku.create('DOUGH')); expect([...pizza.recipe][0].defaultQuantity).toBe(2); expect(() => pizza.removeRecipeLine(Sku.create('CHEESE'))).toThrow(); });
	it('rejects empty recipes and duplicate component identities', () => { expect(() => PredefinedPizza.create({ ...props(), recipe: new Set() })).toThrow(); expect(() => PredefinedPizza.create({ ...props(), recipe: new Set([new RecipeLine(Sku.create('CHEESE'), 1), new RecipeLine(Sku.create('CHEESE'), 2)]) })).toThrow(); });
});
