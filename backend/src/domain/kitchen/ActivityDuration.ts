import { DomainError } from '../common/DomainError';

export class ActivityDuration {
	private constructor(public readonly seconds: number) { Object.freeze(this); }
	static create(seconds: number): ActivityDuration {
		if (!Number.isSafeInteger(seconds) || seconds < 0) throw new DomainError('ActivityDuration must be a non-negative safe integer');
		return new ActivityDuration(seconds);
	}
	equals(other?: ActivityDuration): boolean { return !!other && this.seconds === other.seconds; }
}
