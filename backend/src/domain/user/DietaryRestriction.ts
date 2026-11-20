import { AllergenName } from '../allergen/AllergenName';
import { Timestamp } from '../common/Timestamp';
import { ValueObject } from '../common/ValueObject';

export class DietaryRestriction extends ValueObject<{ allergenName: AllergenName; recordedAt: Timestamp }> {
	constructor(allergenName: AllergenName, recordedAt: Timestamp) { super({ allergenName, recordedAt }); }
	get allergenName(): AllergenName { return this.props.allergenName; }
	get recordedAt(): Timestamp { return this.props.recordedAt; }
}
