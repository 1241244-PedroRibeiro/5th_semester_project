import { MigrationInterface, QueryRunner } from 'typeorm';

export class PasswordRecovery1793923200000 implements MigrationInterface {
	name = 'PasswordRecovery1793923200000';
	async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`CREATE TABLE IF NOT EXISTS password_recovery (
			email VARCHAR NOT NULL CONSTRAINT fk_password_recovery_email REFERENCES users(email) ON UPDATE CASCADE ON DELETE CASCADE,
			"timestamp" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			recovery_code VARCHAR(64) PRIMARY KEY,
			status VARCHAR NOT NULL DEFAULT 'PENDING' CONSTRAINT password_recovery_status_check CHECK (status IN ('PENDING', 'USED'))
		)`);
		await queryRunner.query('CREATE INDEX IF NOT EXISTS idx_password_recovery_email_timestamp ON password_recovery(email, "timestamp")');
	}
	async down(queryRunner: QueryRunner): Promise<void> { await queryRunner.dropTable('password_recovery'); }
}
