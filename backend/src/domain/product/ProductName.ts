import { Identifier } from '../common/Identifier';

export class ProductName extends Identifier {
	private constructor(value: string) { super(value); }
	static create(value: string): ProductName { return new ProductName(value); }
}
