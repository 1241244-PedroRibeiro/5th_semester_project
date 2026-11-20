import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import { databaseOptions } from '../../src/infrastructure/persistence/database-options';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/presentation/app.module';
import { seedDatabase } from '../../src/bootstrap/seed/seed';
import { resolveSeedServices } from '../../src/bootstrap/seed/seed-services';

export const postgres = process.env.TEST_DATABASE_URL ? describe : describe.skip;

/**
 * Runs the development seed through the real application services, bound to this suite's schema.
 * The module is intentionally not closed: closing it would also destroy the suite-owned DataSource.
 */
export async function seedTestDatabase(dataSource: DataSource): Promise<void> {
	const module = await Test.createTestingModule({ imports: [AppModule] })
		.overrideProvider(DataSource).useValue(dataSource).compile();
	await seedDatabase(resolveSeedServices(module));
}

/** Each suite owns a fresh schema. Production tables and other suites are never reused. */
export async function createTestDatabase(seed = true, legacy = false): Promise<{ dataSource: DataSource; close: () => Promise<void> }> {
	const url = process.env.TEST_DATABASE_URL;
	if (!url) throw new Error('TEST_DATABASE_URL is required for PostgreSQL integration tests');
	const schema = `typeorm_test_${randomUUID().replace(/-/g, '')}`;
	const admin = await new DataSource({ type: 'postgres', url }).initialize();
	const runner = admin.createQueryRunner();
	await runner.createSchema(schema, true);
	await runner.release();
	const dataSource = new DataSource(databaseOptions({ ...process.env, DATABASE_URL: url, DB_SCHEMA: schema }));
	try {
		await dataSource.initialize();
		if (legacy) {
			// Reproduce the frozen Sprint 1 baseline (001–013), including its fixtures.
			// Sprint 2 SQL additions are not part of the initial TypeORM migration.
			const directory = join(__dirname, '../../src/infrastructure/persistence/migrations');
			for (const file of readdirSync(directory).filter(file => /^0(?:0[1-9]|1[0-3])_.*\.sql$/.test(file)).sort())
				await dataSource.query(readFileSync(join(directory, file), 'utf8'));
		} else {
			await dataSource.runMigrations();
			if (seed) await seedTestDatabase(dataSource);
		}
	} catch (error) {
		if (dataSource.isInitialized) await dataSource.destroy();
		const cleanup = admin.createQueryRunner();
		try { await cleanup.dropSchema(schema, true, true); } finally { await cleanup.release(); await admin.destroy(); }
		throw error;
	}
	return { dataSource, close: async () => {
		if (dataSource.isInitialized) await dataSource.destroy();
		const cleanup = admin.createQueryRunner();
		try { await cleanup.dropSchema(schema, true, true); } finally { await cleanup.release(); await admin.destroy(); }
	} };
}
