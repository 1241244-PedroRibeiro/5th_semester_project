import {
	ConflictException,
	Injectable,
	NotFoundException,
	UnprocessableEntityException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, In } from 'typeorm';
import { IPredefinedPizzaRepository } from '../../../application/pizza/IPredefinedPizzaRepository';
import { PredefinedPizza } from '../../../domain/pizza/PredefinedPizza';
import { PredefinedPizzaId } from '../../../domain/pizza/PredefinedPizzaId';
import { RecipeLine } from '../../../domain/pizza/RecipeLine';
import { Sku } from '../../../domain/product/Sku';
import { PizzaSizeName } from '../../../domain/pizza/PizzaSizeName';
import { PizzaComponentTypeMap } from '../mappers/PizzaComponentTypeMap';
import {
	PredefinedPizzaEntity,
	PredefinedPizzaAvailableSizeEntity,
	PredefinedPizzaRecipeEntity,
	PizzaComponentTypeEntity,
	ProductEntity,
	PizzaSizeEntity,
	ComponentSizeConfigurationEntity,
} from '../entities';
import { databaseErrorCode } from '../database-error';

@Injectable()
export class PostgresPredefinedPizzaRepository implements IPredefinedPizzaRepository {
	constructor(@InjectDataSource() private readonly dataSource: DataSource) {}
	private query() {
		return this.dataSource
			.getRepository(PredefinedPizzaEntity)
			.createQueryBuilder('pizza')
			.innerJoinAndSelect('pizza.availableSizes', 'sizes')
			.leftJoinAndSelect('pizza.recipe', 'recipe')
			.orderBy('pizza.sku', 'ASC')
			.addOrderBy('sizes.pizza_size', 'ASC')
			.addOrderBy('recipe.component_product_sku', 'ASC');
	}
	private map(row: PredefinedPizzaEntity): PredefinedPizza[] {
		return row.availableSizes.map((size) =>
			PredefinedPizza.create({
				id: new PredefinedPizzaId(Sku.create(row.sku), PizzaSizeName.create(size.pizza_size)),
				recipeName: row.recipe_name,
				recipe: new Set(
					row.recipe.map(
						(line) => new RecipeLine(Sku.create(line.component_product_sku), line.default_quantity),
					),
				),
			}),
		);
	}
	async findAll(): Promise<PredefinedPizza[]> {
		return (await this.query().getMany()).flatMap((row) => this.map(row));
	}
	async findById(id: PredefinedPizzaId): Promise<PredefinedPizza | null> {
		const row = await this.query()
			.where('pizza.sku = :sku AND sizes.pizza_size = :size', {
				sku: id.pizzaSku.value,
				size: id.pizzaSize.value,
			})
			.getOne();
		return row ? (this.map(row)[0] ?? null) : null;
	}
	async findByProduct(sku: Sku): Promise<PredefinedPizza[]> {
		const row = await this.query().where('pizza.sku = :sku', { sku: sku.value }).getOne();
		return row ? this.map(row) : [];
	}
	async findSupportedSizes(sku: Sku): Promise<PizzaSizeName[]> {
		return (await this.findSupportedSizesForProducts([sku])).get(sku.value) ?? [];
	}
	async findSupportedSizesForProducts(skus: Sku[]): Promise<Map<string, PizzaSizeName[]>> {
		if (!skus.length) return new Map();
		const pizzas = await this.dataSource.getRepository(PredefinedPizzaEntity).find({
			where: { sku: In([...new Set(skus.map((sku) => sku.value))]) },
			relations: {
				availableSizes: { size: true },
				recipe: { component: { configurations: true } },
			},
		});
		return new Map(
			pizzas.map((pizza) => [
				pizza.sku,
				pizza.availableSizes
					.filter(
						(size) =>
							size.size.is_active &&
							pizza.recipe.every(
								(line) =>
									line.component.is_active &&
									line.component.is_pizza_component &&
									line.component.configurations.some(
										(config) => config.pizza_size === size.pizza_size,
									),
							),
					)
					.map((size) => PizzaSizeName.create(size.pizza_size))
					.sort((a, b) => a.value.localeCompare(b.value)),
			]),
		);
	}
	async save(pizzas: PredefinedPizza[], options?: { replace: boolean }): Promise<void> {
		if (!pizzas.length) return;
		const grouped = new Map<string, PredefinedPizza[]>();
		for (const pizza of pizzas) {
			const group = grouped.get(pizza.id.pizzaSku.value) ?? [];
			group.push(pizza);
			grouped.set(pizza.id.pizzaSku.value, group);
		}
		try {
			await this.dataSource.transaction(async (manager) => {
				const types = (
					await manager
						.getRepository(PizzaComponentTypeEntity)
						.createQueryBuilder('type')
						.setLock('pessimistic_read')
						.getMany()
				).map((row) => PizzaComponentTypeMap.toDomain(row));
				const skus = [
					...new Set(
						pizzas.flatMap((pizza) => [
							pizza.id.pizzaSku.value,
							...[...pizza.recipe].map((line) => line.componentSku.value),
						]),
					),
				];
				const products = await manager
					.getRepository(ProductEntity)
					.createQueryBuilder('product')
					.where({ sku: In(skus) })
					.setLock('pessimistic_read')
					.getMany();
				const productBySku = new Map(products.map((product) => [product.sku, product]));
				const names = [...new Set(pizzas.map((pizza) => pizza.id.pizzaSize.value))];
				const sizes = await manager
					.getRepository(PizzaSizeEntity)
					.createQueryBuilder('size')
					.where({ name: In(names) })
					.setLock('pessimistic_read')
					.getMany();
				const sizeByName = new Map(sizes.map((size) => [size.name, size]));
				const configurations = await manager
					.getRepository(ComponentSizeConfigurationEntity)
					.createQueryBuilder('config')
					.where({ product_sku: In(skus), pizza_size: In(names) })
					.setLock('pessimistic_read')
					.getMany();
				for (const [sku, variants] of grouped) {
					const first = variants[0];
					const signature = (pizza: PredefinedPizza) =>
						JSON.stringify(
							[...pizza.recipe]
								.map((line) => [line.componentSku.value, line.defaultQuantity])
								.sort((a, b) => String(a[0]).localeCompare(String(b[0]))),
						);
					if (
						variants.some(
							(pizza) =>
								pizza.recipeName !== first.recipeName || signature(pizza) !== signature(first),
						)
					)
						throw new UnprocessableEntityException(
							'All size variants must share the same default recipe',
						);
					if (new Set(variants.map((pizza) => pizza.id.pizzaSize.value)).size !== variants.length)
						throw new UnprocessableEntityException('Available sizes must be unique');
					const product = productBySku.get(sku);
					if (!product) throw new NotFoundException('Sellable product not found');
					if (!product.is_sellable || !product.is_active)
						throw new UnprocessableEntityException(
							'A sellable product and active product are required',
						);
					const counts = new Map<string, number>();
					for (const line of first.recipe) {
						const component = productBySku.get(line.componentSku.value);
						if (
							!component?.is_active ||
							!component.is_pizza_component ||
							!component.component_type_name
						)
							throw new UnprocessableEntityException(
								'An active Pizza Component with a component type is required',
							);
						if (!types.some((type) => type.name.value === component.component_type_name))
							throw new UnprocessableEntityException('Component type is not configured');
						counts.set(
							component.component_type_name,
							(counts.get(component.component_type_name) ?? 0) + 1,
						);
					}
					for (const type of types)
						if (!type.cardinality.isSatisfiedBy(counts.get(type.name.value) ?? 0))
							throw new UnprocessableEntityException(
								`Invalid number of components for type ${type.name.value}`,
							);
					for (const variant of variants) {
						const size = sizeByName.get(variant.id.pizzaSize.value);
						if (!size) throw new NotFoundException('Pizza size not found');
						if (!size.is_active)
							throw new UnprocessableEntityException('An active pizza size is required');
						if (
							[...first.recipe].some(
								(line) =>
									!configurations.some(
										(config) =>
											config.product_sku === line.componentSku.value &&
											config.pizza_size === size.name,
									),
							)
						)
							throw new UnprocessableEntityException(
								'An active component with a configuration for this size is required',
							);
					}
					if (options?.replace) {
						const existing = await manager
							.getRepository(PredefinedPizzaEntity)
							.createQueryBuilder('pizza')
							.where('pizza.sku = :sku', { sku })
							.setLock('pessimistic_write')
							.getOne();
						if (!existing) throw new NotFoundException('Predefined pizza not found');
						await manager.update(PredefinedPizzaEntity, { sku }, { recipe_name: first.recipeName });
						await manager.delete(PredefinedPizzaRecipeEntity, { pizza_sku: sku });
						await manager.delete(PredefinedPizzaAvailableSizeEntity, { pizza_sku: sku });
					} else {
						await manager.insert(PredefinedPizzaEntity, { sku, recipe_name: first.recipeName });
					}
					await manager.insert(
						PredefinedPizzaAvailableSizeEntity,
						variants.map((pizza) => ({ pizza_sku: sku, pizza_size: pizza.id.pizzaSize.value })),
					);
					await manager.insert(
						PredefinedPizzaRecipeEntity,
						[...first.recipe].map((line) => ({
							pizza_sku: sku,
							component_product_sku: line.componentSku.value,
							default_quantity: line.defaultQuantity,
						})),
					);
				}
			});
		} catch (error) {
			if (databaseErrorCode(error) === '23505')
				throw new ConflictException('A predefined pizza already exists for this product');
			throw error;
		}
	}
}
