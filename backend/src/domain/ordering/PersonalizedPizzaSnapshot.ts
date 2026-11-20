import { PredefinedPizzaId } from '../pizza/PredefinedPizzaId';
import { PizzaSizeName } from '../pizza/PizzaSizeName';
import { Money } from '../common/Money';
import { AllergenName } from '../allergen/AllergenName';
import { SnapshotComponent } from './SnapshotComponent';
import { DomainError } from '../common/DomainError';

export interface PersonalizedPizzaSnapshotProps {
	sourcePredefinedPizzaId?: PredefinedPizzaId;
	chosenSize: PizzaSizeName;
	computedPrice: Money;
	allergens: Set<AllergenName>;
	components: SnapshotComponent[];
}

export class PersonalizedPizzaSnapshot {
	private readonly props: PersonalizedPizzaSnapshotProps;
	constructor(props: PersonalizedPizzaSnapshotProps) {
		if (!props.components.length) throw new DomainError('Pizza snapshot must contain at least one component');
		const allergens = new Map([...props.allergens].map(allergen => [allergen.value, allergen]));
		this.props = { ...props, allergens: new Set(allergens.values()), components: [...props.components] };
	}
	get sourcePredefinedPizzaId(): PredefinedPizzaId | undefined { return this.props.sourcePredefinedPizzaId; }
	get chosenSize(): PizzaSizeName { return this.props.chosenSize; }
	get computedPrice(): Money { return this.props.computedPrice; }
	get allergens(): Set<AllergenName> { return new Set(this.props.allergens); }
	get components(): SnapshotComponent[] { return [...this.props.components]; }
	equals(other?: PersonalizedPizzaSnapshot): boolean {
		return !!other
			&& (this.sourcePredefinedPizzaId === undefined ? other.sourcePredefinedPizzaId === undefined : this.sourcePredefinedPizzaId.equals(other.sourcePredefinedPizzaId))
			&& this.chosenSize.equals(other.chosenSize)
			&& this.computedPrice.equals(other.computedPrice)
			&& this.props.allergens.size === other.props.allergens.size
			&& [...this.props.allergens].every(allergen => [...other.props.allergens].some(entry => entry.equals(allergen)))
			&& this.props.components.length === other.props.components.length
			&& this.props.components.every((component, index) => component.equals(other.props.components[index]));
	}
}
