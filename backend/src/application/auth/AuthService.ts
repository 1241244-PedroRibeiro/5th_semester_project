import { StatusAssignmentService } from '../user/StatusAssignmentService';
import { ActivationInvitationService } from './ActivationInvitationService';
import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, NotFoundException, Optional, UnauthorizedException, UnprocessableEntityException } from '@nestjs/common';
import { AUTH_SESSION_REPOSITORY, IAuthSessionRepository } from './IAuthSessionRepository';
import { randomBytes } from 'node:crypto';
import { IUserRepository } from './IUserRepository';
import { IPasswordHasher, ITokenService } from './ISecurityServices';
import { RegisterUserDTO, LoginDTO, AuthResponseDTO, USER_REPOSITORY, PASSWORD_HASHER, TOKEN_SERVICE, AuthFailure, InviteUserDTO, InviteRegisterUserDTO, ActivateAccountDTO, RefreshTokenDTO } from './AuthDTOs';
import { ACTIVATION_INVITATION_REPOSITORY, IActivationInvitationRepository } from './IActivationInvitationRepository';
import { Email } from '../../domain/common/Email';
import { PersonName } from '../../domain/common/PersonName';
import { Timestamp } from '../../domain/common/Timestamp';
import { PasswordHash } from '../../domain/user/PasswordHash';
import { User } from '../../domain/user/User';
import { AuthSession } from '../../domain/user/AuthSession';
import { Username } from '../../domain/user/Username';
import { RoleName } from '../../domain/user/RoleName';
import { UserStatus } from '../../domain/user/UserStatus';
import { UserRole } from '../user/UserRoles';
import { isValidPassword } from '../../domain/user/PasswordPolicy';
import { RolesAssignmentService } from '../user/RolesAssignmentService';

export interface InviteStaffDTO {
	firstName: string;
	lastName: string;
	email: string;
	roles: UserRole[];
}
export interface StaffResponseDTO {
	username: string;
	firstName: string;
	lastName: string;
	createdAt: string;
	updatedAt: string;
	email: string;
	roles: string[];
	status: string;
}
@Injectable()
export class AuthService {
	private readonly failedLogins = new Map<string, { count: number; blockedUntil: number }>();

	constructor(
		@Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
		@Inject(PASSWORD_HASHER) private readonly hasher: IPasswordHasher,
		@Inject(TOKEN_SERVICE) private readonly tokenService: ITokenService,
		@Inject(AUTH_SESSION_REPOSITORY) private readonly sessions: IAuthSessionRepository,
		@Inject(ActivationInvitationService) private readonly activationInvitations: ActivationInvitationService,
		@Inject(StatusAssignmentService) private readonly statusAssignments: StatusAssignmentService,
		@Inject(RolesAssignmentService) private readonly rolesAssignment: RolesAssignmentService,
		@Optional() @Inject(ACTIVATION_INVITATION_REPOSITORY) private readonly invitations?: IActivationInvitationRepository,
	) {}

	async logout(sessionId: string, username: string): Promise<void> {
		if (!AuthSession.isValidId(sessionId))
			throw new UnauthorizedException('Invalid or ended session.');
		const session = await this.sessions.findById(sessionId);
		if (!session?.isActiveFor(username))
			throw new UnauthorizedException('Invalid or ended session.');
		session.revoke();
		await this.sessions.save(session);
	}

	async register(dto: RegisterUserDTO): Promise<AuthResponseDTO> {
		const emailResult = Email.create(dto.email);
		if (emailResult.isFailure)
			throw new BadRequestException(emailResult.getError());
		const email = emailResult.getValue();

		const existing = await this.userRepo.findByEmail(email);
		if (existing && existing.status !== UserStatus.PENDING_REGISTRATION)
			throw new ConflictException(AuthFailure.EmailTaken);

		if (!this.validatePassword(dto.password))
			throw new BadRequestException(AuthFailure.WeakPassword);

		const name = PersonName.create(dto.firstName, dto.lastName);
		const passwordHash = PasswordHash.create(await this.hasher.hash(dto.password)).getValue();
		let user: User;
		if (existing) {
			user = existing;
			user.changeName(name);
			user.changePassword(passwordHash);
			user.activate();
			await this.userRepo.save(user);
			await this.statusAssignments.recordAssignment(user.username.value, user.email.address, user.status);
		}
		else
			user = await this.createUser(email, name, passwordHash, UserStatus.ACTIVE, UserRole.CUSTOMER);

		return { ...(this.tokenService.generateSession ? await this.tokenService.generateSession(user) : { token: await this.tokenService.generateToken(user) }), user: this.toDTO(user) };
	}

	async inviteStaff(dto: InviteRegisterUserDTO, actorUsername: string): Promise<StaffResponseDTO> {
		const emailResult = Email.create(dto.email);

		if (emailResult.isFailure)
			throw new BadRequestException(emailResult.getError());
		const email = emailResult.getValue();

		if (await this.userRepo.exists(email))
			throw new ConflictException(AuthFailure.EmailTaken);
		const role = this.getUserRole(dto.roleName);

		if (![UserRole.ADMINISTRATOR, UserRole.MANAGER, UserRole.EMPLOYEE].includes(role))
			throw new BadRequestException('Invalid staff role');
		const hash = PasswordHash.create(await this.hasher.hash(randomBytes(16).toString('hex'))).getValue();

		let userRoleList = Array.from(dto.roleName, role => this.getUserRole(dto.roleName));
		if (!userRoleList.includes(UserRole.CUSTOMER))
			userRoleList.push(UserRole.CUSTOMER);

		const user = await this.createUser( email,PersonName.create(dto.firstName, dto.lastName),
					hash, UserStatus.PENDING_REGISTRATION, role, actorUsername);
		await this.rolesAssignment.recordAssignments( actorUsername, user.email.address,
					Array.from(user.roles, assigned => this.getUserRole(assigned.name)) );
		await this.activationInvitations.sendActivationInvitation(user, role, dto.activationMode);
		return this.toDTO(user);
	}

	async invite(dto: InviteUserDTO, actorUsername: string): Promise<StaffResponseDTO> {
		const result = Email.create(dto?.email);
		if (result.isFailure)
			throw new BadRequestException(result.getError());
		if (typeof dto?.roleName !== 'string')
			throw new BadRequestException('A role is required');

		const role = this.getUserRole(dto.roleName);
		const email = result.getValue();

		let user = await this.userRepo.findByEmail(email);

		if (user && user.status !== UserStatus.PENDING_REGISTRATION)
			throw new ConflictException(AuthFailure.EmailTaken);
		if (user)
		{
			// Assign first so replacing the only role never leaves an invalid aggregate.
			const assigned = RoleName.create(role);
			user.assignRole(assigned);
			for (const previous of user.roles)
				if (!previous.equals(assigned)) user.revokeRole(previous);
			await this.userRepo.save(user);
		}
		else
		{
			const hash = PasswordHash.create(await this.hasher.hash(randomBytes(32).toString('hex'))).getValue();
			user = await this.createUser(email, PersonName.create('Invited', 'User'), hash, UserStatus.PENDING_REGISTRATION, role, actorUsername);
		}

		let userRoleList = Array.from(dto.roleName, role => this.getUserRole(dto.roleName));
		if (!userRoleList.includes(UserRole.CUSTOMER))
			userRoleList.push(UserRole.CUSTOMER);

		await this.rolesAssignment.recordAssignments( actorUsername, user.email.address,
					Array.from(user.roles, assigned => this.getUserRole(assigned.name)) );
		// Persist first: a failed delivery can be retried by inviting the same pending email.
		await this.activationInvitations.sendActivationInvitation(user, role, dto.activationMode);
		return this.toDTO(user);
	}


	async activate(dto: ActivateAccountDTO): Promise<{ message: string }> {
		if (!dto?.token || typeof dto.password !== 'string')
			throw new BadRequestException('Invitation token and password are required.');
		const invitation = await this.activationInvitations.getActiveInvitation(dto.token);
		if (invitation.purpose !== 'LOCAL_ACCOUNT_ACTIVATION')
			throw new UnprocessableEntityException('This invitation must be completed through the external identity provider.');
		const user = await this.userRepo.findByUsername(Username.create(invitation.username));
		if (!user) throw new NotFoundException('Invitation not found.');
		if (user.status === UserStatus.ACTIVE) throw new ConflictException('Account is already active.');
		if (user.status !== UserStatus.PENDING_REGISTRATION) throw new ConflictException('Account cannot be activated.');
		if (!isValidPassword(dto.password)) throw new UnprocessableEntityException(AuthFailure.WeakPassword);
		if (!this.invitations) throw new NotFoundException('Invitation not found.');
		const passwordHash = await this.hasher.hash(dto.password);
		await this.invitations.activateLocal(invitation.token, user.username.value, passwordHash);
		await this.statusAssignments.recordAssignment(user.username.value, user.email.address, UserStatus.ACTIVE);
		return { message: 'Account activated successfully.' };
	}

	private async createUser(email: Email, name: PersonName, passwordHash: PasswordHash, status: UserStatus, role: UserRole, actorUsername?: string): Promise<User> {
		const [local, domain] = email.address.split('@');
		const base = `${local}_${Array.from(domain)[0]}`;

		for (let suffix = 1; ; suffix++) {
			const username = Username.create(suffix === 1 ? base : `${base}${suffix}`);
			if (await this.userRepo.findByUsername(username))
				continue;
			const now = Timestamp.create(new Date());
			const user = User.create({ username, name, email, passwordHash, status, roles: new Set([RoleName.create(role)]), dietaryRestrictions: new Set(), createdAt: now, updatedAt: now });
			try {
				await this.userRepo.insert(user);
			} catch (error) {
				const conflict = error as { code?: string; constraint?: string };
				// A concurrent registration may claim the username after the availability check.
				if (conflict.code === '23505' && conflict.constraint === 'users_username_key')
					continue;
				if (conflict.code === '23505')
					throw new ConflictException(AuthFailure.EmailTaken);
				throw error;
			}
			await this.statusAssignments.recordAssignment(actorUsername ?? user.username.value, user.email.address, user.status);
			return user;
		}
	}

	async login(dto: LoginDTO): Promise<AuthResponseDTO> {
		const result = Email.create(dto.email);

		if (result.isFailure)
			throw new UnauthorizedException(AuthFailure.InvalidCredentials);
		const email = result.getValue();
		const key = email.address.toLowerCase();
		const attempt = this.failedLogins.get(key);
		if (attempt && attempt.blockedUntil > Date.now())
			throw new UnauthorizedException(AuthFailure.InvalidCredentials);
		const user = await this.userRepo.findByEmail(email);

		if (!user) return this.rejectLogin(key);
		if (user.status === UserStatus.PENDING_REGISTRATION)
			throw new BadRequestException('Registration is pending. Please complete your registration via the invitation link.');
		if (user.status !== UserStatus.ACTIVE)
			throw new ForbiddenException(AuthFailure.AccountDeactivated);
		if (!user.passwordHash)
			throw new UnauthorizedException(AuthFailure.InvalidCredentials);
		if (!await this.hasher.compare(dto.password, user.passwordHash.hashedValue))
			return this.rejectLogin(key);

		this.failedLogins.delete(key);
		return { ...(this.tokenService.generateSession ? await this.tokenService.generateSession(user) : { token: await this.tokenService.generateToken(user) }), user: this.toDTO(user) };
	}

	async refresh(dto: RefreshTokenDTO): Promise<Pick<AuthResponseDTO, 'token' | 'refreshToken'>> {
		if (!this.tokenService.refreshSession)
			throw new UnauthorizedException('Refresh is unavailable.');
		const result = await this.tokenService.refreshSession(dto?.refreshToken);
		if (!result) throw new UnauthorizedException('Invalid or expired refresh token.');
		return result;
	}

	private rejectLogin(key: string): never {
		const current = this.failedLogins.get(key);
		const count = (current?.count ?? 0) + 1;
		this.failedLogins.set(key, { count, blockedUntil: count >= 5 ? Date.now() + 15 * 60 * 1000 : 0 });
		throw new UnauthorizedException(AuthFailure.InvalidCredentials);
	}


	getUserRole(role: string): UserRole {
		const normalized = (role ?? '').trim().toUpperCase() as UserRole;
		if (!Object.values(UserRole).includes(normalized))
			throw new BadRequestException(`Invalid role: ${role}`);
		return normalized;
	}

	validatePassword(password: string): boolean {
		return isValidPassword(password);
	}

	private toDTO(user: User): StaffResponseDTO {
		return { username: user.username.value, firstName: user.name.firstName, lastName: user.name.lastName,
			createdAt: user.createdAt.value.toISOString(), updatedAt: user.updatedAt.value.toISOString(), email: user.email.address,
			roles: [...user.roles].map(role => role.name), status: user.status };
	}
}
