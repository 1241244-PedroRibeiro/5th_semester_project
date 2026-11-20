import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { baselineDatabase } from '../../src/infrastructure/persistence/baseline';
import { PasswordRecoveryEntity } from '../../src/infrastructure/persistence/entities/PasswordRecoveryEntity';
import { PostgresPasswordRecoveryStore } from '../../src/infrastructure/persistence/repositories/PostgresPasswordRecoveryStore';
import { createTestDatabase, postgres } from '../helpers/postgres';

postgres('Password recovery SQL and TypeORM compatibility', () => {
	it('preserves pending records when SQL is repeated and TypeORM migrates afterward', async () => {
		const database = await createTestDatabase(false, true);
		try {
			const source = database.dataSource;
			await baselineDatabase(source);
			const sql = readFileSync(join(__dirname, '../../src/infrastructure/persistence/migrations/018_create_password_recovery_table.sql'), 'utf8');
			await source.query(sql);
			const store = new PostgresPasswordRecoveryStore(source);
			expect(await store.issue('customer@laprizza.test', 'a'.repeat(64), async () => undefined)).toEqual({ status: 'SENT' });
			const before = await source.getRepository(PasswordRecoveryEntity).find();
			await source.query(sql);
			await source.runMigrations();
			await source.query(sql);
			expect(await source.getRepository(PasswordRecoveryEntity).find()).toEqual(before);
			expect((await source.driver.createSchemaBuilder().log()).upQueries).toEqual([]);
		} finally { await database.close(); }
	});
});
