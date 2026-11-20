import { DataSource } from 'typeorm';
import { PersistenceModule } from '../infrastructure/persistence/persistence.module';
import { Module } from '@nestjs/common';
import { CategoryController } from './http/controllers/CategoryController';
import { CategoryService } from '../application/catalogue/CategoryService';
import { ICategoryRepository } from '../application/catalogue/ICategoryRepository';
import { PostgresCategoryRepository } from '../infrastructure/persistence/repositories/PostgresCategoryRepository';
import { ProductCategory } from '../domain/product/product-category/ProductCategory';
import { CategoryName } from '../domain/product/product-category/CategoryName';
import { AuthModule } from './auth.module';
import { JwtAuthGuard } from './http/middlewares/JwtAuthGuard';
import { RolesGuard } from './http/middlewares/roles.guard';
import { TOKEN_SERVICE } from '../application/auth/AuthDTOs';
import { JwtTokenService } from '../infrastructure/security/JwtTokenService';
import { ProductCategoryService } from '../application/product/category-services/ProductCategoryService';
import { ProductCategoryRepository } from '../domain/product/product-category/ProductCategoryRepository';
import { createPage } from '../domain/common/Pagination';

class InMemoryCategoryRepository implements ICategoryRepository {
	private readonly store = new Map<string, ProductCategory>();
	async findByName(name: CategoryName): Promise<ProductCategory | null> { return this.store.get(name.value) ?? null; }
	async findAll(search = ''): Promise<ProductCategory[]> { return [...this.store.values()].filter(value => value.name.value.toLowerCase().includes(search.trim().toLowerCase())); }
	async save(value: ProductCategory): Promise<void> { this.store.set(value.name.value, value); }
	async update(value: ProductCategory): Promise<void> { await this.save(value); }
	async delete(name: CategoryName): Promise<void> { this.store.delete(name.value); }
	async isReferencedByProducts(name: CategoryName): Promise<boolean> { return false; }
}

@Module({
	imports: [PersistenceModule, AuthModule],
	controllers: [CategoryController],
	providers: [
		{
			provide: ProductCategoryService,
			inject: ['ICategoryRepository'],
			useFactory: (repo: ICategoryRepository) => {
				// Both unchanged services must share the same category store, including in memory.
				const adapter: ProductCategoryRepository = {
					save: (category) => repo.save(category),
					findById: (name) => repo.findByName(name),
					findByName: (name) => repo.findByName(name),
					searchByName: (search) => repo.findAll(search),
					remove: (name) => repo.delete(name),
					findAll: async (page) => {
						const categories = await repo.findAll();
						return createPage(categories.slice(page.offset, page.offset + page.pageSize), categories.length, page);
					},
				};
				return new ProductCategoryService(adapter, { existsByCategory: (name) => repo.isReferencedByProducts(name) });
			},
		},
		{
			provide: 'ICategoryRepository',
			inject: [DataSource],
			useFactory: (dataSource: DataSource) => {
				if (process.env.USE_IN_MEMORY_REPO === 'true') {
					return new InMemoryCategoryRepository();
				}
				return new PostgresCategoryRepository(dataSource);
			},
		},
		{
			provide: 'CategoryService',
			useFactory: (repo: ICategoryRepository) => new CategoryService(repo),
			inject: ['ICategoryRepository'],
		},
		{
			provide: TOKEN_SERVICE,
			useClass: JwtTokenService,
		},
		{
			provide: 'ITokenService',
			useClass: JwtTokenService,
		},
		JwtAuthGuard,
		RolesGuard,
	],
	exports: ['CategoryService'],
})
export class CategoryModule {}
