import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, In } from 'typeorm';
import { IProductRepository, ProductFilter } from '../../../application/product/IProductRepository';
import { Product } from '../../../domain/product/Product';
import { Sku } from '../../../domain/product/Sku';
import { ProductName } from '../../../domain/product/ProductName';
import { ProductMap } from '../mappers/ProductMap';
import { AllergenEntity, ProductEntity, ProductCategoryEntity, PizzaComponentTypeEntity, StockItemEntity, ProductAllergenEntity, ComponentSizeConfigurationEntity, PredefinedPizzaRecipeEntity } from '../entities';

@Injectable()
export class PostgresProductRepository implements IProductRepository {
	constructor(@InjectDataSource() private readonly dataSource: DataSource) {}
	private query() {
		return this.dataSource.getRepository(ProductEntity).createQueryBuilder('product')
			.innerJoin('product.category', 'category').leftJoin('product.componentType', 'type')
			.leftJoinAndSelect('product.allergenAssignments', 'allergens');
	}
	private map(row: ProductEntity): Product {
		return ProductMap.toDomain({ ...row, allergens: row.allergenAssignments.map(value => value.allergen_name).sort() });
	}
	async findBySku(sku: Sku): Promise<Product | null> {
		const row = await this.query().where('product.sku = :sku', { sku: sku.value }).getOne();
		return row ? this.map(row) : null;
	}
	async findByName(name: ProductName): Promise<Product | null> {
		const row = await this.query().where('LOWER(product.name) = LOWER(:name)', { name: name.value }).getOne();
		return row ? this.map(row) : null;
	}
	async findAll(filter: ProductFilter = {}): Promise<Product[]> {
		const query = this.query();
		if (filter.categoryName) query.andWhere('product.category_name = :category', { category: filter.categoryName.value });
		if (filter.componentTypeName) query.andWhere('product.component_type_name = :type', { type: filter.componentTypeName.value });
		if (filter.activeOnly) query.andWhere('product.is_active = :active', { active: true });
		if (filter.name) query.andWhere('product.name ILIKE :name', { name: `%${filter.name}%` });
		if (filter.allergenName) query.innerJoin('product.allergenAssignments', 'matchingAllergen', 'matchingAllergen.allergen_name = :allergen', { allergen: filter.allergenName.value });
		return (await query.orderBy('product.name', 'ASC').getMany()).map(row => this.map(row));
	}
	async save(product: Product): Promise<void> { await this.persist(product, false); }
	async update(product: Product): Promise<void> { await this.persist(product, true); }
	private async persist(product: Product, update: boolean): Promise<void> {
		await this.dataSource.transaction(async manager => {
			if (!await manager.existsBy(ProductCategoryEntity, { name: product.category.value })) throw new Error('Category not found');
			if (product.componentType && !await manager.existsBy(PizzaComponentTypeEntity, { name: product.componentType.value })) throw new Error('Component type not found');
			const row = {
				sku: product.sku.value, name: product.name.value, description: product.description,
				category_name: product.category.value, is_sellable: product.flags.sellable,
				is_pizza_component: product.flags.pizzaComponent, is_stock_controlled: product.flags.stockControlled,
				component_type_name: product.componentType?.value ?? null,
				direct_selling_price: product.directSellingPrice?.amount.toString() ?? null,
				direct_price_currency: product.directSellingPrice?.currency ?? null,
				stock_units_per_sale: product.stockUnitsPerSale,
				is_active: product.active,
			};

			const insert = manager.createQueryBuilder().insert().into(ProductEntity).values(row);

			if (update) {
				insert.orUpdate(
					[
						'name',
						'description',
						'category_name',
						'is_sellable',
						'is_pizza_component',
						'is_stock_controlled',
						'component_type_name',
						'direct_selling_price',
						'direct_price_currency',
						'stock_units_per_sale',
						'is_active',
					],
					['sku'],
				);
			}

			await insert.execute();
			if (product.flags.stockControlled) await manager.createQueryBuilder().insert().into(StockItemEntity)
				.values({ product_sku: product.sku.value, current_units: 0 }).orIgnore().execute();
			const names = [...product.allergens].map(value => value.value);
			if (names.length && await manager.countBy(AllergenEntity, { name: In(names) }) !== new Set(names).size) throw new Error('Allergen not found');
			await manager.delete(ProductAllergenEntity, { product_sku: product.sku.value });
			if (names.length) await manager.insert(ProductAllergenEntity, names.map(allergen_name => ({ product_sku: product.sku.value, allergen_name })));
		});
	}
	async isReferenced(sku: Sku): Promise<boolean> {
		return await this.dataSource.getRepository(StockItemEntity).existsBy({ product_sku: sku.value })
			|| await this.dataSource.getRepository(ComponentSizeConfigurationEntity).existsBy({ product_sku: sku.value })
			|| await this.dataSource.getRepository(PredefinedPizzaRecipeEntity).existsBy({ component_product_sku: sku.value });
	}
}