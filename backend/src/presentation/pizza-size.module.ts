import { DataSource } from 'typeorm';
import { PersistenceModule } from '../infrastructure/persistence/persistence.module';
import { Module } from '@nestjs/common';
import { PizzaSizeController } from './http/controllers/PizzaSizeController';
import { PizzaSizeService } from '../application/pizza/PizzaSizeService';
import { PIZZA_SIZE_REPOSITORY } from '../application/pizza/IPizzaSizeRepository';
import { PostgresPizzaSizeRepository } from '../infrastructure/persistence/repositories/PostgresPizzaSizeRepository';
import { InMemoryPizzaSizeRepository } from '../infrastructure/persistence/repositories/InMemoryPizzaSizeRepository';
import { AuthModule } from './auth.module';
import { RolesGuard } from './http/middlewares/roles.guard';

@Module({
  imports: [PersistenceModule, AuthModule],
  controllers: [PizzaSizeController],
  providers: [
    PizzaSizeService,
    RolesGuard,
    {
      provide: PIZZA_SIZE_REPOSITORY,
      inject: [DataSource],
			useFactory: (dataSource: DataSource) => {
        if (process.env.USE_IN_MEMORY_REPO === 'true') {
          return new InMemoryPizzaSizeRepository();
        }
        return new PostgresPizzaSizeRepository(dataSource);
      },
    },
  ],
  exports: [PizzaSizeService, PIZZA_SIZE_REPOSITORY],
})
export class PizzaSizeModule {}