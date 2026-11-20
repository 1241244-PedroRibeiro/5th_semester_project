import { testStatusAssignments } from '../../helpers/status-assignments';
import { testRolesAssignments, testRolesAssignmentRepository } from '../../helpers/roles-assignments';
import { InMemoryAuthSessionRepository } from '../../helpers/auth-sessions';
import { InMemoryUserRepository } from '../../../src/infrastructure/persistence/repositories/InMemoryUserRepository';
import { DomainError } from '../../../src/domain/common/DomainError';
import { beforeEach, describe, expect, it } from '@jest/globals';
import { BadRequestException, ConflictException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../../../src/application/auth/AuthService';
import { ActivationInvitationService } from '../../../src/application/auth/ActivationInvitationService';
import { IUserRepository } from '../../../src/application/auth/IUserRepository';
import { IPasswordHasher, ITokenService } from '../../../src/application/auth/ISecurityServices';
import { User } from '../../../src/domain/user/User';
import { UserRole } from '../../../src/application/user/UserRoles';
import { Email } from '../../../src/domain/common/Email';
import { RoleName } from '../../../src/domain/user/RoleName';

describe('AuthService (Application Unit Tests)', () => {
	let userRepo: IUserRepository;
	let hasher: IPasswordHasher;
	let tokenService: ITokenService;
	let authService: AuthService;
	let usersStore: Map<string, User>;

	beforeEach(() => {
		testRolesAssignmentRepository.entries.length = 0;
		userRepo = new InMemoryUserRepository();
		usersStore = (userRepo as unknown as { users: Map<string, User> }).users;

		hasher = {
			hash: async (plain) => `hashed_${plain}`,
			compare: async (plain, hashed) => hashed === `hashed_${plain}`
		};

		tokenService = {
			generateToken: async (user) => `jwt_mock_${user.username.value}`,
			verifyToken: async () => null
		};

		authService = new AuthService(userRepo, hasher, tokenService, new InMemoryAuthSessionRepository(), new ActivationInvitationService(userRepo, { sendInvitation: async () => {} }), testStatusAssignments, testRolesAssignments);
	});

	it('should register a new customer successfully and return auth token', async () => {
		const result = await authService.register({
			firstName: 'Test',
			lastName: 'User',
			email: 'customer@laprizza.com',
			password: 'Password123!'
		});

		expect(result.token).toContain('jwt_mock_');
		expect(result.user.firstName).toBe('Test');
		expect(result.user.lastName).toBe('User');
		expect(result.user.createdAt).toBe(result.user.updatedAt);
		expect(result.user).not.toHaveProperty('passwordHash');
		expect(result.user.email).toBe('customer@laprizza.com');
		expect(result.user.roles).toContain(UserRole.CUSTOMER);
	});

	it('should reject registration if email is already registered', async () => {
		await authService.register({
			firstName: 'Test',
			lastName: 'User',
			email: 'customer@laprizza.com',
			password: 'Password123!'
		});

		const duplicateResult = authService.register({
			firstName: 'Test',
			lastName: 'User',
			email: 'customer@laprizza.com',
			password: 'Password123!'
		});

		await expect(duplicateResult).rejects.toThrow(ConflictException);
	});

	it('should authenticate valid user on login', async () => {
		await authService.register({
			firstName: 'Test',
			lastName: 'User',
			email: 'client@laprizza.com',
			password: 'SecurePassword123!'
		});

		const loginResult = await authService.login({
			email: 'client@laprizza.com',
			password: 'SecurePassword123!'
		});

		expect(loginResult.token).toBeDefined();
		expect(loginResult.user.roles).toContain(UserRole.CUSTOMER);
	});

	it('does not restore a role revoked before login', async () => {
		await authService.register({
			firstName: 'Test',
			lastName: 'User',
			email: 'revoked@laprizza.com',
			password: 'SecurePassword123!'
		});
		const user = await userRepo.findByEmail(Email.create('revoked@laprizza.com').getValue());
		user!.assignRole(RoleName.create(UserRole.EMPLOYEE));
		user!.revokeRole(RoleName.create(UserRole.CUSTOMER));
		await userRepo.save(user!);

		const loginResult = await authService.login({
			email: 'revoked@laprizza.com',
			password: 'SecurePassword123!'
		});

		expect(loginResult.user.roles).not.toContain(UserRole.CUSTOMER);
	});

	it('should reject login with incorrect password without exposing specific error details', async () => {
		await authService.register({
			firstName: 'Test',
			lastName: 'User',
			email: 'client@laprizza.com',
			password: 'SecurePassword123!'
		});

		const failedLogin = authService.login({
			email: 'client@laprizza.com',
			password: 'wrongpassword'
		});

		await expect(failedLogin).rejects.toThrow(UnauthorizedException);
	});

	it.each([UserRole.ADMINISTRATOR, UserRole.MANAGER, UserRole.EMPLOYEE])('creates a pending invitation for %s', async role => {
		const inviteResult = await authService.inviteStaff({
			firstName: 'Test',
			lastName: 'User',
			email: ' PIZZAIOLO@LAPRIZZA.COM ',
			roleName: role
		}, 'test_e');

		expect(inviteResult.email).toBe('pizzaiolo@laprizza.com');
		expect(inviteResult.roles).toContain(role);
		expect(inviteResult.status).toBe('PENDING_REGISTRATION');
		expect(testRolesAssignmentRepository.entries).toEqual([
			{ assigned_from: 'test_e', assigned_to: 'pizzaiolo@laprizza.com', role },
		]);
	});
	it('rejects registration without a valid name without saving a user', async () => {
		const result = authService.register({
			firstName: '', lastName: 'Silva', email: 'ana@example.com', password: 'Password123!',
		});
		await expect(result).rejects.toThrow(DomainError);
		expect(usersStore.size).toBe(0);
	});

	it('throws BadRequestException for invalid email and weak password', async () => {
		const dto = { firstName: 'Test', lastName: 'User', email: 'valid@example.com', password: 'Password123!' };
		await expect(authService.register({ ...dto, email: 'invalid' })).rejects.toThrow(BadRequestException);
		await expect(authService.register({ ...dto, password: 'short' })).rejects.toThrow(BadRequestException);
	});

	it('throws UnauthorizedException for invalid email and unknown user', async () => {
		await expect(authService.login({ email: 'invalid', password: 'Password123!' })).rejects.toThrow(UnauthorizedException);
		await expect(authService.login({ email: 'unknown@example.com', password: 'Password123!' })).rejects.toThrow(UnauthorizedException);
	});

	it('throws ForbiddenException for a deactivated account', async () => {
		const dto = { firstName: 'Test', lastName: 'User', email: 'inactive@example.com', password: 'Password123!' };
		const result = await authService.register(dto);
		usersStore.get(result.user.username)!.deactivate();
		await expect(authService.login(dto)).rejects.toThrow(ForbiddenException);
	});

	it('throws BadRequestException when invited staff registration is pending', async () => {
		await authService.inviteStaff({ firstName: 'Test', lastName: 'User', email: 'pending@example.com', roleName: 'EMPLOYEE' }, 'test_e');
		await expect(authService.login({ email: 'pending@example.com', password: 'Password123!' })).rejects.toThrow(BadRequestException);
	});

	it('rejects duplicate invitations and invalid invitation input', async () => {
		const dto = { firstName: 'Test', lastName: 'User', email: 'staff@example.com', roleName: 'EMPLOYEE' };
		await authService.inviteStaff(dto, 'test_e');
		await expect(authService.inviteStaff(dto, 'test_e')).rejects.toThrow(ConflictException);
		await expect(authService.inviteStaff({ ...dto, email: 'invalid' }, 'test_e')).rejects.toThrow(BadRequestException);
		await expect(authService.inviteStaff({ ...dto, email: 'other@example.com', roleName: 'unknown' }, 'test_e')).rejects.toThrow(BadRequestException);
		await expect(authService.inviteStaff({ ...dto, email: 'other@example.com', firstName: '' }, 'test_e')).rejects.toThrow(DomainError);
		expect(testRolesAssignmentRepository.entries).toEqual([
			{ assigned_from: 'test_e', assigned_to: 'staff@example.com', role: UserRole.EMPLOYEE },
		]);
	});

	it('returns normalized roles and throws for invalid roles', () => {
		expect(authService.getUserRole(' employee ')).toBe(UserRole.EMPLOYEE);
		expect(() => authService.getUserRole('unknown')).toThrow(BadRequestException);
	});

	it.each([
		undefined, null, 12345678, '', 'Aa1!abc', 'lowercase1!',
		'UPPERCASE1!', 'NoDigitsHere!', 'NoSymbols123', 'SpacesOnly123 ',
	])('rejects a password missing a required rule: %p', async (password) => {
		expect(authService.validatePassword(password as string)).toBe(false);
		await expect(authService.register({
			firstName: 'Test', lastName: 'User', email: 'password@example.com', password: password as string,
		})).rejects.toThrow(BadRequestException);
		expect(usersStore.size).toBe(0);
	});
	it.each(['Abcdef1!', 'StrongPassword123!', 'A long passphrase 1!'])('accepts a password satisfying every rule: %s', (password) => {
		expect(authService.validatePassword(password)).toBe(true);
	});
	it('generates usernames from normalized email and allocates numeric suffixes', async () => {
		const register = (email: string) => authService.register({ firstName: 'John', lastName: 'Doe', email, password: 'Password123!' });
		expect((await register('John.Doe@gmail.com')).user.username).toBe('john.doe_g');
		expect((await register('john.doe@gmx.com')).user.username).toBe('john.doe_g2');
		expect((await register('john.doe@google.com')).user.username).toBe('john.doe_g3');
		expect(usersStore.size).toBe(3);
	});
	it('retries a username claimed between lookup and insertion', async () => {
		const insert = jest.spyOn(userRepo, 'insert');
		insert.mockRejectedValueOnce({ code: '23505', constraint: 'users_username_key' });
		const result = await authService.register({ firstName: 'John', lastName: 'Doe', email: 'john.doe@gmail.com', password: 'Password123!' });
		expect(result.user.username).toBe('john.doe_g2');
		expect(insert).toHaveBeenCalledTimes(2);
	});
	it('completes an invitation through the existing root without losing identity or roles', async () => {
		const invited = await authService.inviteStaff({ firstName: 'John', lastName: 'Doe', email: 'john@example.com', roleName: 'EMPLOYEE' }, 'test_e');
		const registered = await authService.register({ firstName: 'John', lastName: 'Doe', email: 'john@example.com', password: 'Password123!' });
		expect(registered.user.username).toBe(invited.username);
		expect(registered.user.roles).toEqual(['EMPLOYEE']);
		expect(registered.user.status).toBe('ACTIVE');
		expect(usersStore.size).toBe(1);
	});

});
