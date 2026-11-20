import { MigrationInterface, QueryRunner } from 'typeorm';

export class AdministratorRole1793836802000 implements MigrationInterface {
	name = 'AdministratorRole1793836802000';

	async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query("INSERT INTO user_roles (name) VALUES ('ADMINISTRATOR') ON CONFLICT (name) DO NOTHING");
	}

	async down(queryRunner: QueryRunner): Promise<void> {
		// Assigned roles are protected by the foreign key; never silently revoke access.
		await queryRunner.query("DELETE FROM user_roles WHERE name = 'ADMINISTRATOR'");
	}
}
