import { Identifier } from '../common/Identifier';

export class OrderItemId extends Identifier {
	private constructor(value: string) { super(value); }
	static create(value: string): OrderItemId { return new OrderItemId(value); }
}
