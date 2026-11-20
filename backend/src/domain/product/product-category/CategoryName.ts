import { Identifier } from '../../common/Identifier';

export class CategoryName extends Identifier {
	private constructor(value: string) { super(value); }
	static create(value: string): CategoryName { return new CategoryName(value); }
}
