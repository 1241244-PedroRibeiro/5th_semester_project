import { databaseOptions } from '../../../src/infrastructure/persistence/database-options';

describe('TypeORM environment configuration', () => {
	const credentials = { DB_HOST: 'localhost', DB_USER: 'test', DB_PASSWORD: 'test', DB_NAME: 'test' };
	it('requires credentials rather than silently using a hardcoded database account', () => {
		expect(() => databaseOptions({})).toThrow('DB_HOST');
		expect(() => databaseOptions({ ...credentials, DB_PASSWORD: undefined })).toThrow('DB_PASSWORD');
	});
	it('accepts DATABASE_URL and disables automatic schema changes', () => {
		const options = databaseOptions({ DATABASE_URL: 'postgresql://test:test@localhost/test' });
		expect(options).toMatchObject({ url: 'postgresql://test:test@localhost/test', synchronize: false, migrationsRun: false, dropSchema: false });
		expect(options.entities).toHaveLength(38);
	});
	it('uses environment fields, TLS validation, and a bounded connection pool', () => {
		expect(databaseOptions({ ...credentials, DB_PORT: '55432', DB_POOL_MAX: '5', DB_SSL: 'true' }))
			.toMatchObject({ host: 'localhost', port: 55432, extra: { max: 5 }, ssl: { rejectUnauthorized: true } });
	});
	it.each([{ DB_PORT: 'invalid' }, { DB_POOL_MAX: '0' }, { DB_SCHEMA: 'public; DROP TABLE users' }])('rejects invalid configuration %j', values => {
		expect(() => databaseOptions({ ...credentials, ...values })).toThrow();
	});
});
