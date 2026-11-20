import { PizzaSize } from '../../../domain/pizza/PizzaSize';
import { PizzaSizeName } from '../../../domain/pizza/PizzaSizeName';
export interface PizzaSizePersistenceRow {
	name: string;
	is_active: boolean;
}
export class PizzaSizeMap {
	static toDomain(row: PizzaSizePersistenceRow): PizzaSize { return PizzaSize.create({ name: PizzaSizeName.create(row.name), active: row.is_active }); }
}
