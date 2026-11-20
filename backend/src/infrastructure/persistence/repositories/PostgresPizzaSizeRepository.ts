import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, ILike } from 'typeorm';
import { IPizzaSizeRepository } from '../../../application/pizza/IPizzaSizeRepository';
import { PizzaSize } from '../../../domain/pizza/PizzaSize';
import { PizzaSizeName } from '../../../domain/pizza/PizzaSizeName';
import { PizzaSizeMap } from '../mappers/PizzaSizeMap';
import { PizzaSizeEntity, ComponentSizeConfigurationEntity, PredefinedPizzaAvailableSizeEntity } from '../entities';

@Injectable()
export class PostgresPizzaSizeRepository implements IPizzaSizeRepository {
	constructor(@InjectDataSource() private readonly dataSource: DataSource) {}
	async findByName(name: PizzaSizeName): Promise<PizzaSize | null> {
		const row = await this.dataSource.getRepository(PizzaSizeEntity).findOneBy({ name: name.value });
		return row ? PizzaSizeMap.toDomain(row) : null;
	}
	async findAll(search = ''): Promise<PizzaSize[]> {
		const rows = await this.dataSource.getRepository(PizzaSizeEntity).find({ where: { name: ILike(`%${search.trim()}%`) }, order: { name: 'ASC' } });
		return rows.map(row => PizzaSizeMap.toDomain(row));
	}
	async save(value: PizzaSize): Promise<void> {
		await this.dataSource.getRepository(PizzaSizeEntity).upsert({ name: value.name.value, is_active: value.active }, ['name']);
	}
	async update(value: PizzaSize): Promise<void> { await this.save(value); }
	async delete(name: PizzaSizeName): Promise<void> { await this.dataSource.getRepository(PizzaSizeEntity).delete({ name: name.value }); }
	async isReferenced(name: PizzaSizeName): Promise<boolean> {
		return await this.dataSource.getRepository(ComponentSizeConfigurationEntity).existsBy({ pizza_size: name.value })
			|| await this.dataSource.getRepository(PredefinedPizzaAvailableSizeEntity).existsBy({ pizza_size: name.value });
	}
}
