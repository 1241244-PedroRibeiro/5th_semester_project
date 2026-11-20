import { DataSource } from 'typeorm';
import { PersistenceModule } from '../infrastructure/persistence/persistence.module';
import { Module } from '@nestjs/common';
import { PizzaComponentTypeService } from '../application/pizza/PizzaComponentTypeService';
import { PIZZA_COMPONENT_TYPE_REPOSITORY } from '../domain/pizza/pizza-component-type/PizzaComponentTypeRepository';
import { InMemoryPizzaComponentTypeRepository } from '../infrastructure/persistence/repositories/InMemoryPizzaComponentTypeRepository';
import { PostgresPizzaComponentTypeRepository } from '../infrastructure/persistence/repositories/PostgresPizzaComponentTypeRepository';
import { IProductRepository, PRODUCT_REPOSITORY } from '../application/product/IProductRepository';
import { PizzaComponentTypeController } from './http/controllers/PizzaComponentTypeController';
import { ProductModule } from './product.module';
import { AuthModule } from './auth.module';
import { RolesGuard } from './http/middlewares/roles.guard';

@Module({
  imports: [PersistenceModule, AuthModule, ProductModule],
  controllers: [PizzaComponentTypeController],
  providers: [
    {
      provide: PIZZA_COMPONENT_TYPE_REPOSITORY,
      inject: [PRODUCT_REPOSITORY, DataSource],
      useFactory: (products: IProductRepository, dataSource: DataSource) => process.env.USE_IN_MEMORY_REPO === 'true'
        ? new InMemoryPizzaComponentTypeRepository(products, true)
        : new PostgresPizzaComponentTypeRepository(dataSource),
    },
    PizzaComponentTypeService,
    RolesGuard,
  ],
  exports: [PizzaComponentTypeService, PIZZA_COMPONENT_TYPE_REPOSITORY],
})
export class PizzaComponentTypeModule {}
