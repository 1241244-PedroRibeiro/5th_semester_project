import { Injectable } from '@nestjs/common';
import { createPage, Page, PageRequest } from '../../../domain/common/Pagination';
import { ProductCategory } from '../../../domain/product/product-category/ProductCategory';
import { ProductCategoryRepository } from '../../../domain/product/product-category/ProductCategoryRepository';
import { CategoryName } from '../../../domain/product/product-category/valueObjects';

/** Process-local storage, following the current user repository setup. */
@Injectable()
export class InMemoryProductCategoryRepository implements ProductCategoryRepository {
	private readonly categories = new Map<string, ProductCategory>();

	async save(category: ProductCategory): Promise<void> {
		this.categories.set(category.name.value, category);
	}

	async findById(id: CategoryName): Promise<ProductCategory | null> {
		return this.categories.get(id.value) ?? null;
	}

	async findByName(name: CategoryName): Promise<ProductCategory | null> {
		for (const category of this.categories.values()) {
			if (category.name.equals(name))
				return (category);
		}

		return (null);
	}

	async searchByName(text: string): Promise<ProductCategory[]> {
		const query = text.trim().toLowerCase();

		return [...this.categories.values()].filter(category =>
			category.name.value.toLowerCase().includes(query),
			);
	}

	async remove(id: CategoryName): Promise<void> {
		this.categories.delete(id.value);
	}

	async findAll(page: PageRequest): Promise<Page<ProductCategory>> {
		const categories = [...this.categories.values()];

		return createPage(
			categories.slice(page.offset, page.offset + page.pageSize),
			categories.length,
			page,
			);
	}
}
