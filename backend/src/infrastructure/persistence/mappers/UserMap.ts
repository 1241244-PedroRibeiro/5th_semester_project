import { User } from '../../../domain/user/User';
import { Username } from '../../../domain/user/Username';
import { PersonName } from '../../../domain/common/PersonName';
import { Timestamp } from '../../../domain/common/Timestamp';
import { Email } from '../../../domain/common/Email';
import { PasswordHash } from '../../../domain/user/PasswordHash';
import { RoleName } from '../../../domain/user/RoleName';
import { UserStatus } from '../../../domain/user/UserStatus';
import { DietaryRestriction } from '../../../domain/user/DietaryRestriction';
import { AllergenName } from '../../../domain/allergen/AllergenName';
import { DeliveryAddress } from '../../../domain/customer/DeliveryAddress';
import { PhoneNumber } from '../../../domain/customer/PhoneNumber';
import { ExternalIdpSubject } from '../../../domain/user/ExternalIdpSubject';

export interface UserPersistenceRow {
	username: string;
	first_name: string;
	last_name: string;
	created_at: Date;
	updated_at: Date;
	email: string;
	password_hash: string | null;
	external_idp_subject: string | null;
	status: string;
	roles: string[];
	dietary_restrictions: { allergen_name: string; recorded_at: string }[];
	street: string | null;
	postal_code: string | null;
	city: string | null;
	extra_details: string | null;
	phone_number: string | null;
}
export class UserMap {
	static toDomain(row: UserPersistenceRow): User {
		return User.reconstitute({
			address: row.street !== null && row.postal_code !== null && row.city !== null
				? new DeliveryAddress(row.street, row.postal_code, row.city, row.extra_details ?? '') : undefined,
			phoneNumber: row.phone_number === null ? undefined : PhoneNumber.create(row.phone_number),
			username: Username.create(row.username), name: PersonName.create(row.first_name, row.last_name),
			createdAt: Timestamp.create(new Date(row.created_at)), updatedAt: Timestamp.create(new Date(row.updated_at)),
			email: Email.create(row.email).getValue(),
			passwordHash: row.password_hash === null ? undefined : PasswordHash.create(row.password_hash).getValue(),
			externalIdpSubject: row.external_idp_subject === null ? undefined : ExternalIdpSubject.create(row.external_idp_subject),
			roles: new Set(row.roles.map(role => RoleName.create(role))), status: row.status as UserStatus,
			dietaryRestrictions: new Set((row.dietary_restrictions ?? []).map(restriction =>
				new DietaryRestriction(AllergenName.create(restriction.allergen_name), Timestamp.create(new Date(restriction.recorded_at))))),
		});
	}
}
