
import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';

import kitchenSchema from './schemas/kitchen-schema.json';

@Injectable()
export class KitchenConfigValidationService {
    private readonly validateSchema;

    constructor() {
        const ajv = new Ajv2020({
            allErrors: true,
            strict: false,
        });

        addFormats(ajv);

        this.validateSchema = ajv.compile(kitchenSchema);
    }

    validate(configuration: unknown): void {
        // 1. Validate the JSON structure against the official schema.
        if (!this.validateSchema(configuration)) {
            const errors = (this.validateSchema.errors ?? []).map((error) => {
                const path = error.instancePath || '/';
                return `${path}: ${error.message ?? 'Invalid value'}`;
            });

            throw new UnprocessableEntityException({
                message: 'Invalid kitchen configuration.',
                errors,
            });
        }

        const config = configuration as {
            equipment: Array<{ id: string }>;
            animationTriggers?: Array<{
                id: string;
                targetEquipmentId: string;
            }>;
        };

        // 2. Validate unique equipment IDs.
        const equipmentIds = config.equipment.map((item) => item.id);

        if (new Set(equipmentIds).size !== equipmentIds.length) {
            throw new UnprocessableEntityException(
                'Kitchen configuration contains duplicate equipment IDs.',
            );
        }

        // 3. Validate unique animation trigger IDs.
        const triggers = config.animationTriggers ?? [];
        const triggerIds = triggers.map((trigger) => trigger.id);

        if (new Set(triggerIds).size !== triggerIds.length) {
            throw new UnprocessableEntityException(
                'Kitchen configuration contains duplicate animation trigger IDs.',
            );
        }

        // 4. Validate animation trigger references.
        const equipmentIdSet = new Set(equipmentIds);

        const invalidReferences = triggers
            .filter(
                (trigger) => !equipmentIdSet.has(trigger.targetEquipmentId),
            )
            .map((trigger) => trigger.targetEquipmentId);

        if (invalidReferences.length > 0) {
            throw new UnprocessableEntityException({
                message: 'Animation triggers reference non-existing equipment.',
                invalidReferences: [...new Set(invalidReferences)],
            });
        }
    }
}
