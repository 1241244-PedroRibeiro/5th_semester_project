import { MigrationInterface, QueryRunner } from 'typeorm';

export class LoginAttemptBuckets1794096000000 implements MigrationInterface {
	name = 'LoginAttemptBuckets1794096000000';

	async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`CREATE TABLE login_attempt_buckets (
			key CHAR(64) PRIMARY KEY,
			state JSONB NOT NULL,
			expires_at TIMESTAMPTZ NOT NULL
		)`);
		await queryRunner.query('CREATE INDEX idx_login_attempt_buckets_expiry ON login_attempt_buckets (expires_at)');
	}

	async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.dropTable('login_attempt_buckets');
	}
}
