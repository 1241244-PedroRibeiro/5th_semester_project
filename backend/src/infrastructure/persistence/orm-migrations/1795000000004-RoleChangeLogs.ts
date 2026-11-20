import { MigrationInterface, QueryRunner } from 'typeorm';

export class RoleChangeLogs1795000000004 implements MigrationInterface {
	name = 'RoleChangeLogs1795000000004';

	async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`CREATE TABLE IF NOT EXISTS role_change_logs (
			id BIGSERIAL PRIMARY KEY,
			actor_username VARCHAR NOT NULL REFERENCES users(username) ON DELETE RESTRICT,
			target_username VARCHAR NOT NULL REFERENCES users(username) ON DELETE RESTRICT,
			previous_roles JSONB NOT NULL,
			new_roles JSONB NOT NULL,
			reason VARCHAR,
			changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)`);
		await queryRunner.query('CREATE INDEX IF NOT EXISTS idx_role_change_logs_target_changed_at ON role_change_logs(target_username, changed_at DESC)');
	}

	async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query('DROP TABLE IF EXISTS role_change_logs');
	}
}
