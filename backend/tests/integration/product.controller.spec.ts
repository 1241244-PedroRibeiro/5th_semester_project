import { STATUS_ASSIGNMENT_REPOSITORY } from '../../src/application/user/IStatusAssignmentRepository';
import { testStatusAssignmentRepository } from '../helpers/status-assignments';
import { UNAUTHORIZED_ATTEMPT_REPOSITORY } from '../../src/application/auth/IUnauthorizedAttemptRepository';
import { testUnauthorizedAttempts } from '../helpers/unauthorized-attempts';
import { AUTH_SESSION_REPOSITORY } from '../../src/application/auth/IAuthSessionRepository';
import { testSessions, signSession } from '../helpers/auth-sessions';
import { DataSource } from 'typeorm';
import { mockDataSource } from '../helpers/mock-data-source';
import 'dotenv/config';
process.env.USE_IN_MEMORY_REPO = 'true';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'laprizza-default-secret-key-change-in-production-2026';

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { AppModule } from '../../src/presentation/app.module';
import { UserRole } from '../../src/application/user/UserRoles';
import { UserStatus } from '../../src/domain/user/UserStatus';
import { USER_REPOSITORY } from '../../src/application/auth/AuthDTOs';
import { createCatalogueUserRepository } from './helpers/catalogue-users';

describe('ProductController (Integration)', () => {
	let app: INestApplication;
	let managerToken: string;
	let customerToken: string;

	beforeAll(async () => {
		const moduleFixture: TestingModule = await Test.createTestingModule({
			imports: [AppModule],
		})
			.overrideProvider(USER_REPOSITORY)
			.useValue(await createCatalogueUserRepository())
			.overrideProvider(AUTH_SESSION_REPOSITORY).useValue(testSessions)
			.overrideProvider(UNAUTHORIZED_ATTEMPT_REPOSITORY).useValue(testUnauthorizedAttempts)
			.overrideProvider(STATUS_ASSIGNMENT_REPOSITORY).useValue(testStatusAssignmentRepository)
			.overrideProvider(DataSource).useValue(mockDataSource).compile();

		app = moduleFixture.createNestApplication();
		await app.init();

		const jwtService = app.get(JwtService);

		managerToken = signSession(jwtService, {
			sub: 'manager_l',
			email: 'manager@laprizza.com',
			roles: [UserRole.MANAGER],
			status: UserStatus.ACTIVE,
		});

		customerToken = signSession(jwtService, {
			sub: 'client_l',
			email: 'client@laprizza.com',
			roles: [UserRole.CUSTOMER],
			status: UserStatus.ACTIVE,
		});
	});

	it.each(['administrator_l', 'employee_l'])('does not grant restaurant mutations to %s', async username => {
		const token = signSession(app.get(JwtService), { sub: username, roles: ['MANAGER'], status: UserStatus.ACTIVE });
		for (const endpoint of ['/products', '/categories', '/allergens', '/pizza-sizes', '/pizza-component-types', '/component-size-configurations', '/predefined-pizzas', '/stock/PRD-WATER/adjustments']) {
			await request(app.getHttpServer()).post(endpoint).set('Authorization', `Bearer ${token}`).send({}).expect(403);
		}
	});

	it('combines explicitly assigned administrator and manager permissions', async () => {
		const token = signSession(app.get(JwtService), { sub: 'mixed_l', roles: [UserRole.ADMINISTRATOR, UserRole.MANAGER], status: UserStatus.ACTIVE });
		await request(app.getHttpServer()).get('/users').set('Authorization', `Bearer ${token}`).expect(200);
		await request(app.getHttpServer()).post('/products').set('Authorization', `Bearer ${token}`)
			.send({ sku: 'PRD-MIXED', name: 'Mixed role drink', categoryName: 'CAT-BEV', isSellable: true,
				isPizzaComponent: false, isStockControlled: false, directSellingPrice: 1.5 }).expect(201);
	});

	afterAll(async () => {
		await app.close();
	});

	it('POST /products - should block unauthorized access (401)', async () => {
		await request(app.getHttpServer())
			.post('/products')
			.send({ sku: 'PRD-WATER', name: 'Water' })
			.expect(401);
	});

	it('POST /products - should forbid non-manager users (403)', async () => {
		await request(app.getHttpServer())
			.post('/products')
			.set('Authorization', `Bearer ${customerToken}`)
			.send({ sku: 'PRD-WATER', name: 'Water' })
			.expect(403);
	});

	it('POST /products - should allow MANAGER to register product (201)', async () => {
		const res = await request(app.getHttpServer())
			.post('/products')
			.set('Authorization', `Bearer ${managerToken}`)
			.send({
				sku: 'PRD-WATER',
				name: 'Mineral Water',
				description: '500ml water',
				categoryName: 'CAT-BEV',
				isSellable: true,
				isPizzaComponent: false,
				isStockControlled: true,
				directSellingPrice: 1.5,
			})
			.expect(201);

		expect(res.body.sku).toBe('PRD-WATER');
		expect(res.body.active).toBe(true);
	});

	it('GET /products - should permit public consultation (200)', async () => {
		const res = await request(app.getHttpServer())
			.get('/products')
			.expect(200);

		expect(Array.isArray(res.body)).toBe(true);
	});

	it('PATCH /products/:code/block - should allow MANAGER to block product (200)', async () => {
		const res = await request(app.getHttpServer())
			.patch('/products/PRD-WATER/block')
			.set('Authorization', `Bearer ${managerToken}`)
			.expect(200);

		expect(res.body.active).toBe(false);
	});
	it('POST /products - should create a non-sellable component without a direct price (201)', async () => {
    const res = await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
            sku: 'PRD-UNPRICED-COMPONENT',
            name: 'Unpriced Dough Component',
            description: 'Pizza component priced through its size configuration',
            categoryName: 'Ingredients',
            isSellable: false,
            isPizzaComponent: true,
            isStockControlled: true,
            componentTypeName: 'Base Dough'
        })
        .expect(201);

    expect(res.body.isSellable).toBe(false);
    expect(res.body.isPizzaComponent).toBe(true);
    expect(res.body.directSellingPrice).toBeNull();
});

it('POST /products - should reject a product without a business role (400)', async () => {
    await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
            sku: 'PRD-GHOST-ROLE',
            name: 'Ghost Role Product',
            description: 'No sellable or component role',
            categoryName: 'CAT-BEV',
            isSellable: false,
            isPizzaComponent: false,
            isStockControlled: true
        })
        .expect(400);
});

it('POST /products - should reject a sellable product without a direct price (400)', async () => {
    await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
            sku: 'PRD-SELLABLE-NO-PRICE',
            name: 'Sellable Without Price',
            description: 'A sellable product needs a direct price',
            categoryName: 'CAT-BEV',
            isSellable: true,
            isPizzaComponent: false,
            isStockControlled: false
        })
        .expect(400);
});
});
