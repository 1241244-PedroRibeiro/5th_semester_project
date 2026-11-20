import { ValueObject } from '../common/ValueObject';
import { Result } from '../common/Result';

export class PasswordHash extends ValueObject<{ hashedValue: string }> {
	
	private constructor(hashedValue: string) { super({ hashedValue }); }
	get hashedValue(): string { return this.props.hashedValue; }

	static create(hashedValue: string): Result<PasswordHash> {
		if (typeof hashedValue !== 'string' || !hashedValue.trim())
			return Result.fail('Password hash cannot be empty');
		return Result.ok(new PasswordHash(hashedValue));
	}
}
