
import {
    ConflictException,
    Injectable,
} from '@nestjs/common';

import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import {
    IKitchenConfigurationRepository,
    KitchenConfigurationRecord,
    CreateKitchenConfigurationInput,
    UpdateKitchenConfigurationInput,
} from '../../../application/kitchen/IKitchenConfigurationRepository';

import { KitchenConfigurationEntity } from '../entities/KitchenConfigurationEntity';

@Injectable()
export class PostgresKitchenConfigurationRepository
    implements IKitchenConfigurationRepository {

    constructor(
        @InjectDataSource()
        private readonly dataSource: DataSource,
    ) {}

    async findAll(): Promise<KitchenConfigurationRecord[]> {
        const rows = await this.dataSource
            .getRepository(KitchenConfigurationEntity)
            .find({
                order: { name: 'ASC' },
            });

        return rows.map(row => this.toRecord(row));
    }

    async findById(id: string): Promise<KitchenConfigurationRecord | null> {
        const row = await this.dataSource
            .getRepository(KitchenConfigurationEntity)
            .findOneBy({ id });

        return row ? this.toRecord(row) : null;
    }

    async findByName(name: string): Promise<KitchenConfigurationRecord | null> {
        const row = await this.dataSource
            .getRepository(KitchenConfigurationEntity)
            .findOneBy({ name });

        return row ? this.toRecord(row) : null;
    }

    async findActive(): Promise<KitchenConfigurationRecord | null> {
        const row = await this.dataSource
            .getRepository(KitchenConfigurationEntity)
            .findOneBy({ is_active: true });

        return row ? this.toRecord(row) : null;
    }

    async create(
        input: CreateKitchenConfigurationInput,
    ): Promise<KitchenConfigurationRecord> {

        const repository = this.dataSource
            .getRepository(KitchenConfigurationEntity);

        const row = repository.create({
            name: input.name,
            json_content: input.json_content,
            is_active: false,
        });

        try {
            const saved = await repository.save(row);
            return this.toRecord(saved);
        } catch (error: unknown) {
            this.handleDatabaseConflict(error);
            throw error;
        }
    }

    async update(
        input: UpdateKitchenConfigurationInput,
    ): Promise<KitchenConfigurationRecord | null> {

        const repository = this.dataSource
            .getRepository(KitchenConfigurationEntity);

        const row = await repository.findOneBy({ id: input.id });

        if (!row) {
            return null;
        }

        row.name = input.name;
        row.json_content = input.json_content;

        try {
            const saved = await repository.save(row);
            return this.toRecord(saved);
        } catch (error: unknown) {
            this.handleDatabaseConflict(error);
            throw error;
        }
    }

    async delete(id: string): Promise<boolean> {

        const result = await this.dataSource
            .getRepository(KitchenConfigurationEntity)
            .delete({
                id,
                is_active: false,
            });

        return (result.affected ?? 0) > 0;
    }

    async activate(id: string): Promise<KitchenConfigurationRecord | null> {

        try {
            return await this.dataSource.transaction(async manager => {

                const repository = manager
                    .getRepository(KitchenConfigurationEntity);

                const target = await repository.findOne({
                    where: { id },
                    lock: { mode: 'pessimistic_write' },
                });

                if (!target) {
                    return null;
                }

                await repository
                    .createQueryBuilder()
                    .update(KitchenConfigurationEntity)
                    .set({ is_active: false })
                    .where('is_active = :active', { active: true })
                    .execute();

                target.is_active = true;

                const saved = await repository.save(target);

                return this.toRecord(saved);
            });
        } catch (error: unknown) {
            this.handleDatabaseConflict(error);
            throw error;
        }
    }

    private toRecord(
        row: KitchenConfigurationEntity,
    ): KitchenConfigurationRecord {

        return {
            id: row.id,
            name: row.name,
            json_content: row.json_content,
            is_active: row.is_active,
            created_at: row.created_at,
            updated_at: row.updated_at,
        };
    }

    private handleDatabaseConflict(error: unknown): void {

        const databaseError = error as {
            driverError?: {
                code?: string;
                constraint?: string;
            };
        };

        if (
            databaseError.driverError?.code === '23505' &&
            (
                databaseError.driverError?.constraint ===
                    'uq_kitchen_configuration_name' ||
                databaseError.driverError?.constraint ===
                    'kitchen_configurations_name_key'
            )
        ) {
            throw new ConflictException(
                'A kitchen configuration with this name already exists.',
            );
        }

        if (
            databaseError.driverError?.code === '23505' &&
            databaseError.driverError?.constraint ===
                'uq_active_kitchen_configuration'
        ) {
            throw new ConflictException(
                'Another kitchen configuration is active. Please refresh and try again.',
            );
        }
    }
}
