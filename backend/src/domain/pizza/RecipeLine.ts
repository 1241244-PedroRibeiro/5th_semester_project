import { Sku } from '../product/Sku';
import { ValueObject } from '../common/ValueObject';
import { requirePositiveInteger } from '../common/Guard';

export class RecipeLine extends ValueObject<{ componentSku: Sku; defaultQuantity: number }> {
	constructor(componentSku: Sku, defaultQuantity: number) {
		super({ componentSku, defaultQuantity: requirePositiveInteger('Default quantity', defaultQuantity) });
	}
	get componentSku(): Sku { return this.props.componentSku; }
	get defaultQuantity(): number { return this.props.defaultQuantity; }
}
