import { Product } from '../../domain/product/Product';
import { Sku } from '../../domain/product/Sku';
import { CategoryName } from '../../domain/product/product-category/CategoryName';
import { AllergenName } from '../../domain/allergen/AllergenName';
import { ComponentTypeName } from '../../domain/pizza/pizza-component-type/valueObjects';
import { ProductName } from '../../domain/product/ProductName';
export interface ProductFilter { categoryName?: CategoryName; allergenName?: AllergenName; componentTypeName?: ComponentTypeName; name?: string; activeOnly?: boolean; }
export const PRODUCT_REPOSITORY = 'IProductRepository';
export interface IProductRepository {
	findBySku(sku: Sku): Promise<Product | null>;
	findByName(name: ProductName): Promise<Product | null>;
	findAll(filter?: ProductFilter): Promise<Product[]>;
	save(product: Product): Promise<void>;
	update(product: Product): Promise<void>;
	isReferenced(sku: Sku): Promise<boolean>;
}
