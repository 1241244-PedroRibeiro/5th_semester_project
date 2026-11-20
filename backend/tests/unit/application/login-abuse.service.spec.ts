import { HttpException, ServiceUnavailableException } from '@nestjs/common';
import { LoginAbuseService } from '../../../src/application/auth/LoginAbuseService';
import { TestLoginAttemptStore } from '../../helpers/login-attempts';

describe('Login abuse protection', () => {
	let service: LoginAbuseService;
	let store: TestLoginAttemptStore;
	const email = 'owner@example.test';
	const ip = '192.0.2.1';
	const fail = async (account = email, address = ip) => {
		const attempt = await service.begin(account, address);
		await service.finish(attempt, 'failure');
	};
	async function blocked(account: string, address: string, seconds: number) {
		try {
			await service.begin(account, address);
			throw new Error('Expected rejection');
		} catch (error) {
			expect(error).toBeInstanceOf(HttpException);
			expect((error as HttpException).getStatus()).toBe(429);
			expect((error as HttpException).getResponse()).toMatchObject({ retryAfterSeconds: seconds });
		}
	}
	beforeEach(() => {
		jest.useFakeTimers().setSystemTime(new Date('2026-11-08T12:00:00Z'));
		store = new TestLoginAttemptStore();
		service = new LoginAbuseService(store);
	});
	afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks(); });

	it('counts successful logins across accounts toward the rolling IP limit', async () => {
		for (let n = 0; n < 20; n++) {
			const attempt = await service.begin(`account${n}@example.test`, ip);
			await service.finish(attempt, 'success');
		}
		await blocked('another@example.test', ip, 60);
		jest.advanceTimersByTime(60_000);
		await expect(service.begin(email, ip)).resolves.toBeDefined();
	});

	it('blocks a normalized account/IP pair after five failures while other pairs remain usable', async () => {
		for (let n = 0; n < 5; n++) await fail(' OWNER@EXAMPLE.TEST ');
		await blocked(email, ip, 300);
		await expect(service.begin('other@example.test', ip)).resolves.toBeDefined();
		await expect(service.begin(email, '192.0.2.2')).resolves.toBeDefined();
		jest.advanceTimersByTime(300_000);
		await expect(service.begin(email, ip)).resolves.toBeDefined();
	});

	it('aggregates ten failures from different IPs and escalates bounded account cooldowns', async () => {
		for (const seconds of [60, 120, 240, 480, 900, 900]) {
			for (let n = 0; n < 10; n++) await fail(email, `192.0.2.${n + 1}`);
			await blocked(email, '198.51.100.1', seconds);
			jest.advanceTimersByTime(seconds * 1000);
		}
	});

	it('expires failed attempts outside the 15-minute observation window', async () => {
		for (let n = 0; n < 4; n++) await fail();
		jest.advanceTimersByTime(15 * 60_000);
		await fail();
		await expect(service.begin(email, ip)).resolves.toBeDefined();
	});

	it('resets previous account failures on success without clearing the IP quota', async () => {
		for (let n = 0; n < 4; n++) await fail();
		await service.finish(await service.begin(email, ip), 'success');
		for (let n = 0; n < 4; n++) await fail();
		await expect(service.begin(email, ip)).resolves.toBeDefined();
	});

	it('reserves slots before verification to bound concurrent distributed guessing', async () => {
		const results = await Promise.allSettled(Array.from({ length: 30 }, (_, n) => service.begin(email, `192.0.2.${n + 1}`)));
		expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(10);
		expect(results.filter(result => result.status === 'rejected')).toHaveLength(20);
		// A process crash cannot leave permanent reservations.
		jest.advanceTimersByTime(120_000);
		await expect(service.begin(email, ip)).resolves.toBeDefined();
	});

	it('limits simultaneous attempts from one account/IP pair to five', async () => {
		const attempts = await Promise.all(Array.from({ length: 5 }, () => service.begin(email, ip)));
		await blocked(email, ip, 120);
		await service.finish(attempts[0], 'error');
		await expect(service.begin(email, ip)).resolves.toBeDefined();
	});

	it('does not erase other pending reservations when an attempt succeeds', async () => {
		const attempts = await Promise.all(Array.from({ length: 5 }, () => service.begin(email, ip)));
		await service.finish(attempts[0], 'success');
		await service.begin(email, ip);
		await blocked(email, ip, 120);
	});

	it('applies the same failure policy to unknown accounts and does not store passwords, raw IPs or emails', async () => {
		for (let n = 0; n < 5; n++) await fail('unknown@example.test');
		await blocked('unknown@example.test', ip, 300);
		const stored = JSON.stringify([...store.buckets.entries()]);
		expect(stored).not.toContain('unknown@example.test');
		expect(stored).not.toContain(ip);
	});

	it('keeps IP protection for malformed email input', async () => {
		for (let n = 0; n < 20; n++) await service.begin({ email: 'invalid' }, ip);
		await blocked(email, ip, 60);
		expect(store.buckets.size).toBe(1);
	});

	it('fails closed when shared storage is unavailable', async () => {
		jest.spyOn(store, 'update').mockRejectedValue(new Error('Database unavailable'));
		await expect(service.begin(email, ip)).rejects.toBeInstanceOf(ServiceUnavailableException);
	});
});
