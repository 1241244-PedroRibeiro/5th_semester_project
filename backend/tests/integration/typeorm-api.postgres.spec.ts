import { UnauthorizedAttemptEntity } from '../../src/infrastructure/persistence/entities/UnauthorizedAttemptEntity';
import { JwtService } from '@nestjs/jwt';
import { AuthSessionEntity } from '../../src/infrastructure/persistence/entities/AuthSessionEntity';
import { PostgresAuthSessionRepository } from '../../src/infrastructure/persistence/repositories/PostgresAuthSessionRepository';
import { DataSource } from 'typeorm';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/presentation/app.module';
import { createTestDatabase, postgres } from '../helpers/postgres';
import { UserEntity } from '../../src/infrastructure/persistence/entities';

postgres('Existing HTTP contracts with real TypeORM repositories', () => {
	let database: Awaited<ReturnType<typeof createTestDatabase>>;
	let app: INestApplication;
	let token: string;
	beforeAll(async () => {
		process.env.USE_IN_MEMORY_REPO = 'false';
		database = await createTestDatabase();
		const module = await Test.createTestingModule({ imports: [AppModule] })
			.overrideProvider(DataSource).useValue(database.dataSource).compile();
		app = module.createNestApplication(); await app.init();
		const login = await request(app.getHttpServer()).post('/auth/login').send({ email: 'manager@laprizza.test', password: 'Manager123!' }).expect(200);
		token = login.body.token;
	});
	afterAll(async () => { await app?.close(); await database?.close(); });

	it('serves health and all public catalogue endpoints', async () => {
		for (const route of ['/health', '/categories', '/allergens', '/pizza-sizes', '/pizza-component-types?page=1&pageSize=20', '/products', '/predefined-pizzas', '/catalogue']) {
			const response = await request(app.getHttpServer()).get(route);
			expect({ route, status: response.status, ...(response.status !== 200 ? { body: response.body } : {}) }).toEqual({ route, status: 200 });
		}
	});
	it('registers and logs in a customer with persisted roles', async () => {
		const registered = await request(app.getHttpServer()).post('/auth/register').send({ firstName: 'New', lastName: 'Customer', email: 'new@example.test', password: 'Password123!' }).expect(201);
		expect(registered.body).toHaveProperty('token');
		expect(await database.dataSource.getRepository(UserEntity).existsBy({ email: 'new@example.test' })).toBe(true);
		await request(app.getHttpServer()).post('/auth/login').send({ email: 'new@example.test', password: 'Password123!' }).expect(200);
	});
	it('creates, reads and removes a category through the existing routes', async () => {
		await request(app.getHttpServer()).post('/categories').set('Authorization', `Bearer ${token}`).send({ categoryName: 'API Test', description: 'TypeORM integration' }).expect(201);
		const category = await request(app.getHttpServer()).get('/categories/API%20Test').expect(200);
		expect(category.body.name).toBe('API Test');
		await request(app.getHttpServer()).delete('/categories/API%20Test').set('Authorization', `Bearer ${token}`).expect(200);
		await request(app.getHttpServer()).get('/categories/API%20Test').expect(404);
	});
	it('persists contact details and lists users through the shared auth repository', async () => {
		const result = await request(app.getHttpServer()).put('/user/me/phone-number').set('Authorization', `Bearer ${token}`).send({ phoneNumber: '+351912345678' }).expect(200);
		expect(result.body.phoneNumber).toBe('+351912345678');
		expect((await database.dataSource.getRepository(UserEntity).findOneByOrFail({ username: 'manager_l' })).phone_number).toBe('+351912345678');
		const address = { street: 'Rua Persistida 10', postalCode: '4000-001', city: 'Porto', extraDetails: 'Floor 2' };
		await request(app.getHttpServer()).put('/user/me/address').set('Authorization', `Bearer ${token}`).send(address).expect(200);
		const persisted = await request(app.getHttpServer()).get('/user/me/contact-details').set('Authorization', `Bearer ${token}`).expect(200);
		expect(persisted.body).toMatchObject({ username: 'manager_l', address, phoneNumber: '+351912345678' });
		const administrator = await request(app.getHttpServer()).post('/auth/login').send({ email: 'administrator@laprizza.test', password: 'Manager123!' }).expect(200);
		await request(app.getHttpServer()).get('/users?page=1&pageSize=2').set('Authorization', `Bearer ${administrator.body.token}`).expect(200);
	});
	it('creates a sellable product, exposes it in catalogue, and adjusts its stock', async () => {
		await request(app.getHttpServer()).post('/products').set('Authorization', `Bearer ${token}`).send({ sku: 'API-WATER', name: 'API Water', description: 'Water',
			categoryName: 'Beverages', isSellable: true, isPizzaComponent: false, isStockControlled: true, directSellingPrice: 1.5 }).expect(201);
		const adjusted = await request(app.getHttpServer()).post('/stock/API-WATER/adjustments').set('Authorization', `Bearer ${token}`)
			.send({ adjustmentType: 'INCREASE', amount: 5, reason: 'Delivery' }).expect(200);
		expect(adjusted.body.currentUnits).toBe(5);
		const catalogue = await request(app.getHttpServer()).get('/catalogue/API-WATER').expect(200);
		expect(catalogue.body).toMatchObject({ productSku: 'API-WATER', directPrice: { amount: 1.5, currency: 'EUR' }, isAvailable: true });
	});
	it('persists account changes and authenticates only the new email and password', async () => {
		const registered = await request(app.getHttpServer()).post('/auth/register').send({
			firstName: 'Account', lastName: 'Owner', email: 'account.original@example.test', password: 'OriginalPassword1!',
		}).expect(201);
		const auth = `Bearer ${registered.body.token}`;
		const username = registered.body.user.username;
		await request(app.getHttpServer()).put('/user/me/phone-number').set('Authorization', auth).send({ phoneNumber: '+351912345678' }).expect(200);
		await request(app.getHttpServer()).put('/user/me/name').set('Authorization', auth).send({ firstName: 'Updated', lastName: 'Owner' }).expect(200);
		await request(app.getHttpServer()).put('/user/me/email').set('Authorization', auth).send({ email: 'ACCOUNT.UPDATED@example.test', currentPassword: 'OriginalPassword1!' }).expect(200);
		await request(app.getHttpServer()).post('/auth/login').send({ email: 'account.original@example.test', password: 'OriginalPassword1!' }).expect(401);
		await request(app.getHttpServer()).put('/user/me/password').set('Authorization', auth).send({ currentPassword: 'OriginalPassword1!', newPassword: 'ReplacementPassword2!' }).expect(200);
		await request(app.getHttpServer()).post('/auth/login').send({ email: 'account.updated@example.test', password: 'OriginalPassword1!' }).expect(401);
		const login = await request(app.getHttpServer()).post('/auth/login').send({ email: 'account.updated@example.test', password: 'ReplacementPassword2!' }).expect(200);
		expect(login.body.user).toMatchObject({ username, firstName: 'Updated', lastName: 'Owner', email: 'account.updated@example.test' });
		const saved = await database.dataSource.getRepository(UserEntity).findOneByOrFail({ username });
		expect(saved.phone_number).toBe('+351912345678');
		expect(saved.password_hash).toMatch(/^\$argon2id\$/);
	});
	it('persists session revocation and prevents replayed reads and writes across repository instances', async () => {
		const credentials = { email: 'session-replay@example.test', password: 'Password123!' };
		const registration = await request(app.getHttpServer()).post('/auth/register')
			.send({ ...credentials, firstName: 'Session', lastName: 'Owner' }).expect(201);
		const oldToken = registration.body.token;
		const username = registration.body.user.username;
		const login = await request(app.getHttpServer()).post('/auth/login').send(credentials).expect(200);
		const jwt = app.get(JwtService);
		const claims = jwt.decode(oldToken);
		const sessions = database.dataSource.getRepository(AuthSessionEntity);
		const record = await sessions.findOneByOrFail({ id: claims.sid });
		expect(record).toMatchObject({ username, revoked_at: null });
		expect(record.expires_at.getTime()).toBe(claims.exp * 1000);
		const independentRepository = new PostgresAuthSessionRepository(database.dataSource);
		expect((await independentRepository.findById(claims.sid))?.isActiveFor(username)).toBe(true);
		const staleSession = (await independentRepository.findById(claims.sid))!;
		await request(app.getHttpServer()).get(`/user/${username}`).set('Authorization', `Bearer ${oldToken}`).expect(200);
		await request(app.getHttpServer()).put('/user/me/name').set('Authorization', `Bearer ${oldToken}`)
			.send({ firstName: 'Saved', lastName: 'Before logout' }).expect(200);
		await request(app.getHttpServer()).post('/auth/logout').set('Authorization', `Bearer ${oldToken}`).expect(204);
		expect((await sessions.findOneByOrFail({ id: claims.sid })).revoked_at).toBeInstanceOf(Date);
		expect((await independentRepository.findById(claims.sid))?.isActiveFor(username)).toBe(false);
		const revokedAt = (await sessions.findOneByOrFail({ id: claims.sid })).revoked_at;
		await independentRepository.save(staleSession);
		staleSession.revoke(new Date(Date.now() + 1000));
		await independentRepository.save(staleSession);
		expect((await sessions.findOneByOrFail({ id: claims.sid })).revoked_at).toEqual(revokedAt);
		await request(app.getHttpServer()).get(`/user/${username}`).set('Authorization', `Bearer ${oldToken}`).expect(401);
		await request(app.getHttpServer()).put('/user/me/name').set('Authorization', `Bearer ${oldToken}`)
			.send({ firstName: 'Replayed', lastName: 'Mutation' }).expect(401);
		expect((await database.dataSource.getRepository(UserEntity).findOneByOrFail({ username })).first_name).toBe('Saved');
		await request(app.getHttpServer()).get(`/user/${username}`).set('Authorization', `Bearer ${login.body.token}`).expect(200);
		const otherSid = jwt.decode(login.body.token).sid;
		await sessions.update({ id: otherSid }, { expires_at: new Date(0) });
		await request(app.getHttpServer()).get(`/user/${username}`).set('Authorization', `Bearer ${login.body.token}`).expect(401);
		// Deleting an account also removes its credentials via the foreign key.
		await database.dataSource.getRepository(UserEntity).delete({ username });
		expect(await sessions.countBy({ username })).toBe(0);
	});

	it('persists authenticated forbidden attempts and retains the audit after account deletion', async () => {
		const registered = await request(app.getHttpServer()).post('/auth/register').send({
			firstName: 'Audit', lastName: 'Customer', email: 'audit-owner@example.test', password: 'Password123!',
		}).expect(201);
		const username = registered.body.user.username;
		const auditToken = registered.body.token;
		const entries = database.dataSource.getRepository(UnauthorizedAttemptEntity);
		const before = new Date();
		for (let attempt = 0; attempt < 2; attempt++)
			await request(app.getHttpServer()).get('/users?token=secret').set('Authorization', `Bearer ${auditToken}`).expect(403);
		await request(app.getHttpServer()).get('/user/manager_l').set('Authorization', `Bearer ${auditToken}`).expect(403);
		const records = await entries.find({ where: { user: username }, order: { id: 'ASC' } });
		expect(records.map(record => record.endpoint)).toEqual(['GET /users', 'GET /users', 'GET /user/:username']);
		for (const record of records) {
			expect(record.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
			expect(record.timestamp.getTime()).toBeLessThanOrEqual(Date.now());
		}
		await expect(entries.insert({ user: 'missing_audit_owner', endpoint: 'GET /users' })).rejects.toMatchObject({ code: '23503' });
		await database.dataSource.getRepository(UserEntity).delete({ username });
		for (const record of records)
			expect((await entries.findOneByOrFail({ id: record.id })).user).toBeNull();
	});

});
