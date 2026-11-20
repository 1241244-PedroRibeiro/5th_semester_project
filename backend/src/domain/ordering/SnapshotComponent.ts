import { Sku } from '../product/Sku';
import { ValueObject } from '../common/ValueObject';
import { requirePositiveInteger } from '../common/Guard';

export class SnapshotComponent extends ValueObject<{ componentSku: Sku; quantity: number }> {
	constructor(componentSku: Sku, quantity: number) { super({ componentSku, quantity: requirePositiveInteger('Component quantity', quantity) }); }
	get componentSku(): Sku { return this.props.componentSku; }
	get quantity(): number { return this.props.quantity; }
}
