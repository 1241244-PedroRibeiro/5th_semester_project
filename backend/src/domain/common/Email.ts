import { ValueObject } from './ValueObject';
import { Result } from './Result';

export class Email extends ValueObject<{ address: string }> {
	private constructor(address: string) { super({ address }); }
	get address(): string { return this.props.address; }

	/** Partially hidden form safe to show to unauthenticated callers, e.g. `j***e@example.com`. */
	masked(): string {
		const [local, domain] = this.address.split('@');
		if (local.length <= 2) return `${local[0] ?? '*'}***@${domain}`;
		return `${local[0]}***${local[local.length - 1]}@${domain}`;
	}
	static create(address: string): Result<Email> {
		if (typeof address !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address.trim()))
			return Result.fail('Invalid email address format');
		return Result.ok(new Email(address.trim().toLowerCase()));
	}
}
