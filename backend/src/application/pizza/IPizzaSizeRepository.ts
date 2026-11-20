import { PizzaSize } from '../../domain/pizza/PizzaSize';
import { PizzaSizeName } from '../../domain/pizza/PizzaSizeName';

export const PIZZA_SIZE_REPOSITORY = 'IPizzaSizeRepository';
export interface IPizzaSizeRepository {
	findByName(name: PizzaSizeName): Promise<PizzaSize | null>;
	findAll(search?: string): Promise<PizzaSize[]>;
	save(value: PizzaSize): Promise<void>;
	update(value: PizzaSize): Promise<void>;
	delete(name: PizzaSizeName): Promise<void>;
	isReferenced(name: PizzaSizeName): Promise<boolean>;
}
