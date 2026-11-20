import { StatusAssignmentService } from './StatusAssignmentService';
import { RolesAssignmentService } from './RolesAssignmentService';
import { AllergenName } from '../../domain/allergen/AllergenName';
import { RoleName } from '../../domain/user/RoleName';
import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, NotFoundException, Optional, UnprocessableEntityException } from "@nestjs/common";
import { UserAllergensDTO } from '../allergen/AllergenDTOs';
import { IUserRepository, USER_REPOSITORY } from '../auth/IUserRepository';
import { Username } from '../../domain/user/Username';
import { SetUserRolesDTO, CustomerSummaryDTO, CustomerDirectoryDTO, CustomerDetailsDTO, SetUserAddressDTO, SetUserPhoneNumberDTO, SetUserNameDTO, SetUserEmailDTO, SetUserPasswordDTO, UserContactResponseDTO, UserResponseDTO } from './UserDTOs';
import { PASSWORD_HASHER, AuthFailure } from '../auth/AuthDTOs';
import { IPasswordHasher } from '../auth/ISecurityServices';
import { Email } from '../../domain/common/Email';
import { PersonName } from '../../domain/common/PersonName';
import { PasswordHash } from '../../domain/user/PasswordHash';
import { isValidPassword } from '../../domain/user/PasswordPolicy';
import { DeliveryAddress } from '../../domain/customer/DeliveryAddress';
import { PhoneNumber } from '../../domain/customer/PhoneNumber';
import { User } from '../../domain/user/User';
import { UserRole } from './UserRoles';
import { UserStatus } from '../../domain/user/UserStatus';
import { DomainError } from '../../domain/common/DomainError';
import { Page, PageRequest } from '../../domain/common/Pagination';
import { UserFilter } from './UserFilter';
import { IRoleChangeLogRepository, ROLE_CHANGE_LOG_REPOSITORY, RoleChangeLogDTO } from './IRoleChangeLogRepository';

@Injectable()
export class UserService{
	constructor(
		@Inject(USER_REPOSITORY) private readonly userRepo : IUserRepository,
		@Inject(PASSWORD_HASHER) private readonly hasher: IPasswordHasher,
		@Inject(RolesAssignmentService) private readonly rolesAssignments: RolesAssignmentService,
		@Inject(StatusAssignmentService) private readonly statusAssignments: StatusAssignmentService,
		@Inject(ROLE_CHANGE_LOG_REPOSITORY) @Optional() private readonly roleChangeLogs?: IRoleChangeLogRepository,
	) {}

	public async setName(username: string, dto: SetUserNameDTO): Promise<UserResponseDTO> {
		this.validateAccountInput(dto, ['firstName', 'lastName']);
		const name = PersonName.create(dto.firstName, dto.lastName);
		const user = await this.requireActiveUser(username);
		user.changeName(name);
		await this.userRepo.save(user);
		return this.toUserResponse(user);
	}

	public async setEmail(username: string, dto: SetUserEmailDTO): Promise<UserResponseDTO> {
		this.validateAccountInput(dto, ['email', 'currentPassword']);
		const email = Email.create(dto.email);
		if (email.isFailure)
			throw new BadRequestException(email.getError());

		const user = await this.requireActiveUser(username);
		await this.verifyCurrentPassword(user, dto.currentPassword);

		const existing = await this.userRepo.findByEmail(email.getValue());
		if (existing && existing.username.value !== username)
			throw new ConflictException(AuthFailure.EmailTaken);

		user.changeEmail(email.getValue());
		try {
			await this.userRepo.save(user);
		} catch (error) {
			const conflict = error as { code?: string; driverError?: { code?: string } };
			if ((conflict.code ?? conflict.driverError?.code) === '23505')
				throw new ConflictException(AuthFailure.EmailTaken);
			throw error;
		}
		return this.toUserResponse(user);
	}

	public async setPassword(username: string, dto: SetUserPasswordDTO): Promise<UserResponseDTO> {
		this.validateAccountInput(dto, ['currentPassword', 'newPassword']);
		if (!isValidPassword(dto.newPassword))
			throw new BadRequestException(AuthFailure.WeakPassword);

		const user = await this.requireActiveUser(username);
		await this.verifyCurrentPassword(user, dto.currentPassword);

		user.changePassword(PasswordHash.create(await this.hasher.hash(dto.newPassword)).getValue());

		await this.userRepo.save(user);
		return this.toUserResponse(user);
	}

	public async setAddress(username: string, dto: SetUserAddressDTO): Promise<UserContactResponseDTO> {
		this.validateContactInput(dto, ['street', 'postalCode', 'city', 'extraDetails']);

		const address = new DeliveryAddress(
			this.readAddressText('Street', dto.street),
			this.readAddressText('Postal code', dto.postalCode),
			this.readAddressText('City', dto.city),
			dto.extraDetails === undefined ? '' : this.readAddressText('Extra details', dto.extraDetails, true));

		const user = await this.requireUser(username);

		user.changeAddress(address);
		await this.userRepo.save(user);
		return this.toContactResponse(user);
	}

	public async setPhoneNumber(username: string, dto: SetUserPhoneNumberDTO): Promise<UserContactResponseDTO> {
		this.validateContactInput(dto, ['phoneNumber']);
		if (typeof dto.phoneNumber !== 'string' || !/^\+[1-9]\d{1,14}$/.test(dto.phoneNumber.trim()))
			throw new BadRequestException('Phone number must use international E.164 format');
		const phoneNumber = PhoneNumber.create(dto.phoneNumber);
		const user = await this.requireUser(username);
		user.changePhoneNumber(phoneNumber);
		await this.userRepo.save(user);
		return this.toContactResponse(user);
	}

	public async relateUserAllergens(username: string, allergens: string[]): Promise<void> {
		const user = await this.requireUser(username);
		for (const allergen of allergens)
			user.recordDietaryRestriction(AllergenName.create(allergen));
		await this.userRepo.save(user);
	}

	public async getUserAllergens(username: string): Promise<UserAllergensDTO> {
		const user = await this.requireUser(username);
		return { username, allergens: [...user.dietaryRestrictions].map(restriction => restriction.allergenName.value) };
	}

	public async relateCustomerAllergens(username: string, allergens: string[]): Promise<void> {
		const user = await this.requireCustomer(username);
		for (const allergen of allergens)
			user.recordDietaryRestriction(AllergenName.create(allergen));
		await this.userRepo.save(user);
	}

	public async getCustomerSummary(username: string): Promise<CustomerSummaryDTO> {
		const user = await this.requireCustomer(username);
		return { username: user.username.value, firstName: user.name.firstName, lastName: user.name.lastName };
	}

	public async getCustomerDirectory(search = '', page?: number, pageSize?: number): Promise<Page<CustomerDirectoryDTO>> {
		let request: PageRequest;
		try {
			request = PageRequest.create(page, pageSize);
			if (!Number.isSafeInteger(request.page) || !Number.isSafeInteger(request.offset))
				throw new BadRequestException('Page is too large.');
		} catch (error) {
			if (error instanceof DomainError) throw new BadRequestException(error.message);
			throw error;
		}
		const result = await this.userRepo.findFiltered({ type: 'roleSearch', role: RoleName.create(UserRole.CUSTOMER), search: search.trim() }, request);
		return { ...result, items: result.items.map(user => ({
			username: user.username.value,
			firstName: user.name.firstName,
			lastName: user.name.lastName,
			email: user.email.address,
			status: user.status,
			createdAt: user.createdAt.value.toISOString(),
			...(user.phoneNumber ? { phoneNumber: user.phoneNumber.value } : {}),
			...(user.address ? { address: { street: user.address.street, postalCode: user.address.postalCode, city: user.address.city, extraDetails: user.address.extraDetails } } : {}),
		})) };
	}

	public async getCustomerDetails(username: string): Promise<CustomerDetailsDTO> {
		const user = await this.requireCustomer(username);
		return {
			username: user.username.value,
			firstName: user.name.firstName,
			lastName: user.name.lastName,
			email: user.email.address,
			status: user.status,
			createdAt: user.createdAt.value.toISOString(),
			...(user.phoneNumber ? { phoneNumber: user.phoneNumber.value } : {}),
			...(user.address ? { address: { street: user.address.street, postalCode: user.address.postalCode, city: user.address.city, extraDetails: user.address.extraDetails } } : {}),
			dietaryRestrictions: [...user.dietaryRestrictions].map(value => value.allergenName.value),
		};
	}

	public async getCustomerAllergens(username: string): Promise<UserAllergensDTO> {
		const user = await this.requireCustomer(username);
		return { username, allergens: [...user.dietaryRestrictions].map(restriction => restriction.allergenName.value) };
	}

	private async requireCustomer(username: string): Promise<User> {
		const user = await this.requireUser(username);
		if (![...user.roles].some(role => role.name === UserRole.CUSTOMER))
			throw new ForbiddenException('Restaurant management only permits access to customer records.');
		return user;
	}

	public async getOwnContacts(username: string): Promise<UserContactResponseDTO> {
		return this.toContactResponse(await this.requireActiveUser(username));
	}

	public async getUser(username: string): Promise<UserResponseDTO> {
		const user = await this.userRepo.findByUsername(Username.create(username));
		if (user == null)
			throw new NotFoundException('User not found.');

		return this.toUserResponse(user);
	}

	public async getAllUsers(page?: number, pageSize?: number): Promise<Page<UserResponseDTO>> {
		return this.getFilteredUsers({ type: 'all' }, page, pageSize);
	}

	public async getFilterByCreationDate(date: string, page?: number, pageSize?: number): Promise<Page<UserResponseDTO>> {
		const from = new Date(`${date}T00:00:00.000Z`);
		if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(from.getTime())
				|| from.toISOString().slice(0, 10) !== date)
			throw new BadRequestException('Creation date must be a valid date in YYYY-MM-DD format.');
		const to = new Date(from);
		to.setUTCDate(to.getUTCDate() + 1);
		return this.getFilteredUsers({ type: 'creationDate', from, to }, page, pageSize);
	}

	public async getFilterByRole(role: UserRole, page?: number, pageSize?: number): Promise<Page<UserResponseDTO>> {
		if (!Object.values(UserRole).includes(role))
			throw new BadRequestException('Invalid user role.');
		return this.getFilteredUsers({ type: 'role', role: RoleName.create(role) }, page, pageSize);
	}

	public async getFilterByStatus(status: UserStatus, page?: number, pageSize?: number): Promise<Page<UserResponseDTO>> {
		if (!Object.values(UserStatus).includes(status))
			throw new BadRequestException('Invalid user status.');
		return this.getFilteredUsers({ type: 'status', status }, page, pageSize);
	}

	public async setRoles(username: string, dto: SetUserRolesDTO, actorUsername: string): Promise<UserResponseDTO> {
		if (!dto || typeof dto !== 'object' || Array.isArray(dto) || Object.keys(dto).some(key => key !== 'roles' && key !== 'reason')
				|| !Array.isArray(dto.roles) || !dto.roles.length || dto.roles.some(role => !Object.values(UserRole).includes(role)))
			throw new BadRequestException('Select at least one valid user role.');
		if (dto.reason !== undefined && (typeof dto.reason !== 'string' || dto.reason.length > 500))
			throw new BadRequestException('Reason must be a text value of at most 500 characters.');

		const user = await this.requireUser(username);
		if (user.status === UserStatus.DEACTIVATED)
			throw new ConflictException('Reactivate this account before changing its roles.');
		const roles = new Set(dto.roles);
		const previousRoles = [...user.roles].map(role => role.name as UserRole);
		if (roles.has(UserRole.CUSTOMER) && this.userRepo.hasCustomer && !await this.userRepo.hasCustomer(user.username))
			throw new UnprocessableEntityException('A CUSTOMER role requires a linked customer record.');
		if (previousRoles.includes(UserRole.MANAGER) && !roles.has(UserRole.MANAGER)
				&& this.userRepo.countActiveManagers && await this.userRepo.countActiveManagers() <= 1)
			throw new ConflictException('Cannot remove the last active MANAGER.');

		for (const role of roles)
			user.assignRole(RoleName.create(role));
		for (const previous of user.roles)
		{
			if (!roles.has(previous.name as UserRole))
				user.revokeRole(previous);
		}
		try {
			const entry = { actorUsername, targetUsername: username, previousRoles, newRoles: [...roles], reason: dto.reason?.trim() || null };
			if (this.userRepo.saveWithRoleChangeLog)
				await this.userRepo.saveWithRoleChangeLog(user, entry);
			else {
				await this.userRepo.save(user);
				if (this.roleChangeLogs)
					await this.roleChangeLogs.record(entry);
			}
		} catch (error) {
			if ((error as { code?: string }).code === 'LAST_ACTIVE_MANAGER')
				throw new ConflictException('Cannot remove the last active MANAGER.');
			throw error;
		}
		const newRoles = [...user.roles].map(role => role.name as UserRole);
		await this.rolesAssignments.recordAssignments(actorUsername, user.email.address, newRoles);
		return this.toUserResponse(user);
	}

	public async getRoleHistory(username: string, page = 1, pageSize = 20): Promise<Page<RoleChangeLogDTO>> {
		await this.requireUser(username);
		if (!this.roleChangeLogs) throw new NotFoundException('Role history is unavailable.');
		return this.roleChangeLogs.findByTarget(username, page, pageSize);
	}

	public async reactivateUser(username: string, actorUsername: string): Promise<void> {
		const user = await this.requireUser(username);
		if (user.status !== UserStatus.DEACTIVATED)
			throw new ConflictException('Only deactivated accounts can be reactivated.');
		user.activate();
		await this.userRepo.save(user);
		await this.statusAssignments.recordAssignment(actorUsername, user.email.address, user.status);
	}

	public async deactivateUser(username: string, actorUsername: string): Promise<void> {
		const user = await this.requireUser(username);
		if (user.status === UserStatus.DEACTIVATED) return;
		if ([...user.roles].some(role => role.name === UserRole.MANAGER)
				&& this.userRepo.countActiveManagers && await this.userRepo.countActiveManagers() <= 1)
			throw new ConflictException('Cannot remove the last active MANAGER.');
		user.deactivate();
		try {
			await this.userRepo.save(user);
		} catch (error) {
			if ((error as { code?: string }).code === 'LAST_ACTIVE_MANAGER')
				throw new ConflictException('Cannot remove the last active MANAGER.');
			throw error;
		}
		await this.statusAssignments.recordAssignment(actorUsername, user.email.address, user.status);
	}



	private async requireUser(username: string): Promise<User> {
		const user = await this.userRepo.findByUsername(Username.create(username));
		if (!user)
			throw new NotFoundException('User not found.');
		return user;
	}

	private validateContactInput(dto: unknown, fields: string[]): void {
		if (!dto || typeof dto !== 'object' || Array.isArray(dto))
			throw new BadRequestException('Contact details must be an object');
		if (Object.keys(dto).some(field => !fields.includes(field)))
			throw new BadRequestException('Contact details contain unsupported fields');
	}

	private readAddressText(label: string, value: unknown, allowEmpty = false): string {
		if (typeof value !== 'string' || (!allowEmpty && !value.trim()))
			throw new BadRequestException(`${label} must be ${allowEmpty ? 'a string' : 'a non-empty string'}`);
		return value.trim();
	}

	private toContactResponse(user: User): UserContactResponseDTO {
		return {
			...this.toUserResponse(user),
			...(user.address ? { address: {
				street: user.address.street,
				postalCode: user.address.postalCode,
				city: user.address.city,
				extraDetails: user.address.extraDetails,
			} } : {}),
			...(user.phoneNumber ? { phoneNumber: user.phoneNumber.value } : {}),
		};
	}

	private async getFilteredUsers(filter: UserFilter, page?: number, pageSize?: number): Promise<Page<UserResponseDTO>> {
		let request: PageRequest;
		try {
			request = PageRequest.create(page, pageSize);
			if (!Number.isSafeInteger(request.page) || !Number.isSafeInteger(request.offset))
				throw new BadRequestException('Page is too large.');
		} catch (error) {
			if (error instanceof DomainError)
				throw new BadRequestException(error.message);
			throw error;
		}
		const result = await this.userRepo.findFiltered(filter, request);
		return { ...result, items: result.items.map(user => this.toUserResponse(user)) };
	}

	private toUserResponse(user: User): UserResponseDTO {
		return {
			username: user.username.value,
			firstName: user.name.firstName,
			lastName: user.name.lastName,
			createdAt: user.createdAt.value.toISOString(),
			email: user.email.address,
			roles: [...user.roles].map(role => role.name as UserRole),
			status: user.status,
		};
	}

	private validateAccountInput(dto: unknown, fields: string[]): void {
		if (!dto || typeof dto !== 'object' || Array.isArray(dto))
			throw new BadRequestException('Account details must be an object');
		if (Object.keys(dto).some(field => !fields.includes(field)))
			throw new BadRequestException('Account details contain unsupported fields');
	}

	private async requireActiveUser(username: string): Promise<User> {
		const user = await this.requireUser(username);
		if (user.status !== UserStatus.ACTIVE)
			throw new ForbiddenException('An active account is required.');
		return user;
	}

	private async verifyCurrentPassword(user: User, value: unknown): Promise<void> {
		if (typeof value !== 'string' || !value.length)
			throw new BadRequestException('Current password is required.');
		
		// CORREÇÃO: Verifica se o utilizador tem password local
		if (!user.passwordHash)
			throw new ForbiddenException('Current password is incorrect (no local password set).');

		if (!await this.hasher.compare(value, user.passwordHash.hashedValue))
			throw new ForbiddenException('Current password is incorrect.');
	}
}
