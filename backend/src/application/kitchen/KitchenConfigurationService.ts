
import {
    BadRequestException,
    ConflictException,
    Inject,
    Injectable,
    NotFoundException,
} from '@nestjs/common';

import {
    IKitchenConfigurationRepository,
    KitchenConfigurationRecord,
} from './IKitchenConfigurationRepository';

import { KitchenConfigValidationService } from './KitchenConfigValidationService';
import { KitchenAssetValidationService } from './KitchenAssetValidationService';

@Injectable()
export class KitchenConfigurationService {

    constructor(
        @Inject('IKitchenConfigurationRepository')
        private readonly repository: IKitchenConfigurationRepository,

        private readonly validator: KitchenConfigValidationService,

        private readonly assetValidator: KitchenAssetValidationService,
    ) {}

    async getAll(): Promise<KitchenConfigurationRecord[]> {
        return this.repository.findAll();
    }

    async getById(id: string): Promise<KitchenConfigurationRecord> {

        const configuration = await this.repository.findById(id);

        if (!configuration) {
            throw new NotFoundException(
                `Kitchen configuration '${id}' was not found.`,
            );
        }

        return configuration;
    }

    async create(
        name: string,
        jsonContent: Record<string, unknown>,
    ): Promise<KitchenConfigurationRecord> {

        this.validateName(name);

        this.validator.validate(jsonContent);
        await this.assetValidator.validate(jsonContent);

        const existing = await this.repository.findByName(name);

        if (existing) {
            throw new ConflictException(
                `Kitchen configuration '${name}' already exists.`,
            );
        }

        return this.repository.create({
            name,
            json_content: jsonContent,
        });
    }

    async update(
        id: string,
        name: string,
        jsonContent: Record<string, unknown>,
    ): Promise<KitchenConfigurationRecord> {

        this.validateName(name);

        this.validator.validate(jsonContent);
        await this.assetValidator.validate(jsonContent);

        const existing = await this.repository.findById(id);

        if (!existing) {
            throw new NotFoundException(
                `Kitchen configuration '${id}' was not found.`,
            );
        }

        const sameName = await this.repository.findByName(name);

        if (sameName && sameName.id !== id) {
            throw new ConflictException(
                `Kitchen configuration '${name}' already exists.`,
            );
        }

        const updated = await this.repository.update({
            id,
            name,
            json_content: jsonContent,
        });

        if (!updated) {
            throw new NotFoundException(
                `Kitchen configuration '${id}' was not found.`,
            );
        }

        return updated;
    }

    async delete(id: string): Promise<void> {

        const existing = await this.repository.findById(id);

        if (!existing) {
            throw new NotFoundException(
                `Kitchen configuration '${id}' was not found.`,
            );
        }

        if (existing.is_active) {
            throw new ConflictException(
                'The active kitchen configuration cannot be deleted.',
            );
        }

        const deleted = await this.repository.delete(id);

        if (!deleted) {
            throw new ConflictException(
                'The kitchen configuration could not be deleted.',
            );
        }
    }

    async activate(id: string): Promise<KitchenConfigurationRecord> {

        const existing = await this.repository.findById(id);

        if (!existing) {
            throw new NotFoundException(
                `Kitchen configuration '${id}' was not found.`,
            );
        }

        this.validator.validate(existing.json_content);
        await this.assetValidator.validate(existing.json_content);

        const activated = await this.repository.activate(id);

        if (!activated) {
            throw new NotFoundException(
                `Kitchen configuration '${id}' was not found.`,
            );
        }

        return activated;
    }

    async getActive(): Promise<KitchenConfigurationRecord> {

        const configuration = await this.repository.findActive();

        if (!configuration) {
            throw new NotFoundException(
                'There is no active kitchen configuration.',
            );
        }

        this.validator.validate(configuration.json_content);
        await this.assetValidator.validate(configuration.json_content);

        return configuration;
    }

    private validateName(name: string): void {

        if (!name || !name.trim()) {
            throw new BadRequestException(
                'Kitchen configuration name is required.',
            );
        }

        if (name.trim().length > 100) {
            throw new BadRequestException(
                'Kitchen configuration name cannot exceed 100 characters.',
            );
        }

        if (name !== name.trim()) {
            throw new BadRequestException(
                'Kitchen configuration name cannot start or end with whitespace.',
            );
        }
    }
}
