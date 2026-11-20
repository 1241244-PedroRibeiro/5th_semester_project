import { PizzaComponentTypeConflictError, PizzaComponentUnauthorizedDeletionException } from '../../domain/pizza/pizza-component-type/PizzaComponentTypeErrors';
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { irremovable_pizzas_component_types, PizzaComponentType, PizzaComponentTypeProps } from '../../domain/pizza/pizza-component-type/PizzaComponentType';
import { ComponentTypeName, AssemblyOrder } from '../../domain/pizza/pizza-component-type/valueObjects';
import { PIZZA_COMPONENT_TYPE_REPOSITORY, PizzaComponentTypeRepository } from '../../domain/pizza/pizza-component-type/PizzaComponentTypeRepository';
import { PizzaComponentTypeInUseError, PizzaComponentTypeNotFoundError } from '../../domain/pizza/pizza-component-type/PizzaComponentTypeErrors';
import { cardinalityFromStorage, cardinalityToStorage } from '../../infrastructure/persistence/mappers/CardinalityMap';
import { CreatePizzaComponentTypeDTO, UpdatePizzaComponentTypeDTO, PizzaComponentTypeResponseDTO } from './PizzaComponentTypeDTOs';
import { Page, PageRequest } from '../../domain/common/Pagination';

@Injectable()
export class PizzaComponentTypeService {
	constructor(@Inject(PIZZA_COMPONENT_TYPE_REPOSITORY) private readonly repository: PizzaComponentTypeRepository) {}

	async create(props: PizzaComponentTypeProps): Promise<PizzaComponentType> {
		const type = PizzaComponentType.create(props);
		await this.repository.save(type);
		return type;
	}

	async createComponentType(dto: CreatePizzaComponentTypeDTO): Promise<PizzaComponentTypeResponseDTO> {
		if (!dto || typeof dto !== 'object' || Array.isArray(dto))
			throw new BadRequestException('Component type details are required');
		const name = ComponentTypeName.create(dto.name);

		if (await this.repository.findByName(name))
			throw new PizzaComponentTypeConflictError();
		const order = AssemblyOrder.create(dto.assemblyOrder);

		if (order.isFailure)
			throw new BadRequestException(order.getError());

		return this.toDTO(await this.create({ name,
							assemblyOrder: order.getValue(),
							cardinality: cardinalityFromStorage(dto.minCardinality, dto.maxCardinality) }));
	}

	async getComponentTypes(page: number, pageSize: number, search?: string): Promise<Page<PizzaComponentTypeResponseDTO>> {
		if (search !== undefined && typeof search !== 'string')
			throw new BadRequestException('Search must be a string');
		const request = PageRequest.create(page, pageSize);
		const result = await this.repository.findAllPaginated(request, search);
		return { ...result, items: result.items.map(type => this.toDTO(type)) };
	}

	save(type: PizzaComponentType): Promise<void> { return this.repository.save(type); }

	findByName(name: ComponentTypeName): Promise<PizzaComponentType | null> { return this.repository.findByName(name); }

	async getComponentTypeByName(name: string): Promise<PizzaComponentTypeResponseDTO> { return this.toDTO(await this.requireType(name)); }

	async updateComponentType(name: string, dto: UpdatePizzaComponentTypeDTO): Promise<PizzaComponentTypeResponseDTO> {
		if (!dto || typeof dto !== 'object' || Array.isArray(dto))
			throw new BadRequestException('Component type details are required');
		const type = await this.requireType(name);
		if (dto.name !== undefined && dto.name !== type.name.value)
			throw new BadRequestException('Component type name cannot be changed');

		const order = AssemblyOrder.create(dto.assemblyOrder === undefined ? type.assemblyOrder.sequenceNumber : dto.assemblyOrder);
		if (order.isFailure)
			throw new BadRequestException(order.getError());
		const cardinality = cardinalityFromStorage(
			dto.minCardinality === undefined ? type.cardinality.minimum : dto.minCardinality,
			dto.maxCardinality === undefined ? cardinalityToStorage(type.cardinality.maximum) : dto.maxCardinality);

		type.changeAssemblyOrder(order.getValue());
		type.changeCardinality(cardinality);
		// Repository uniqueness checks also reject assembly orders claimed by concurrent updates.
		await this.repository.save(type);
		return this.toDTO(type);
	}

	async deleteComponentType(name: string): Promise<void> {
		const type = await this.requireType(name);
		if (await this.repository.isReferenced(type.name))
			throw new PizzaComponentTypeInUseError();

		if (irremovable_pizzas_component_types.includes(type.name.value))
			throw new PizzaComponentUnauthorizedDeletionException()
		await this.repository.delete(type.name);
	}

	private async requireType(name: string): Promise<PizzaComponentType> {
		const type = await this.repository.findByName(ComponentTypeName.create(name));
		if (!type)
			throw new PizzaComponentTypeNotFoundError();
		return type;
	}

	private toDTO(type: PizzaComponentType): PizzaComponentTypeResponseDTO {
		return { name: type.name.value, assemblyOrder: type.assemblyOrder.sequenceNumber, minCardinality: type.cardinality.minimum, maxCardinality: cardinalityToStorage(type.cardinality.maximum) };
	}
}
