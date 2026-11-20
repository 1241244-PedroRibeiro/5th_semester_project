import { STATUS_ASSIGNMENT_REPOSITORY } from '../../src/application/user/IStatusAssignmentRepository';
import { testStatusAssignmentRepository } from '../helpers/status-assignments';
import { UNAUTHORIZED_ATTEMPT_REPOSITORY } from '../../src/application/auth/IUnauthorizedAttemptRepository';
import { testUnauthorizedAttempts } from '../helpers/unauthorized-attempts';
import { AUTH_SESSION_REPOSITORY } from '../../src/application/auth/IAuthSessionRepository';
import { testSessions, signSession } from '../helpers/auth-sessions';
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { USER_REPOSITORY } from '../../src/application/auth/AuthDTOs';
import { Username } from '../../src/domain/user/Username';
import { RoleName } from '../../src/domain/user/RoleName';
import { InMemoryUserRepository } from '../../src/infrastructure/persistence/repositories/InMemoryUserRepository';
import { AppModule } from '../../src/presentation/app.module';
import { userFixture } from '../helpers/domain';
import { mockDataSource } from '../helpers/mock-data-source';

describe('Product categories through the application module', () => {
	let app: INestApplication;
	let jwt: JwtService;
	let previousRepositoryMode: string | undefined;

	beforeAll(async () => {
		previousRepositoryMode = process.env.USE_IN_MEMORY_REPO;
		process.env.USE_IN_MEMORY_REPO = 'true';
		const users = new InMemoryUserRepository();
		for (const role of ['MANAGER', 'EMPLOYEE', 'CUSTOMER']) {
			await users.save(userFixture({
				username: Username.create(`${role.toLowerCase()}_category`),
				roles: new Set([RoleName.create(role)]),
			}));
		}
		const module = await Test.createTestingModule({ imports: [AppModule] })
			.overrideProvider(AUTH_SESSION_REPOSITORY).useValue(testSessions)
			.overrideProvider(UNAUTHORIZED_ATTEMPT_REPOSITORY).useValue(testUnauthorizedAttempts)
			.overrideProvider(STATUS_ASSIGNMENT_REPOSITORY).useValue(testStatusAssignmentRepository)
			.overrideProvider(DataSource).useValue(mockDataSource)
			.overrideProvider(USER_REPOSITORY).useValue(users)
			.compile();
		jwt = module.get(JwtService);
		app = module.createNestApplication();
		await app.init();
	});

	afterAll(async () => {
		await app?.close();
		if (previousRepositoryMode === undefined) delete process.env.USE_IN_MEMORY_REPO;
		else process.env.USE_IN_MEMORY_REPO = previousRepositoryMode;
	});

	it('serves the public paginated endpoint used by the frontend', async () => {
		await request(app.getHttpServer()).get('/categories?page=1&pageSize=8')
			.expect(200, { items: [], total: 0, page: 1, pageSize: 8, totalPages: 0 });
	});

	it('lets a manager create, paginate, search, read, update and delete categories', async () => {
		const auth = `Bearer ${signSession(jwt, { sub: 'manager_category' })}`;
		for (const name of ['Beverages', 'Desserts']) {
			await request(app.getHttpServer()).post('/categories').set('Authorization', auth)
				.send({ categoryName: name, description: `${name} description` }).expect(201, { name });
		}
		const response = await request(app.getHttpServer()).get('/categories?page=2&pageSize=1').expect(200);
		expect(response.body).toEqual({ items: [{ name: 'Desserts', description: 'Desserts description' }], total: 2, page: 2, pageSize: 1, totalPages: 2 });
		const filtered = await request(app.getHttpServer()).get('/categories?search=Bever&page=1&pageSize=8').expect(200);
		expect(filtered.body.total).toBe(1);
		expect(Array.isArray((await request(app.getHttpServer()).get('/categories').expect(200)).body)).toBe(true);
		await request(app.getHttpServer()).get('/categories/Beverages').expect(200, { name: 'Beverages', description: 'Beverages description' });
		await request(app.getHttpServer()).put('/categories/Beverages').set('Authorization', auth)
			.send({ name: 'Cold drinks', description: 'Updated description' }).expect(200, { name: 'Cold drinks', description: 'Updated description' });
		await request(app.getHttpServer()).get('/categories/Beverages').expect(404);
		for (const name of ['Cold%20drinks', 'Desserts'])
			await request(app.getHttpServer()).delete(`/categories/${name}`).set('Authorization', auth).expect(200);
	});

	it.each(['page=0', 'page=nope', 'page=1.5', 'pageSize=101', 'pageSize=', 'page=1&page=2', 'search=a&search=b'])('rejects invalid query %s', async query => {
		await request(app.getHttpServer()).get(`/categories?${query}`).expect(400);
	});

	it.each([{}, { categoryName: 123 }, { categoryName: '' }, { categoryName: 'Pizza', description: 123 }])('rejects invalid creation body %j', async body => {
		const auth = `Bearer ${signSession(jwt, { sub: 'manager_category' })}`;
		await request(app.getHttpServer()).post('/categories').set('Authorization', auth).send(body).expect(400);
	});

	it('creates without a description and shares the category across both services', async () => {
		const auth = `Bearer ${signSession(jwt, { sub: 'manager_category' })}`;
		await request(app.getHttpServer()).post('/categories').set('Authorization', auth).send({ categoryName: 'Optional' }).expect(201, { name: 'Optional' });
		await request(app.getHttpServer()).get('/categories/Optional').expect(200, { name: 'Optional', description: '' });
		const filtered = await request(app.getHttpServer()).get('/categories?search=OPTION').expect(200);
		expect(filtered.body).toEqual([{ name: 'Optional', description: '' }]);
		await request(app.getHttpServer()).put('/categories/Optional').set('Authorization', auth).send({ name: 'Optional' }).expect(400);
		await request(app.getHttpServer()).delete('/categories/Optional').set('Authorization', auth).expect(200);
	});

	it('reports duplicates, missing records and referenced-category conflicts', async () => {
		const auth = `Bearer ${signSession(jwt, { sub: 'manager_category' })}`;
		await request(app.getHttpServer()).post('/categories').set('Authorization', auth).send({ categoryName: 'Used', description: 'Used category' }).expect(201);
		await request(app.getHttpServer()).post('/categories').set('Authorization', auth).send({ categoryName: ' Used ', description: 'Duplicate' }).expect(409);
		await request(app.getHttpServer()).delete('/categories/Unknown').set('Authorization', auth).expect(404);
		await request(app.getHttpServer()).put('/categories/Unknown').set('Authorization', auth).send({ name: 'Unknown', description: 'Missing' }).expect(404);
		const referenced = jest.spyOn(app.get('ICategoryRepository'), 'isReferencedByProducts').mockResolvedValue(true);
		try {
			await request(app.getHttpServer()).delete('/categories/Used').set('Authorization', auth).expect(409);
			await request(app.getHttpServer()).put('/categories/Used').set('Authorization', auth).send({ name: 'Renamed', description: 'Still used' }).expect(400);
			await request(app.getHttpServer()).put('/categories/Used').set('Authorization', auth).send({ name: 'Used', description: 'Description only' }).expect(200);
		} finally { referenced.mockRestore(); }
		await request(app.getHttpServer()).delete('/categories/Used').set('Authorization', auth).expect(200);
	});

	it.each(['post', 'put', 'delete'] as const)('requires authentication for %s', async method => {
		await request(app.getHttpServer())[method](method === 'post' ? '/categories' : '/categories/Beverages')
			.send({ name: 'Beverages', description: 'Drinks' }).expect(401);
	});

	it.each(['EMPLOYEE', 'CUSTOMER'])('prevents %s from changing categories', async role => {
		const auth = `Bearer ${signSession(jwt, { sub: `${role.toLowerCase()}_category` })}`;
		for (const method of ['post', 'put', 'delete'] as const) {
			await request(app.getHttpServer())[method](method === 'post' ? '/categories' : '/categories/Beverages').set('Authorization', auth)
				.send({ name: 'Beverages', description: 'Drinks' }).expect(403);
		}
	});

	it('removes the duplicated product-categories API', async () => {
		await request(app.getHttpServer()).get('/product-categories').expect(404);
	});
});
