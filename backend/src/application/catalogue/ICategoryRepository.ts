import { ProductCategory } from '../../domain/product/product-category/ProductCategory';
import { CategoryName } from '../../domain/product/product-category/CategoryName';

export interface ICategoryRepository {
	findByName(name: CategoryName): Promise<ProductCategory | null>;
	findAll(search?: string): Promise<ProductCategory[]>;
	save(value: ProductCategory): Promise<void>;
	update(value: ProductCategory): Promise<void>;
	delete(name: CategoryName): Promise<void>;
	isReferencedByProducts(name: CategoryName): Promise<boolean>;
}
