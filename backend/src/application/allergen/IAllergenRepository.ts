import { Allergen } from '../../domain/allergen/Allergen';
import { AllergenName } from '../../domain/allergen/AllergenName';

export interface IAllergenRepository {
	findByName(name: AllergenName): Promise<Allergen | null>;
	findAll(search?: string): Promise<Allergen[]>;
	save(value: Allergen): Promise<void>;
	update(value: Allergen): Promise<void>;
	delete(name: AllergenName): Promise<void>;
	isReferenced(name: AllergenName): Promise<boolean>;
}
