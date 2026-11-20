import { Result } from '../common/Result';

export class CardinalityBounds {
	private constructor(public readonly minimum: number, public readonly maximum: number) { Object.freeze(this); }
	static create(minimum: number, maximum: number): Result<CardinalityBounds> {

		if (!Number.isSafeInteger(minimum) || minimum < 0)
			return Result.fail('Minimum cardinality must be a non-negative integer');

		if (!Number.isSafeInteger(maximum) || maximum < minimum)
			return Result.fail('Maximum cardinality must be an integer at least equal to the minimum');

		return Result.ok(new CardinalityBounds(minimum, maximum));
	}
	isSatisfiedBy(count: number): boolean { return Number.isSafeInteger(count) && count >= this.minimum && count <= this.maximum; }
}
