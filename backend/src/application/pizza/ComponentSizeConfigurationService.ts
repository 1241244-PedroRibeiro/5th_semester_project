import { BadRequestException, ConflictException, Inject, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { COMPONENT_SIZE_CONFIGURATION_REPOSITORY, IComponentSizeConfigurationRepository, ConfigurationRecord } from './IComponentSizeConfigurationRepository';
import { CreateComponentSizeConfigurationDTO, UpdateComponentSizeConfigurationDTO, ComponentSizeConfigurationResponseDTO } from './ComponentSizeConfigurationDTOs';
import { ComponentSizeConfiguration } from '../../domain/pizza/ComponentSizeConfiguration';
import { ConfigurationId } from '../../domain/pizza/ConfigurationId';
import { PizzaSizeName } from '../../domain/pizza/PizzaSizeName';
import { Sku } from '../../domain/product/Sku';
import { Money } from '../../domain/common/Money';
import { StockQuantity } from '../../domain/stock/StockQuantity';
@Injectable()
export class ComponentSizeConfigurationService {
	constructor(@Inject(COMPONENT_SIZE_CONFIGURATION_REPOSITORY) private readonly repository: IComponentSizeConfigurationRepository) {}

	async create(dto: CreateComponentSizeConfigurationDTO): Promise<ComponentSizeConfigurationResponseDTO> {
		const sku = Sku.create(dto.componentSku), size = PizzaSizeName.create(dto.pizzaSize);
		const controlled = await this.repository.validateReferences(sku, size);

		if (controlled && dto.stockUnitsConsumed === undefined)
			throw new BadRequestException('Stock units consumed are required for stock-controlled products');
		const config = ComponentSizeConfiguration.create({ id: ConfigurationId.create(randomUUID()), componentSku: sku, pizzaSize: size, price: this.price(dto.price), stockUnitsConsumed: StockQuantity.create(controlled ? dto.stockUnitsConsumed! : 0) });
		await this.repository.save(config);
		return this.getById(config.id.value);
	}

	async getById(raw: string): Promise<ComponentSizeConfigurationResponseDTO> {
		const record = await this.repository.findById(ConfigurationId.create(raw));
		if (!record)
			throw new NotFoundException('Component size configuration not found');
		return this.toDTO(record);
	}

	async getAll(search?: string, sku?: string, size?: string): Promise<ComponentSizeConfigurationResponseDTO[]> { return (await this.repository.findAll(search, sku ? Sku.create(sku) : undefined, size ? PizzaSizeName.create(size) : undefined)).map(record => this.toDTO(record)); }

	async getByProduct(sku: string): Promise<ComponentSizeConfigurationResponseDTO[]> { return (await this.repository.findByProduct(Sku.create(sku))).map(record => this.toDTO(record)); }

	async update(raw: string, dto: UpdateComponentSizeConfigurationDTO): Promise<ComponentSizeConfigurationResponseDTO> {
		const record = await this.repository.findById(ConfigurationId.create(raw));

		if (!record)
			throw new NotFoundException('Component size configuration not found');
		if (record.stockControlled && dto.stockUnitsConsumed === undefined)
			throw new BadRequestException('Stock units consumed are required for stock-controlled products');

		record.configuration.changePrice(this.price(dto.price));
		record.configuration.changeConsumption(StockQuantity.create(record.stockControlled ? dto.stockUnitsConsumed! : 0));
		await this.repository.save(record.configuration); return this.getById(raw);
	}

	async delete(raw: string): Promise<{ message: string }> {
		const id = ConfigurationId.create(raw);

		const record = await this.repository.findById(id);
		if (!record)
			throw new NotFoundException('Component size configuration not found');
		const config = record.configuration;

		const inUse = await this.repository.isUsedByPredefinedPizza(config.componentSku,config.pizzaSize,);
		if (inUse)
			throw new ConflictException('Component size configuration is used by a predefined pizza',);

		// not known error, exists(checked up), but cannot be deleted somehow
		if (!await this.repository.delete(id))
			throw new InternalServerErrorException('Internal Server Error: could not delete the Configuration');
		return { message: 'Component size configuration deleted successfully' };
	}

	private price(amount: number): Money {
		let price: Money;

		try {
			price = Money.create(amount);
		}  catch (error) {
			throw new BadRequestException(error instanceof Error ? error.message : 'Invalid price');
		}
		if (price.amount !== amount)
			throw new BadRequestException('Price must have at most two decimal places');

		return price;
	}

	private toDTO(record: ConfigurationRecord): ComponentSizeConfigurationResponseDTO {
		const config = record.configuration;
		return { id: config.id.value, componentSku: config.componentSku.value, productName: record.productName, pizzaSize: config.pizzaSize.value, sizeName: config.pizzaSize.value, price: config.price.amount,
			stockUnitsConsumed: record.stockControlled ? config.stockUnitsConsumed.units : null, stockControlled: record.stockControlled };
	}
}
