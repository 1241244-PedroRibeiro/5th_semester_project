import { HttpException, INestApplication, UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AuthService } from '../../src/application/auth/AuthService';
import { ActivationInvitationService } from '../../src/application/auth/ActivationInvitationService';
import { LOGIN_ATTEMPT_STORE } from '../../src/application/auth/ILoginAttemptStore';
import { LoginAbuseService } from '../../src/application/auth/LoginAbuseService';
import { AuthController } from '../../src/presentation/http/controllers/AuthController';
import { LoginRateLimitGuard } from '../../src/presentation/http/middlewares/LoginRateLimit.guard';
import { GlobalExceptionFilter } from '../../src/presentation/global_exception.filter';
import { configureTrustedProxy } from '../../src/presentation/trusted-proxy';
import { TestLoginAttemptStore } from '../helpers/login-attempts';
import { testUnauthorizedAttempts } from '../helpers/unauthorized-attempts';

describe('Login protection HTTP boundary', () => {
	let app: INestApplication;
	const store = new TestLoginAttemptStore();
	const login = jest.fn();
	const attempt = (email = 'owner@example.test', address?: string) => {
		const operation = request(app.getHttpServer()).post('/auth/login').send({ email, password: 'WrongPassword1!', ip: '198.51.100.200' });
		return address ? operation.set('X-Forwarded-For', address).set('X-Real-IP', address) : operation;
	};
	beforeAll(async () => {
		const module = await Test.createTestingModule({
			controllers: [AuthController],
			providers: [LoginAbuseService, LoginRateLimitGuard,
				{ provide: LOGIN_ATTEMPT_STORE, useValue: store },
				{ provide: AuthService, useValue: { login } },
				{ provide: ActivationInvitationService, useValue: { resendActivation: jest.fn() } }],
		}).compile();
		app = module.createNestApplication();
		app.useGlobalFilters(new GlobalExceptionFilter(testUnauthorizedAttempts));
		await app.init();
	});
	beforeEach(() => {
		store.buckets.clear();
		login.mockReset().mockRejectedValue(new UnauthorizedException('Invalid email or password'));
		configureTrustedProxy(app.getHttpAdapter().getInstance(), '');
	});
	afterEach(() => { jest.restoreAllMocks(); });
	afterAll(async () => { await app.close(); });

	it('takes the IP from the socket and ignores spoofed headers and body fields from untrusted peers', async () => {
		for (let n = 1; n <= 5; n++) await attempt(undefined, `192.0.2.${n}`).expect(401);
		const denied = await attempt(undefined, '192.0.2.100').expect(429);
		expect(Number(denied.headers['retry-after'])).toBeGreaterThan(0);
		expect(denied.body).toEqual({ error: { message: 'Too many login attempts. Please try again later.' } });
		expect(login).toHaveBeenCalledTimes(5);
	});

	it('uses the client IP forwarded by a specifically trusted proxy and aggregates distributed failures', async () => {
		configureTrustedProxy(app.getHttpAdapter().getInstance(), '127.0.0.1/32,::1/128');
		for (let n = 1; n <= 10; n++) await attempt(' OWNER@EXAMPLE.TEST ', `192.0.2.${n}`).expect(401);
		const denied = await attempt('owner@example.test', '192.0.2.100').expect(429);
		expect(Number(denied.headers['retry-after'])).toBeGreaterThanOrEqual(59);
		expect(Number(denied.headers['retry-after'])).toBeLessThanOrEqual(60);
		expect(login).toHaveBeenCalledTimes(10);
	});

	it('limits one IP across many different target accounts', async () => {
		for (let n = 0; n < 20; n++) await attempt(`account${n}@example.test`).expect(401);
		await attempt('another@example.test').expect(429);
		expect(login).toHaveBeenCalledTimes(20);
	});

	it('resets failures on success, while leaving other account/IP pairs isolated', async () => {
		for (let n = 0; n < 4; n++) await attempt().expect(401);
		login.mockResolvedValueOnce({ token: 'test-session', user: { email: 'owner@example.test' } });
		await attempt().expect(200);
		for (let n = 0; n < 5; n++) await attempt().expect(401);
		await attempt().expect(429);
		await attempt('other@example.test').expect(401);
	});

	it('releases reservations after server errors without treating them as failed passwords', async () => {
		login.mockRejectedValue(new HttpException('Temporarily unavailable', 503));
		for (let n = 0; n < 6; n++) await attempt().expect(503);
		login.mockRejectedValue(new UnauthorizedException());
		await attempt().expect(401);
	});

	it('does not verify credentials when protection storage is unavailable', async () => {
		jest.spyOn(store, 'update').mockRejectedValue(new Error('Private database error'));
		const res = await attempt().expect(503);
		expect(JSON.stringify(res.body)).not.toContain('Private database error');
		expect(login).not.toHaveBeenCalled();
	});

	it.each(['true', '1', '0.0.0.0/0', '::/0', '192.0.2.1/99'])('rejects unsafe or invalid trusted-proxy configuration %s', value => {
		expect(() => configureTrustedProxy(app.getHttpAdapter().getInstance(), value)).toThrow('TRUSTED_PROXY_CIDRS');
	});
});
