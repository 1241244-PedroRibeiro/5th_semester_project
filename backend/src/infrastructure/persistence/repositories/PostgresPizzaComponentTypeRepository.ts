import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { PizzaComponentType } from '../../../domain/pizza/pizza-component-type/PizzaComponentType';
import { PizzaComponentTypeRepository } from '../../../domain/pizza/pizza-component-type/PizzaComponentTypeRepository';
import { ComponentTypeName } from '../../../domain/pizza/pizza-component-type/valueObjects';
import { PizzaComponentTypeConflictError, PizzaComponentTypeInUseError } from '../../../domain/pizza/pizza-component-type/PizzaComponentTypeErrors';
import { PizzaComponentTypeMap } from '../mappers/PizzaComponentTypeMap';
import { cardinalityToStorage } from '../mappers/CardinalityMap';
import { createPage, Page, PageRequest } from '../../../domain/common/Pagination';
import { PizzaComponentTypeEntity, ProductEntity } from '../entities';
import { databaseErrorCode } from '../database-error';

@Injectable()
export class PostgresPizzaComponentTypeRepository implements PizzaComponentTypeRepository {
	constructor(@InjectDataSource() private readonly dataSource: DataSource) {}
	async findById(name: ComponentTypeName): Promise<PizzaComponentType | null> { return this.findByName(name); }
	async findByName(name: ComponentTypeName): Promise<PizzaComponentType | null> {
		const row = await this.dataSource.getRepository(PizzaComponentTypeEntity).findOneBy({ name: name.value });
		return row ? PizzaComponentTypeMap.toDomain(row) : null;
	}
	private search(search: string) {
		return this.dataSource.getRepository(PizzaComponentTypeEntity).createQueryBuilder('type')
			.where('type.name ILIKE :search OR CAST(type.assembly_order AS text) = :order', { search: `%${search.trim()}%`, order: search })
			.orderBy('type.assembly_order', 'ASC').addOrderBy('type.name', 'ASC');
	}
	async findAll(search = ''): Promise<PizzaComponentType[]> {
		return (await this.search(search).getMany()).map(row => PizzaComponentTypeMap.toDomain(row));
	}
	async findAllPaginated(page: PageRequest, search = ''): Promise<Page<PizzaComponentType>> {
		const [rows, total] = await this.search(search).take(page.pageSize).skip(page.offset).getManyAndCount();
		return createPage(rows.map(row => PizzaComponentTypeMap.toDomain(row)), total, page);
	}
	async save(type: PizzaComponentType): Promise<void> {
		try {
			await this.dataSource.getRepository(PizzaComponentTypeEntity).upsert({
				name: type.name.value, assembly_order: type.assemblyOrder.sequenceNumber,
				min_cardinality: type.cardinality.minimum, max_cardinality: cardinalityToStorage(type.cardinality.maximum),
			}, ['name']);
		} catch (error) { if (databaseErrorCode(error) === '23505') throw new PizzaComponentTypeConflictError(); throw error; }
	}
	async isReferenced(name: ComponentTypeName): Promise<boolean> {
		return this.dataSource.getRepository(ProductEntity).existsBy({ component_type_name: name.value });
	}
	async delete(name: ComponentTypeName): Promise<void> {
		try { await this.dataSource.getRepository(PizzaComponentTypeEntity).delete({ name: name.value }); }
		catch (error) { if (databaseErrorCode(error) === '23503') throw new PizzaComponentTypeInUseError(); throw error; }
	}
}
