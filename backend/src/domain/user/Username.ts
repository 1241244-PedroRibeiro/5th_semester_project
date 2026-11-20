import { Identifier } from '../common/Identifier';

export class Username extends Identifier {
	private constructor(value: string) { super(value); }
	static create(value: string): Username { return new Username(value); }
}
