import { Result } from '../common/Result';

export class AssemblyOrder {
	private constructor(public readonly sequenceNumber: number) { Object.freeze(this); }

	static create(sequenceNumber: number): Result<AssemblyOrder> {
		if (!Number.isSafeInteger(sequenceNumber) || sequenceNumber < 1)
			return Result.fail('Assembly order must be a positive integer');
		return Result.ok(new AssemblyOrder(sequenceNumber));
	}

	equals(other?: AssemblyOrder): boolean { return !!other && this.sequenceNumber === other.sequenceNumber; }
}
