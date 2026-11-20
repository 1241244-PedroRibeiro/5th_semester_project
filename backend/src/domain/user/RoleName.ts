import { ValueObject } from '../common/ValueObject';
import { requireText } from '../common/Guard';

export class RoleName extends ValueObject<{ name: string }> {
	private constructor(name: string) { super({ name }); }
	static create(name: string): RoleName { return new RoleName(requireText('Role name', name, Number.MAX_SAFE_INTEGER)); }
	get name(): string { return this.props.name; }
}
