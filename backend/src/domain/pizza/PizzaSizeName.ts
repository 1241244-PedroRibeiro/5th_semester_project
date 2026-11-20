import { Identifier } from '../common/Identifier';

export class PizzaSizeName extends Identifier {
	private constructor(value: string) { super(value); }
	static create(value: string): PizzaSizeName { return new PizzaSizeName(value); }
}
