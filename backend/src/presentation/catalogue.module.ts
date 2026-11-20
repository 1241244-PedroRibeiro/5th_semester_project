import { DataSource } from 'typeorm';
import { PersistenceModule } from '../infrastructure/persistence/persistence.module';
import { Module } from '@nestjs/common';

import { CatalogueService } from '../application/catalogue/CatalogueService';
import { CATALOGUE_REPOSITORY } from '../application/catalogue/ICatalogueRepository';

import { PostgresCatalogueRepository } from '../infrastructure/persistence/repositories/PostgresCatalogueRepository';

import { CatalogueController } from './http/controllers/CatalogueController';
import { AuthModule } from './auth.module';

@Module({
  imports: [PersistenceModule, AuthModule],
  controllers: [CatalogueController],
  providers: [
    CatalogueService,
    {
      provide: CATALOGUE_REPOSITORY,
      inject: [DataSource],
      useFactory: (dataSource: DataSource) => new PostgresCatalogueRepository(dataSource),
    },
  ],
})
export class CatalogueModule {}