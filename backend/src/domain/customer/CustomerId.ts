import { Identifier } from '../common/Identifier';

export class CustomerId extends Identifier {
	private constructor(value: string) { super(value); }

	static create(value: string): CustomerId { return new CustomerId(value); }
}
