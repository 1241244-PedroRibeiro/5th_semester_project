import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlanningService } from '../application/planning/PlanningService';
import { PLANNING_RESULT_REPOSITORY } from '../application/planning/IPlanningResultRepository';
import { PRODUCT_REPOSITORY } from '../application/product/IProductRepository';
import { PREDEFINED_PIZZA_REPOSITORY } from '../application/pizza/IPredefinedPizzaRepository';
import { COMPONENT_SIZE_CONFIGURATION_REPOSITORY } from '../application/pizza/IComponentSizeConfigurationRepository';
import { PROLOG_HTTP_CLIENT, PrologHttpClient } from '../infrastructure/prolog/PrologHttpClient';
import { PostgresPlanningResultRepository } from '../infrastructure/persistence/repositories/PostgresPlanningResultRepository';
import { PlanningResultEntity } from '../infrastructure/persistence/entities/PlanningResultEntity';
import { PlanningController } from './http/controllers/PlanningController';
import { PlanningManagementController } from './http/controllers/PlanningManagementController';
import { PostgresProductRepository } from '../infrastructure/persistence/repositories/PostgresProductRepository';
import { PostgresPredefinedPizzaRepository } from '../infrastructure/persistence/repositories/PostgresPredefinedPizzaRepository';
import { PostgresComponentSizeConfigurationRepository } from '../infrastructure/persistence/repositories/PostgresComponentSizeConfigurationRepository';
import { PostgresStockRepository } from '../infrastructure/persistence/repositories/PostgresStockRepository';
import { CONSUMPTION_FORECAST_REPOSITORY } from '../application/planning/IConsumptionForecastRepository';
import { SUPPLIER_SCENARIO_REPOSITORY } from '../application/planning/ISupplierScenarioRepository';
import { PostgresConsumptionForecastRepository } from '../infrastructure/persistence/repositories/PostgresConsumptionForecastRepository';
import { PostgresSupplierScenarioRepository } from '../infrastructure/persistence/repositories/PostgresSupplierScenarioRepository';
import { AuthModule } from './auth.module';

@Module({
    imports: [ConfigModule, TypeOrmModule.forFeature([PlanningResultEntity]), AuthModule],
    controllers: [PlanningController, PlanningManagementController],
    providers: [
        PlanningService,
        { provide: PLANNING_RESULT_REPOSITORY, useClass: PostgresPlanningResultRepository },
        { provide: PRODUCT_REPOSITORY, useClass: PostgresProductRepository },
        { provide: PREDEFINED_PIZZA_REPOSITORY, useClass: PostgresPredefinedPizzaRepository },
        {
            provide: COMPONENT_SIZE_CONFIGURATION_REPOSITORY,
            useClass: PostgresComponentSizeConfigurationRepository,
        },
        { provide: 'IStockRepository', useClass: PostgresStockRepository },
        { provide: PROLOG_HTTP_CLIENT, useClass: PrologHttpClient },
        { provide: CONSUMPTION_FORECAST_REPOSITORY, useClass: PostgresConsumptionForecastRepository },
        { provide: SUPPLIER_SCENARIO_REPOSITORY, useClass: PostgresSupplierScenarioRepository },
    ],
    exports: [PlanningService],
})
export class PlanningModule {}