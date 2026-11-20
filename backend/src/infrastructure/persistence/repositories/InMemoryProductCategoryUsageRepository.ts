import { Injectable } from '@nestjs/common';
import { ProductCategoryUsageRepository } from '../../../application/product/ProductCategoryUsageRepository';
import { CategoryName } from '../../../domain/product/product-category/valueObjects';

/** Process-local references until the product persistence adapter is implemented. */
@Injectable()
export class InMemoryProductCategoryUsageRepository implements ProductCategoryUsageRepository {

	private readonly productCategories = new Map<string, string>();

	assignProduct(productId: string, categoryId: CategoryName): void {
		this.productCategories.set(productId, categoryId.value);
	}

	removeProduct(productId: string): void {
		this.productCategories.delete(productId);
	}

	async existsByCategory(id: CategoryName): Promise<boolean> {
		return [...this.productCategories.values()].includes(id.value);
	}
}
