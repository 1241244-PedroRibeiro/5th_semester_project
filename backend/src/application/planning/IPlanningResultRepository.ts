import { PlanningRequirementDTO, UnmetNeedDTO } from './PlanningDTOs';

export const PLANNING_RESULT_REPOSITORY = 'IPlanningResultRepository';

export interface CreatePlanningResultInput {
    forecastName: string | null;
    scenarioName: string | null;
    referenceDate: string;
    isReplay: boolean;
    isSimulated: boolean;
    forecastSnapshot: unknown;
    scenarioSnapshot: unknown;
    stockSnapshot: unknown;
    requirements: PlanningRequirementDTO[];
    proposals: unknown[];
    unmetNeeds: UnmetNeedDTO[];
}

export interface PlanningResultRecord extends CreatePlanningResultInput {
    executionId: number;
    executedAt: string;
}

export interface IPlanningResultRepository {
    save(input: CreatePlanningResultInput): Promise<PlanningResultRecord>;
    findById(executionId: number): Promise<PlanningResultRecord | null>;
    findAll(filters?: {
        forecastName?: string;
        scenarioName?: string;
        pageSize?: number;
        pageStartIndex?: number;
    }): Promise<PlanningResultRecord[]>;
}