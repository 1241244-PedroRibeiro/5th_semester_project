import { PizzaSize } from '../../../../src/domain/pizza/PizzaSize';
import { PizzaSizeName } from '../../../../src/domain/pizza/PizzaSizeName';
describe('PizzaSize', () => {
	it('uses size name as identity and changes availability through the root', () => { const size = PizzaSize.create({ name: PizzaSizeName.create('Large'), active: true }); expect(size.name.value).toBe('Large'); size.deactivate(); expect(size.active).toBe(false); size.activate(); expect(size.active).toBe(true); });
});
