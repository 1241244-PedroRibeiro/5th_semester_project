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
import { PRODUCT_REPOSITORY } from '../../src/application/product/IProductRepository';
import {
	PREDEFINED_PIZZA_REPOSITORY,
	IPredefinedPizzaRepository,
} from '../../src/application/pizza/IPredefinedPizzaRepository';
import { PIZZA_COMPONENT_TYPE_REPOSITORY } from '../../src/domain/pizza/pizza-component-type/PizzaComponentTypeRepository';
import { PredefinedPizza } from '../../src/domain/pizza/PredefinedPizza';
import { ProductFlags } from '../../src/domain/product/ProductFlags';
import { Sku } from '../../src/domain/product/Sku';
import { InMemoryProductRepository } from '../../src/infrastructure/persistence/repositories/InMemoryProductRepository';
import { createCatalogueUserRepository } from './helpers/catalogue-users';
import { productFixture, typeFixture } from '../helpers/domain';
describe('Existing predefined pizza endpoints with composite identities', () => {
	let app: INestApplication, manager: string, customer: string;
	const input = {
		pizzaSku: 'PIZZA',
		recipeName: 'Pizza',
		defaultRecipeLines: [{ componentSku: 'CHEESE', defaultQuantity: 2 }],
		availableSizes: ['Large', 'Small'],
	};
	beforeAll(async () => {
		const products = new InMemoryProductRepository();
		await products.save(productFixture());
		await products.save(
			productFixture({
				sku: Sku.create('PIZZA'),
				flags: new ProductFlags(true, false, false),
				componentType: undefined,
			}),
		);
		const store: PredefinedPizza[] = [];
		const repo: IPredefinedPizzaRepository = {
			findSupportedSizesForProducts: async (skus) =>
				new Map(
					skus.map((sku) => [
						sku.value,
						store
							.filter((pizza) => pizza.id.pizzaSku.equals(sku))
							.map((pizza) => pizza.id.pizzaSize),
					]),
				),
			findSupportedSizes: async (sku) =>
				store.filter((pizza) => pizza.id.pizzaSku.equals(sku)).map((pizza) => pizza.id.pizzaSize),
			save: async (pizzas, options) => {
				if (options?.replace) {
					for (let index = store.length - 1; index >= 0; index--)
						if (pizzas.some((pizza) => pizza.id.pizzaSku.equals(store[index].id.pizzaSku)))
							store.splice(index, 1);
				}
				store.push(...pizzas);
			},
			findAll: async () => store,
			findById: async (id) => store.find((pizza) => pizza.id.equals(id)) ?? null,
			findByProduct: async (sku) => store.filter((pizza) => pizza.id.pizzaSku.equals(sku)),
		};
		const module = await Test.createTestingModule({ imports: [AppModule] })
			.overrideProvider(USER_REPOSITORY)
			.useValue(await createCatalogueUserRepository())
			.overrideProvider(PRODUCT_REPOSITORY)
			.useValue(products)
			.overrideProvider(PREDEFINED_PIZZA_REPOSITORY)
			.useValue(repo)
			.overrideProvider(PIZZA_COMPONENT_TYPE_REPOSITORY)
			.useValue({ findAll: async () => [typeFixture()] })
			.overrideProvider(AUTH_SESSION_REPOSITORY).useValue(testSessions)
			.overrideProvider(UNAUTHORIZED_ATTEMPT_REPOSITORY).useValue(testUnauthorizedAttempts)
			.overrideProvider(STATUS_ASSIGNMENT_REPOSITORY).useValue(testStatusAssignmentRepository)
			.overrideProvider(DataSource)
			.useValue(mockDataSource)
			.compile();
		app = module.createNestApplication();
		await app.init();
		manager = signSession(app.get(JwtService), { sub: 'manager_l' });
		customer = signSession(app.get(JwtService), { sub: 'client_l' });
	});
	afterAll(async () => {
		await app?.close();
	});
	it('preserves create permissions', async () => {
		await request(app.getHttpServer()).post('/predefined-pizzas').send(input).expect(401);
		await request(app.getHttpServer())
			.post('/predefined-pizzas')
			.set('Authorization', `Bearer ${customer}`)
			.send(input)
			.expect(403);
	});
	it('creates all requested size aggregates through the existing POST', async () => {
		const { body } = await request(app.getHttpServer())
			.post('/predefined-pizzas')
			.set('Authorization', `Bearer ${manager}`)
			.send(input)
			.expect(201);
		expect(body.ids).toEqual([
			{ pizzaSku: 'PIZZA', pizzaSize: 'Large' },
			{ pizzaSku: 'PIZZA', pizzaSize: 'Small' },
		]);
		expect(body.defaultRecipeLines).toEqual(input.defaultRecipeLines);
	});
	it('reads by SKU and optional size on the existing detail route', async () => {
		const result = await request(app.getHttpServer())
			.get('/predefined-pizzas/PIZZA')
			.query({ pizzaSize: 'Large' })
			.expect(200);
		expect(result.body.ids).toEqual([{ pizzaSku: 'PIZZA', pizzaSize: 'Large' }]);
		const all = await request(app.getHttpServer()).get('/predefined-pizzas').expect(200);
		expect(all.body).toHaveLength(2);
	});
	it('returns 404 for a missing composite identity', async () => {
		await request(app.getHttpServer())
			.get('/predefined-pizzas/PIZZA')
			.query({ pizzaSize: 'Missing' })
			.expect(404);
	});
	it.each([
		{ ...input, availableSizes: [] },
		{ ...input, defaultRecipeLines: [] },
		{ ...input, recipeName: '' },
	])('rejects malformed requests %j', async (dto) => {
		await request(app.getHttpServer())
			.post('/predefined-pizzas')
			.set('Authorization', `Bearer ${manager}`)
			.send(dto)
			.expect(400);
	});
	it('allows only managers to replace a predefined recipe', async () => {
		await request(app.getHttpServer()).put('/predefined-pizzas/PIZZA').send(input).expect(401);
		await request(app.getHttpServer())
			.put('/predefined-pizzas/PIZZA')
			.set('Authorization', `Bearer ${customer}`)
			.send(input)
			.expect(403);
	});
	it('persists recipe edits and size changes without creating duplicate variants', async () => {
		const update = {
			recipeName: 'New recipe',
			defaultRecipeLines: [{ componentSku: 'CHEESE', defaultQuantity: 4 }],
			availableSizes: ['Small'],
		};
		await request(app.getHttpServer())
			.put('/predefined-pizzas/PIZZA')
			.set('Authorization', `Bearer ${manager}`)
			.send(update)
			.expect(200);
		const result = await request(app.getHttpServer()).get('/predefined-pizzas/PIZZA').expect(200);
		expect(result.body.recipeName).toBe('New recipe');
		expect(result.body.ids).toEqual([{ pizzaSku: 'PIZZA', pizzaSize: 'Small' }]);
		expect(result.body.defaultRecipeLines).toEqual(update.defaultRecipeLines);
		await request(app.getHttpServer())
			.get('/predefined-pizzas/PIZZA')
			.query({ pizzaSize: 'Large' })
			.expect(404);
	});
	it('rejects invalid replacement configurations and leaves the existing recipe intact', async () => {
		await request(app.getHttpServer())
			.put('/predefined-pizzas/PIZZA')
			.set('Authorization', `Bearer ${manager}`)
			.send({ ...input, defaultRecipeLines: [] })
			.expect(400);
		const result = await request(app.getHttpServer()).get('/predefined-pizzas/PIZZA').expect(200);
		expect(result.body.recipeName).toBe('New recipe');
		await request(app.getHttpServer())
			.put('/predefined-pizzas/MISSING')
			.set('Authorization', `Bearer ${manager}`)
			.send(input)
			.expect(404);
	});
});
