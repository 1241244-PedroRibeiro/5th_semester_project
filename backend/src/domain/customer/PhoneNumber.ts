import { Identifier } from '../common/Identifier';

export class PhoneNumber extends Identifier {
	private constructor(value: string) { super(value); }
	static create(value: string): PhoneNumber { return new PhoneNumber(value); }
}
