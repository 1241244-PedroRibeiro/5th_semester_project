import { MigrationInterface, QueryRunner } from 'typeorm';

export class StatusAssignment1794009601000 implements MigrationInterface {
	name = 'StatusAssignment1794009601000';

	async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`CREATE TABLE IF NOT EXISTS status_assignment (
	id BIGSERIAL PRIMARY KEY,
	assigned_from VARCHAR CONSTRAINT fk_status_assignment_from REFERENCES users(username) ON DELETE SET NULL,
	status VARCHAR NOT NULL CONSTRAINT status_assignment_status_check CHECK (status IN ('ACTIVE', 'DEACTIVATED', 'PENDING_REGISTRATION')),
	assigned_to VARCHAR NOT NULL,
	"timestamp" TIMESTAMPTZ NOT NULL DEFAULT NOW()
)`);
		await queryRunner.query('CREATE INDEX IF NOT EXISTS idx_status_assignment_from_timestamp ON status_assignment(assigned_from, "timestamp")');
		await queryRunner.query('CREATE INDEX IF NOT EXISTS idx_status_assignment_to_timestamp ON status_assignment(assigned_to, "timestamp")');
	}

	async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.dropTable('status_assignment');
	}
}
