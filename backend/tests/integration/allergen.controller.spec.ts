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
import { USER_REPOSITORY } from '../../src/application/auth/AuthDTOs';
import { createCatalogueUserRepository } from './helpers/catalogue-users';

describe('AllergenController (Integration)', () => {
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
		});

		customerToken = signSession(jwtService, {
			sub: 'client_l',
			email: 'client@laprizza.com',
			roles: [UserRole.CUSTOMER],
		});
	});

	afterAll(async () => {
		await app.close();
	});

	it('POST /allergens - should block unauthorized access without token', async () => {
		await request(app.getHttpServer())
			.post('/allergens')
			.send({ name: 'Soybeans', description: 'Soy products' })
			.expect(401);
	});

	it('POST /allergens - should forbid non-manager users (403)', async () => {
		await request(app.getHttpServer())
			.post('/allergens')
			.set('Authorization', `Bearer ${customerToken}`)
			.send({ name: 'Soybeans', description: 'Soy products' })
			.expect(403);
	});

	it('POST /allergens - should allow MANAGER to create allergen (201)', async () => {
		const res = await request(app.getHttpServer())
			.post('/allergens')
			.set('Authorization', `Bearer ${managerToken}`)
			.send({ name: 'Soybeans', description: 'Soy products' })
			.expect(201);

		expect(res.body).toHaveProperty('name');
		expect(res.body).not.toHaveProperty('code');
		expect(res.body.name).toBe('Soybeans');
	});

	it('GET /allergens - should allow public consultation (200)', async () => {
		const res = await request(app.getHttpServer())
			.get('/allergens')
			.expect(200);

		expect(Array.isArray(res.body)).toBe(true);
	});
});
