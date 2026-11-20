import { DataSource } from 'typeorm';
import { PersistenceModule } from '../infrastructure/persistence/persistence.module';
import { Module } from '@nestjs/common';
import { ProductController } from './http/controllers/ProductController';
import { ProductService } from '../application/product/ProductService';
import { PRODUCT_REPOSITORY } from '../application/product/IProductRepository';
import { InMemoryProductRepository } from '../infrastructure/persistence/repositories/InMemoryProductRepository';
import { PostgresProductRepository } from '../infrastructure/persistence/repositories/PostgresProductRepository';
import { AuthModule } from './auth.module';
import { RolesGuard } from './http/middlewares/roles.guard';
import { PREDEFINED_PIZZA_REPOSITORY } from '../application/pizza/IPredefinedPizzaRepository';
import { PostgresPredefinedPizzaRepository } from '../infrastructure/persistence/repositories/PostgresPredefinedPizzaRepository';
import { PostgresStockRepository } from '../infrastructure/persistence/repositories/PostgresStockRepository';
import { ProductExportService } from '../application/product/ProductExportService';
import { COMPONENT_SIZE_CONFIGURATION_REPOSITORY } from '../application/pizza/IComponentSizeConfigurationRepository';
import { PostgresComponentSizeConfigurationRepository } from '../infrastructure/persistence/repositories/PostgresComponentSizeConfigurationRepository';

@Module({
  imports: [PersistenceModule, AuthModule],
  controllers: [ProductController],
  providers: [
    ProductService,
    ProductExportService,
    RolesGuard,
    {
      provide: PRODUCT_REPOSITORY,
      inject: [DataSource],
			useFactory: (dataSource: DataSource) => {
        if (process.env.USE_IN_MEMORY_REPO === 'true') {
          return new InMemoryProductRepository();
        }
        return new PostgresProductRepository(dataSource);
      },
    },
    { provide: PREDEFINED_PIZZA_REPOSITORY, useClass: PostgresPredefinedPizzaRepository },
    { provide: 'IStockRepository', useClass: PostgresStockRepository },
    { provide: COMPONENT_SIZE_CONFIGURATION_REPOSITORY, useClass: PostgresComponentSizeConfigurationRepository },
  ],
  exports: [ProductService, PRODUCT_REPOSITORY],
})
export class ProductModule {}