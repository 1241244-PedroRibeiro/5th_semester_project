import { PersistenceModule } from '../infrastructure/persistence/persistence.module';
import { PostgresProductCategoryRepository } from '../infrastructure/persistence/repositories/PostgresProductCategoryRepository';
import { Module } from '@nestjs/common';
import { ProductCategoryService } from '../application/product/category-services/ProductCategoryService';
import { PRODUCT_CATEGORY_REPOSITORY } from '../domain/product/product-category/ProductCategoryRepository';
import { InMemoryProductCategoryRepository } from '../infrastructure/persistence/repositories/InMemoryProductCategoryRepository';
import { PRODUCT_CATEGORY_USAGE_REPOSITORY } from '../application/product/ProductCategoryUsageRepository';
import { InMemoryProductCategoryUsageRepository } from '../infrastructure/persistence/repositories/InMemoryProductCategoryUsageRepository';

@Module({
	imports: [PersistenceModule],
	providers: [
		PostgresProductCategoryRepository,
		InMemoryProductCategoryUsageRepository,
		{
			provide: PRODUCT_CATEGORY_USAGE_REPOSITORY,
			useFactory: (memory: InMemoryProductCategoryUsageRepository, postgres: PostgresProductCategoryRepository) => process.env.USE_IN_MEMORY_REPO === 'true' ? memory : postgres,
			inject: [InMemoryProductCategoryUsageRepository, PostgresProductCategoryRepository],
		},
		InMemoryProductCategoryRepository,
		{
			provide: PRODUCT_CATEGORY_REPOSITORY,
			useFactory: (memory: InMemoryProductCategoryRepository, postgres: PostgresProductCategoryRepository) => process.env.USE_IN_MEMORY_REPO === 'true' ? memory : postgres,
			inject: [InMemoryProductCategoryRepository, PostgresProductCategoryRepository],
		},
		ProductCategoryService,
	],
	exports: [
		ProductCategoryService,
		PRODUCT_CATEGORY_REPOSITORY,
		PRODUCT_CATEGORY_USAGE_REPOSITORY,
	],
})
export class ProductCategoryModule {}
