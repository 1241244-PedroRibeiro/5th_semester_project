import { CategoryName } from '../../domain/product/product-category/valueObjects';

export const PRODUCT_CATEGORY_USAGE_REPOSITORY = Symbol('PRODUCT_CATEGORY_USAGE_REPOSITORY');

/** Product storage must implement this query to protect referenced categories. */
export interface ProductCategoryUsageRepository {
	existsByCategory(id: CategoryName): Promise<boolean>;
}
