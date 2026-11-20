import { Identifier } from '../common/Identifier';

export class Sku extends Identifier {
	private constructor(value: string) { super(value); }
	static create(value: string): Sku { return new Sku(value); }
}
