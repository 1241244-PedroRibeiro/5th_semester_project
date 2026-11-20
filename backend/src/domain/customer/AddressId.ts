import { Identifier } from '../common/Identifier';

export class AddressId extends Identifier {
	private constructor(value: string) { super(value); }
	
	static create(value: string): AddressId { return new AddressId(value); }
}
