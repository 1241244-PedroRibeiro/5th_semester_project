import { MigrationInterface, QueryRunner } from "typeorm";

export class AddExternalIdpToUsers1794009602000 implements MigrationInterface {
    name = 'AddExternalIdpToUsers1794009602000'

    public async up(queryRunner: QueryRunner): Promise<void> {

        await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "external_idp_subject" character varying`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "password_hash" DROP NOT NULL`);
    
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "password_hash" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "external_idp_subject"`);
    }
}