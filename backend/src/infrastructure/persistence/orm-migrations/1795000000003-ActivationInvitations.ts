import { MigrationInterface, QueryRunner } from 'typeorm';

export class ActivationInvitations1795000000003 implements MigrationInterface {
	name = 'ActivationInvitations1795000000003';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			CREATE TABLE IF NOT EXISTS "activation_invitations" (
				"token" character varying NOT NULL,
				"username" character varying NOT NULL,
				"purpose" character varying NOT NULL,
				"expires_at" TIMESTAMPTZ NOT NULL,
				"used_at" TIMESTAMPTZ,
				"revoked_at" TIMESTAMPTZ,
				"created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
				CONSTRAINT "PK_activation_invitations_token" PRIMARY KEY ("token"),
				CONSTRAINT "FK_activation_invitations_user"
					FOREIGN KEY ("username") REFERENCES "users"("username") ON DELETE CASCADE,
				CONSTRAINT "CHK_activation_invitations_purpose"
					CHECK ("purpose" IN ('LOCAL_ACCOUNT_ACTIVATION', 'EXTERNAL_IDP_MATCH', 'PASSWORD_RESET'))
			)
		`);
		await queryRunner.query(`
			CREATE INDEX IF NOT EXISTS "IDX_activation_invitations_username_purpose"
			ON "activation_invitations" ("username", "purpose")
		`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`DROP INDEX IF EXISTS "IDX_activation_invitations_username_purpose"`);
		await queryRunner.query(`DROP TABLE IF EXISTS "activation_invitations"`);
	}
}
