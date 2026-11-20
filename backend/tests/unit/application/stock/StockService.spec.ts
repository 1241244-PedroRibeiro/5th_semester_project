import { DataSource, EntityManager } from 'typeorm';
import { StockItemEntity, StockMovementEntity } from '../../../../src/infrastructure/persistence/entities';
import { queryBuilder } from '../../../helpers/query-builder';
import { PostgresStockRepository } from '../../../../src/infrastructure/persistence/repositories/PostgresStockRepository';
import { CategoryName } from '../../../../src/domain/product/product-category/CategoryName';
import { StockService } from '../../../../src/application/stock/StockService';
import { IStockRepository } from '../../../../src/application/stock/IStockRepository';
import { StockItem } from '../../../../src/domain/stock/StockItem';
import { StockQuantity } from '../../../../src/domain/stock/StockQuantity';
import { Sku } from '../../../../src/domain/product/Sku';
import { Timestamp } from '../../../../src/domain/common/Timestamp';

describe('StockService root orchestration', () => {
	let service: StockService, item: StockItem, repo: jest.Mocked<IStockRepository>;
	beforeEach(() => {
		const now = Timestamp.create(new Date('2020-01-01Z'));
		item = StockItem.create({ productSku: Sku.create('CHEESE'), currentUnits: StockQuantity.create(10), movements: [], createdAt: now, updatedAt: now });
		repo = { findAll: jest.fn(), findByProductSku: jest.fn(), withLockedItem: jest.fn(async (_sku, mutate) => { mutate(item); return { productSku: 'CHEESE', productName: 'Cheese', currentUnits: item.currentUnits.units, updatedAt: item.updatedAt.value.toISOString() }; }) };
		service = new StockService(repo);
	});
	it('replenishes via StockItem and records a domain movement', async () => { const result = await service.adjustStock('CHEESE', { adjustmentType: 'INCREASE', amount: 3, reason: 'Delivery' }); expect(result.getValue().currentUnits).toBe(13); expect(item.movements[0].type).toBe('REPLENISHMENT'); expect(repo.withLockedItem.mock.calls[0][0]).toBeInstanceOf(Sku); });
	it('consumes via StockItem', async () => { expect((await service.adjustStock('CHEESE', { adjustmentType: 'DECREASE', amount: 3 })).getValue().currentUnits).toBe(7); expect(item.movements[0].type).toBe('CONSUMPTION'); });
	it('rejects insufficient stock without mutation', async () => { const result = await service.adjustStock('CHEESE', { adjustmentType: 'DECREASE', amount: 11 }); expect(result.getError()).toBe('Insufficient stock'); expect(item.currentUnits.units).toBe(10); expect(item.movements).toHaveLength(0); });
	it.each([0, -1, 1.5, NaN])('rejects invalid amount %p before persistence', async amount => { expect((await service.adjustStock('CHEESE', { adjustmentType: 'INCREASE', amount })).isFailure).toBe(true); expect(repo.withLockedItem).not.toHaveBeenCalled(); });
	it('returns not found for unknown stock', async () => { repo.withLockedItem.mockResolvedValue(null); expect((await service.adjustStock('MISSING', { adjustmentType: 'INCREASE', amount: 1 })).getError()).toContain('not found'); });
	it('passes search filters and SKU wrappers to repositories', async () => { repo.findAll.mockResolvedValue([]); repo.findByProductSku.mockResolvedValue(null); await service.getAllStock({ categoryName: 'Ingredients' }); await service.getStockByProductSku('CHEESE'); expect(repo.findAll).toHaveBeenCalledWith({ categoryName: CategoryName.create('Ingredients') }); expect(repo.findByProductSku.mock.calls[0][0].value).toBe('CHEESE'); });
});

describe('Stock aggregate TypeORM transaction persistence', () => {
	function setup() {
		const query = queryBuilder();
		query.getOne.mockResolvedValue({ product_sku: 'CHEESE', product: { name: 'Cheese' }, current_units: 10, created_at: new Date('2020-01-01Z'), updated_at: new Date('2020-01-01Z') });
		const manager = { getRepository: () => ({ createQueryBuilder: () => query }), find: jest.fn().mockResolvedValue([]), update: jest.fn(), insert: jest.fn() };
		const transaction = jest.fn(async (work: (manager: EntityManager) => Promise<unknown>) => work(manager as unknown as EntityManager));
		const repo = new PostgresStockRepository({ transaction } as unknown as DataSource);
		return { repo, manager, query, transaction };
	}
	it('locks stock and product while saving the balance and its generated movement together', async () => {
		const { repo, manager, query, transaction } = setup();
		const result = await repo.withLockedItem(Sku.create('CHEESE'), item => item.replenish(StockQuantity.create(3), 'Delivery'));
		expect(result!.currentUnits).toBe(13);
		expect(transaction).toHaveBeenCalledTimes(1);
		expect(query.setLock).toHaveBeenCalledWith('pessimistic_write', undefined, ['stock', 'product']);
		expect(manager.update).toHaveBeenCalledWith(StockItemEntity, { product_sku: 'CHEESE' }, { current_units: 13, updated_at: expect.any(Date) });
		expect(manager.insert).toHaveBeenCalledWith(StockMovementEntity, [{ id: expect.any(String), product_sku: 'CHEESE', type: 'REPLENISHMENT', amount: 3, reason: 'Delivery', recorded_at: expect.any(Date) }]);
	});
	it('propagates domain failure before any balance or history write', async () => {
		const { repo, manager } = setup();
		await expect(repo.withLockedItem(Sku.create('CHEESE'), item => item.consume(StockQuantity.create(11), 'Order'))).rejects.toThrow();
		expect(manager.update).not.toHaveBeenCalled();
		expect(manager.insert).not.toHaveBeenCalled();
	});
});
