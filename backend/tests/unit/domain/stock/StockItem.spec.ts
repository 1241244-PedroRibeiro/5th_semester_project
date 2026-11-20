import { StockItem } from '../../../../src/domain/stock/StockItem';
import { StockQuantity } from '../../../../src/domain/stock/StockQuantity';
import { Sku } from '../../../../src/domain/product/Sku';
import { Timestamp } from '../../../../src/domain/common/Timestamp';
describe('StockItem history ownership', () => {
	const make = () => { const time = Timestamp.create(new Date('2020-01-01Z')); return StockItem.create({ productSku: Sku.create('CHEESE'), currentUnits: StockQuantity.create(10), movements: [], createdAt: time, updatedAt: time }); };
	it('replenishes and consumes with recorded movements', () => { const item = make(); item.replenish(StockQuantity.create(5), 'Delivery'); item.consume(StockQuantity.create(3), 'Order'); expect(item.currentUnits.units).toBe(12); expect(item.movements.map(movement => movement.type)).toEqual(['REPLENISHMENT', 'CONSUMPTION']); item.movements.pop(); expect(item.movements.length).toBe(2); });
	it('preserves balance and history on an invalid consumption', () => { const item = make(); expect(() => item.consume(StockQuantity.create(11), 'Order')).toThrow(); expect(item.currentUnits.units).toBe(10); expect(item.movements).toHaveLength(0); });
});
