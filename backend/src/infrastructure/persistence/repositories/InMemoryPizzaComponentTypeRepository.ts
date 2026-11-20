import { PizzaComponentType } from '../../../domain/pizza/pizza-component-type/PizzaComponentType';
import { PizzaComponentTypeRepository } from '../../../domain/pizza/pizza-component-type/PizzaComponentTypeRepository';
import { AssemblyOrder, ComponentTypeName } from '../../../domain/pizza/pizza-component-type/valueObjects';
import { PizzaComponentTypeConflictError, PizzaComponentTypeInUseError } from '../../../domain/pizza/pizza-component-type/PizzaComponentTypeErrors';
import { IProductRepository } from '../../../application/product/IProductRepository';
import { cardinalityFromStorage } from '../mappers/CardinalityMap';
import { createPage, Page, PageRequest } from '../../../domain/common/Pagination';

export class InMemoryPizzaComponentTypeRepository implements PizzaComponentTypeRepository {
	private readonly types = new Map<string, PizzaComponentType>();
	constructor(private readonly products?: IProductRepository, seed = false) {
		if (seed) for (const [name, order, minimum, maximum] of [['Base Dough', 1, 1, 1], ['Base Sauce', 2, 0, 1], ['Cheese', 3, 0, 1], ['Topping', 4, 0, null]] as const) {
			const type = PizzaComponentType.create({ name: ComponentTypeName.create(name), assemblyOrder: AssemblyOrder.create(order).getValue(), cardinality: cardinalityFromStorage(minimum, maximum) });
			this.types.set(name, type);
		}
	}
	private copy(type: PizzaComponentType): PizzaComponentType { return PizzaComponentType.create({ name: type.name, assemblyOrder: type.assemblyOrder, cardinality: type.cardinality }); }
	async save(type: PizzaComponentType): Promise<void> {
		for (const existing of this.types.values()) if (!existing.name.equals(type.name) && (existing.name.value.toLowerCase() === type.name.value.toLowerCase() || existing.assemblyOrder.equals(type.assemblyOrder))) throw new PizzaComponentTypeConflictError();
		this.types.set(type.name.value, this.copy(type));
	}
	async findById(name: ComponentTypeName): Promise<PizzaComponentType | null> { return this.findByName(name); }
	async findByName(name: ComponentTypeName): Promise<PizzaComponentType | null> { const type = this.types.get(name.value); return type ? this.copy(type) : null; }
	async findAll(search = ''): Promise<PizzaComponentType[]> {
		return [...this.types.values()].filter(type => type.name.value.toLowerCase().includes(search.trim().toLowerCase()) || String(type.assemblyOrder.sequenceNumber) === search)
			.sort((a, b) => a.assemblyOrder.sequenceNumber - b.assemblyOrder.sequenceNumber).map(type => this.copy(type));
	}
	async findAllPaginated(page: PageRequest, search?: string): Promise<Page<PizzaComponentType>> {
		const types = await this.findAll(search);
		return createPage(types.slice(page.offset, page.offset + page.pageSize), types.length, page);
	}
	async isReferenced(name: ComponentTypeName): Promise<boolean> { return !!this.products && (await this.products.findAll({ componentTypeName: name })).length > 0; }
	async delete(name: ComponentTypeName): Promise<void> { if (await this.isReferenced(name)) throw new PizzaComponentTypeInUseError(); this.types.delete(name.value); }
}
