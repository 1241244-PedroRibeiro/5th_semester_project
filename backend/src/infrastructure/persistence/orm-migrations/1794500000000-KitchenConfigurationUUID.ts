
import { MigrationInterface, QueryRunner } from 'typeorm';

export class KitchenConfigurationUUID1794500000000
    implements MigrationInterface {

    name = 'KitchenConfigurationUUID1794500000000';

    async up(queryRunner: QueryRunner): Promise<void> {

        // Add a UUID to every existing configuration.
        await queryRunner.query(`
            CREATE EXTENSION IF NOT EXISTS pgcrypto;
        `);

        await queryRunner.query(`
            ALTER TABLE kitchen_configurations
            ADD COLUMN IF NOT EXISTS id UUID
            DEFAULT gen_random_uuid();
        `);

        await queryRunner.query(`
            UPDATE kitchen_configurations
            SET id = gen_random_uuid()
            WHERE id IS NULL;
        `);

        await queryRunner.query(`
            ALTER TABLE kitchen_configurations
            ALTER COLUMN id SET NOT NULL;
        `);

        await queryRunner.query(`
            ALTER TABLE kitchen_configurations
            ALTER COLUMN id SET DEFAULT gen_random_uuid();
        `);

        // Remove the old primary key (name).
        await queryRunner.query(`
            ALTER TABLE kitchen_configurations
            DROP CONSTRAINT IF EXISTS kitchen_configurations_pkey;
        `);

        // Make UUID the new primary key.
        await queryRunner.query(`
            ALTER TABLE kitchen_configurations
            ADD CONSTRAINT kitchen_configurations_pkey
            PRIMARY KEY (id);
        `);

        // Preserve name uniqueness as a business constraint.
        await queryRunner.query(`
            ALTER TABLE kitchen_configurations
            ADD CONSTRAINT uq_kitchen_configuration_name
            UNIQUE (name);
        `);

        // Preserve the one-active-configuration invariant.
        await queryRunner.query(`
            CREATE UNIQUE INDEX IF NOT EXISTS
            uq_active_kitchen_configuration
            ON kitchen_configurations (is_active)
            WHERE is_active = TRUE;
        `);
    }

    async down(queryRunner: QueryRunner): Promise<void> {

        await queryRunner.query(`
            DROP INDEX IF EXISTS uq_active_kitchen_configuration;
        `);

        await queryRunner.query(`
            ALTER TABLE kitchen_configurations
            DROP CONSTRAINT IF EXISTS uq_kitchen_configuration_name;
        `);

        await queryRunner.query(`
            ALTER TABLE kitchen_configurations
            DROP CONSTRAINT IF EXISTS kitchen_configurations_pkey;
        `);

        await queryRunner.query(`
            ALTER TABLE kitchen_configurations
            ADD CONSTRAINT kitchen_configurations_pkey
            PRIMARY KEY (name);
        `);

        await queryRunner.query(`
            ALTER TABLE kitchen_configurations
            DROP COLUMN IF EXISTS id;
        `);

        await queryRunner.query(`
            CREATE UNIQUE INDEX IF NOT EXISTS
            uq_active_kitchen_configuration
            ON kitchen_configurations (is_active)
            WHERE is_active = TRUE;
        `);
    }
}
