import { Username } from './Username';
import { PersonName } from '../common/PersonName';
import { Email } from '../common/Email';
import { Timestamp } from '../common/Timestamp';
import { PasswordHash } from './PasswordHash';
import { RoleName } from './RoleName';
import { DietaryRestriction } from './DietaryRestriction';
import { AllergenName } from '../allergen/AllergenName';
import { UserStatus } from './UserStatus';
import { UserValidationError } from './UserValidationError';
import { DeliveryAddress } from '../customer/DeliveryAddress';
import { PhoneNumber } from '../customer/PhoneNumber';
import { ExternalIdpSubject } from './ExternalIdpSubject';

export interface UserProps {
	username: Username;
	name: PersonName;
	email: Email;
	passwordHash?: PasswordHash;
	externalIdpSubject?: ExternalIdpSubject;
	status: UserStatus;
	roles: Set<RoleName>;
	dietaryRestrictions: Set<DietaryRestriction>;
	createdAt: Timestamp;
	updatedAt: Timestamp;
	address?: DeliveryAddress;
	phoneNumber?: PhoneNumber;
}

export class User {
	private constructor(private readonly props: UserProps) {}

	static create(props: UserProps): User {
		if (!props.roles.size)
			throw new UserValidationError('A user must have at least one role');
		if (!Object.values(UserStatus).includes(props.status))
			throw new UserValidationError('Invalid user status');
		if (props.updatedAt.value < props.createdAt.value)
			throw new UserValidationError('Invalid user timestamps');
		if (!props.passwordHash && !props.externalIdpSubject)
			throw new UserValidationError('A user must have either a password hash or an external IdP subject');

		const roles = new Map([...props.roles].map(role => [role.name, role]));
		const restrictions = new Map([...props.dietaryRestrictions].map(restriction => [restriction.allergenName.value, restriction]));

		return new User({ ...props, roles: new Set(roles.values()), dietaryRestrictions: new Set(restrictions.values()) });
	}

	static reconstitute(props: UserProps): User { return User.create(props); }

	assignRole(role: RoleName): void {
		if (!this.hasRole(role))
			this.props.roles.add(role);
		this.touch();
	}

	revokeRole(role: RoleName): void {
		if (this.hasRole(role) && this.props.roles.size === 1)
			throw new UserValidationError('Cannot revoke the only role');
		for (const assigned of this.props.roles) if (assigned.equals(role)) this.props.roles.delete(assigned);
		this.touch();
	}

	recordDietaryRestriction(allergenName: AllergenName): void {
		if (![...this.props.dietaryRestrictions].some(restriction => restriction.allergenName.equals(allergenName)))
			this.props.dietaryRestrictions.add(new DietaryRestriction(allergenName, Timestamp.create(new Date())));
		this.touch();
	}

	clearDietaryRestriction(allergenName: AllergenName): void {
		for (const restriction of this.props.dietaryRestrictions)
		{
			if (restriction.allergenName.equals(allergenName))
				this.props.dietaryRestrictions.delete(restriction);
		}
		this.touch();
	}

	hasRole(role: RoleName): boolean { return [...this.props.roles].some(assigned => assigned.equals(role)); }

	changePassword(passwordHash: PasswordHash): void { this.props.passwordHash = passwordHash; this.touch(); }

	changeName(name: PersonName): void { this.props.name = name; this.touch(); }

	changeEmail(email: Email): void { this.props.email = email; this.touch(); }

	changeAddress(address: DeliveryAddress): void { this.props.address = address; this.touch(); }

	changePhoneNumber(phoneNumber: PhoneNumber): void { this.props.phoneNumber = phoneNumber; this.touch(); }

	linkExternalIdp(subject: ExternalIdpSubject): void { this.props.externalIdpSubject = subject; this.touch(); }

	activate(): void { this.props.status = UserStatus.ACTIVE; this.touch(); }

	deactivate(): void { this.props.status = UserStatus.DEACTIVATED; this.touch(); }

	private touch(): void { this.props.updatedAt = Timestamp.create(new Date()); }

	get username(): Username 			{ return this.props.username; }
	get name(): PersonName 				{ return this.props.name; }
	get email(): Email 					{ return this.props.email; }
	get passwordHash(): PasswordHash | undefined { return this.props.passwordHash; }
	get externalIdpSubject(): ExternalIdpSubject | undefined { return this.props.externalIdpSubject; }
	get status(): UserStatus 			{ return this.props.status; }
	get roles(): Set<RoleName> 			{ return new Set(this.props.roles); }
	get dietaryRestrictions(): Set<DietaryRestriction> 		{ return new Set(this.props.dietaryRestrictions); }
	get createdAt(): Timestamp 			{ return this.props.createdAt; }
	get updatedAt(): Timestamp 			{ return this.props.updatedAt; }
	get address(): DeliveryAddress | undefined { return this.props.address; }
	get phoneNumber(): PhoneNumber | undefined { return this.props.phoneNumber; }
}
