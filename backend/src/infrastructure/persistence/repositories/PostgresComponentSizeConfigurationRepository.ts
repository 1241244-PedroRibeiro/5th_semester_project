import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { IComponentSizeConfigurationRepository, ConfigurationRecord } from '../../../application/pizza/IComponentSizeConfigurationRepository';
import { ComponentSizeConfiguration } from '../../../domain/pizza/ComponentSizeConfiguration';
import { ConfigurationId } from '../../../domain/pizza/ConfigurationId';
import { Sku } from '../../../domain/product/Sku';
import { PizzaSizeName } from '../../../domain/pizza/PizzaSizeName';
import { Money } from '../../../domain/common/Money';
import { StockQuantity } from '../../../domain/stock/StockQuantity';
import { ComponentSizeConfigurationEntity, ProductEntity, PizzaSizeEntity, PredefinedPizzaEntity } from '../entities';
import { databaseErrorCode } from '../database-error';

@Injectable()
export class PostgresComponentSizeConfigurationRepository implements IComponentSizeConfigurationRepository {
	constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

	async validateReferences(sku: Sku, size: PizzaSizeName): Promise<boolean> {
		const product = await this.dataSource.getRepository(ProductEntity).findOneBy({ sku: sku.value });
		if (!product) throw new NotFoundException('Product not found');
		if (!product.is_pizza_component || !product.is_active) throw new BadRequestException('An active Pizza Component is required');
		const pizzaSize = await this.dataSource.getRepository(PizzaSizeEntity).findOneBy({ name: size.value });
		if (!pizzaSize) throw new NotFoundException('Pizza size not found');
		if (!pizzaSize.is_active) throw new BadRequestException('Inactive pizza sizes cannot be configured');
		return product.is_stock_controlled;
	}

	async save(config: ComponentSizeConfiguration): Promise<void> {
		try {
			await this.dataSource.transaction(async manager => {
				if (!await manager.existsBy(ProductEntity, { sku: config.componentSku.value })
					|| !await manager.existsBy(PizzaSizeEntity, { name: config.pizzaSize.value })) throw new NotFoundException('Product or pizza size not found');
				await manager.createQueryBuilder().insert().into(ComponentSizeConfigurationEntity).values({
					id: config.id.value, product_sku: config.componentSku.value, pizza_size: config.pizzaSize.value,
					price: config.price.amount.toString(), stock_units_consumed: config.stockUnitsConsumed.units, price_currency: config.price.currency,
				}).orUpdate(['price', 'stock_units_consumed', 'price_currency'], ['id']).execute();
			});
		} catch (error) { if (databaseErrorCode(error) === '23505') throw new ConflictException('A configuration already exists for this product and size'); throw error; }
	}

	private query() {
		return this.dataSource.getRepository(ComponentSizeConfigurationEntity).createQueryBuilder('config')
			.innerJoinAndSelect('config.product', 'product').innerJoin('config.size', 'size');
	}

	private map(row: ComponentSizeConfigurationEntity): ConfigurationRecord {
		return { configuration: ComponentSizeConfiguration.create({
			id: ConfigurationId.create(row.id), componentSku: Sku.create(row.product_sku), pizzaSize: PizzaSizeName.create(row.pizza_size),
			price: Money.create(Number(row.price), row.price_currency), stockUnitsConsumed: StockQuantity.create(row.stock_units_consumed),
		}), productName: row.product.name, stockControlled: row.product.is_stock_controlled };
	}

	async findById(id: ConfigurationId): Promise<ConfigurationRecord | null> {
		const row = await this.query().where('config.id = :id', { id: id.value }).getOne();
		return row ? this.map(row) : null;
	}

	async findAll(search = '', sku?: Sku, size?: PizzaSizeName): Promise<ConfigurationRecord[]> {
		const query = this.query().where('(product.name ILIKE :search OR size.name ILIKE :search)', { search: `%${search.trim()}%` });
		if (sku) query.andWhere('config.product_sku = :sku', { sku: sku.value });
		if (size) query.andWhere('config.pizza_size = :size', { size: size.value });
		return (await query.orderBy('product.name', 'ASC').addOrderBy('size.name', 'ASC').getMany()).map(row => this.map(row));
	}

	async findByProduct(sku: Sku): Promise<ConfigurationRecord[]> { return this.findAll('', sku); }

	async isUsedByPredefinedPizza(componentSku: Sku, pizzaSize: PizzaSizeName): Promise<boolean> {
		return this.dataSource.getRepository(PredefinedPizzaEntity).exists({
			where: {
				recipe: { component_product_sku: componentSku.value },
				availableSizes: { pizza_size: pizzaSize.value },
			},
		});
	}

	async delete(id: ConfigurationId): Promise<boolean> {
		return !!(await this.dataSource.getRepository(ComponentSizeConfigurationEntity).delete({ id: id.value })).affected;
	}
}
