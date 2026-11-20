
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import type { ErrorObject } from 'ajv';

export interface KitchenValidationResult {
    valid: boolean;
    errors: string[];
}

@Injectable({
    providedIn: 'root'
})
export class KitchenConfigValidator {

    private readonly http = inject(HttpClient);

    private readonly validatorPromise = this.loadValidator();

    private async loadValidator() {
        const schema = await firstValueFrom(
            this.http.get<object>('/schemas/kitchen-schema.json')
        );

        const ajv = new Ajv2020({
            allErrors: true,
            strict: false,
            validateFormats: true
        });

        addFormats(ajv);

        return ajv.compile(schema);
    }

    async validate(
        value: unknown
    ): Promise<KitchenValidationResult> {

        const validator = await this.validatorPromise;

        const valid = validator(value);

        const errors: string[] = [];

        if (!valid && validator.errors) {
            errors.push(
                ...validator.errors.map(error =>
                    this.formatError(error)
                )
            );
        }

        // Additional validation:
        // JSON Schema cannot enforce uniqueness of object properties
        // or references between equipment and animation triggers.

        if (
            value !== null &&
            typeof value === 'object' &&
            !Array.isArray(value)
        ) {
            const json = value as Record<string, any>;


if (Array.isArray(json['equipment'])) {

    const equipment = json['equipment'];

    const equipmentIds = equipment
        .filter((item: any) =>
            item && typeof item.id === 'string'
        )
        .map((item: any) => item.id);

    const uniqueEquipmentIds = new Set(equipmentIds);

    if (uniqueEquipmentIds.size !== equipmentIds.length) {
        errors.push(
            '/equipment: contains duplicate equipment identifiers.'
        );
    }

    if (Array.isArray(json['animationTriggers'])) {

        const triggers = json['animationTriggers'];

        const triggerIds = triggers
            .filter((item: any) =>
                item && typeof item.id === 'string'
            )
            .map((item: any) => item.id);

        if (new Set(triggerIds).size !== triggerIds.length) {
            errors.push(
                '/animationTriggers: contains duplicate trigger identifiers.'
            );
        }

        for (let i = 0; i < triggers.length; i++) {

            const trigger = triggers[i];

            if (
                trigger &&
                typeof trigger.targetEquipmentId === 'string' &&
                !uniqueEquipmentIds.has(trigger.targetEquipmentId)
            ) {
                errors.push(
                    `/animationTriggers/${i}/targetEquipmentId: references an equipment identifier that does not exist.`
                );
            }
        }
    }
}
    
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    private formatError(error: ErrorObject): string {

        const path = error.instancePath || '/';

        return `${path}: ${error.message ?? 'Invalid value.'}`;
    }



/**
 * Verifica se os ficheiros GLB referenciados na configuração existem.
 * Os modelos devem estar em /assets/3d/models/.
 */
async validateAssetReferences(
    
    value: unknown
): Promise<KitchenValidationResult> {
console.log('[WEB06] Starting asset validation');

console.log(
    '[WEB06] Equipment:',
    (value as any)?.equipment
);
    const errors: string[] = [];

    // A configuração tem de ser um objeto.
    if (
        value === null ||
        typeof value !== 'object' ||
        Array.isArray(value)
    ) {
        return {
            valid: false,
            errors: ['/ : configuration must be an object.']
        };
    }

    const equipment = (value as Record<string, any>)['equipment'];

    if (!Array.isArray(equipment)) {
        return { valid: true, errors: [] };
    }

    // Agrupar referências repetidas para não verificar o mesmo ficheiro várias vezes.
    const references = new Map<string, number[]>();

    equipment.forEach((item: any, index: number) => {
        if (typeof item?.modelUrl !== 'string') {
            return;
        }

        const url = item.modelUrl;
        const indexes = references.get(url) ?? [];

        indexes.push(index);
        references.set(url, indexes);
    });

    for (const [url, indexes] of references) {

        // Aceitar apenas caminhos locais e seguros.
        if (
            
            !url.startsWith('/assets/3d/models/') ||
            url.includes('..') ||
            url.includes('\\')
        ) {
            errors.push(
                ...indexes.map(index =>
                    `/equipment/${index}/modelUrl: must be a safe, same-origin asset path.`
                )
            );

            continue;
        }

        try {
            console.log('[WEB06] Checking asset:', url);
            // HEAD verifica a existência sem descarregar o modelo.
            await firstValueFrom(
                this.http.head(url, { observe: 'response' })
            );
        } catch(error) {
              console.error('[WEB06] Asset request failed:', url, error);
  
            errors.push(
                ...indexes.map(index =>
                    `/equipment/${index}/modelUrl: asset '${url}' does not exist or cannot be reached.`
                )
            );
        }
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

}
