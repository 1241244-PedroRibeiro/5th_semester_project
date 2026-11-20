import { Identifier } from '../common/Identifier';

export class ResourceId extends Identifier {
	private constructor(value: string) { super(value); }
	static create(value: string): ResourceId { return new ResourceId(value); }
}
