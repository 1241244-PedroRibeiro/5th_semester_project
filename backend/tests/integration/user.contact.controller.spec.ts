import { StatusAssignmentService } from '../../src/application/user/StatusAssignmentService';
import { testStatusAssignments } from '../helpers/status-assignments';
import { RolesAssignmentService } from '../../src/application/user/RolesAssignmentService';
import { testRolesAssignments } from '../helpers/roles-assignments';
import { testUnauthorizedAttempts } from '../helpers/unauthorized-attempts';
import { AUTH_SESSION_REPOSITORY } from '../../src/application/auth/IAuthSessionRepository';
import { testSessions, signSession } from '../helpers/auth-sessions';
import { PASSWORD_HASHER } from '../../src/application/auth/AuthDTOs';
import { passwordHasher } from '../helpers/password-hasher';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { UserController } from '../../src/presentation/http/controllers/UserController';
import { UserService } from '../../src/application/user/UserService';
import { USER_REPOSITORY } from '../../src/application/auth/AuthDTOs';
import { InMemoryUserRepository } from '../../src/infrastructure/persistence/repositories/InMemoryUserRepository';
import { AuthGuard } from '../../src/presentation/auth.guard';
import { RolesGuard } from '../../src/presentation/http/middlewares/roles.guard';
import { StatusGuard } from '../../src/presentation/http/middlewares/UserStatus.guard';
import { GlobalExceptionFilter } from '../../src/presentation/global_exception.filter';
import { Username } from '../../src/domain/user/Username';
import { RoleName } from '../../src/domain/user/RoleName';
import { UserStatus } from '../../src/domain/user/UserStatus';
import { userFixture } from '../helpers/domain';

describe('Self-service user contact endpoints', () => {
	let app: INestApplication;
	let repo: InMemoryUserRepository;
	const jwt = new JwtService({ secret: 'contact-endpoint-test-secret' });
	const address = { street: 'Rua Nova', postalCode: '1000-001', city: 'Lisbon', extraDetails: '' };
	beforeAll(async () => {
		repo = new InMemoryUserRepository();
		for (const [username, role, status] of [
			['customer_e', 'CUSTOMER', UserStatus.ACTIVE],
			['manager_e', 'MANAGER', UserStatus.ACTIVE],
			['administrator_e', 'ADMINISTRATOR', UserStatus.ACTIVE],
			['mixed_e', 'ADMINISTRATOR', UserStatus.ACTIVE],
			['employee_e', 'EMPLOYEE', UserStatus.ACTIVE],
			['inactive_e', 'CUSTOMER', UserStatus.DEACTIVATED],
		] as const) {
			await repo.save(userFixture({ username: Username.create(username), roles: new Set([RoleName.create(role), ...(username === 'mixed_e' ? [RoleName.create('MANAGER')] : [])]), status }));
		}
		const module = await Test.createTestingModule({
			controllers: [UserController],
			providers: [
				UserService, { provide: StatusAssignmentService, useValue: testStatusAssignments }, { provide: RolesAssignmentService, useValue: testRolesAssignments },
				{ provide: PASSWORD_HASHER, useValue: passwordHasher },
				{ provide: USER_REPOSITORY, useValue: repo },
				{ provide: 'AllergenService', useValue: { checkAllergens: jest.fn().mockResolvedValue(['Gluten']) } },
				{ provide: AUTH_SESSION_REPOSITORY, useValue: testSessions }, { provide: JwtService, useValue: jwt },
				{ provide: APP_GUARD, useClass: AuthGuard },
				{ provide: APP_GUARD, useClass: RolesGuard },
				{ provide: APP_GUARD, useClass: StatusGuard },
			],
		}).compile();
		app = module.createNestApplication();
		app.useGlobalFilters(new GlobalExceptionFilter(testUnauthorizedAttempts));
		await app.init();
	});
	it('limits managers to customer identity and dietary information', async () => {
		const token = signSession(jwt, { sub: 'manager_e' });
		const customer = await request(app.getHttpServer()).get('/user/customer_e')
			.set('Authorization', `Bearer ${token}`).expect(200);
		expect(customer.body).toEqual({ username: 'customer_e', firstName: expect.any(String), lastName: expect.any(String) });
		await request(app.getHttpServer()).get('/user/customer_e/allergens')
			.set('Authorization', `Bearer ${token}`).expect(200);
		for (const target of ['employee_e', 'administrator_e']) {
			await request(app.getHttpServer()).get(`/user/${target}`).set('Authorization', `Bearer ${token}`).expect(403);
			await request(app.getHttpServer()).get(`/user/${target}/allergens`).set('Authorization', `Bearer ${token}`).expect(403);
		}
		await request(app.getHttpServer()).delete('/user/customer_e').set('Authorization', `Bearer ${token}`).expect(403);
	});

	it('allows account administration without granting restaurant access', async () => {
		const token = signSession(jwt, { sub: 'administrator_e' });
		const response = await request(app.getHttpServer()).get('/user/employee_e').set('Authorization', `Bearer ${token}`).expect(200);
		expect(response.body.roles).toEqual(['EMPLOYEE']);
		await request(app.getHttpServer()).get('/user/customer_e/allergens').set('Authorization', `Bearer ${token}`).expect(403);
		await request(app.getHttpServer()).get('/user/customer_e/allergens')
			.set('Authorization', `Bearer ${signSession(jwt, { sub: 'mixed_e' })}`).expect(200);
	});

	it('rejects staff access to other users and dietary information', async () => {
		const token = signSession(jwt, { sub: 'employee_e' });
		await request(app.getHttpServer()).get('/user/customer_e').set('Authorization', `Bearer ${token}`).expect(403);
		await request(app.getHttpServer()).get('/user/customer_e/allergens').set('Authorization', `Bearer ${token}`).expect(403);
	});

	it('allows managers to maintain customer dietary restrictions but not other accounts', async () => {
		const token = signSession(jwt, { sub: 'manager_e' });
		await request(app.getHttpServer()).post('/user/customer_e/allergen')
			.set('Authorization', `Bearer ${token}`).send({ allergens: ['Gluten'] }).expect(201);
		const restrictions = await request(app.getHttpServer()).get('/user/customer_e/allergens')
			.set('Authorization', `Bearer ${token}`).expect(200);
		expect(restrictions.body.allergens).toContain('Gluten');
		await request(app.getHttpServer()).post('/user/employee_e/allergen')
			.set('Authorization', `Bearer ${token}`).send({ allergens: ['Gluten'] }).expect(403);
		for (const username of ['employee_e', 'administrator_e']) {
			await request(app.getHttpServer()).post('/user/customer_e/allergen')
				.set('Authorization', `Bearer ${signSession(jwt, { sub: username })}`).send({ allergens: ['Gluten'] }).expect(403);
		}
	});

	it('allows administrators to deactivate accounts', async () => {
		await request(app.getHttpServer()).delete('/user/inactive_e')
			.set('Authorization', `Bearer ${signSession(jwt, { sub: 'administrator_e' })}`).expect(200);
	});

	afterAll(async () => { await app?.close(); });
	it.each(['customer_e', 'manager_e', 'employee_e'])('updates only the authenticated account for %s', async username => {
		const token = signSession(jwt, { sub: username });
		const phone = await request(app.getHttpServer()).put('/user/me/phone-number')
			.set('Authorization', `Bearer ${token}`).send({ phoneNumber: '+351912345678' }).expect(200);
		expect(phone.body).toMatchObject({ username, phoneNumber: '+351912345678' });
		const result = await request(app.getHttpServer()).put('/user/me/address')
			.set('Authorization', `Bearer ${token}`).send(address).expect(200);
		expect(result.body).toMatchObject({ username, address, phoneNumber: '+351912345678' });
		expect(result.body).not.toHaveProperty('passwordHash');
	});
	it.each(['address', 'phone-number'])('requires authentication for %s and applies the existing status guard', async endpoint => {
		await request(app.getHttpServer()).put(`/user/me/${endpoint}`).send({}).expect(401, { error: { message: 'Authentication required.' } });
		await request(app.getHttpServer()).put(`/user/me/${endpoint}`).set('Authorization', `Bearer ${signSession(jwt, { sub: 'inactive_e' })}`).send({}).expect(403);
		await request(app.getHttpServer()).put(`/user/me/${endpoint}`).set('Authorization', `Bearer ${signSession(jwt, { sub: 'deleted_e' })}`).send({}).expect(401);
	});
	it('rejects identifiers in the body and returns the existing validation error format', async () => {
		const token = signSession(jwt, { sub: 'customer_e' });
		const result = await request(app.getHttpServer()).put('/user/me/address').set('Authorization', `Bearer ${token}`)
			.send({ ...address, username: 'manager_e' }).expect(400);
		expect(result.body).toEqual({ error: { message: 'Contact details contain unsupported fields' } });
		await request(app.getHttpServer()).put('/user/me/phone-number').set('Authorization', `Bearer ${token}`)
			.send({ phoneNumber: 'invalid' }).expect(400);
	});
	it('keeps contact values out of the existing shared profile response', async () => {
		const result = await request(app.getHttpServer()).get('/user/customer_e').set('Authorization', `Bearer ${signSession(jwt, { sub: 'customer_e' })}`).expect(200);
		expect(result.body).not.toHaveProperty('address');
		expect(result.body).not.toHaveProperty('phoneNumber');
	});
	it.each(['customer_e', 'manager_e', 'employee_e'])('reads persisted private contacts only for the authenticated %s', async username => {
		const result = await request(app.getHttpServer()).get('/user/me/contact-details?username=inactive_e')
			.set('Authorization', `Bearer ${signSession(jwt, { sub: username })}`).expect(200);
		expect(result.body).toMatchObject({ username, address, phoneNumber: '+351912345678' });
		expect(result.headers['cache-control']).toBe('no-store');
		expect(result.body).not.toHaveProperty('passwordHash');
	});
	it('requires authentication and active status for the private contact read', async () => {
		await request(app.getHttpServer()).get('/user/me/contact-details').expect(401);
		await request(app.getHttpServer()).get('/user/me/contact-details').set('Authorization', `Bearer ${signSession(jwt, { sub: 'inactive_e' })}`).expect(403);
		await request(app.getHttpServer()).get('/user/me/contact-details').set('Authorization', `Bearer ${signSession(jwt, { sub: 'deleted_e' })}`).expect(401);
		await request(app.getHttpServer()).get('/user/manager_e/contact-details').set('Authorization', `Bearer ${signSession(jwt, { sub: 'customer_e' })}`).expect(404);
	});
});
