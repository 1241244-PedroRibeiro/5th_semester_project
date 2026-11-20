import { PredefinedPizzaId } from './PredefinedPizzaId';
import { RecipeLine } from './RecipeLine';
import { Sku } from '../product/Sku';
import { DomainError } from '../common/DomainError';

export interface PredefinedPizzaProps {
	id: PredefinedPizzaId;
	recipeName: string;
	recipe: Set<RecipeLine>;
}

export class PredefinedPizza {
	private constructor(private readonly props: PredefinedPizzaProps) {}
	static create(props: PredefinedPizzaProps): PredefinedPizza {
		if (!props.recipe.size)
			throw new DomainError('Recipe must contain at least one line');
		if (new Set([...props.recipe].map(line => line.componentSku.value)).size !== props.recipe.size)
			throw new DomainError('Recipe component identities must be unique');

		return new PredefinedPizza({ ...props, recipe: new Set(props.recipe) });
	}

	addRecipeLine(componentSku: Sku, quantity: number): void {
		if ([...this.props.recipe].some(line => line.componentSku.equals(componentSku))) throw new DomainError('Component already exists in recipe');
		this.props.recipe.add(new RecipeLine(componentSku, quantity));
	}

	removeRecipeLine(componentSku: Sku): void {
		const line = [...this.props.recipe].find(entry => entry.componentSku.equals(componentSku));

		if (!line)
			return;
		if (this.props.recipe.size === 1)
			throw new DomainError('Cannot remove the last recipe line');

		this.props.recipe.delete(line);
	}

	changeQuantity(componentSku: Sku, quantity: number): void {
		const line = [...this.props.recipe].find(entry => entry.componentSku.equals(componentSku));

		if (!line)
			throw new DomainError('Component does not exist in recipe');

		const replacement = new RecipeLine(componentSku, quantity);
		this.props.recipe.delete(line);
		this.props.recipe.add(replacement);
	}

	get id(): PredefinedPizzaId { return this.props.id; }
	get recipeName(): string { return this.props.recipeName; }
	get recipe(): Set<RecipeLine> { return new Set(this.props.recipe); }
}
