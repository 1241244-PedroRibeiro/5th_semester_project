import { StatusAssignmentService } from '../../src/application/user/StatusAssignmentService';
import { testStatusAssignments, testStatusAssignmentRepository } from '../helpers/status-assignments';
import { RolesAssignmentService } from '../../src/application/user/RolesAssignmentService';
import { testRolesAssignments, testRolesAssignmentRepository } from '../helpers/roles-assignments';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { UserController } from '../../src/presentation/http/controllers/UserController';
import { UserService } from '../../src/application/user/UserService';
import { USER_REPOSITORY, PASSWORD_HASHER } from '../../src/application/auth/AuthDTOs';
import { AUTH_SESSION_REPOSITORY } from '../../src/application/auth/IAuthSessionRepository';
import { InMemoryUserRepository } from '../../src/infrastructure/persistence/repositories/InMemoryUserRepository';
import { AuthGuard } from '../../src/presentation/auth.guard';
import { RolesGuard } from '../../src/presentation/http/middlewares/roles.guard';
import { StatusGuard } from '../../src/presentation/http/middlewares/UserStatus.guard';
import { GlobalExceptionFilter } from '../../src/presentation/global_exception.filter';
import { Username } from '../../src/domain/user/Username';
import { RoleName } from '../../src/domain/user/RoleName';
import { Email } from '../../src/domain/common/Email';
import { UserStatus } from '../../src/domain/user/UserStatus';
import { userFixture } from '../helpers/domain';
import { testUnauthorizedAttempts } from '../helpers/unauthorized-attempts';
import { testSessions, signSession } from '../helpers/auth-sessions';
import { passwordHasher } from '../helpers/password-hasher';

describe('User role management HTTP security', () => {
	let app: INestApplication;
	let repo: InMemoryUserRepository;
	const jwt = new JwtService({ secret: 'role-management-test-secret' });
	beforeAll(async () => {
		repo = new InMemoryUserRepository();
		const module = await Test.createTestingModule({ controllers: [UserController], providers: [
			UserService, { provide: StatusAssignmentService, useValue: testStatusAssignments }, { provide: RolesAssignmentService, useValue: testRolesAssignments }, { provide: USER_REPOSITORY, useValue: repo }, { provide: PASSWORD_HASHER, useValue: passwordHasher },
			{ provide: 'AllergenService', useValue: {} }, { provide: AUTH_SESSION_REPOSITORY, useValue: testSessions }, { provide: JwtService, useValue: jwt },
			{ provide: APP_GUARD, useClass: AuthGuard }, { provide: APP_GUARD, useClass: RolesGuard }, { provide: APP_GUARD, useClass: StatusGuard },
		] }).compile();
		app = module.createNestApplication(); app.useGlobalFilters(new GlobalExceptionFilter(testUnauthorizedAttempts)); await app.init();
	});
	beforeEach(async () => {
		testSessions.sessions.clear();
		testRolesAssignmentRepository.entries.length = 0;
		testStatusAssignmentRepository.entries.length = 0;
		for (const role of ['ADMINISTRATOR', 'MANAGER', 'EMPLOYEE', 'CUSTOMER']) {
			const username = role.toLowerCase();
			await repo.save(userFixture({ username: Username.create(username), email: Email.create(`${username}@example.com`).getValue(), roles: new Set([RoleName.create(role)]) }));
		}
	});
	afterAll(async () => { await app?.close(); });
	const put = (actor = 'manager', username = 'customer') => request(app.getHttpServer()).put(`/users/${username}/roles`)
		.set('Authorization', `Bearer ${signSession(jwt, { sub: actor })}`);

	it('adds roles, replaces the only role, and applies changes to existing bearer sessions', async () => {
		const token = signSession(jwt, { sub: 'customer' });
		await put().send({ roles: ['CUSTOMER', 'MANAGER', 'MANAGER'] }).expect(200)
			.expect(response => expect(response.body.roles).toEqual(['CUSTOMER', 'MANAGER']));
		const managerRequest = () => request(app.getHttpServer()).get('/user/customer/allergens').set('Authorization', `Bearer ${token}`);
		await managerRequest().expect(200);
		await put().send({ roles: ['EMPLOYEE'] }).expect(200)
			.expect(response => expect(response.body.roles).toEqual(['EMPLOYEE']));
		await managerRequest().expect(403);
		const stored = (await repo.findByUsername(Username.create('customer')))!;
		expect([...stored.roles].map(role => role.name)).toEqual(['EMPLOYEE']);
		expect(stored.status).toBe(UserStatus.ACTIVE);
	});

	it('records actor, recipient email and each distinct saved role, preserving previous history', async () => {
		await put().send({ roles: ['CUSTOMER', 'EMPLOYEE', 'EMPLOYEE'] }).expect(200);
		expect(testRolesAssignmentRepository.entries).toEqual([
			{ assigned_from: 'manager', assigned_to: 'customer@example.com', role: 'CUSTOMER' },
			{ assigned_from: 'manager', assigned_to: 'customer@example.com', role: 'EMPLOYEE' },
		]);
		await put().send({ roles: ['MANAGER'] }).expect(200);
		expect(testRolesAssignmentRepository.entries).toHaveLength(3);
		expect(testRolesAssignmentRepository.entries[2]).toEqual({ assigned_from: 'manager', assigned_to: 'customer@example.com', role: 'MANAGER' });
	});

	it('does not record denied, invalid or unsaved role changes', async () => {
		await put('administrator').send({ roles: ['MANAGER'] }).expect(403);
		await put().send({ roles: [] }).expect(400);
		await put('manager', 'missing').send({ roles: ['MANAGER'] }).expect(404);
		const save = jest.spyOn(repo, 'save').mockRejectedValueOnce(new Error('Role save failed'));
		await put().send({ roles: ['MANAGER'] }).expect(500);
		save.mockRestore();
		expect(testRolesAssignmentRepository.entries).toEqual([]);
	});

	it('reports history persistence failure after the role save, rather than reporting success', async () => {
		const record = jest.spyOn(testRolesAssignmentRepository, 'record').mockRejectedValueOnce(new Error('History save failed'));
		await put().send({ roles: ['MANAGER'] }).expect(500);
		record.mockRestore();
		expect([...(await repo.findByUsername(Username.create('customer')))!.roles].map(role => role.name)).toEqual(['MANAGER']);
		expect(testRolesAssignmentRepository.entries).toEqual([]);
	});

	it.each(['administrator', 'employee', 'customer'])('forbids %s role changes', async actor => {
		await put(actor).send({ roles: ['ADMINISTRATOR'] }).expect(403);
	});

	it('requires authentication and an active manager', async () => {
		await request(app.getHttpServer()).put('/user/customer/roles').send({ roles: ['MANAGER'] }).expect(401);
		const manager = (await repo.findByUsername(Username.create('manager')))!;
		manager.deactivate(); await repo.save(manager);
		await put().send({ roles: ['MANAGER'] }).expect(403);
	});

	it('rejects invalid/empty roles without changing stored assignments, and returns 404 for missing users', async () => {
		for (const body of [{}, { roles: [] }, { roles: 'MANAGER' }, { roles: ['OWNER'] }, { roles: [null] }, { roles: ['MANAGER'], status: 'ACTIVE' }])
			await put().send(body).expect(400);
		expect([...(await repo.findByUsername(Username.create('customer')))!.roles].map(role => role.name)).toEqual(['CUSTOMER']);
		await put('manager', 'missing').send({ roles: ['MANAGER'] }).expect(404);
	});

	it('allows pending role edits but blocks deactivated role edits until administrator reactivation', async () => {
		await repo.save(userFixture({ username: Username.create('pending'), status: UserStatus.PENDING_REGISTRATION }));
		await put('manager', 'pending').send({ roles: ['MANAGER', 'EMPLOYEE'] }).expect(200)
			.expect(response => expect(response.body.status).toBe('PENDING_REGISTRATION'));
		await request(app.getHttpServer()).delete('/user/customer').set('Authorization', `Bearer ${signSession(jwt, { sub: 'administrator' })}`).expect(200);
		await put().send({ roles: ['MANAGER'] }).expect(409);
		const stored = (await repo.findByUsername(Username.create('customer')))!;
		expect([...stored.roles].map(role => role.name)).toEqual(['CUSTOMER']);
		const token = signSession(jwt, { sub: 'customer' });
		await request(app.getHttpServer()).get('/user/me/contact-details').set('Authorization', `Bearer ${token}`).expect(403);
		await request(app.getHttpServer()).post('/user/customer/reactivate')
			.set('Authorization', `Bearer ${signSession(jwt, { sub: 'administrator' })}`).expect(204);
		const reactivated = (await repo.findByUsername(Username.create('customer')))!;
		expect(reactivated.status).toBe(UserStatus.ACTIVE);
		expect(reactivated.passwordHash!.hashedValue).toBe(stored.passwordHash!.hashedValue);
		expect([...reactivated.roles].map(role => role.name)).toEqual(['CUSTOMER']);
		await request(app.getHttpServer()).get('/user/me/contact-details').set('Authorization', `Bearer ${token}`).expect(200);
		await put().send({ roles: ['MANAGER'] }).expect(200);
	});

	it.each(['manager', 'employee', 'customer'])('forbids %s account reactivation', async actor => {
		await request(app.getHttpServer()).post('/user/customer/reactivate')
			.set('Authorization', `Bearer ${signSession(jwt, { sub: actor })}`).expect(403);
	});

	it('requires authentication/active manager and refuses active, pending and missing targets', async () => {
		await request(app.getHttpServer()).post('/user/customer/reactivate').expect(401);
		const reactivate = (target: string) => request(app.getHttpServer()).post(`/user/${target}/reactivate`)
			.set('Authorization', `Bearer ${signSession(jwt, { sub: 'administrator' })}`);
		await reactivate('customer').expect(409);
		await repo.save(userFixture({ username: Username.create('pending_reactivate'), status: UserStatus.PENDING_REGISTRATION }));
		await reactivate('pending_reactivate').expect(409);
		await reactivate('missing').expect(404);
		expect((await repo.findByUsername(Username.create('pending_reactivate')))!.status).toBe(UserStatus.PENDING_REGISTRATION);
		const administrator = (await repo.findByUsername(Username.create('administrator')))!;
		administrator.deactivate(); await repo.save(administrator);
		await reactivate('customer').expect(403);
	});

	it('records each actual status change once using the authenticated actor', async () => {
		const token = signSession(jwt, { sub: 'administrator' });
		const deactivate = () => request(app.getHttpServer()).delete('/user/customer').set('Authorization', `Bearer ${token}`);
		await deactivate().expect(200);
		await deactivate().expect(200);
		expect(testStatusAssignmentRepository.entries).toEqual([
			{ assigned_from: 'administrator', assigned_to: 'customer@example.com', status: UserStatus.DEACTIVATED },
		]);
		await request(app.getHttpServer()).post('/user/customer/reactivate').set('Authorization', `Bearer ${token}`)
			.send({ assigned_from: 'spoofed-user' }).expect(204);
		expect(testStatusAssignmentRepository.entries[1]).toEqual({ assigned_from: 'administrator', assigned_to: 'customer@example.com', status: UserStatus.ACTIVE });
	});

	it('does not record denied or failed status changes, and propagates history failure after save', async () => {
		const token = signSession(jwt, { sub: 'administrator' });
		await request(app.getHttpServer()).post('/user/customer/reactivate').set('Authorization', `Bearer ${token}`).expect(409);
		await request(app.getHttpServer()).post('/user/customer/reactivate').expect(401);
		const save = jest.spyOn(repo, 'save').mockRejectedValueOnce(new Error('Status save failed'));
		await request(app.getHttpServer()).delete('/user/customer').set('Authorization', `Bearer ${token}`).expect(500);
		save.mockRestore();
		expect(testStatusAssignmentRepository.entries).toEqual([]);
		// In-memory aggregates are mutable; restore ACTIVE explicitly after the simulated save failure.
		const customer = (await repo.findByUsername(Username.create('customer')))!;
		customer.activate(); await repo.save(customer);
		const record = jest.spyOn(testStatusAssignmentRepository, 'record').mockRejectedValueOnce(new Error('Status history failed'));
		await request(app.getHttpServer()).delete('/user/customer').set('Authorization', `Bearer ${token}`).expect(500);
		record.mockRestore();
		expect((await repo.findByUsername(Username.create('customer')))!.status).toBe(UserStatus.DEACTIVATED);
	});

	it('keeps the acting manager role while allowing other own-role changes', async () => {
		await put('manager', 'manager').send({ roles: ['EMPLOYEE'] }).expect(409);
	});
});
