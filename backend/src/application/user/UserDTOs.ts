import { UserRole } from './UserRoles';
import { UserStatus } from '../../domain/user/UserStatus';

export interface UserResponseDTO {
	username: string;
	firstName: string;
	lastName: string;
	createdAt: string;
	email: string;
	roles: UserRole[];
	status: UserStatus;
}

export interface SetUserAddressDTO {
	street: string;
	postalCode: string;
	city: string;
	extraDetails?: string;
}

export interface SetUserPhoneNumberDTO {
	phoneNumber: string;
}

export interface SetUserNameDTO {
	firstName: string;
	lastName: string;
}

export interface SetUserEmailDTO {
	email: string;
	currentPassword: string;
}

export interface SetUserPasswordDTO {
	currentPassword: string;
	newPassword: string;
}

/** Private contact details returned by self-service contact read/write endpoints. */
export interface UserContactResponseDTO extends UserResponseDTO {
	address?: SetUserAddressDTO;
	phoneNumber?: string;
}

/** Customer identity needed for restaurant service; excludes account administration data. */
export type CustomerSummaryDTO = Pick<UserResponseDTO, 'username' | 'firstName' | 'lastName'>;

export interface CustomerDirectoryDTO {
	username: string;
	firstName: string;
	lastName: string;
	email: string;
	status: UserStatus;
	createdAt: string;
	phoneNumber?: string;
	address?: SetUserAddressDTO;
}
export interface CustomerDetailsDTO extends CustomerDirectoryDTO { dietaryRestrictions: string[]; }

export interface SetUserRolesDTO {
	roles: UserRole[];
	reason?: string;
}
