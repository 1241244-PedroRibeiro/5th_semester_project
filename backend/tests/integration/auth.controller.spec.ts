import { STATUS_ASSIGNMENT_REPOSITORY } from '../../src/application/user/IStatusAssignmentRepository';
import { ROLES_ASSIGNMENT_REPOSITORY } from '../../src/application/user/IRolesAssignmentRepository';
import { testRolesAssignmentRepository } from '../helpers/roles-assignments';
import { LOGIN_ATTEMPT_STORE } from '../../src/application/auth/ILoginAttemptStore';
import { testLoginAttempts } from '../helpers/login-attempts';
import { testStatusAssignmentRepository } from '../helpers/status-assignments';
import { INVITATION_MAILER } from '../../src/application/auth/IInvitationMailer';
import { UNAUTHORIZED_ATTEMPT_REPOSITORY } from '../../src/application/auth/IUnauthorizedAttemptRepository';
import { testUnauthorizedAttempts } from '../helpers/unauthorized-attempts';
import { AuthSession } from '../../src/domain/user/AuthSession';
import { Timestamp } from '../../src/domain/common/Timestamp';
import { AUTH_SESSION_REPOSITORY } from '../../src/application/auth/IAuthSessionRepository';
import { testSessions, signSession } from '../helpers/auth-sessions';
import { DataSource } from 'typeorm';
import { mockDataSource } from '../helpers/mock-data-source';
import { userFixture } from '../helpers/domain';
import { Username } from '../../src/domain/user/Username';
import { RoleName } from '../../src/domain/user/RoleName';
import 'dotenv/config';

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/presentation/app.module';
import { UserRole } from '../../src/application/user/UserRoles';
import { UserStatus } from '../../src/domain/user/UserStatus';
import { Email } from '../../src/domain/user/Email';
import { PasswordHash } from '../../src/domain/user/PasswordHash';
import { JwtService } from '@nestjs/jwt';
import { IPasswordHasher } from '../../src/application/auth/ISecurityServices';
import { PASSWORD_HASHER, USER_REPOSITORY } from '../../src/application/auth/AuthDTOs';
import { InMemoryUserRepository } from '../../src/infrastructure/persistence/repositories/InMemoryUserRepository';

describe('AuthController (Integration E2E)', () => {
	let app: INestApplication;
	let inMemoryRepo: InMemoryUserRepository;
	const sendInvitation = jest.fn().mockResolvedValue(undefined);

	beforeAll(async () => {
		inMemoryRepo = new InMemoryUserRepository();

		const moduleFixture: TestingModule = await Test.createTestingModule({
			imports: [AppModule],
		})
			.overrideProvider(INVITATION_MAILER).useValue({ sendInvitation })
			.overrideProvider(ROLES_ASSIGNMENT_REPOSITORY).useValue(testRolesAssignmentRepository)
			.overrideProvider(LOGIN_ATTEMPT_STORE).useValue(testLoginAttempts)
			.overrideProvider(USER_REPOSITORY)
			.useValue(inMemoryRepo)
			.overrideProvider(AUTH_SESSION_REPOSITORY).useValue(testSessions)
			.overrideProvider(UNAUTHORIZED_ATTEMPT_REPOSITORY).useValue(testUnauthorizedAttempts)
			.overrideProvider(STATUS_ASSIGNMENT_REPOSITORY).useValue(testStatusAssignmentRepository)
			.overrideProvider(DataSource).useValue(mockDataSource).compile();

		app = moduleFixture.createNestApplication();
		await app.init();
	});

	beforeEach(() => {
		testLoginAttempts.buckets.clear();
		testSessions.sessions.clear();
		sendInvitation.mockReset().mockResolvedValue(undefined);
		testStatusAssignmentRepository.entries.length = 0;
		if ((inMemoryRepo as any).users instanceof Map) {
			(inMemoryRepo as any).users.clear();
		} else if (typeof (inMemoryRepo as any).clear === 'function') {
			(inMemoryRepo as any).clear();
		}
	});

	afterAll(async () => {
		if (app) {
			await app.close();
		}
	});

	it('POST /auth/register - should successfully register a new user and return 201', async () => {
		const response = await request(app.getHttpServer())
			.post('/auth/register')
			.send({
				firstName: 'Test',
				lastName: 'User',
				email: 'manager@laprizza.com',
				password: 'Password123!',
			})
			.expect(201);

		expect(response.body).toHaveProperty('token');
		expect(response.body.user).toHaveProperty('username');
		expect(response.body.user.email).toBe('manager@laprizza.com');
	});

	it('POST /auth/refresh - rotates the persisted refresh token and rejects reuse', async () => {
		const login = await request(app.getHttpServer()).post('/auth/register')
			.send({ email: 'refresh@example.com', password: 'Password123!', firstName: 'Refresh', lastName: 'User' }).expect(201);
		expect(login.body.refreshToken).toEqual(expect.any(String));
		const refreshed = await request(app.getHttpServer()).post('/auth/refresh')
			.send({ refreshToken: login.body.refreshToken }).expect(200);
		expect(refreshed.body.token).toEqual(expect.any(String));
		expect(refreshed.body.refreshToken).toEqual(expect.any(String));
		expect(refreshed.body.refreshToken).not.toBe(login.body.refreshToken);
		await request(app.getHttpServer()).post('/auth/refresh')
			.send({ refreshToken: login.body.refreshToken }).expect(401);
	});

	it('POST /auth/register - should return 409 Conflict if email is already registered', async () => {
		await request(app.getHttpServer())
			.post('/auth/register')
			.send({
				firstName: 'Test',
				lastName: 'User',
				email: 'duplicate@laprizza.com',
				password: 'Password123!',
			})
			.expect(201);

		const duplicateResponse = await request(app.getHttpServer())
			.post('/auth/register')
			.send({
				firstName: 'Test',
				lastName: 'User',
				email: 'duplicate@laprizza.com',
				password: 'Password123!',
			})
			.expect(409);

		expect(JSON.stringify(duplicateResponse.body)).toContain('already exists');
	});

	it('POST /auth/login - should authenticate valid user and return 200 with JWT token', async () => {
		await request(app.getHttpServer())
			.post('/auth/register')
			.send({
				firstName: 'Test',
				lastName: 'User',
				email: 'client@laprizza.com',
				password: 'Password123!',
			})
			.expect(201);

		const response = await request(app.getHttpServer())
			.post('/auth/login')
			.send({
				email: 'client@laprizza.com',
				password: 'Password123!',
			})
			.expect(200);

		expect(response.body).toHaveProperty('token');
		expect(response.body.user.email).toBe('client@laprizza.com');
	});

	it('POST /auth/login - should return 401 Unauthorized for incorrect password', async () => {
		await request(app.getHttpServer())
			.post('/auth/register')
			.send({
				firstName: 'Test',
				lastName: 'User',
				email: 'user_auth@laprizza.com',
				password: 'Password123!',
			})
			.expect(201);

		await request(app.getHttpServer())
			.post('/auth/login')
			.send({
				email: 'user_auth@laprizza.com',
				password: 'WrongPassword!',
			})
			.expect(401);
	});
	it('POST /auth/register - maps domain validation exceptions to 400', async () => {
		const response = await request(app.getHttpServer())
			.post('/auth/register')
			.send({ firstName: '', lastName: 'User', email: 'invalid-name@example.com', password: 'Password123!' })
			.expect(400);

		expect(response.body).toEqual({
			error: { message: 'First name cannot be empty' },
		});
	});

	it('ends only the current session and rejects replayed reads and writes', async () => {
		const credentials = { email: 'logout@example.com', password: 'Password123!' };
		const registered = await request(app.getHttpServer()).post('/auth/register')
			.send({ ...credentials, firstName: 'Original', lastName: 'Owner' }).expect(201);
		const oldToken = registered.body.token;
		const login = await request(app.getHttpServer()).post('/auth/login').send(credentials).expect(200);
		const otherToken = login.body.token;
		const jwt = app.get(JwtService);
		expect(jwt.decode(oldToken).sid).not.toBe(jwt.decode(otherToken).sid);
		const path = `/user/${registered.body.user.username}`;
		await request(app.getHttpServer()).get(path).set('Authorization', `Bearer ${oldToken}`).expect(200);
		await request(app.getHttpServer()).put('/user/me/name').set('Authorization', `Bearer ${oldToken}`)
			.send({ firstName: 'Before', lastName: 'Logout' }).expect(200);
		await request(app.getHttpServer()).post('/auth/logout').set('Authorization', `Bearer ${oldToken}`).expect(204);
		await request(app.getHttpServer()).get(path).set('Authorization', `Bearer ${oldToken}`).expect(401);
		await request(app.getHttpServer()).put('/user/me/name').set('Authorization', `Bearer ${oldToken}`)
			.send({ firstName: 'Unauthorized', lastName: 'Change' }).expect(401);
		await request(app.getHttpServer()).post('/auth/logout').set('Authorization', `Bearer ${oldToken}`).expect(401);
		const current = await request(app.getHttpServer()).get(path).set('Authorization', `Bearer ${otherToken}`).expect(200);
		expect(current.body).toMatchObject({ firstName: 'Before', lastName: 'Logout' });
		expect((await inMemoryRepo.findByUsername(Username.create(registered.body.user.username)))?.name.firstName).toBe('Before');
		// Login-issued tokens follow the same logout path as registration-issued tokens.
		await request(app.getHttpServer()).post('/auth/logout').set('Authorization', `Bearer ${otherToken}`).expect(204);
		await request(app.getHttpServer()).get(path).set('Authorization', `Bearer ${otherToken}`).expect(401);
	});

	it('rejects legacy, missing, mismatched, and expired server sessions', async () => {
		const registered = await request(app.getHttpServer()).post('/auth/register')
			.send({ email: 'sessions@example.com', password: 'Password123!', firstName: 'Session', lastName: 'Owner' }).expect(201);
		const jwt = app.get(JwtService);
		const sub = registered.body.user.username;
		const sid = jwt.decode(registered.body.token).sid;
		const credentials = [
			jwt.sign({ sub }),
			jwt.sign({ sub, sid: '00000000-0000-4000-8000-000000000001' }),
			jwt.sign({ sub: 'other_user', sid }),
			jwt.sign({ sub, sid }, { expiresIn: -1 }),
		];
		for (const token of credentials)
			await request(app.getHttpServer()).get(`/user/${sub}`).set('Authorization', `Bearer ${token}`).expect(401);
		const session = testSessions.sessions.get(sid)!;
		testSessions.sessions.set(sid, AuthSession.reconstitute({ id: sid, username: session.username,
			expiresAt: Timestamp.create(new Date(0)), revokedAt: null }));
		await request(app.getHttpServer()).get(`/user/${sub}`).set('Authorization', `Bearer ${registered.body.token}`).expect(401);
		await request(app.getHttpServer()).post('/auth/logout').expect(401);
	});

	it('does not report successful logout when revocation fails', async () => {
		const registered = await request(app.getHttpServer()).post('/auth/register')
			.send({ email: 'logout-failure@example.com', password: 'Password123!', firstName: 'Session', lastName: 'Owner' }).expect(201);
		const save = jest.spyOn(testSessions, 'save').mockRejectedValueOnce(new Error('Database unavailable'));
		await request(app.getHttpServer()).post('/auth/logout').set('Authorization', `Bearer ${registered.body.token}`).expect(500);
		save.mockRestore();
		await request(app.getHttpServer()).post('/auth/logout').set('Authorization', `Bearer ${registered.body.token}`).expect(204);
	});

	async function invitationActor(role: UserRole, status = UserStatus.ACTIVE) {
		const user = userFixture({ username: Username.create('inviter'), roles: new Set([RoleName.create(role)]), status });
		await inMemoryRepo.save(user);
		return signSession(app.get(JwtService), { sub: user.username.value });
	}

	it.each([UserRole.MANAGER])('allows %s to invite, replace a pending role and complete normal registration', async role => {
		const token = await invitationActor(role);
		const invite = await request(app.getHttpServer()).post('/auth/invite').set('Authorization', `Bearer ${token}`)
			.send({ email: '  invited@example.com ', roleName: 'employee' }).expect(201);
		expect(invite.body).toMatchObject({ email: 'invited@example.com', roles: ['EMPLOYEE'], status: 'PENDING_REGISTRATION' });
		expect(invite.body).not.toHaveProperty('passwordHash');
		expect(sendInvitation).toHaveBeenCalledWith('invited@example.com', 'EMPLOYEE');
		await request(app.getHttpServer()).post('/auth/login').send({ email: 'invited@example.com', password: 'Password123!' }).expect(400);
		const updated = await request(app.getHttpServer()).post('/auth/invite').set('Authorization', `Bearer ${token}`)
			.send({ email: 'INVITED@example.com', roleName: 'MANAGER' }).expect(201);
		expect(updated.body.username).toBe(invite.body.username);
		expect(updated.body.roles).toEqual(['MANAGER']);
		expect(sendInvitation).toHaveBeenLastCalledWith('invited@example.com', 'MANAGER');
		const registered = await request(app.getHttpServer()).post('/auth/register')
			.send({ email: 'invited@example.com', firstName: 'Jamie', lastName: 'Wilson', password: 'Password123!' }).expect(201);
		expect(registered.body.user).toMatchObject({ firstName: 'Jamie', lastName: 'Wilson', roles: ['MANAGER'], status: 'ACTIVE' });
		await request(app.getHttpServer()).post('/auth/invite').set('Authorization', `Bearer ${token}`)
			.send({ email: 'invited@example.com', roleName: 'EMPLOYEE' }).expect(409);
		expect(sendInvitation).toHaveBeenCalledTimes(2);
	});

	it.each([UserRole.CUSTOMER, UserRole.EMPLOYEE])('rejects %s invitations', async role => {
		const token = await invitationActor(role);
		await request(app.getHttpServer()).post('/auth/invite').set('Authorization', `Bearer ${token}`)
			.send({ email: 'forbidden@example.com', roleName: 'MANAGER' }).expect(403);
		expect(sendInvitation).not.toHaveBeenCalled();
	});

	it('requires an active authenticated inviter and validates email and role', async () => {
		const body = { email: 'invite@example.com', roleName: 'EMPLOYEE' };
		await request(app.getHttpServer()).post('/auth/invite').send(body).expect(401);
		const token = await invitationActor(UserRole.MANAGER, UserStatus.DEACTIVATED);
		await request(app.getHttpServer()).post('/auth/invite').set('Authorization', `Bearer ${token}`).send(body).expect(403);
		const active = await invitationActor(UserRole.MANAGER);
		for (const invalid of [{ ...body, email: 'invalid' }, { email: body.email }, { ...body, roleName: 'OWNER' }, { ...body, roleName: 123 }])
			await request(app.getHttpServer()).post('/auth/invite').set('Authorization', `Bearer ${active}`).send(invalid).expect(400);
		expect(sendInvitation).not.toHaveBeenCalled();
	});

	it('reports email failure and lets the inviter retry the saved pending invitation', async () => {
		const token = await invitationActor(UserRole.MANAGER);
		const { ServiceUnavailableException } = await import('@nestjs/common');
		sendInvitation.mockRejectedValueOnce(new ServiceUnavailableException('Invitation email could not be sent.'));
		const body = { email: 'retry@example.com', roleName: 'EMPLOYEE' };
		await request(app.getHttpServer()).post('/auth/invite').set('Authorization', `Bearer ${token}`).send(body).expect(503);
		expect((await inMemoryRepo.findByEmail(Email.create(body.email).getValue()))?.status).toBe(UserStatus.PENDING_REGISTRATION);
		await request(app.getHttpServer()).post('/auth/invite').set('Authorization', `Bearer ${token}`).send(body).expect(201);
	});

	it('records creation and registration completion using the correct actor and no event on invitation resend', async () => {
		const token = await invitationActor(UserRole.MANAGER);
		const invite = { email: 'status-invite@example.com', roleName: 'EMPLOYEE' };
		await request(app.getHttpServer()).post('/auth/invite').set('Authorization', `Bearer ${token}`).send(invite).expect(201);
		await request(app.getHttpServer()).post('/auth/invite').set('Authorization', `Bearer ${token}`).send({ ...invite, roleName: 'MANAGER' }).expect(201);
		expect(testStatusAssignmentRepository.entries).toEqual([
			{ assigned_from: 'inviter', assigned_to: invite.email, status: UserStatus.PENDING_REGISTRATION },
		]);
		const completed = await request(app.getHttpServer()).post('/auth/register')
			.send({ email: invite.email, firstName: 'Invited', lastName: 'Person', password: 'Password123!' }).expect(201);
		expect(testStatusAssignmentRepository.entries[1]).toEqual({ assigned_from: completed.body.user.username, assigned_to: invite.email, status: UserStatus.ACTIVE });
		const created = await request(app.getHttpServer()).post('/auth/register')
			.send({ email: 'self-status@example.com', firstName: 'Self', lastName: 'Registration', password: 'Password123!' }).expect(201);
		expect(testStatusAssignmentRepository.entries[2]).toEqual({ assigned_from: created.body.user.username, assigned_to: 'self-status@example.com', status: UserStatus.ACTIVE });
		await request(app.getHttpServer()).post('/auth/pre_register').set('Authorization', `Bearer ${token}`)
			.send({ email: 'legacy-status@example.com', firstName: 'Legacy', lastName: 'Invite', roleName: 'EMPLOYEE' }).expect(201);
		expect(testStatusAssignmentRepository.entries[3]).toEqual({ assigned_from: 'inviter', assigned_to: 'legacy-status@example.com', status: UserStatus.PENDING_REGISTRATION });
	});

	it('does not record invalid creation, and reports history failure after a successful account insert', async () => {
		const body = { email: 'status-failure@example.com', firstName: 'History', lastName: 'Failure', password: 'Password123!' };
		await request(app.getHttpServer()).post('/auth/register').send({ ...body, password: 'weak' }).expect(400);
		expect(testStatusAssignmentRepository.entries).toEqual([]);
		const record = jest.spyOn(testStatusAssignmentRepository, 'record').mockRejectedValueOnce(new Error('Status history unavailable'));
		await request(app.getHttpServer()).post('/auth/register').send(body).expect(500);
		record.mockRestore();
		expect((await inMemoryRepo.findByEmail(Email.create(body.email).getValue()))?.status).toBe(UserStatus.ACTIVE);
	});

	const statusCases = [
		[UserRole.ADMINISTRATOR, UserStatus.ACTIVE, 200, 403],
		[UserRole.ADMINISTRATOR, UserStatus.DEACTIVATED, 403, 403],
		[UserRole.ADMINISTRATOR, UserStatus.PENDING_REGISTRATION, 400, 403],
		[UserRole.MANAGER, UserStatus.ACTIVE, 200, 201],
		[UserRole.EMPLOYEE, UserStatus.ACTIVE, 200, 403],
		[UserRole.MANAGER, UserStatus.DEACTIVATED, 403, 403],
		[UserRole.MANAGER, UserStatus.PENDING_REGISTRATION, 400, 403],
		[UserRole.CUSTOMER, UserStatus.ACTIVE, 200, 403],
		[UserRole.CUSTOMER, UserStatus.DEACTIVATED, 403, 403],
		[UserRole.CUSTOMER, UserStatus.PENDING_REGISTRATION, 400, 403],
	] as const;

	it.each(statusCases)('login and invitation access for %s with status %s', async (role, status, loginStatus, inviteStatus) => {
		const passwordHash = PasswordHash.create(await app.get<IPasswordHasher>(PASSWORD_HASHER).hash('Manager123!')).getValue();
		const email = Email.create(`${role.toLowerCase()}-${status.toLowerCase()}@example.com`).getValue();
		const props = {
			username: Username.create(`${role.toLowerCase()}_${status.toLowerCase()}`), email, passwordHash,
			roles: new Set([RoleName.create(role)]), status: UserStatus.ACTIVE,
		};
		const activeUser = userFixture(props);
		await inMemoryRepo.save(activeUser);
		// Issue the token before changing database status, to test existing sessions.
		const token = signSession(app.get(JwtService), { sub: activeUser.username.value, roles: [role], status: UserStatus.ACTIVE });
		await inMemoryRepo.save(userFixture({ ...props, status }));

		const login = await request(app.getHttpServer())
			.post('/auth/login')
			.send({ email: email.address, password: 'Manager123!' })
			.expect(loginStatus);
		if (loginStatus === 200) {
			expect(login.body.user.roles).toEqual([role]);
			expect(login.body.user.status).toBe(status);
			expect(login.body.token).toEqual(expect.any(String));
		} else {
			expect(login.body).not.toHaveProperty('token');
			expect(login.body.error.message).toBe(status === UserStatus.DEACTIVATED
				? 'User account is deactivated'
				: 'Registration is pending. Please complete your registration via the invitation link.');
		}

		const invite = await request(app.getHttpServer())
			.post('/auth/pre_register')
			.set('Authorization', `Bearer ${token}`)
			.send({ firstName: 'New', lastName: 'Staff', email: 'new-staff@example.com', roleName: 'EMPLOYEE' })
			.expect(inviteStatus);
		if (inviteStatus === 201) {
			expect(invite.body.status).toBe(UserStatus.PENDING_REGISTRATION);
			expect(invite.body.roles).toEqual([UserRole.EMPLOYEE]);
		} else {
			expect(invite.body.error.message).toBe('You do not have permission to do this.');
			expect(await inMemoryRepo.findByEmail(Email.create('new-staff@example.com').getValue())).toBeNull();
		}
	});
});
