import { STATUS_ASSIGNMENT_REPOSITORY } from '../../src/application/user/IStatusAssignmentRepository';
import { LOGIN_ATTEMPT_STORE } from '../../src/application/auth/ILoginAttemptStore';
import { testLoginAttempts } from '../helpers/login-attempts';
import { testStatusAssignmentRepository } from '../helpers/status-assignments';
import { INestApplication, Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { AppModule } from '../../src/presentation/app.module';
import { USER_REPOSITORY } from '../../src/application/auth/AuthDTOs';
import { AUTH_SESSION_REPOSITORY } from '../../src/application/auth/IAuthSessionRepository';
import { UNAUTHORIZED_ATTEMPT_REPOSITORY } from '../../src/application/auth/IUnauthorizedAttemptRepository';
import { InMemoryUserRepository } from '../../src/infrastructure/persistence/repositories/InMemoryUserRepository';
import { Email } from '../../src/domain/common/Email';
import { Username } from '../../src/domain/user/Username';
import { RoleName } from '../../src/domain/user/RoleName';
import { UserStatus } from '../../src/domain/user/UserStatus';
import { userFixture } from '../helpers/domain';
import { mockDataSource } from '../helpers/mock-data-source';
import { testSessions, signSession } from '../helpers/auth-sessions';
import { testUnauthorizedAttempts } from '../helpers/unauthorized-attempts';

describe('Unauthorized endpoint attempt auditing', () => {
	let app: INestApplication;
	let jwt: JwtService;
	const tokens: Record<string, string> = {};

	beforeAll(async () => {
		const users = new InMemoryUserRepository();
		for (const [username, role, status] of [
			['customer_a', 'CUSTOMER', UserStatus.ACTIVE],
			['customer_b', 'CUSTOMER', UserStatus.ACTIVE],
			['administrator_a', 'ADMINISTRATOR', UserStatus.ACTIVE],
			['inactive_manager', 'MANAGER', UserStatus.DEACTIVATED],
		] as const) {
			await users.insert(userFixture({ username: Username.create(username), email: Email.create(`${username}@example.test`).getValue(), roles: new Set([RoleName.create(role)]), status }));
		}
		const module = await Test.createTestingModule({ imports: [AppModule] })
			.overrideProvider(USER_REPOSITORY).useValue(users)
			.overrideProvider(LOGIN_ATTEMPT_STORE).useValue(testLoginAttempts)
			.overrideProvider(AUTH_SESSION_REPOSITORY).useValue(testSessions)
			.overrideProvider(UNAUTHORIZED_ATTEMPT_REPOSITORY).useValue(testUnauthorizedAttempts)
			.overrideProvider(STATUS_ASSIGNMENT_REPOSITORY).useValue(testStatusAssignmentRepository)
			.overrideProvider(DataSource).useValue(mockDataSource).compile();
		jwt = module.get(JwtService);
		for (const username of ['customer_a', 'customer_b', 'administrator_a', 'inactive_manager'])
			tokens[username] = signSession(jwt, { sub: username });
		app = module.createNestApplication();
		await app.init();
	});
	beforeEach(() => { testUnauthorizedAttempts.entries.length = 0; });
	afterEach(() => { jest.restoreAllMocks(); });
	afterAll(async () => { await app?.close(); });

	it('records one row per role-denied request using the authenticated user, not request input', async () => {
		for (let index = 0; index < 2; index++) {
			const res = await request(app.getHttpServer()).get('/users?token=secret&user=manager_a')
				.set('Authorization', `Bearer ${tokens.customer_a}`).expect(403);
			expect(res.body).toEqual({ error: { message: 'You do not have permission to do this.' } });
		}
		expect(testUnauthorizedAttempts.entries).toHaveLength(2);
		expect(testUnauthorizedAttempts.entries).toEqual([
			{ user: 'customer_a', timestamp: expect.any(Date), endpoint: 'GET /users' },
			{ user: 'customer_a', timestamp: expect.any(Date), endpoint: 'GET /users' },
		]);
	});

	it('records denied mutation endpoints without request payloads or spoofed identity', async () => {
		await request(app.getHttpServer()).post('/auth/pre_register?token=private')
			.set('Authorization', `Bearer ${tokens.customer_a}`)
			.send({ firstName: 'Private', lastName: 'Payload', email: 'private@example.test', roleName: 'EMPLOYEE', user: 'manager_a' }).expect(403);
		expect(testUnauthorizedAttempts.entries).toEqual([
			{ user: 'customer_a', timestamp: expect.any(Date), endpoint: 'POST /auth/pre_register' },
		]);
	});

	it('records status denials and controller ownership denials', async () => {
		await request(app.getHttpServer()).get('/users').set('Authorization', `Bearer ${tokens.inactive_manager}`).expect(403);
		await request(app.getHttpServer()).get('/user/customer_b?password=secret')
			.set('Authorization', `Bearer ${tokens.customer_a}`).expect(403);
		expect(testUnauthorizedAttempts.entries.map(({ user, endpoint }) => ({ user, endpoint }))).toEqual([
			{ user: 'inactive_manager', endpoint: 'GET /users' },
			{ user: 'customer_a', endpoint: 'GET /user/:username' },
		]);
	});

	it('does not log allowed requests, missing/invalid credentials, or revoked sessions', async () => {
		await request(app.getHttpServer()).get('/users').set('Authorization', `Bearer ${tokens.administrator_a}`).expect(200);
		await request(app.getHttpServer()).get('/users').expect(401);
		await request(app.getHttpServer()).get('/users').set('Authorization', 'Bearer invalid').expect(401);
		const revoked = signSession(jwt, { sub: 'customer_a' });
		await request(app.getHttpServer()).post('/auth/logout').set('Authorization', `Bearer ${revoked}`).expect(204);
		await request(app.getHttpServer()).get('/users').set('Authorization', `Bearer ${revoked}`).expect(401);
		await request(app.getHttpServer()).post('/auth/login')
			.send({ email: 'inactive_manager@example.test', password: 'NotUsed1!' }).expect(403);
		expect(testUnauthorizedAttempts.entries).toEqual([]);
	});

	it('keeps the operation forbidden and reports a generic diagnostic if audit storage fails', async () => {
		const diagnostic = jest.spyOn(Logger.prototype, 'error').mockImplementation();
		jest.spyOn(testUnauthorizedAttempts, 'record').mockRejectedValueOnce(new Error('Private database details'));
		const response = await request(app.getHttpServer()).get('/users').set('Authorization', `Bearer ${tokens.customer_a}`).expect(403);
		expect(response.body).toEqual({ error: { message: 'You do not have permission to do this.' } });
		expect(diagnostic).toHaveBeenCalledWith('Failed to persist unauthorized access attempt.');
	});
});
