import { Identifier } from '../common/Identifier';

export class ActivityId extends Identifier {
	private constructor(value: string) { super(value); }
	static create(value: string): ActivityId { return new ActivityId(value); }
}
