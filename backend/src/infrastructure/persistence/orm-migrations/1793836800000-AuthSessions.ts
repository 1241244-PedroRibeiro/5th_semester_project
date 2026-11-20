import { MigrationInterface, QueryRunner } from 'typeorm';

export class AuthSessions1793836800000 implements MigrationInterface {
	name = 'AuthSessions1793836800000';

	async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`CREATE TABLE IF NOT EXISTS auth_sessions (
			id UUID PRIMARY KEY,
			username VARCHAR NOT NULL REFERENCES users(username) ON DELETE CASCADE,
			expires_at TIMESTAMPTZ NOT NULL,
			revoked_at TIMESTAMPTZ,
			refresh_token_hash VARCHAR
		)`);
		await queryRunner.query('ALTER TABLE auth_sessions ADD COLUMN IF NOT EXISTS refresh_token_hash VARCHAR');
		await queryRunner.query('CREATE UNIQUE INDEX IF NOT EXISTS idx_auth_sessions_refresh_token_hash ON auth_sessions(refresh_token_hash) WHERE refresh_token_hash IS NOT NULL');
		await queryRunner.query('CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires_at ON auth_sessions(expires_at)');
	}

	async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.dropTable('auth_sessions');
	}
}
