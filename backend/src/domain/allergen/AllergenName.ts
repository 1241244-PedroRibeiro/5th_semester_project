import { Identifier } from '../common/Identifier';

export class AllergenName extends Identifier {
	private constructor(value: string) { super(value); }
	
	static create(value: string): AllergenName { return new AllergenName(value); }
}
