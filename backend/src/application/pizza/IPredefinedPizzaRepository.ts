import { PredefinedPizza } from '../../domain/pizza/PredefinedPizza';
import { PredefinedPizzaId } from '../../domain/pizza/PredefinedPizzaId';
import { PizzaSizeName } from '../../domain/pizza/PizzaSizeName';
import { Sku } from '../../domain/product/Sku';
export const PREDEFINED_PIZZA_REPOSITORY = 'IPredefinedPizzaRepository';
export interface IPredefinedPizzaRepository {
	save(pizzas: PredefinedPizza[], options?: { replace: boolean }): Promise<void>;
	findSupportedSizes(sku: Sku): Promise<PizzaSizeName[]>;
	findSupportedSizesForProducts(skus: Sku[]): Promise<Map<string, PizzaSizeName[]>>;
	findAll(): Promise<PredefinedPizza[]>;
	findById(id: PredefinedPizzaId): Promise<PredefinedPizza | null>;
	findByProduct(sku: Sku): Promise<PredefinedPizza[]>;
}
