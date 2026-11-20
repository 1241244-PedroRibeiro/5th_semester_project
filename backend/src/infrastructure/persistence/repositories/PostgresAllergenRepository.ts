import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, ILike } from 'typeorm';
import { IAllergenRepository } from '../../../application/allergen/IAllergenRepository';
import { Allergen } from '../../../domain/allergen/Allergen';
import { AllergenName } from '../../../domain/allergen/AllergenName';
import { AllergenMap } from '../mappers/AllergenMap';
import { AllergenEntity, ProductAllergenEntity, UserDietaryRestrictionEntity } from '../entities';

@Injectable()
export class PostgresAllergenRepository implements IAllergenRepository {
	constructor(@InjectDataSource() private readonly dataSource: DataSource) {}
	async findByName(name: AllergenName): Promise<Allergen | null> {
		const row = await this.dataSource.getRepository(AllergenEntity).findOneBy({ name: name.value });
		return row ? AllergenMap.toDomain(row) : null;
	}
	async findAll(search = ''): Promise<Allergen[]> {
		const rows = await this.dataSource.getRepository(AllergenEntity).find({ where: { name: ILike(`%${search.trim()}%`) }, order: { name: 'ASC' } });
		return rows.map(row => AllergenMap.toDomain(row));
	}
	async save(value: Allergen): Promise<void> {
		await this.dataSource.getRepository(AllergenEntity).upsert({ name: value.name.value, description: value.description }, ['name']);
	}
	async update(value: Allergen): Promise<void> { await this.save(value); }
	async delete(name: AllergenName): Promise<void> { await this.dataSource.getRepository(AllergenEntity).delete({ name: name.value }); }
	async isReferenced(name: AllergenName): Promise<boolean> {
		return await this.dataSource.getRepository(ProductAllergenEntity).existsBy({ allergen_name: name.value })
			|| await this.dataSource.getRepository(UserDietaryRestrictionEntity).existsBy({ allergen_name: name.value });
	}
}
