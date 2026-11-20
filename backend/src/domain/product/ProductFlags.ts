import { ValueObject } from '../common/ValueObject';
import { DomainError } from '../common/DomainError';

export class ProductFlags extends ValueObject<{ sellable: boolean; pizzaComponent: boolean; stockControlled: boolean }> {
	constructor(sellable: boolean, pizzaComponent: boolean, stockControlled: boolean) {
		super({ sellable, pizzaComponent, stockControlled });
		if (!this.isConsistent()) {
			throw new DomainError('Product must be at least sellable, a pizza component, or both.');
		}
	}
	get sellable(): boolean { return this.props.sellable; }
	get pizzaComponent(): boolean { return this.props.pizzaComponent; }
	get stockControlled(): boolean { return this.props.stockControlled; }
	isConsistent(): boolean {
		return this.props.sellable || this.props.pizzaComponent;
	}
}