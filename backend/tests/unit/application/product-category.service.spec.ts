import { DataSource } from 'typeorm';
import { mockDataSource } from '../../helpers/mock-data-source';
process.env.USE_IN_MEMORY_REPO = 'true';
import { Test, TestingModule } from '@nestjs/testing';
import { ProductCategoryService } from '../../../src/application/product/category-services/ProductCategoryService';
import { PageRequest } from '../../../src/domain/common/Pagination';
import {
	PRODUCT_CATEGORY_REPOSITORY,
	ProductCategoryRepository,
} from '../../../src/domain/product/product-category/ProductCategoryRepository';
import { CategoryName } from '../../../src/domain/product/product-category/valueObjects';
import { InMemoryProductCategoryRepository } from '../../../src/infrastructure/persistence/repositories/InMemoryProductCategoryRepository';
import { ProductCategoryModule } from '../../../src/presentation/product-category.module';

describe('ProductCategory dependency injection', () => {
	let module: TestingModule;

	afterEach(async () => {
		await module?.close();
	});

	it('resolves the service and shares the repository instance through its token', async () => {
		module = await Test.createTestingModule({ imports: [ProductCategoryModule] }).overrideProvider(DataSource).useValue(mockDataSource).compile();
		const service = module.get(ProductCategoryService);
		const repository = module.get<ProductCategoryRepository>(PRODUCT_CATEGORY_REPOSITORY);
		expect(repository).toBe(module.get(InMemoryProductCategoryRepository));

		const first = await service.create({ name: CategoryName.create('Pizza'), description: 'Pizzas' });
		const second = await service.create({ name: CategoryName.create('Drinks'), description: 'Beverages' });
		expect(await service.findById(first.name)).toBe(first);
		expect(await service.findByName(second.name)).toBe(second);
		expect(await service.searchByName('PIZ')).toEqual([first]);
		expect(await service.findAll(PageRequest.create(2, 1))).toEqual({
			items: [second],
			total: 2,
			page: 2,
			pageSize: 1,
			totalPages: 2,
		});

		await service.remove(first.name);
		expect(await service.findById(first.name)).toBeNull();
	});

	it('allows the repository to be replaced without changing the service', async () => {
		const repository: ProductCategoryRepository = {
			save: jest.fn().mockResolvedValue(undefined),
			findById: jest.fn().mockResolvedValue(null),
			findByName: jest.fn().mockResolvedValue(null),
			searchByName: jest.fn().mockResolvedValue([]),
			remove: jest.fn().mockResolvedValue(undefined),
			findAll: jest.fn(),
		};
		module = await Test.createTestingModule({ imports: [ProductCategoryModule] })
			.overrideProvider(PRODUCT_CATEGORY_REPOSITORY)
			.useValue(repository)
			.overrideProvider(DataSource).useValue(mockDataSource).compile();

		const service = module.get(ProductCategoryService);
		const category = await service.create({ name: CategoryName.create('Pizza'), description: 'Pizzas' });
		expect(repository.save).toHaveBeenCalledWith(category);
		await expect(service.findById(category.name)).resolves.toBeNull();
		expect(repository.findById).toHaveBeenCalledWith(category.name);
	});
});
