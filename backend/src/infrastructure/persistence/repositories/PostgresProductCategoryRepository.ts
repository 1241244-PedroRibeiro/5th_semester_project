import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ProductCategory } from '../../../domain/product/product-category/ProductCategory';
import { CategoryName } from '../../../domain/product/product-category/CategoryName';
import { ProductCategoryRepository } from '../../../domain/product/product-category/ProductCategoryRepository';
import { ProductCategoryUsageRepository } from '../../../application/product/ProductCategoryUsageRepository';
import { Page, PageRequest, createPage } from '../../../domain/common/Pagination';
import { ProductCategoryEntity } from '../entities';
import { CategoryMap } from '../mappers/CategoryMap';
import { PostgresCategoryRepository } from './PostgresCategoryRepository';

@Injectable()
export class PostgresProductCategoryRepository implements ProductCategoryRepository, ProductCategoryUsageRepository {
	private readonly categories: PostgresCategoryRepository;
	constructor(@InjectDataSource() private readonly dataSource: DataSource) { this.categories = new PostgresCategoryRepository(dataSource); }
	save(category: ProductCategory): Promise<void> { return this.categories.save(category); }
	findById(name: CategoryName): Promise<ProductCategory | null> { return this.findByName(name); }
	findByName(name: CategoryName): Promise<ProductCategory | null> { return this.categories.findByName(name); }
	searchByName(text: string): Promise<ProductCategory[]> { return this.categories.findAll(text); }
	remove(name: CategoryName): Promise<void> { return this.categories.delete(name); }
	existsByCategory(name: CategoryName): Promise<boolean> { return this.categories.isReferencedByProducts(name); }
	async findAll(page: PageRequest): Promise<Page<ProductCategory>> {
		const [rows, total] = await this.dataSource.getRepository(ProductCategoryEntity).findAndCount({
			order: { name: 'ASC' }, take: page.pageSize, skip: page.offset,
		});
		return createPage(rows.map(row => CategoryMap.toDomain(row)), total, page);
	}
}
