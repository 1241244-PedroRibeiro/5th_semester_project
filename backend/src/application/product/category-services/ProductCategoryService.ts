import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { DomainError } from '../../../domain/common/DomainError';
import { Page, PageRequest } from '../../../domain/common/Pagination';
import { ProductCategory, ProductCategoryProps } from '../../../domain/product/product-category/ProductCategory';
import {
	PRODUCT_CATEGORY_REPOSITORY,
	type ProductCategoryRepository,
} from '../../../domain/product/product-category/ProductCategoryRepository';
import { CategoryName } from '../../../domain/product/product-category/valueObjects';
import { PRODUCT_CATEGORY_USAGE_REPOSITORY, type ProductCategoryUsageRepository } from '../ProductCategoryUsageRepository';
import {
	CategoryAlreadyExistsError, CategoryInUseError, CategoryNotFoundError,
	type CategoryDto, parseName, toCategoryDto,
} from './ProductCategoryUtils';

@Injectable()
export class ProductCategoryService {
	constructor(
		@Inject(PRODUCT_CATEGORY_REPOSITORY)
		private readonly repository: ProductCategoryRepository,
		@Inject(PRODUCT_CATEGORY_USAGE_REPOSITORY)
		private readonly products: ProductCategoryUsageRepository,
	) {}

	async addCategory(categoryName: string, description = ''): Promise<CategoryDto> {
		const name = parseName(categoryName);
		if (await this.repository.findByName(name))
			throw new CategoryAlreadyExistsError();

		const category = await this.create({ name, description });
		return toCategoryDto(category);
	}

	async listCategories(page?: number, pageSize?: number): Promise<Page<CategoryDto>> {
		const request = this.parsePageRequest(page, pageSize);
		const result = await this.repository.findAll(request);
		return { ...result, items: result.items.map(toCategoryDto) };
	}

	async removeCategory(categoryName: string): Promise<void> {
		const category = await this.repository.findByName(parseName(categoryName));
		if (!category)
			throw new CategoryNotFoundError();
		if (await this.products.existsByCategory(category.name))
			throw new CategoryInUseError();

		await this.repository.remove(category.name);
	}

	private parsePageRequest(page?: number, pageSize?: number): PageRequest {
		try {
			return PageRequest.create(page, pageSize);
		} catch (error) {
			if (error instanceof DomainError)
				throw new BadRequestException(error.message);
			throw error;
		}
	}

	async create(input: ProductCategoryProps): Promise<ProductCategory> {
		const category = ProductCategory.create(input);
		await this.repository.save(category);
		return category;
	}

	save(category: ProductCategory): Promise<void> { return this.repository.save(category);}
	findById(id: CategoryName): Promise<ProductCategory | null> { return this.repository.findById(id);}
	findByName(name: CategoryName): Promise<ProductCategory | null> { return this.repository.findByName(name);}
	searchByName(text: string): Promise<ProductCategory[]> { return this.repository.searchByName(text);}
	findAll(page: PageRequest): Promise<Page<ProductCategory>> { return this.repository.findAll(page);}
	remove(id: CategoryName): Promise<void> { return this.repository.remove(id);}
}
