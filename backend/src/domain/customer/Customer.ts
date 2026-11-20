import { randomUUID } from 'node:crypto';
import { DomainError } from '../common/DomainError';
import { PersonName } from '../common/PersonName';
import { Timestamp } from '../common/Timestamp';
import { Username } from '../user/Username';
import { CustomerId } from './CustomerId';
import { AddressId } from './AddressId';
import { VatNumber } from './VatNumber';
import { ContactInformation } from './ContactInformation';
import { ConsentPreferences } from './ConsentPreferences';
import { CustomerAddress } from './CustomerAddress';
import { DeliveryAddress } from './DeliveryAddress';
import { CustomerDietaryRestriction } from './CustomerDietaryRestriction';

export interface CustomerProps {
	id: CustomerId;
	username?: Username;
	name: PersonName;
	contactInfo: ContactInformation;
	vatNumber?: VatNumber;
	consent: ConsentPreferences;
	addresses: CustomerAddress[];
	dietaryRestrictions?: CustomerDietaryRestriction[];
	createdAt: Timestamp;
	updatedAt: Timestamp;
}

export class Customer {
	private constructor(private readonly props: CustomerProps) {}

	static create(props: CustomerProps): Customer {
		if (new Set(props.addresses.map(address => address.id.value)).size !== props.addresses.length)
			throw new DomainError('Customer address identities must be unique');
		if (props.addresses.filter(address => address.isDefault).length > 1)
			throw new DomainError('Only one address can be the default');
		if (new Set((props.dietaryRestrictions ?? []).map(value => value.allergenName.value)).size !== (props.dietaryRestrictions ?? []).length)
			throw new DomainError('Customer dietary restrictions must be unique by allergen');
		if (props.updatedAt.value < props.createdAt.value)
			throw new DomainError('Invalid customer timestamps');

		return new Customer({ ...props, addresses: [...props.addresses], dietaryRestrictions: [...(props.dietaryRestrictions ?? [])] });
	}

	static reconstitute(props: CustomerProps): Customer { return Customer.create(props); }

	updateContactInformation(contactInfo: ContactInformation): void { this.props.contactInfo = contactInfo; this.touch(); }

	updateProfile(name: PersonName, contactInfo: ContactInformation, vatNumber?: VatNumber): void {
		this.props.name = name;
		this.props.contactInfo = contactInfo;
		this.props.vatNumber = vatNumber;
		this.touch();
	}

	linkUser(username: Username): void {
		if (this.props.username && !this.props.username.equals(username))
			throw new DomainError('Customer is already linked to a user');
		this.props.username = username;
		this.touch();
	}

	unLinkUser(): void { this.props.username = undefined; this.touch(); }

	replaceDietaryRestrictions(restrictions: CustomerDietaryRestriction[]): void {
		const names = restrictions.map(value => value.allergenName.value);
		if (new Set(names).size !== names.length)
			throw new DomainError('Customer dietary restrictions must be unique by allergen');
		this.props.dietaryRestrictions = [...restrictions];
		this.touch();
	}

	addAddress(address: DeliveryAddress, isDefault: boolean): void {
		if (isDefault) this.props.addresses = this.props.addresses.map(entry => new CustomerAddress(entry.id, false, entry.address));
		this.props.addresses.push(new CustomerAddress(AddressId.create(randomUUID()), isDefault, address));
		this.touch();
	}

	removeAddress(id: AddressId): void {
		if (!this.props.addresses.some(address => address.id.equals(id)))
			throw new DomainError('Address does not belong to customer');
		this.props.addresses = this.props.addresses.filter(address => !address.id.equals(id));
		this.touch();
	}

	setDefaultAddress(id: AddressId): void {
		if (!this.props.addresses.some(address => address.id.equals(id)))
			throw new DomainError('Address does not belong to customer');

		this.props.addresses = this.props.addresses.map(entry => new CustomerAddress(entry.id, entry.id.equals(id), entry.address));
		this.touch();
	}

	updateAddress(id: AddressId, address: DeliveryAddress, isDefault?: boolean): void {
		if (!this.props.addresses.some(entry => entry.id.equals(id)))
			throw new DomainError('Address does not belong to customer');
		if (isDefault === true)
			this.props.addresses = this.props.addresses.map(entry => new CustomerAddress(entry.id, false, entry.address));
		this.props.addresses = this.props.addresses.map(entry => entry.id.equals(id)
			? new CustomerAddress(entry.id, isDefault ?? entry.isDefault, address)
			: entry);
		this.touch();
	}

	updateConsent(marketingConsent: boolean): void {
		const now = Timestamp.create(new Date());
		this.props.consent = new ConsentPreferences(marketingConsent, now);
		this.props.updatedAt = now;
	}

	private touch(): void { this.props.updatedAt = Timestamp.create(new Date()); }

	get id(): CustomerId { return this.props.id; }
	get username(): Username | undefined { return this.props.username; }
	get name(): PersonName { return this.props.name; }
	get contactInfo(): ContactInformation { return this.props.contactInfo; }
	get vatNumber(): VatNumber | undefined { return this.props.vatNumber; }
	get consent(): ConsentPreferences { return this.props.consent; }
	get addresses(): CustomerAddress[] { return [...this.props.addresses]; }
	get dietaryRestrictions(): CustomerDietaryRestriction[] { return [...(this.props.dietaryRestrictions ?? [])]; }
	get createdAt(): Timestamp { return this.props.createdAt; }
	get updatedAt(): Timestamp { return this.props.updatedAt; }
}
