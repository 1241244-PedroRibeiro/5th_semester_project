import { Allergen } from '../../../domain/allergen/Allergen';
import { AllergenName } from '../../../domain/allergen/AllergenName';
export interface AllergenPersistenceRow {
	name: string;
	description: string | null;
}
export class AllergenMap {
	static toDomain(row: AllergenPersistenceRow): Allergen { return Allergen.create({ name: AllergenName.create(row.name), description: row.description ?? '' }); }
}
