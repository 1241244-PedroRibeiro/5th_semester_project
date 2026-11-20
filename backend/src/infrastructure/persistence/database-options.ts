import { join } from 'node:path';
import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import * as entities from './entities';

/** Shared by NestJS, the migration CLI and seed runner. Never mutates the schema on startup. */
export function databaseOptions(env: NodeJS.ProcessEnv = process.env): PostgresConnectionOptions {
	const required = (name: string): string => {
		const value = env[name];
		if (!value) throw new Error(`Missing database environment variable: ${name}`);
		return value;
	};
	const integer = (name: string, fallback: number): number => {
		const value = env[name] === undefined ? fallback : Number(env[name]);
		if (!Number.isInteger(value) || value <= 0) throw new Error(`${name} must be a positive integer`);
		return value;
	};
	const schema = env.DB_SCHEMA || 'public';
	if (!/^[a-z_][a-z0-9_]*$/.test(schema)) throw new Error('DB_SCHEMA must be a lowercase PostgreSQL identifier');
	return {
		type: 'postgres',
		...(env.DATABASE_URL ? { url: env.DATABASE_URL } : {
			host: required('DB_HOST'), port: integer('DB_PORT', 5432),
			username: required('DB_USER'), password: required('DB_PASSWORD'), database: required('DB_NAME'),
		}),
		schema,
		entities: Object.values(entities),
		migrations: [join(__dirname, 'orm-migrations', '*{.ts,.js}')],
		migrationsTableName: 'typeorm_migrations',
		synchronize: false,
		migrationsRun: false,
		dropSchema: false,
		installExtensions: false,
		uuidExtension: 'pgcrypto',
		logging: env.DB_LOGGING === 'true',
		ssl: env.DB_SSL === 'true' ? { rejectUnauthorized: true } : false,
		extra: { options: `-c search_path=${schema},public`, max: integer('DB_POOL_MAX', 20), idleTimeoutMillis: 30000, connectionTimeoutMillis: 2000 },
	};
}
