import { MigrationInterface, QueryRunner } from 'typeorm';

export class ExchangeCodes1795000000005 implements MigrationInterface {
	name = 'ExchangeCodes1795000000005';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			CREATE TABLE IF NOT EXISTS "external_exchange_codes" (
				"code_hash" character varying NOT NULL,
				"username" character varying NOT NULL,
				"expires_at" TIMESTAMPTZ NOT NULL,
				"used_at" TIMESTAMPTZ,
				CONSTRAINT "PK_external_exchange_codes_code_hash" PRIMARY KEY ("code_hash"),
				CONSTRAINT "FK_external_exchange_codes_user"
					FOREIGN KEY ("username") REFERENCES "users"("username") ON DELETE CASCADE
			)
		`);
		await queryRunner.query(`
			CREATE INDEX IF NOT EXISTS "IDX_external_exchange_codes_expires_at"
			ON "external_exchange_codes" ("expires_at", "used_at")
		`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`DROP INDEX IF EXISTS "IDX_external_exchange_codes_expires_at"`);
		await queryRunner.query(`DROP TABLE IF EXISTS "external_exchange_codes"`);
	}
}
