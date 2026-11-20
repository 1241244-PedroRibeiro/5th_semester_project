import { PersistenceModule } from '../infrastructure/persistence/persistence.module';
import { Module } from '@nestjs/common';

import {
  ComponentSizeConfigurationController,
} from './http/controllers/ComponentSizeConfigurationController';

import {
  ComponentSizeConfigurationService,
} from '../application/pizza/ComponentSizeConfigurationService';

import {
  COMPONENT_SIZE_CONFIGURATION_REPOSITORY,
} from '../application/pizza/IComponentSizeConfigurationRepository';

import {
  PostgresComponentSizeConfigurationRepository,
} from '../infrastructure/persistence/repositories/PostgresComponentSizeConfigurationRepository';

import { AuthModule } from './auth.module';
import { RolesGuard } from './http/middlewares/roles.guard';

@Module({
  imports: [PersistenceModule, AuthModule],
  controllers: [ComponentSizeConfigurationController],
  providers: [
    ComponentSizeConfigurationService,
    RolesGuard,
    {
      provide: COMPONENT_SIZE_CONFIGURATION_REPOSITORY,
      useClass: PostgresComponentSizeConfigurationRepository,
    },
  ],
  exports: [ComponentSizeConfigurationService],
})
export class ComponentSizeConfigurationModule {}