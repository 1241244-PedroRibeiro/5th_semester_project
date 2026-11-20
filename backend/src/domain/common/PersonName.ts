import { ValueObject } from './ValueObject';
import { requireText } from './Guard';

export class PersonName extends ValueObject<{ firstName: string; lastName: string }> {
	private constructor(firstName: string, lastName: string) { super({ firstName, lastName }); }
	static create(firstName: string, lastName: string): PersonName {
		return new PersonName(requireText('First name', firstName, 75), requireText('Last name', lastName, 75));
	}
	get firstName(): string { return this.props.firstName; }
	get lastName(): string { return this.props.lastName; }
	fullName(): string { return `${this.firstName} ${this.lastName}`; }
}
