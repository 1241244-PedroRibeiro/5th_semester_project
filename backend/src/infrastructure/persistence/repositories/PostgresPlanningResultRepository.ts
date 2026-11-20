import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
    CreatePlanningResultInput,
    IPlanningResultRepository,
    PlanningResultRecord,
} from '../../../application/planning/IPlanningResultRepository';
import { PlanningResultEntity } from '../entities/PlanningResultEntity';

@Injectable()
export class PostgresPlanningResultRepository implements IPlanningResultRepository {
    constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

    async save(input: CreatePlanningResultInput): Promise<PlanningResultRecord> {
        const repo = this.dataSource.getRepository(PlanningResultEntity);
        const saved = await repo.save(repo.create({
            forecast_name: input.forecastName,
            scenario_name: input.scenarioName,
            reference_date: input.referenceDate,
            is_replay: input.isReplay,
            is_simulated: input.isSimulated,
            forecast_snapshot: input.forecastSnapshot,
            scenario_snapshot: input.scenarioSnapshot,
            stock_snapshot: input.stockSnapshot,
            requirements: input.requirements,
            proposals: input.proposals,
            unmet_needs: input.unmetNeeds,
        }));
        return this.toRecord(saved);
    }

    async findById(executionId: number): Promise<PlanningResultRecord | null> {
        const row = await this.dataSource.getRepository(PlanningResultEntity).findOne({
            where: { execution_id: executionId },
        });
        return row ? this.toRecord(row) : null;
    }

    async findAll(filters: {
        forecastName?: string;
        scenarioName?: string;
        pageSize?: number;
        pageStartIndex?: number;
    } = {}): Promise<PlanningResultRecord[]> {
        const query = this.dataSource.getRepository(PlanningResultEntity)
            .createQueryBuilder('result')
            .orderBy('result.executed_at', 'DESC')
            .addOrderBy('result.execution_id', 'DESC');

        if (filters.forecastName) query.andWhere('result.forecast_name = :forecastName', { forecastName: filters.forecastName });
        if (filters.scenarioName) query.andWhere('result.scenario_name = :scenarioName', { scenarioName: filters.scenarioName });

        const pageSize = Math.min(Math.max(filters.pageSize ?? 20, 1), 100);
        const pageStartIndex = Math.max(filters.pageStartIndex ?? 0, 0);
        const rows = await query.take(pageSize).skip(pageStartIndex).getMany();
        return rows.map((row) => this.toRecord(row));
    }

    private toRecord(row: PlanningResultEntity): PlanningResultRecord {
        return {
            executionId: row.execution_id,
            forecastName: row.forecast_name,
            scenarioName: row.scenario_name,
            referenceDate: row.reference_date,
            isReplay: row.is_replay,
            isSimulated: row.is_simulated,
            forecastSnapshot: row.forecast_snapshot,
            scenarioSnapshot: row.scenario_snapshot,
            stockSnapshot: row.stock_snapshot,
            requirements: row.requirements as PlanningResultRecord['requirements'],
            proposals: row.proposals as PlanningResultRecord['proposals'],
            unmetNeeds: row.unmet_needs as PlanningResultRecord['unmetNeeds'],
            executedAt: row.executed_at.toISOString(),
        };
    }
}