
import { MigrationInterface, QueryRunner } from 'typeorm';

export class KitchenConfigurations1794096000000
    implements MigrationInterface {

    name = 'KitchenConfigurations1794096000000';

    async up(queryRunner: QueryRunner): Promise<void> {

    // Fresh database: the table does not exist yet, so create it
    // directly in its final shape and stop.
    const tableExists = await queryRunner.hasTable('kitchen_configurations');

    if (!tableExists) {
        await queryRunner.query(`
            CREATE TABLE kitchen_configurations (
                name VARCHAR(100) PRIMARY KEY,
                json_content JSONB NOT NULL,
                is_active BOOLEAN NOT NULL DEFAULT FALSE,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        `);

        await queryRunner.query(`
            CREATE UNIQUE INDEX IF NOT EXISTS uq_active_kitchen_configuration
            ON kitchen_configurations (is_active)
            WHERE is_active = TRUE
        `);
        return;
    }

    // Table already in the final shape: nothing to do.
    const hasOldSchema = await queryRunner.hasColumn(
        'kitchen_configurations',
        'configuration',
    );
    if (!hasOldSchema) {
        return;
    }

    // Old shape (id, configuration, active) -> new shape.

    // Remove the previous active configuration index.
    await queryRunner.query(`
        DROP INDEX IF EXISTS kitchen_configurations_one_active
    `);

    // Replace the technical UUID primary key with the business key.
    await queryRunner.query(`
        ALTER TABLE kitchen_configurations
        DROP CONSTRAINT kitchen_configurations_pkey
    `);

    await queryRunner.query(`
        ALTER TABLE kitchen_configurations
        DROP COLUMN id
    `);

    // Rename columns according to ADR-011.
    await queryRunner.query(`
        ALTER TABLE kitchen_configurations
        RENAME COLUMN configuration TO json_content
    `);

    await queryRunner.query(`
        ALTER TABLE kitchen_configurations
        RENAME COLUMN active TO is_active
    `);

    // Standardize the business identifier.
    await queryRunner.query(`
        ALTER TABLE kitchen_configurations
        ALTER COLUMN name TYPE VARCHAR(100)
    `);

    // Use the configuration name as primary key.
    await queryRunner.query(`
        ALTER TABLE kitchen_configurations
        ADD CONSTRAINT kitchen_configurations_pkey
        PRIMARY KEY (name)
    `);

    // Enforce exactly one active configuration.
    await queryRunner.query(`
        CREATE UNIQUE INDEX uq_active_kitchen_configuration
        ON kitchen_configurations (is_active)
        WHERE is_active = TRUE
    `);
}

    async down(queryRunner: QueryRunner): Promise<void> {

        await queryRunner.query(`
            DROP INDEX IF EXISTS uq_active_kitchen_configuration
        `);

        await queryRunner.query(`
            ALTER TABLE kitchen_configurations
            DROP CONSTRAINT kitchen_configurations_pkey
        `);

        await queryRunner.query(`
            ALTER TABLE kitchen_configurations
            ADD COLUMN id UUID NOT NULL DEFAULT gen_random_uuid()
        `);

        await queryRunner.query(`
            ALTER TABLE kitchen_configurations
            ADD CONSTRAINT kitchen_configurations_pkey
            PRIMARY KEY (id)
        `);

        await queryRunner.query(`
            ALTER TABLE kitchen_configurations
            RENAME COLUMN json_content TO configuration
        `);

        await queryRunner.query(`
            ALTER TABLE kitchen_configurations
            RENAME COLUMN is_active TO active
        `);

        await queryRunner.query(`
            ALTER TABLE kitchen_configurations
            ALTER COLUMN name TYPE VARCHAR(120)
        `);

        await queryRunner.query(`
            CREATE UNIQUE INDEX kitchen_configurations_one_active
            ON kitchen_configurations (active)
            WHERE active = TRUE
        `);
    }
}
