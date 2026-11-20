import { STATUS_ASSIGNMENT_REPOSITORY } from '../../src/application/user/IStatusAssignmentRepository';
import { testStatusAssignmentRepository } from '../helpers/status-assignments';
import { UNAUTHORIZED_ATTEMPT_REPOSITORY } from '../../src/application/auth/IUnauthorizedAttemptRepository';
import { testUnauthorizedAttempts } from '../helpers/unauthorized-attempts';
import { AUTH_SESSION_REPOSITORY } from '../../src/application/auth/IAuthSessionRepository';
import { testSessions, signSession } from '../helpers/auth-sessions';
import { DataSource } from 'typeorm';
import { mockDataSource } from '../helpers/mock-data-source';
process.env.USE_IN_MEMORY_REPO = 'true';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { AppModule } from '../../src/presentation/app.module';
import { USER_REPOSITORY } from '../../src/application/auth/AuthDTOs';
import { UserStatus } from '../../src/domain/user/UserStatus';
import { Username } from '../../src/domain/user/Username';
import { RoleName } from '../../src/domain/user/RoleName';
import { Email } from '../../src/domain/common/Email';
import { ProductService } from '../../src/application/product/ProductService';
import { createCatalogueUserRepository } from './helpers/catalogue-users';
import { userFixture } from '../helpers/domain';
const path = '/pizza-component-types';
describe('Existing component type API with name identities', () => {
	let app: INestApplication, manager: string, customer: string;
	let sequence = 10;
	const payload = () => ({ name: `Type ${sequence}`, assemblyOrder: sequence++, minCardinality: 0, maxCardinality: null });
	beforeAll(async () => {
		const users = await createCatalogueUserRepository();
		for (const status of [UserStatus.DEACTIVATED, UserStatus.PENDING_REGISTRATION]) await users.save(userFixture({ username: Username.create(status), email: Email.create(`${status}@example.com`).getValue(), roles: new Set([RoleName.create('MANAGER')]), status }));
		const module = await Test.createTestingModule({ imports: [AppModule] }).overrideProvider(USER_REPOSITORY).useValue(users).overrideProvider(AUTH_SESSION_REPOSITORY).useValue(testSessions)
			.overrideProvider(UNAUTHORIZED_ATTEMPT_REPOSITORY).useValue(testUnauthorizedAttempts)
			.overrideProvider(STATUS_ASSIGNMENT_REPOSITORY).useValue(testStatusAssignmentRepository)
			.overrideProvider(DataSource).useValue(mockDataSource).compile();
		app = module.createNestApplication(); await app.init(); manager = signSession(app.get(JwtService), { sub: 'manager_l' }); customer = signSession(app.get(JwtService), { sub: 'client_l' });
	});
	afterAll(async () => { await app?.close(); });
	it('keeps baseline names, ordering and nullable bounds', async () => { const result = await request(app.getHttpServer()).get(path).query({ page: 1, pageSize: 20 }).expect(200); expect(result.body.items.map((type: any) => [type.name, type.assemblyOrder, type.minCardinality, type.maxCardinality])).toEqual([['Base Dough', 1, 1, 1], ['Base Sauce', 2, 0, 1], ['Cheese', 3, 0, 1], ['Topping', 4, 0, null]]); expect(result.body.items[0]).not.toHaveProperty('id'); expect(result.body.items[0]).not.toHaveProperty('code'); });
	it.each(['post', 'put', 'delete'] as const)('%s still requires an authenticated manager', async method => { const url = method === 'post' ? path : `${path}/Topping`; await request(app.getHttpServer())[method](url).send(payload()).expect(401); await request(app.getHttpServer())[method](url).set('Authorization', `Bearer ${customer}`).send(payload()).expect(403); });
	it.each([UserStatus.DEACTIVATED, UserStatus.PENDING_REGISTRATION])('rejects writes for persisted status %s', async status => { const token = signSession(app.get(JwtService), { sub: status, roles: ['MANAGER'], status: 'ACTIVE' }); for (const method of ['post', 'put', 'delete'] as const) await request(app.getHttpServer())[method](method === 'post' ? path : `${path}/Topping`).set('Authorization', `Bearer ${token}`).send(payload()).expect(403); });
	it('creates, reads and deletes by name while preserving null maxima', async () => { const input = payload(), url = `${path}/${encodeURIComponent(input.name)}`; const result = await request(app.getHttpServer()).post(path).set('Authorization', `Bearer ${manager}`).send(input).expect(201); expect(result.body).toEqual(input); await request(app.getHttpServer()).get(url).expect(200, input); await request(app.getHttpServer()).put(url).set('Authorization', `Bearer ${manager}`).send({ ...input, name: 'Renamed' }).expect(400); await request(app.getHttpServer()).get(url).expect(200, input); await request(app.getHttpServer()).delete(url).set('Authorization', `Bearer ${manager}`).expect(200); await request(app.getHttpServer()).get(url).expect(404); });
	it('updates bounds and an unoccupied order, rejects occupied orders and missing types', async () => {
		const input = payload(), url = `${path}/${encodeURIComponent(input.name)}`;
		await request(app.getHttpServer()).post(path).set('Authorization', `Bearer ${manager}`).send(input).expect(201);
		const updated = { ...input, assemblyOrder: sequence++, minCardinality: 1, maxCardinality: 3 };
		await request(app.getHttpServer()).put(url).set('Authorization', `Bearer ${manager}`).send({ assemblyOrder: updated.assemblyOrder, minCardinality: 1, maxCardinality: 3 }).expect(200, updated);
		await request(app.getHttpServer()).put(url).set('Authorization', `Bearer ${manager}`).send({ assemblyOrder: 1 }).expect(409);
		await request(app.getHttpServer()).get(url).expect(200, updated);
		await request(app.getHttpServer()).put(url).set('Authorization', `Bearer ${manager}`).send({ maxCardinality: null }).expect(200, { ...updated, maxCardinality: null });
		await request(app.getHttpServer()).put(`${path}/Missing`).set('Authorization', `Bearer ${manager}`).send({ minCardinality: 0 }).expect(404);
		await request(app.getHttpServer()).delete(url).set('Authorization', `Bearer ${manager}`).expect(200);
	});
	it.each([{ name: 'Cheese' }, { assemblyOrder: 1 }])('rejects duplicate identity or ordering %j', async override => { await request(app.getHttpServer()).post(path).set('Authorization', `Bearer ${manager}`).send({ ...payload(), ...override }).expect(409); });
	it.each([{ name: '' }, { name: 4 }, { assemblyOrder: 0 }, { assemblyOrder: 1.5 }, { assemblyOrder: '5' }, { minCardinality: -1 }, { maxCardinality: -1 }, { minCardinality: 3, maxCardinality: 2 }])('rejects invalid input %j', async override => { await request(app.getHttpServer()).post(path).set('Authorization', `Bearer ${manager}`).send({ ...payload(), ...override }).expect(400); });
	it('searches names or assembly positions and rejects repeated search params', async () => { const result = await request(app.getHttpServer()).get(path).query({ search: 'dough', page: 1, pageSize: 20 }).expect(200); expect(result.body.items[0].name).toBe('Base Dough'); await request(app.getHttpServer()).get(`${path}?search=a&search=b`).expect(400); });
	it('protects types referenced by products even when the product is inactive', async () => { await app.get(ProductService).createProduct({ sku: 'REFERENCE', name: 'Reference', description: '', categoryName: 'Ingredients', isSellable: false, isPizzaComponent: true, isStockControlled: false, componentTypeName: 'Topping', directSellingPrice: 1 }); await app.get(ProductService).blockProduct('REFERENCE'); await request(app.getHttpServer()).delete(`${path}/Topping`).set('Authorization', `Bearer ${manager}`).expect(409); });
});
