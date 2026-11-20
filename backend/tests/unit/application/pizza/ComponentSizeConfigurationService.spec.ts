import { BadRequestException, ConflictException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { ComponentSizeConfigurationService } from '../../../../src/application/pizza/ComponentSizeConfigurationService';
import { IComponentSizeConfigurationRepository, ConfigurationRecord } from '../../../../src/application/pizza/IComponentSizeConfigurationRepository';
import { ComponentSizeConfiguration } from '../../../../src/domain/pizza/ComponentSizeConfiguration';
import { ConfigurationId } from '../../../../src/domain/pizza/ConfigurationId';
import { Sku } from '../../../../src/domain/product/Sku';
import { PizzaSizeName } from '../../../../src/domain/pizza/PizzaSizeName';
import { Money } from '../../../../src/domain/common/Money';
import { StockQuantity } from '../../../../src/domain/stock/StockQuantity';
describe('Component configuration root orchestration', () => {
	let repo: jest.Mocked<IComponentSizeConfigurationRepository>, service: ComponentSizeConfigurationService, record: ConfigurationRecord;
	beforeEach(() => {
		record = { configuration: ComponentSizeConfiguration.create({ id: ConfigurationId.create('config'), componentSku: Sku.create('CHEESE'), pizzaSize: PizzaSizeName.create('Large'), price: Money.create(1.5), stockUnitsConsumed: StockQuantity.create(1) }), productName: 'Cheese', stockControlled: true };
		repo = { validateReferences: jest.fn().mockResolvedValue(true), save: jest.fn().mockResolvedValue(undefined), findById: jest.fn().mockResolvedValue(record), findAll: jest.fn().mockResolvedValue([record]), findByProduct: jest.fn().mockResolvedValue([record]), delete: jest.fn().mockResolvedValue(true), isUsedByPredefinedPizza: jest.fn().mockResolvedValue(false) };
		service = new ComponentSizeConfigurationService(repo);
	});
	it('creates domain values and persists a configuration root', async () => { await service.create({ componentSku: 'CHEESE', pizzaSize: 'Large', price: 2, stockUnitsConsumed: 1 }); const config = repo.save.mock.calls[0][0]; expect(config).toBeInstanceOf(ComponentSizeConfiguration); expect(config.componentSku).toBeInstanceOf(Sku); expect(config.price.amount).toBe(2); });
	it('changes price and consumption through root methods', async () => { const price = jest.spyOn(record.configuration, 'changePrice'), consumption = jest.spyOn(record.configuration, 'changeConsumption'); const result = await service.update('config', { price: 2.25, stockUnitsConsumed: 2 }); expect(price).toHaveBeenCalledWith(Money.create(2.25)); expect(consumption).toHaveBeenCalledWith(StockQuantity.create(2)); expect(result.price).toBe(2.25); expect(result.componentSku).toBe('CHEESE'); expect(result.pizzaSize).toBe('Large'); expect(result).not.toHaveProperty('updatedAt'); });
	it('wraps natural reference filters', async () => { await service.getAll('Cheese', 'CHEESE', 'Large'); expect(repo.findAll).toHaveBeenCalledWith('Cheese', Sku.create('CHEESE'), PizzaSizeName.create('Large')); });
	it('requires consumption for stock-controlled components', async () => { await expect(service.create({ componentSku: 'CHEESE', pizzaSize: 'Large', price: 2 })).rejects.toBeInstanceOf(BadRequestException); expect(repo.save).not.toHaveBeenCalled(); });
	it('returns 404 for missing configuration and deletion', async () => { repo.findById.mockResolvedValue(null); repo.delete.mockResolvedValue(false); await expect(service.getById('missing')).rejects.toBeInstanceOf(NotFoundException); await expect(service.update('missing', { price: 1 })).rejects.toBeInstanceOf(NotFoundException); await expect(service.delete('missing')).rejects.toBeInstanceOf(NotFoundException); });
	it('rejects deletion of a used configuration and keeps it readable', async () => {
		repo.isUsedByPredefinedPizza.mockResolvedValue(true);
		await expect(service.delete('config')).rejects.toBeInstanceOf(ConflictException);
		expect(repo.isUsedByPredefinedPizza).toHaveBeenCalledWith(record.configuration.componentSku, record.configuration.pizzaSize);
		expect(repo.delete).not.toHaveBeenCalled();
		expect((await service.getById('config')).id).toBe('config');
	});
	it('deletes an unused configuration', async () => {
		await expect(service.delete('config')).resolves.toEqual({ message: 'Component size configuration deleted successfully' });
		expect(repo.isUsedByPredefinedPizza).toHaveBeenCalledWith(record.configuration.componentSku, record.configuration.pizzaSize);
		expect(repo.delete).toHaveBeenCalledWith(record.configuration.id);
	});
	it('does not check usage or delete when the configuration is missing', async () => {
		repo.findById.mockResolvedValue(null);
		await expect(service.delete('missing')).rejects.toBeInstanceOf(NotFoundException);
		expect(repo.isUsedByPredefinedPizza).not.toHaveBeenCalled();
		expect(repo.delete).not.toHaveBeenCalled();
	});
	it('reports the current service error if the repository cannot delete an existing configuration', async () => {
		repo.delete.mockResolvedValue(false);
		await expect(service.delete('config')).rejects.toBeInstanceOf(InternalServerErrorException);
	});
	it('does not delete if the usage check fails', async () => {
		const error = new Error('Database unavailable');
		repo.isUsedByPredefinedPizza.mockRejectedValue(error);
		await expect(service.delete('config')).rejects.toBe(error);
		expect(repo.delete).not.toHaveBeenCalled();
	});
});
