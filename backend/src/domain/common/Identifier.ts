import { DomainError } from './DomainError';

/** Base class for string-based identifiers (UUIDs or Mongo ObjectId strings). */
export abstract class Identifier {
	public readonly value: string;

	protected constructor(value: string) {
		if (typeof value !== 'string' || value.trim().length === 0) {
		throw new DomainError(`${new.target.name} cannot be empty`);
		}
		this.value = value.trim();
	}

	equals(other?: Identifier | null): boolean {
		return !!other && other.constructor === this.constructor && other.value === this.value;
	}

	toString(): string {
		return this.value;
	}
}
