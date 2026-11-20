import { IPizzaSizeRepository } from '../../../application/pizza/IPizzaSizeRepository';
import { PizzaSize } from '../../../domain/pizza/PizzaSize';
import { PizzaSizeName } from '../../../domain/pizza/PizzaSizeName';

export class InMemoryPizzaSizeRepository implements IPizzaSizeRepository {
	private readonly store = new Map<string, PizzaSize>();
	async findByName(name: PizzaSizeName): Promise<PizzaSize | null> { return this.store.get(name.value) ?? null; }
	async findAll(search = ''): Promise<PizzaSize[]> { return [...this.store.values()].filter(value => value.name.value.toLowerCase().includes(search.toLowerCase())); }
	async save(value: PizzaSize): Promise<void> { this.store.set(value.name.value, value); }
	async update(value: PizzaSize): Promise<void> { await this.save(value); }
	async delete(name: PizzaSizeName): Promise<void> { this.store.delete(name.value); }
	async isReferenced(name: PizzaSizeName): Promise<boolean> { return false; }
}
