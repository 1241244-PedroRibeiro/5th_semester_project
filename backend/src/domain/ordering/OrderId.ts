import { Identifier } from '../common/Identifier';

export class OrderId extends Identifier {
	private constructor(value: string) { super(value); }
	static create(value: string): OrderId { return new OrderId(value); }
}
