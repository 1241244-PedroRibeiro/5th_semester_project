import { PizzaComponentType } from '../../../domain/pizza/pizza-component-type/PizzaComponentType';
import { AssemblyOrder, ComponentTypeName } from '../../../domain/pizza/pizza-component-type/valueObjects';
import { cardinalityFromStorage } from './CardinalityMap';
export interface PizzaComponentTypePersistenceRow {
	name: string;
	assembly_order: number;
	min_cardinality: number;
	max_cardinality: number | null;
}
export class PizzaComponentTypeMap {
	static toDomain(row: PizzaComponentTypePersistenceRow): PizzaComponentType {
		return PizzaComponentType.create({ name: ComponentTypeName.create(row.name), assemblyOrder: AssemblyOrder.create(row.assembly_order).getValue(), cardinality: cardinalityFromStorage(row.min_cardinality, row.max_cardinality) });
	}
}
