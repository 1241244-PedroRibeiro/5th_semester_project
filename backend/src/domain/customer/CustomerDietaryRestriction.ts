import { Timestamp } from '../common/Timestamp';
import { AllergenName } from '../allergen/AllergenName';

export class CustomerDietaryRestriction {
	constructor(
		public readonly allergenName: AllergenName,
		public readonly description: string,
		public readonly recordedAt: Timestamp,
	) {
		Object.freeze(this);
	}
}
