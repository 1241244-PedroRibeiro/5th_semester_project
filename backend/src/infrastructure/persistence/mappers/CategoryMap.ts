import { ProductCategory } from '../../../domain/product/product-category/ProductCategory';
import { CategoryName } from '../../../domain/product/product-category/CategoryName';
export interface CategoryPersistenceRow {
	name: string;
	description: string | null;
}
export class CategoryMap {
	static toDomain(row: CategoryPersistenceRow): ProductCategory { return ProductCategory.create({ name: CategoryName.create(row.name), description: row.description ?? '' }); }
}
