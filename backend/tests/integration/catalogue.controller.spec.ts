import { STATUS_ASSIGNMENT_REPOSITORY } from '../../src/application/user/IStatusAssignmentRepository';
import { testStatusAssignmentRepository } from '../helpers/status-assignments';
import { UNAUTHORIZED_ATTEMPT_REPOSITORY } from '../../src/application/auth/IUnauthorizedAttemptRepository';
import { testUnauthorizedAttempts } from '../helpers/unauthorized-attempts';
import { AUTH_SESSION_REPOSITORY } from '../../src/application/auth/IAuthSessionRepository';
import { testSessions } from '../helpers/auth-sessions';
import { DataSource } from 'typeorm';
import { mockDataSource } from '../helpers/mock-data-source';
import 'dotenv/config';

process.env.USE_IN_MEMORY_REPO = 'true';
process.env.JWT_SECRET =
	process.env.JWT_SECRET ||
	'laprizza-default-secret-key-change-in-production-2026';

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { AppModule } from '../../src/presentation/app.module';
import { USER_REPOSITORY } from '../../src/application/auth/AuthDTOs';
import {
	CATALOGUE_REPOSITORY,
	ICatalogueRepository,
} from '../../src/application/catalogue/ICatalogueRepository';
import { CatalogueItemDTO } from '../../src/application/catalogue/CatalogueDTOs';
import { createCatalogueUserRepository } from './helpers/catalogue-users';

const CATALOGUE_ITEMS: CatalogueItemDTO[] = [
	{
		productSku: 'PRD-COLA',
		name: 'Cola',
		description: 'Cold beverage',
		categoryName: 'CAT-BEV',
		allergens: [],
		directPrice: {
			amount: 2.5,
			currency: 'EUR',
		},
		isPredefinedPizza: false,
		isAvailable: false,
	},
	{
		productSku: 'PRD-WATER',
		name: 'Water',
		description: 'Bottled water',
		categoryName: 'CAT-BEV',
		allergens: [],
		directPrice: {
			amount: 1,
			currency: 'EUR',
		},
		isPredefinedPizza: false,
		isAvailable: true,
	},
	{
		productSku: 'PRD-PIZZA-MARG',
		name: 'Pizza Margherita',
		description: 'Tomato and mozzarella',
		categoryName: 'CAT-PIZZA',
		allergens: ['ALL-GLUTEN', 'ALL-DAIRY'],
		isPredefinedPizza: true,
		isAvailable: false,
		recipeName: 'Margherita',
		defaultRecipeLines: [
			{
				componentSku: 'PRD-MOZZ',
				defaultQuantity: 1,
			},
		],
		sizeVariants: [
			{
				pizzaSize: '550e8400-e29b-41d4-a716-446655440001',
				sizeName: 'Small',
				computedPrice: { amount: 7, currency: 'EUR' },
				isAvailable: false,
			},
			{
				pizzaSize: '550e8400-e29b-41d4-a716-446655440002',
				sizeName: 'Medium',
				computedPrice: { amount: 9, currency: 'EUR' },
				isAvailable: true,
			},
		],
	},
	{
		productSku: 'PRD-PIZZA-SOLDOUT',
		name: 'Unavailable Pizza',
		description: 'Pizza temporarily unavailable',
		categoryName: 'CAT-PIZZA',
		allergens: [],
		isPredefinedPizza: true,
		isAvailable: true,
		recipeName: 'Unavailable',
		defaultRecipeLines: [],
		sizeVariants: [
			{
				pizzaSize: '550e8400-e29b-41d4-a716-446655440003',
				sizeName: 'Small',
				computedPrice: { amount: 8, currency: 'EUR' },
				isAvailable: false,
			},
		],
	},
];

describe('CatalogueController (integration)', () => {
	let app: INestApplication;

	const catalogueRepository: jest.Mocked<ICatalogueRepository> = {
		findAll: jest.fn().mockResolvedValue(CATALOGUE_ITEMS),
		findByProductSku: jest.fn().mockImplementation(
			async (productSku: string) =>
				CATALOGUE_ITEMS.find(
					(item) =>
						item.productSku.toUpperCase() ===
						productSku.toUpperCase(),
				) ?? null,
		),
	};

	beforeAll(async () => {
		const moduleFixture: TestingModule =
			await Test.createTestingModule({
				imports: [AppModule],
			})
				.overrideProvider(USER_REPOSITORY)
				.useValue(await createCatalogueUserRepository())
				.overrideProvider(CATALOGUE_REPOSITORY)
				.useValue(catalogueRepository)
				.overrideProvider(AUTH_SESSION_REPOSITORY).useValue(testSessions)
			.overrideProvider(UNAUTHORIZED_ATTEMPT_REPOSITORY).useValue(testUnauthorizedAttempts)
			.overrideProvider(STATUS_ASSIGNMENT_REPOSITORY).useValue(testStatusAssignmentRepository)
			.overrideProvider(DataSource).useValue(mockDataSource).compile();

		app = moduleFixture.createNestApplication();
		await app.init();
	});

	afterAll(async () => {
		await app?.close();
	});

	it('allows public consultation of the catalogue', async () => {
		await request(app.getHttpServer())
			.get('/catalogue')
			.expect(200)
			.expect(({ body }) => {
				expect(body).toHaveLength(4);
				expect(body[0].productSku).toBe('PRD-COLA');
			});
	});

	it('filters products by category', async () => {
		await request(app.getHttpServer())
			.get('/catalogue?category=CAT-PIZZA')
			.expect(200)
			.expect(({ body }) => {
				expect(body).toHaveLength(2);
				expect(
					body.every(
						(item: CatalogueItemDTO) =>
							item.categoryName === 'CAT-PIZZA',
					),
				).toBe(true);
			});
	});

	it('excludes products containing requested allergens', async () => {
		await request(app.getHttpServer())
			.get('/catalogue?excludeAllergens=ALL-GLUTEN,ALL-DAIRY')
			.expect(200)
			.expect(({ body }) => {
				const codes = body.map(
					(item: CatalogueItemDTO) => item.productSku,
				);

				expect(codes).not.toContain('PRD-PIZZA-MARG');
				expect(codes).toContain('PRD-COLA');
				expect(codes).toContain('PRD-WATER');
			});
	});

	it('returns only currently available products when requested', async () => {
		await request(app.getHttpServer())
			.get('/catalogue?availableOnly=true')
			.expect(200)
			.expect(({ body }) => {
				const codes = body.map(
					(item: CatalogueItemDTO) => item.productSku,
				);

				expect(codes).toContain('PRD-WATER');
				expect(codes).toContain('PRD-PIZZA-MARG');
				expect(codes).not.toContain('PRD-COLA');
				expect(codes).not.toContain('PRD-PIZZA-SOLDOUT');
			});
	});

	it('rejects an invalid availableOnly parameter', async () => {
		await request(app.getHttpServer())
			.get('/catalogue?availableOnly=yes')
			.expect(400);
	});

	it('returns predefined pizza details including its recipe and sizes', async () => {
		await request(app.getHttpServer())
			.get('/catalogue/PRD-PIZZA-MARG')
			.expect(200)
			.expect(({ body }) => {
				expect(body.productSku).toBe('PRD-PIZZA-MARG');
				expect(body.recipeName).toBe('Margherita');
				expect(body.defaultRecipeLines).toHaveLength(1);
				expect(body.sizeVariants).toHaveLength(2);
				expect(body.isAvailable).toBe(true);
			});
	});

	it('returns 404 for a product not present in the catalogue', async () => {
		await request(app.getHttpServer())
			.get('/catalogue/PRD-UNKNOWN')
			.expect(404);
	});

	it('allows public consultation without an authentication token', async () => {
		await request(app.getHttpServer())
			.get('/catalogue')
			.expect(200);
	});
});
