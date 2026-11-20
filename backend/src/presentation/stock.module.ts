import { DataSource } from 'typeorm';
import { PersistenceModule } from '../infrastructure/persistence/persistence.module';

import { Module } from '@nestjs/common';
import { StockController } from './http/controllers/StockController';
import { StockService } from '../application/stock/StockService';
import { IStockRepository } from '../application/stock/IStockRepository';
import { PostgresStockRepository } from '../infrastructure/persistence/repositories/PostgresStockRepository';
import { AuthModule } from './auth.module';
import { RolesGuard } from './http/middlewares/roles.guard';

@Module({
  imports: [PersistenceModule, AuthModule],
  controllers: [StockController],
  providers: [
    {
      provide: 'IStockRepository',
      inject: [DataSource],
      useFactory: (dataSource: DataSource) => new PostgresStockRepository(dataSource),
    },
    {
      provide: 'StockService',
      useFactory: (repo: IStockRepository) =>
        new StockService(repo),
      inject: ['IStockRepository'],
    },
    RolesGuard,
  ],
  exports: ['StockService'],
})
export class StockModule {}
