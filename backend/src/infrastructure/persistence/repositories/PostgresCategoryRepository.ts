import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, ILike } from 'typeorm';
import { ICategoryRepository } from '../../../application/catalogue/ICategoryRepository';
import { ProductCategory } from '../../../domain/product/product-category/ProductCategory';
import { CategoryName } from '../../../domain/product/product-category/CategoryName';
import { CategoryMap } from '../mappers/CategoryMap';
import { ProductCategoryEntity, ProductEntity } from '../entities';

@Injectable()
export class PostgresCategoryRepository implements ICategoryRepository {
	constructor(@InjectDataSource() private readonly dataSource: DataSource) {}
	async findByName(name: CategoryName): Promise<ProductCategory | null> {
		const row = await this.dataSource.getRepository(ProductCategoryEntity).findOneBy({ name: name.value });
		return row ? CategoryMap.toDomain(row) : null;
	}
	async findAll(search = ''): Promise<ProductCategory[]> {
		const rows = await this.dataSource.getRepository(ProductCategoryEntity).find({ where: { name: ILike(`%${search.trim()}%`) }, order: { name: 'ASC' } });
		return rows.map(row => CategoryMap.toDomain(row));
	}
	async save(value: ProductCategory): Promise<void> {
		await this.dataSource.getRepository(ProductCategoryEntity).upsert({ name: value.name.value, description: value.description }, ['name']);
	}
	async update(value: ProductCategory): Promise<void> { await this.save(value); }
	async delete(name: CategoryName): Promise<void> { await this.dataSource.getRepository(ProductCategoryEntity).delete({ name: name.value }); }
	async isReferencedByProducts(name: CategoryName): Promise<boolean> {
		return this.dataSource.getRepository(ProductEntity).existsBy({ category_name: name.value });
	}
}
