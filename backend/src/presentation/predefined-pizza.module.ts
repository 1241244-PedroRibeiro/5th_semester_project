import { DataSource } from 'typeorm';
import { PersistenceModule } from '../infrastructure/persistence/persistence.module';
import { Module } from '@nestjs/common';
import { PredefinedPizzaService } from '../application/pizza/PredefinedPizzaService';
import { PREDEFINED_PIZZA_REPOSITORY } from '../application/pizza/IPredefinedPizzaRepository';
import { PostgresPredefinedPizzaRepository } from '../infrastructure/persistence/repositories/PostgresPredefinedPizzaRepository';
import { PredefinedPizzaController } from './http/controllers/PredefinedPizzaController';
import { ProductModule } from './product.module';
import { PizzaComponentTypeModule } from './pizza-component-type.module';
import { AuthModule } from './auth.module';

@Module({
  imports: [PersistenceModule, AuthModule, ProductModule, PizzaComponentTypeModule],
  controllers: [PredefinedPizzaController],
  providers: [
    PredefinedPizzaService,
    {
      provide: PREDEFINED_PIZZA_REPOSITORY,
      inject: [DataSource],
      useFactory: (dataSource: DataSource) => new PostgresPredefinedPizzaRepository(dataSource),
    },
  ],
  exports: [PredefinedPizzaService, PREDEFINED_PIZZA_REPOSITORY],
})
export class PredefinedPizzaModule {}