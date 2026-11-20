import { DomainError } from './DomainError';

/** Trims the text and checks it is a non-empty string within the maximum length. */

export function requireText(label: string, raw: unknown, maxLength: number): string {
	if (typeof raw !== 'string')
		throw new DomainError(`${label} must be a string`);

	const value = raw.trim();

	if (value.length === 0)
		throw new DomainError(`${label} cannot be empty`);
	if (value.length > maxLength)
		throw new DomainError(`${label} cannot exceed ${maxLength} characters`);

	return (value);
}

export function requireNonNegativeNumber(label: string, raw: unknown): number {
	if (typeof raw !== 'number' || !Number.isFinite(raw))
		throw new DomainError(`${label} must be a valid number`);

	if (raw < 0)
		throw new DomainError(`${label} cannot be negative`);

	return (raw);
}

export function requirePositiveInteger(label: string, raw: unknown): number {
	if (typeof raw !== 'number' || !Number.isInteger(raw))
		throw new DomainError(`${label} must be an integer`);
	if (raw < 1)
		throw new DomainError(`${label} must be greater than zero`);

	return (raw);
}

export function requireBoolean(label: string, raw: unknown): boolean {
	if (typeof raw !== 'boolean')
		throw new DomainError(`${label} must be a boolean`);

	return (raw);
}
