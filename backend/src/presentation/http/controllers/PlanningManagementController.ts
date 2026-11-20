import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Put, UseGuards } from '@nestjs/common';
import { PlanningService } from '../../../application/planning/PlanningService';
import { ForecastInputDTO, SupplierScenarioInputDTO } from '../../../application/planning/PlanningDTOs';
import { JwtAuthGuard } from '../middlewares/JwtAuthGuard';
import { RolesGuard } from '../middlewares/roles.guard';
import { StatusGuard } from '../middlewares/UserStatus.guard';
import { Roles } from '../middlewares/decorators';

@Controller()
@UseGuards(JwtAuthGuard, StatusGuard, RolesGuard)
export class PlanningManagementController {
    constructor(private readonly planningService: PlanningService) {}

    @Get('consumption-forecasts')
    @Roles('MANAGER')
    listForecasts() { return this.planningService.listForecasts(); }

    @Post('consumption-forecasts')
    @Roles('MANAGER')
    @HttpCode(HttpStatus.CREATED)
    createForecast(@Body() body: ForecastInputDTO) { return this.planningService.createForecast(body); }

    @Put('consumption-forecasts/:name')
    @Roles('MANAGER')
    updateForecast(@Param('name') name: string, @Body() body: Omit<ForecastInputDTO, 'name'>) {
        return this.planningService.updateForecast(name, body);
    }

    @Delete('consumption-forecasts/:name')
    @Roles('MANAGER')
    @HttpCode(HttpStatus.NO_CONTENT)
    async deleteForecast(@Param('name') name: string): Promise<void> {
        await this.planningService.deleteForecast(name);
    }

    @Get('supplier-scenarios')
    @Roles('MANAGER')
    listScenarios() { return this.planningService.listScenarios(); }

    @Post('supplier-scenarios')
    @Roles('MANAGER')
    @HttpCode(HttpStatus.CREATED)
    createScenario(@Body() body: SupplierScenarioInputDTO) { return this.planningService.createScenario(body); }

    @Put('supplier-scenarios/:name')
    @Roles('MANAGER')
    updateScenario(@Param('name') name: string, @Body() body: Omit<SupplierScenarioInputDTO, 'name'>) {
        return this.planningService.updateScenario(name, body);
    }

    @Delete('supplier-scenarios/:name')
    @Roles('MANAGER')
    @HttpCode(HttpStatus.NO_CONTENT)
    async deleteScenario(@Param('name') name: string): Promise<void> {
        await this.planningService.deleteScenario(name);
    }

    @Post('supplier-scenarios/:name/confirm')
    @Roles('MANAGER')
    confirmScenario(@Param('name') name: string) { return this.planningService.confirmScenario(name); }
}
