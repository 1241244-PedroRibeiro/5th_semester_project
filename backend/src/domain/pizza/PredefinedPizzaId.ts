import { Sku } from '../product/Sku';
import { PizzaSizeName } from './PizzaSizeName';
import { ValueObject } from '../common/ValueObject';

export class PredefinedPizzaId extends ValueObject<{ pizzaSku: Sku; pizzaSize: PizzaSizeName }> {
	constructor(pizzaSku: Sku, pizzaSize: PizzaSizeName) { super({ pizzaSku, pizzaSize }); }

	get pizzaSku(): Sku { return this.props.pizzaSku; }
	get pizzaSize(): PizzaSizeName { return this.props.pizzaSize; }
}
