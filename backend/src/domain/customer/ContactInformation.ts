import { ValueObject } from '../common/ValueObject';
import { PhoneNumber } from './PhoneNumber';
import { Email } from '../common/Email';

export class ContactInformation extends ValueObject<{ phone: PhoneNumber; email: Email }> {
	constructor(phone: PhoneNumber, email: Email) { super({ phone, email }); }

	get phone(): PhoneNumber { return this.props.phone; }
	get email(): Email { return this.props.email; }
}
