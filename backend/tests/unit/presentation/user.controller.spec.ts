import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { UserController } from '../../../src/presentation/http/controllers/UserController';
import { UserService } from '../../../src/application/user/UserService';
import { UserStatus } from '../../../src/domain/user/UserStatus';

describe('UserController path parameters', () => {
	let app: INestApplication;
	const customerId = 'customer_e';
	const otherId = 'other_e';
	const service = {
		getUserAllergens: jest.fn().mockResolvedValue({ username: customerId, allergens: [] }),
		relateUserAllergens: jest.fn().mockResolvedValue(undefined),
		deactivateUser: jest.fn().mockResolvedValue(undefined),
	};
	const allergens = { checkAllergens: jest.fn().mockResolvedValue(['Gluten']) };

	beforeAll(async () => {
		const module = await Test.createTestingModule({
			controllers: [UserController],
			providers: [
				{ provide: UserService, useValue: service },
				{ provide: 'AllergenService', useValue: allergens },
			],
		}).compile();
		app = module.createNestApplication();
		// Authentication is stubbed here to isolate routing, pipes, and ownership.
		app.use((req: any, _res: any, next: () => void) => {
			req.user = { username: customerId, roles: ['CUSTOMER'], status: UserStatus.ACTIVE };
			next();
		});
		await app.init();
	});

	beforeEach(() => jest.clearAllMocks());
	afterAll(async () => { await app.close(); });

	it('reads allergens using the path ID even when the body supplies another ID', async () => {
		await request(app.getHttpServer()).get(`/user/${customerId}/allergens`)
			.send({ username: otherId }).expect(200);
		expect(service.getUserAllergens).toHaveBeenCalledWith(customerId);
	});

	it('relates allergens using the path ID and allergen names from the body', async () => {
		await request(app.getHttpServer()).post(`/user/${customerId}/allergen`)
			.send({ username: otherId, allergens: ['Gluten'] }).expect(201);
		expect(allergens.checkAllergens).toHaveBeenCalledWith(['Gluten']);
		expect(service.relateUserAllergens).toHaveBeenCalledWith(customerId, ['Gluten']);
	});

	it('deactivates using the path ID even when the body supplies another ID', async () => {
		await request(app.getHttpServer()).delete(`/user/${customerId}`)
			.send({ username: otherId }).expect(200);
		expect(service.deactivateUser).toHaveBeenCalledWith(customerId, customerId);
	});

	it.each([
		['get', 'allergens'], ['post', 'allergen'], ['delete', ''],
	] as const)('rejects access to another username for %s %s', async (method, endpoint) => {
		await request(app.getHttpServer())[method](`/user/not-a-uuid${endpoint ? `/${endpoint}` : ''}`)
			.send({ allergens: ['Gluten'] }).expect(method === 'delete' ? 401 : 403);
		expect(service.getUserAllergens).not.toHaveBeenCalled();
		expect(service.relateUserAllergens).not.toHaveBeenCalled();
		expect(service.deactivateUser).not.toHaveBeenCalled();
	});

	it('rejects relating allergens to another path ID before accessing services', async () => {
		await request(app.getHttpServer()).post(`/user/${otherId}/allergen`)
			.send({ allergens: ['Gluten'] }).expect(403);
		expect(allergens.checkAllergens).not.toHaveBeenCalled();
		expect(service.relateUserAllergens).not.toHaveBeenCalled();
	});
});
