import { BadRequestException, Inject, Injectable, NotFoundException, UnprocessableEntityException, } from '@nestjs/common';
import { IProductRepository, PRODUCT_REPOSITORY } from '../product/IProductRepository';
import { PIZZA_COMPONENT_TYPE_REPOSITORY, PizzaComponentTypeRepository, } from '../../domain/pizza/pizza-component-type/PizzaComponentTypeRepository';
import { IPredefinedPizzaRepository, PREDEFINED_PIZZA_REPOSITORY, } from './IPredefinedPizzaRepository';
import { CreatePredefinedPizzaDTO, PredefinedPizzaResponseDTO } from './PredefinedPizzaDTOs';
import { Sku } from '../../domain/product/Sku';
import { PizzaSizeName } from '../../domain/pizza/PizzaSizeName';
import { PredefinedPizza } from '../../domain/pizza/PredefinedPizza';
import { PredefinedPizzaId } from '../../domain/pizza/PredefinedPizzaId';
import { RecipeLine } from '../../domain/pizza/RecipeLine';

@Injectable()
export class PredefinedPizzaService {
	constructor(
		@Inject(PREDEFINED_PIZZA_REPOSITORY) private readonly repository: IPredefinedPizzaRepository,
		@Inject(PRODUCT_REPOSITORY) private readonly products: IProductRepository,
		@Inject(PIZZA_COMPONENT_TYPE_REPOSITORY) private readonly types: PizzaComponentTypeRepository,
	) {}

	async create(dto: CreatePredefinedPizzaDTO): Promise<PredefinedPizzaResponseDTO> {
		return this.persist(dto, false);
	}

	async update(
		pizzaSku: string,
		dto: Omit<CreatePredefinedPizzaDTO, 'pizzaSku'>,
	): Promise<PredefinedPizzaResponseDTO> {
		if (!(await this.repository.findByProduct(Sku.create(pizzaSku))).length)
			throw new NotFoundException('Predefined pizza not found');
		return this.persist({ ...dto, pizzaSku }, true);
	}

	private async persist(
		dto: CreatePredefinedPizzaDTO,
		replace: boolean,
	): Promise<PredefinedPizzaResponseDTO> {
		if (
			!dto ||
			!Array.isArray(dto.defaultRecipeLines) ||
			!dto.defaultRecipeLines.length ||
			!Array.isArray(dto.availableSizes) ||
			!dto.availableSizes.length
		)
			throw new BadRequestException('Recipe lines and availableSizes are required');

		if (
			typeof dto.recipeName !== 'string' ||
			!dto.recipeName.trim() ||
			dto.recipeName.trim().length > 100
		)
			throw new BadRequestException('recipeName must contain between 1 and 100 characters');

		if (new Set(dto.availableSizes).size !== dto.availableSizes.length)
			throw new BadRequestException('Available sizes must be unique');

		const sku = Sku.create(dto.pizzaSku),
			product = await this.products.findBySku(sku);
		if (!product) throw new NotFoundException('Sellable product not found');
		if (!product.flags.sellable)
			throw new UnprocessableEntityException(
				'Predefined pizza must be associated with a sellable product',
			);
		const recipe = new Set<RecipeLine>(),
			counts = new Map<string, number>();

		for (const requested of dto.defaultRecipeLines) {
			if (!requested || typeof requested.componentSku !== 'string')
				throw new BadRequestException('Every recipe line must specify a componentSku');
			const component = await this.products.findBySku(Sku.create(requested.componentSku));
			if (!component) throw new NotFoundException('Pizza component product not found');
			if (!component.active || !component.flags.pizzaComponent || !component.componentType)
				throw new UnprocessableEntityException(
					'An active Pizza Component with a component type is required',
				);
			recipe.add(new RecipeLine(component.sku, requested.defaultQuantity));
			counts.set(
				component.componentType.value,
				(counts.get(component.componentType.value) ?? 0) + 1,
			);
		}

		const configured = await this.types.findAll();

		for (const type of configured) {
			if (!type.cardinality.isSatisfiedBy(counts.get(type.name.value) ?? 0))
				throw new UnprocessableEntityException(
					`Invalid number of components for type ${type.name.value}`,
				);
		}

		for (const name of counts.keys()) {
			if (!configured.some((type) => type.name.value === name))
				throw new UnprocessableEntityException('Component type is not configured');
		}

		const pizzas = dto.availableSizes.map((size) =>
			PredefinedPizza.create({
				id: new PredefinedPizzaId(sku, PizzaSizeName.create(size)),
				recipeName: dto.recipeName.trim(),
				recipe,
			}),
		);
		if (replace) await this.repository.save(pizzas, { replace: true });
		else await this.repository.save(pizzas);
		return this.toDTO(pizzas);
	}

	async findAll(): Promise<PredefinedPizzaResponseDTO[]> {
		// Each returned item describes one aggregate; a create request may create several size variants atomically.
		const pizzas = await this.repository.findAll();
		const supported = await this.repository.findSupportedSizesForProducts(
			pizzas.map((pizza) => pizza.id.pizzaSku),
		);
		return Promise.all(
			pizzas.map((pizza) => this.toDTO([pizza], supported.get(pizza.id.pizzaSku.value) ?? [])),
		);
	}

	async findById(sku: string, size?: string): Promise<PredefinedPizzaResponseDTO> {
		const productSku = Sku.create(sku);
		const pizza = size
			? await this.repository.findById(
					new PredefinedPizzaId(productSku, PizzaSizeName.create(size)),
				)
			: null;
		const pizzas = size ? (pizza ? [pizza] : []) : await this.repository.findByProduct(productSku);
		if (!pizzas.length) throw new NotFoundException('Predefined pizza not found');
		return this.toDTO(pizzas);
	}

	private async toDTO(
		pizzas: PredefinedPizza[],
		supportedSizes?: PizzaSizeName[],
	): Promise<PredefinedPizzaResponseDTO> {
		const supported =
			supportedSizes ?? (await this.repository.findSupportedSizes(pizzas[0].id.pizzaSku));
		return {
			ids: pizzas.map((pizza) => ({
				pizzaSku: pizza.id.pizzaSku.value,
				pizzaSize: pizza.id.pizzaSize.value,
			})),
			pizzaSku: pizzas[0].id.pizzaSku.value,
			recipeName: pizzas[0].recipeName,
			defaultRecipeLines: [...pizzas[0].recipe].map((line) => ({
				componentSku: line.componentSku.value,
				defaultQuantity: line.defaultQuantity,
			})),
			supportedSizes: pizzas
				.map((pizza) => pizza.id.pizzaSize.value)
				.filter((size) => supported.some((name) => name.value === size)),
		};
	}
}
