import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('planning_results')
export class PlanningResultEntity {
    @PrimaryGeneratedColumn()
    execution_id!: number;

    @Column('varchar', { nullable: true })
    forecast_name!: string | null;

    @Column('varchar', { nullable: true })
    scenario_name!: string | null;

    @Column('date')
    reference_date!: string;

    @Column('boolean', { default: false })
    is_replay!: boolean;

    @Column('boolean', { default: false })
    is_simulated!: boolean;

    @Column('jsonb')
    forecast_snapshot!: unknown;

    @Column('jsonb')
    scenario_snapshot!: unknown;

    @Column('jsonb')
    stock_snapshot!: unknown;

    @Column('jsonb')
    requirements!: unknown;

    @Column('jsonb')
    proposals!: unknown;

    @Column('jsonb')
    unmet_needs!: unknown;

    @Column('timestamptz', { default: () => 'NOW()' })
    executed_at!: Date;
}