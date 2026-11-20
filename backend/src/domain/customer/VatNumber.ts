import { Identifier } from '../common/Identifier';

export class VatNumber extends Identifier {
	private constructor(value: string) { super(value); }
	static create(value: string): VatNumber { return new VatNumber(value); }
}
