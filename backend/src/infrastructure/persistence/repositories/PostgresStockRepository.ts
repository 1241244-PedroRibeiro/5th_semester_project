import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { IStockRepository, StockFilter } from '../../../application/stock/IStockRepository';
import { StockItemResponseDTO } from '../../../application/stock/StockDTOs';
import { StockItem } from '../../../domain/stock/StockItem';
import { StockQuantity } from '../../../domain/stock/StockQuantity';
import { StockMovement } from '../../../domain/stock/StockMovement';
import { StockMovementId } from '../../../domain/stock/StockMovementId';
import { StockMovementType } from '../../../domain/stock/StockMovementType';
import { Timestamp } from '../../../domain/common/Timestamp';
import { Sku } from '../../../domain/product/Sku';
import { StockItemEntity, StockMovementEntity } from '../entities';

@Injectable()
export class PostgresStockRepository implements IStockRepository {
	constructor(@InjectDataSource() private readonly dataSource: DataSource) {}
	private query(manager: EntityManager = this.dataSource.manager) {
		// Inactive products remain visible in stock management (Clarification #19).
		return manager.getRepository(StockItemEntity).createQueryBuilder('stock')
			.innerJoinAndSelect('stock.product', 'product').innerJoin('product.category', 'category')
			.where('product.is_stock_controlled = :controlled', { controlled: true });
	}
	private map(row: StockItemEntity): StockItemResponseDTO {
		return { productSku: row.product_sku, productName: row.product.name, currentUnits: row.current_units, updatedAt: row.updated_at.toISOString() };
	}
	async findAll(filter: StockFilter = {}): Promise<StockItemResponseDTO[]> {
		const query = this.query().andWhere('(product.name ILIKE :search OR product.sku ILIKE :search)', { search: `%${filter.search ?? ''}%` });
		if (filter.categoryName) query.andWhere('product.category_name = :category', { category: filter.categoryName.value });
		if (filter.active !== undefined) query.andWhere('product.is_active = :active', { active: filter.active });
		if (filter.lowStock) query.andWhere('stock.current_units = :zero', { zero: 0 });
		return (await query.orderBy('product.name', 'ASC').getMany()).map(row => this.map(row));
	}
	async findByProductSku(sku: Sku): Promise<StockItemResponseDTO | null> {
		const row = await this.query().andWhere('stock.product_sku = :sku', { sku: sku.value }).getOne();
		return row ? this.map(row) : null;
	}
	async withLockedItem(sku: Sku, mutate: (item: StockItem) => void): Promise<StockItemResponseDTO | null> {
		return this.dataSource.transaction(async manager => {
			const row = await this.query(manager).andWhere('stock.product_sku = :sku', { sku: sku.value })
				.setLock('pessimistic_write', undefined, ['stock', 'product']).getOne();
			if (!row) return null;
			const movements = await manager.find(StockMovementEntity, { where: { product_sku: sku.value }, order: { recorded_at: 'ASC', id: 'ASC' } });
			const item = StockItem.create({ productSku: sku, currentUnits: StockQuantity.create(row.current_units),
				createdAt: Timestamp.create(row.created_at), updatedAt: Timestamp.create(row.updated_at),
				movements: movements.map(value => new StockMovement(StockMovementId.create(value.id), value.type as StockMovementType,
					StockQuantity.create(value.amount), value.reason, Timestamp.create(value.recorded_at))),
			});
			const previousIds = new Set(item.movements.map(value => value.id.value));
			mutate(item);
			await manager.update(StockItemEntity, { product_sku: sku.value }, { current_units: item.currentUnits.units, updated_at: item.updatedAt.value });
			const added = item.movements.filter(value => !previousIds.has(value.id.value)).map(value => ({
				id: value.id.value, product_sku: sku.value, type: value.type, amount: value.amount.units, reason: value.reason, recorded_at: value.recordedAt.value,
			}));
			if (added.length) await manager.insert(StockMovementEntity, added);
			return { productSku: sku.value, productName: row.product.name, currentUnits: item.currentUnits.units, updatedAt: item.updatedAt.value.toISOString() };
		});
	}
}
