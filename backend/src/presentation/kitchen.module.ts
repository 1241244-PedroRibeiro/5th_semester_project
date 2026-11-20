
import { Module } from '@nestjs/common';

import { KitchenConfigurationService } from '../application/kitchen/KitchenConfigurationService';
import { KitchenConfigValidationService } from '../application/kitchen/KitchenConfigValidationService';
import { KitchenAssetValidationService } from '../application/kitchen/KitchenAssetValidationService';
import { PostgresKitchenConfigurationRepository } from '../infrastructure/persistence/repositories/PostgresKitchenConfigurationRepository';

import { KitchenConfigurationController } from './http/controllers/KitchenConfigurationController';
import { AuthModule } from './auth.module';

@Module({
    imports: [AuthModule],
    controllers: [KitchenConfigurationController],
    providers: [
        KitchenAssetValidationService,
        KitchenConfigValidationService,
        {
            provide: 'IKitchenConfigurationRepository',
            useClass: PostgresKitchenConfigurationRepository,
        },
        KitchenConfigurationService,
    ],
    exports: [KitchenConfigurationService],
})
export class KitchenModule {}
