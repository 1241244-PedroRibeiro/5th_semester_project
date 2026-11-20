import { AllergenName } from './AllergenName';

export interface AllergenProps {
	name: AllergenName;
	description: string;
}

export class Allergen {
	private constructor(private readonly props: AllergenProps) {}

	static create(props: AllergenProps): Allergen { return new Allergen({ ...props }); }

	updateDescription(description: string): void { this.props.description = description; }

	get name(): AllergenName { return this.props.name; }
	get description(): string { return this.props.description; }
}
