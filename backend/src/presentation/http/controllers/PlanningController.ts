import { Body, Controller, Get, Post, Query, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { Roles } from '../middlewares/decorators';
import { JwtAuthGuard } from '../middlewares/JwtAuthGuard';
import { RolesGuard } from '../middlewares/roles.guard';
import { StatusGuard } from '../middlewares/UserStatus.guard';
import { PlanningService } from '../../../application/planning/PlanningService';
import { BomExecutionRequestDTO, PlanningExecutionRequestDTO, PlanningResultResponseDTO } from '../../../application/planning/PlanningDTOs';

@Controller('planning')
@UseGuards(JwtAuthGuard, StatusGuard, RolesGuard)
export class PlanningController {
    constructor(private readonly planningService: PlanningService) {}

    @Post('bom-executions')
    @Roles('MANAGER')
    async executeBom(@Body() body: BomExecutionRequestDTO): Promise<PlanningResultResponseDTO> {
        return this.planningService.executeBom(body);
    }

    @Post('executions')
    @Roles('MANAGER')
    async executeForecast(@Body() body: PlanningExecutionRequestDTO): Promise<PlanningResultResponseDTO> {
        return this.planningService.executeForecast(body);
    }

    @Get('executions')
    @Roles('MANAGER')
    async listExecutions(
        @Query('forecastName') forecastName?: string,
        @Query('scenarioName') scenarioName?: string,
        @Query('pageSize') pageSize?: string,
        @Query('pageStartIndex') pageStartIndex?: string,
    ): Promise<PlanningResultResponseDTO[]> {
        return this.planningService.listExecutions({
            forecastName,
            scenarioName,
            pageSize: pageSize === undefined ? undefined : Number(pageSize),
            pageStartIndex: pageStartIndex === undefined ? undefined : Number(pageStartIndex),
        });
    }

    @Get('executions/:executionId')
    @Roles('MANAGER')
    async getExecution(@Param('executionId', ParseIntPipe) executionId: number): Promise<PlanningResultResponseDTO> {
        return this.planningService.getExecution(executionId);
    }

    @Post('executions/:executionId/replay')
    @Roles('MANAGER')
    async replayExecution(@Param('executionId', ParseIntPipe) executionId: number): Promise<PlanningResultResponseDTO> {
        return this.planningService.replayExecution(executionId);
    }
}