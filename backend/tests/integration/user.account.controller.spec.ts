import { StatusAssignmentService } from '../../src/application/user/StatusAssignmentService';
import { testStatusAssignments } from '../helpers/status-assignments';
import { RolesAssignmentService } from '../../src/application/user/RolesAssignmentService';
import { testRolesAssignments } from '../helpers/roles-assignments';
import { testUnauthorizedAttempts } from '../helpers/unauthorized-attempts';
import { AUTH_SESSION_REPOSITORY } from '../../src/application/auth/IAuthSessionRepository';
import { testSessions, signSession } from '../helpers/auth-sessions';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { UserController } from '../../src/presentation/http/controllers/UserController';
import { UserService } from '../../src/application/user/UserService';
import { USER_REPOSITORY, PASSWORD_HASHER } from '../../src/application/auth/AuthDTOs';
import { InMemoryUserRepository } from '../../src/infrastructure/persistence/repositories/InMemoryUserRepository';
import { Argon2Hasher } from '../../src/infrastructure/security/Argon2Hasher';
import { AuthGuard } from '../../src/presentation/auth.guard';
import { RolesGuard } from '../../src/presentation/http/middlewares/roles.guard';
import { StatusGuard } from '../../src/presentation/http/middlewares/UserStatus.guard';
import { GlobalExceptionFilter } from '../../src/presentation/global_exception.filter';
import { Username } from '../../src/domain/user/Username';
import { RoleName } from '../../src/domain/user/RoleName';
import { Email } from '../../src/domain/common/Email';
import { PasswordHash } from '../../src/domain/user/PasswordHash';
import { UserStatus } from '../../src/domain/user/UserStatus';
import { userFixture } from '../helpers/domain';

describe('Self-service account HTTP security', () => {
	let app: INestApplication;
	let repo: InMemoryUserRepository;
	const jwt = new JwtService({ secret: 'account-endpoint-test-secret' });
	const hasher = new Argon2Hasher();
	const currentPassword = 'CurrentPassword1!';
	beforeAll(async () => {
		repo = new InMemoryUserRepository();
		const hash = PasswordHash.create(await hasher.hash(currentPassword)).getValue();
		for (const role of ['CUSTOMER', 'MANAGER', 'EMPLOYEE']) {
			const username = role.toLowerCase();
			await repo.insert(userFixture({ username: Username.create(username), email: Email.create(`${username}@example.com`).getValue(), passwordHash: hash, roles: new Set([RoleName.create(role)]) }));
		}
		await repo.insert(userFixture({ username: Username.create('inactive'), email: Email.create('inactive@example.com').getValue(), passwordHash: hash, status: UserStatus.DEACTIVATED }));
		const module = await Test.createTestingModule({ controllers: [UserController], providers: [
			UserService, { provide: StatusAssignmentService, useValue: testStatusAssignments }, { provide: RolesAssignmentService, useValue: testRolesAssignments }, { provide: USER_REPOSITORY, useValue: repo }, { provide: PASSWORD_HASHER, useValue: hasher },
			{ provide: 'AllergenService', useValue: {} }, { provide: AUTH_SESSION_REPOSITORY, useValue: testSessions }, { provide: JwtService, useValue: jwt },
			{ provide: APP_GUARD, useClass: AuthGuard }, { provide: APP_GUARD, useClass: RolesGuard }, { provide: APP_GUARD, useClass: StatusGuard },
		] }).compile();
		app = module.createNestApplication(); app.useGlobalFilters(new GlobalExceptionFilter(testUnauthorizedAttempts)); await app.init();
	});
	afterAll(async () => { await app?.close(); });
	it.each(['customer', 'manager', 'employee'])('updates only the current user for %s with real password verification', async username => {
		const token = signSession(jwt, { sub: username });
		const put = (field: string) => request(app.getHttpServer()).put(`/user/me/${field}`).set('Authorization', `Bearer ${token}`);
		await put('name').send({ firstName: 'Updated', lastName: username }).expect(200);
		await put('email').send({ email: `${username}.new@example.com`, currentPassword: 'wrong' }).expect(403);
		const email = await put('email').send({ email: `${username}.new@example.com`, currentPassword }).expect(200);
		expect(email.body).toMatchObject({ username, email: `${username}.new@example.com`, firstName: 'Updated' });
		await put('password').send({ currentPassword: 'wrong', newPassword: 'NewPassword2!' }).expect(403);
		await put('password').send({ currentPassword, newPassword: 'weak' }).expect(400);
		const password = await put('password').send({ currentPassword, newPassword: 'NewPassword2!' }).expect(200);
		expect(password.body).not.toHaveProperty('passwordHash');
		expect(JSON.stringify(password.body)).not.toContain('NewPassword2!');
		const stored = (await repo.findByUsername(Username.create(username)))!;
		expect(stored.passwordHash!.hashedValue).toMatch(/^\$argon2id\$/);
		expect(await hasher.compare('NewPassword2!', stored.passwordHash!.hashedValue)).toBe(true);
		expect(await hasher.compare(currentPassword, stored.passwordHash!.hashedValue)).toBe(false);
	});
	it.each(['name', 'email', 'password'])('requires an authenticated active user for %s', async field => {
		await request(app.getHttpServer()).put(`/user/me/${field}`).send({}).expect(401);
		await request(app.getHttpServer()).put(`/user/me/${field}`).set('Authorization', `Bearer ${signSession(jwt, { sub: 'inactive' })}`).send({}).expect(403);
	});
	it('rejects invalid names, duplicate email and attempts to select another user', async () => {
		const token = signSession(jwt, { sub: 'manager' });
		await request(app.getHttpServer()).put('/user/me/name').set('Authorization', `Bearer ${token}`).send({ firstName: ' ', lastName: 'Valid' }).expect(400);
		await request(app.getHttpServer()).put('/user/me/name').set('Authorization', `Bearer ${token}`).send({ firstName: 'Name', lastName: 'Other', username: 'customer' }).expect(400);
		await request(app.getHttpServer()).put('/user/me/email').set('Authorization', `Bearer ${token}`).send({ email: 'customer.new@example.com', currentPassword: 'NewPassword2!' }).expect(409);
	});
});
