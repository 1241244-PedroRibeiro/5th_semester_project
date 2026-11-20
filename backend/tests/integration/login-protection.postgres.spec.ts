import { LoginAbuseService } from '../../src/application/auth/LoginAbuseService';
import { PostgresLoginAttemptStore } from '../../src/infrastructure/persistence/repositories/PostgresLoginAttemptStore';
import { LoginAttemptBucketEntity } from '../../src/infrastructure/persistence/entities/LoginAttemptBucketEntity';
import { emptyLoginBucket } from '../../src/application/auth/ILoginAttemptStore';
import { createTestDatabase, postgres } from '../helpers/postgres';

postgres('Shared PostgreSQL login protection', () => {
	let database: Awaited<ReturnType<typeof createTestDatabase>>;
	let services: LoginAbuseService[];
	beforeAll(async () => {
		database = await createTestDatabase(false);
		services = [0, 1].map(() => new LoginAbuseService(new PostgresLoginAttemptStore(database.dataSource)));
	});
	beforeEach(async () => { await database.dataSource.getRepository(LoginAttemptBucketEntity).clear(); });
	afterAll(async () => { await database?.close(); });

	it('atomically reserves at most ten account slots across instances and different IPs', async () => {
		const results = await Promise.allSettled(Array.from({ length: 30 }, (_, n) => services[n % 2].begin('owner@example.test', `192.0.2.${n + 1}`)));
		const admitted = results.filter(result => result.status === 'fulfilled');
		expect(admitted).toHaveLength(10);
		const denied = results.filter(result => result.status === 'rejected');
		expect(denied).toHaveLength(20);
		for (const result of denied) expect(result.reason.getStatus()).toBe(429);
		await Promise.all(admitted.map((result, n) => services[n % 2].finish(result.value, 'failure')));
		await expect(services[1].begin(' OWNER@EXAMPLE.TEST ', '198.51.100.1')).rejects.toMatchObject({ status: 429 });
	});

	it('shares the IP quota across instances without losing concurrent increments', async () => {
		const results = await Promise.allSettled(Array.from({ length: 30 }, (_, n) => services[n % 2].begin(`account${n}@example.test`, '192.0.2.1')));
		expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(20);
		for (const result of results.filter(result => result.status === 'rejected'))
			expect(result.reason.getStatus()).toBe(429);
	});

	it('expires stale state and stores only hashed keys with bounded counter state', async () => {
		for (let n = 0; n < 5; n++) {
			const attempt = await services[0].begin('owner@example.test', '192.0.2.1');
			await services[0].finish(attempt, 'failure');
		}
		await expect(services[1].begin('owner@example.test', '192.0.2.1')).rejects.toMatchObject({ status: 429 });
		const repository = database.dataSource.getRepository(LoginAttemptBucketEntity);
		const rows = await repository.find();
		expect(rows).toHaveLength(3);
		expect(JSON.stringify(rows)).not.toMatch(/owner@example|192\.0\.2\.1|WrongPassword/);
		await repository.createQueryBuilder().update().set({ expiresAt: new Date(Date.now() - 1000) }).execute();
		await expect(services[1].begin('owner@example.test', '192.0.2.1')).resolves.toBeDefined();
	});

	it('rolls back and reapplies the new migration', async () => {
		await database.dataSource.undoLastMigration();
		await expect(database.dataSource.getRepository(LoginAttemptBucketEntity).find()).rejects.toMatchObject({ code: '42P01' });
		await database.dataSource.runMigrations();
		await expect(services[0].begin('owner@example.test', '192.0.2.1')).resolves.toBeDefined();
	});

	it('maps the existing migration schema without additional schema changes', async () => {
		expect((await database.dataSource.driver.createSchemaBuilder().log()).upQueries).toEqual([]);
	});

	it('bounds expiry cleanup to 100 rows and skips rows locked by another transaction', async () => {
		const repository = database.dataSource.getRepository(LoginAttemptBucketEntity);
		const rows = Array.from({ length: 105 }, (_, n) => ({ key: n.toString(16).padStart(64, '0'),
			state: emptyLoginBucket(), expiresAt: new Date(Date.now() - 1000) }));
		await repository.insert(rows);
		const runner = database.dataSource.createQueryRunner();
		await runner.connect();
		await runner.startTransaction();
		try {
			await runner.manager.getRepository(LoginAttemptBucketEntity).findOneOrFail({
				where: { key: rows[0].key }, lock: { mode: 'pessimistic_write' },
			});
			// Malformed email makes this a single IP-store update/cleanup operation.
			await services[0].begin(undefined, '192.0.2.1');
			expect(await repository.count()).toBe(6);
			expect(await repository.existsBy({ key: rows[0].key })).toBe(true);
		} finally {
			await runner.rollbackTransaction();
			await runner.release();
		}
		await services[1].begin(undefined, '192.0.2.2');
		expect(await repository.count()).toBe(2);
		expect(await repository.existsBy({ key: rows[0].key })).toBe(false);
	});
});
