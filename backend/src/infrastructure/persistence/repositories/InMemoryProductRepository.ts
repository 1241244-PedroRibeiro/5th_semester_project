import { IProductRepository, ProductFilter } from '../../../application/product/IProductRepository';
import { ProductName } from '../../../domain/product/ProductName';
import { Product } from '../../../domain/product/Product';
import { Sku } from '../../../domain/product/Sku';

export class InMemoryProductRepository implements IProductRepository {
	private readonly store = new Map<string, Product>();
	async findBySku(sku: Sku): Promise<Product | null> { return this.store.get(sku.value) ?? null; }
	async findByName(name: ProductName): Promise<Product | null> { return [...this.store.values()].find(product => product.name.value.toLowerCase() === name.value.trim().toLowerCase()) ?? null; }
	async findAll(filter: ProductFilter = {}): Promise<Product[]> {
		return [...this.store.values()].filter(product => (!filter.activeOnly || product.active)
			&& (!filter.categoryName || product.category.value === filter.categoryName.value)
			&& (!filter.componentTypeName || product.componentType?.value === filter.componentTypeName.value)
			&& (!filter.allergenName || [...product.allergens].some(allergen => allergen.value === filter.allergenName?.value))
			&& (!filter.name || product.name.value.toLowerCase().includes(filter.name.toLowerCase())));
	}
	async save(product: Product): Promise<void> { this.store.set(product.sku.value, product); }
	async update(product: Product): Promise<void> { await this.save(product); }
	async isReferenced(sku: Sku): Promise<boolean> { return false; }
}
