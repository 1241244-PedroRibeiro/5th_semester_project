import { ValueObject } from '../common/ValueObject';
import { requireText } from '../common/Guard';

export class ExternalIdpSubject extends ValueObject<{ value: string }> {
	private constructor(value: string) { super({ value }); }
	
	static create(value: string): ExternalIdpSubject {
		return new ExternalIdpSubject(requireText('External IdP subject', value, 255));
	}
	
	get value(): string { return this.props.value; }
}