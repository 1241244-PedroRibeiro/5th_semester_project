import { StatusAssignmentService } from '../../src/application/user/StatusAssignmentService';
import { testStatusAssignments } from '../helpers/status-assignments';
import { RolesAssignmentService } from '../../src/application/user/RolesAssignmentService';
import { testRolesAssignments } from '../helpers/roles-assignments';
import { AUTH_SESSION_REPOSITORY } from '../../src/application/auth/IAuthSessionRepository';
import { testSessions, signSession } from '../helpers/auth-sessions';
import { PASSWORD_HASHER } from '../../src/application/auth/AuthDTOs';
import { passwordHasher } from '../helpers/password-hasher';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { APP_GUARD } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { BackofficeUsersController } from '../../src/presentation/http/controllers/BackofficeUsersController';
import { UserService } from '../../src/application/user/UserService';
import { USER_REPOSITORY } from '../../src/application/auth/IUserRepository';
import { InMemoryUserRepository } from '../../src/infrastructure/persistence/repositories/InMemoryUserRepository';
import { UserMap } from '../../src/infrastructure/persistence/mappers/UserMap';
import { AuthGuard } from '../../src/presentation/auth.guard';
import { RolesGuard } from '../../src/presentation/http/middlewares/roles.guard';
import { StatusGuard } from '../../src/presentation/http/middlewares/UserStatus.guard';

describe('Backoffice users with authentication and authorization', () => {
	let app: INestApplication;
	let repository: InMemoryUserRepository;
	const jwt = new JwtService({ secret: 'filter-tests-secret', signOptions: { expiresIn: '15m' } });
	const tokens: Record<string, string> = {};
	const endpoints = ['', 'filter/creation-date/2026-10-21', 'filter/role/CUSTOMER', 'filter/status/ACTIVE'];

	beforeAll(async () => {
		repository = new InMemoryUserRepository();
		const fixtures = [
			['administrator', 'ADMINISTRATOR', 'ACTIVE'],
			['manager', 'MANAGER', 'ACTIVE'],
			['customer', 'CUSTOMER', 'ACTIVE'],
			['employee', 'EMPLOYEE', 'ACTIVE'],
			['deactivated', 'ADMINISTRATOR', 'DEACTIVATED'],
			['pending', 'ADMINISTRATOR', 'PENDING_REGISTRATION'],
			['mixed', 'CUSTOMER', 'ACTIVE'],
		];
		for (const [index, [name, role, status]] of fixtures.entries()) {
			const id = `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`;
			await repository.save(UserMap.toDomain({
				street: null, postal_code: null, city: null, extra_details: null, phone_number: null,
				username: id, dietary_restrictions: [], first_name: 'Test', last_name: name, email: `${name}@example.com`,
				password_hash: 'private-hash', external_idp_subject: null, status,
				roles: name === 'mixed' ? ['CUSTOMER', 'ADMINISTRATOR'] : [role],
				created_at: new Date('2026-10-21T12:00:00Z'), updated_at: new Date('2026-10-21T12:00:00Z'),
			}));
			// Claim values cannot override the role/status loaded from the repository.
			tokens[name] = signSession(jwt, { sub: id, roles: ['ADMINISTRATOR'], status: 'ACTIVE' });
		}
		const module = await Test.createTestingModule({
			controllers: [BackofficeUsersController],
			providers: [
				UserService, { provide: StatusAssignmentService, useValue: testStatusAssignments }, { provide: RolesAssignmentService, useValue: testRolesAssignments },
				{ provide: PASSWORD_HASHER, useValue: passwordHasher },
				{ provide: USER_REPOSITORY, useValue: repository },
				{ provide: AUTH_SESSION_REPOSITORY, useValue: testSessions }, { provide: JwtService, useValue: jwt },
				{ provide: APP_GUARD, useClass: AuthGuard },
				{ provide: APP_GUARD, useClass: RolesGuard },
				{ provide: APP_GUARD, useClass: StatusGuard },
			],
		}).compile();
		app = module.createNestApplication();
		await app.init();
	});

	afterAll(async () => { await app.close(); });

	it.each(endpoints)('allows active administrators and returns public paginated users for %s', async endpoint => {
		const res = await request(app.getHttpServer()).get(`/users/${endpoint}?page=1&pageSize=2`)
			.set('Authorization', `Bearer ${tokens.administrator}`).expect(200);
		expect(res.body).toMatchObject({ page: 1, pageSize: 2 });
		expect(res.body.items).toHaveLength(2);
		expect(res.body.totalPages).toBe(Math.ceil(res.body.total / 2));
		for (const user of res.body.items) {
			expect(Object.keys(user).sort()).toEqual(['username', 'firstName', 'lastName', 'createdAt', 'email', 'roles', 'status'].sort());
			if (endpoint.startsWith('filter/role/')) expect(user.roles).toContain('CUSTOMER');
			if (endpoint.startsWith('filter/status/')) expect(user.status).toBe('ACTIVE');
			if (endpoint.startsWith('filter/creation-date/')) expect(user.createdAt).toMatch(/^2026-10-21T/);
		}
	});

	it.each(endpoints)('allows active managers to view paginated users for %s', async endpoint => {
		const response = await request(app.getHttpServer()).get(`/users/${endpoint}?page=1&pageSize=2`)
			.set('Authorization', `Bearer ${tokens.manager}`).expect(200);
		expect(response.body.items).toHaveLength(2);
		expect(response.body).toMatchObject({ page: 1, pageSize: 2 });
		for (const user of response.body.items) {
			expect(user).toHaveProperty('email');
			expect(user).not.toHaveProperty('passwordHash');
		}
	});

	it.each(endpoints)('rejects unauthenticated requests for %s', async endpoint => {
		await request(app.getHttpServer()).get(`/users/${endpoint}`).expect(401);
	});

	it.each(endpoints.flatMap(endpoint => ['customer', 'employee', 'deactivated', 'pending'].map(name => [endpoint, name])))(
		'rejects %s for a persisted %s account even with administrator token claims', async (endpoint, name) => {
			await request(app.getHttpServer()).get(`/users/${endpoint}`)
				.set('Authorization', `Bearer ${tokens[name]}`).expect(403);
		},
	);

	it('allows an authenticated active administrator to list all users across pages', async () => {
		const first = await request(app.getHttpServer()).get('/users?page=1&pageSize=4')
			.set('Authorization', `Bearer ${tokens.administrator}`).expect(200);
		const second = await request(app.getHttpServer()).get('/users/?page=2&pageSize=4')
			.set('Authorization', `Bearer ${tokens.administrator}`).expect(200);
		expect(first.body).toMatchObject({ total: 7, page: 1, pageSize: 4, totalPages: 2 });
		expect(second.body).toMatchObject({ total: 7, page: 2, pageSize: 4, totalPages: 2 });
		expect(first.body.items).toHaveLength(4);
		expect(second.body.items).toHaveLength(3);
		const users = [...first.body.items, ...second.body.items];
		expect(new Set(users.map(user => user.username)).size).toBe(7);
		expect(users.map(user => user.status)).toEqual(expect.arrayContaining(['ACTIVE', 'DEACTIVATED', 'PENDING_REGISTRATION']));
		expect(users.flatMap(user => user.roles)).toEqual(expect.arrayContaining(['ADMINISTRATOR', 'CUSTOMER', 'EMPLOYEE']));
	});

	it('forbids an authenticated active customer from listing all users', async () => {
		await request(app.getHttpServer()).get('/users/')
			.set('Authorization', `Bearer ${tokens.customer}`).expect(403);
	});

	it.each(['page=0', 'page=-1', 'page=1.5', 'pageSize=0', 'pageSize=101',
		'page=', 'page=abc', 'page=1&page=2', 'page[x]=1', 'page=9007199254740992'])(
		'rejects invalid pagination when listing all users: %s', async query => {
			await request(app.getHttpServer()).get(`/users?${query}`)
				.set('Authorization', `Bearer ${tokens.administrator}`).expect(400);
		},
	);

	it('uses defaults and retains totals for an empty all-users page', async () => {
		const defaults = await request(app.getHttpServer()).get('/users')
			.set('Authorization', `Bearer ${tokens.administrator}`).expect(200);
		expect(defaults.body).toMatchObject({ total: 7, page: 1, pageSize: 20, totalPages: 1 });
		const empty = await request(app.getHttpServer()).get('/users?page=3&pageSize=4')
			.set('Authorization', `Bearer ${tokens.administrator}`).expect(200);
		expect(empty.body).toEqual({ items: [], total: 7, page: 3, pageSize: 4, totalPages: 2 });
	});

	it('allows an active administrator who also has the customer role', async () => {
		await request(app.getHttpServer()).get('/users/filter/role/ADMINISTRATOR')
			.set('Authorization', `Bearer ${tokens.mixed}`).expect(200);
	});

	it.each([
		'creation-date/2026-02-30', 'creation-date/invalid', 'role/ADMIN', 'status/UNKNOWN',
		'role/CUSTOMER?page=0', 'role/CUSTOMER?page=-1', 'role/CUSTOMER?page=1.5',
		'role/CUSTOMER?pageSize=101', 'role/CUSTOMER?pageSize=0', 'role/CUSTOMER?page=',
		'role/CUSTOMER?page=abc', 'role/CUSTOMER?page=1&page=2', 'role/CUSTOMER?page[x]=1',
	])('returns 400 for invalid filter or pagination: %s', async endpoint => {
		await request(app.getHttpServer()).get(`/users/filter/${endpoint}`)
			.set('Authorization', `Bearer ${tokens.administrator}`).expect(400);
	});

	it('returns defaults and empty pages without 404', async () => {
		const defaults = await request(app.getHttpServer()).get('/users/filter/role/CUSTOMER')
			.set('Authorization', `Bearer ${tokens.administrator}`).expect(200);
		expect(defaults.body).toMatchObject({ total: 2, page: 1, pageSize: 20, totalPages: 1 });
		const empty = await request(app.getHttpServer()).get('/users/filter/role/CUSTOMER?page=3&pageSize=1')
			.set('Authorization', `Bearer ${tokens.administrator}`).expect(200);
		expect(empty.body).toEqual({ items: [], total: 2, page: 3, pageSize: 1, totalPages: 2 });
	});
});
