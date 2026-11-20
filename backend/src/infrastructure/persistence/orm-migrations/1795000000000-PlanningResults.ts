import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class PlanningResults1795000000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: 'planning_results',
                columns: [
                    { name: 'execution_id', type: 'serial', isPrimary: true },
                    { name: 'forecast_name', type: 'varchar', isNullable: true },
                    { name: 'scenario_name', type: 'varchar', isNullable: true },
                    { name: 'reference_date', type: 'date', isNullable: false },
                    { name: 'is_replay', type: 'boolean', default: false },
                    { name: 'is_simulated', type: 'boolean', default: false },
                    { name: 'forecast_snapshot', type: 'jsonb', isNullable: false },
                    { name: 'scenario_snapshot', type: 'jsonb', isNullable: false },
                    { name: 'stock_snapshot', type: 'jsonb', isNullable: false },
                    { name: 'requirements', type: 'jsonb', isNullable: false },
                    { name: 'proposals', type: 'jsonb', isNullable: false },
                    { name: 'unmet_needs', type: 'jsonb', isNullable: false },
                    { name: 'executed_at', type: 'timestamptz', default: 'NOW()' },
                ],
            }),
            true,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable('planning_results');
    }
}