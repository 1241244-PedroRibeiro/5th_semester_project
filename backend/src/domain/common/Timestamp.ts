import { DomainError } from './DomainError';

export class Timestamp {
	private readonly instant: number;
	private constructor(value: Date) { this.instant = value.getTime(); }
	static create(value: Date): Timestamp {
		if (!(value instanceof Date) || !Number.isFinite(value.getTime()))
			throw new DomainError('Timestamp must be a valid instant');
		return new Timestamp(value);
	}
	get value(): Date { return new Date(this.instant); }
	equals(other?: Timestamp): boolean { return !!other && this.instant === other.instant; }
}
