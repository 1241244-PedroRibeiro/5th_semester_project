import { Page, PageRequest } from '../../common/Pagination';
import { ProductCategory } from './ProductCategory';
import { CategoryName } from './CategoryName';

/** Runtime token used by NestJS to resolve the repository interface. */
export const PRODUCT_CATEGORY_REPOSITORY = Symbol('PRODUCT_CATEGORY_REPOSITORY');

export interface ProductCategoryRepository {

	/** Inserts or updates the category. */
	save(category: ProductCategory): Promise<void>;
	findById(id: CategoryName): Promise<ProductCategory | null>;
	findByName(name: CategoryName): Promise<ProductCategory | null>;

	/** Partial, case-insensitive match on the category name (AC4 - searchable categories). */
	searchByName(text: string): Promise<ProductCategory[]>;
	remove(id: CategoryName): Promise<void>;
	findAll(page: PageRequest): Promise<Page<ProductCategory>>;
}
