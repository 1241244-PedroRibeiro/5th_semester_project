import { MigrationInterface, QueryRunner } from 'typeorm';

export class UnauthorizedAttempts1793836801000 implements MigrationInterface {
	name = 'UnauthorizedAttempts1793836801000';

	async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`CREATE TABLE IF NOT EXISTS unauthorized_attempts (
			id BIGSERIAL PRIMARY KEY,
			"user" VARCHAR CONSTRAINT fk_unauthorized_attempts_user REFERENCES users(username) ON DELETE SET NULL,
			"timestamp" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			endpoint TEXT NOT NULL
		)`);
		await queryRunner.query('CREATE INDEX IF NOT EXISTS idx_unauthorized_attempts_user_timestamp ON unauthorized_attempts("user", "timestamp")');
	}

	async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.dropTable('unauthorized_attempts');
	}
}
