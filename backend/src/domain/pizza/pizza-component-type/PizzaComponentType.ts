import { CardinalityBounds } from '../CardinalityBounds';
import { AssemblyOrder, ComponentTypeName } from './valueObjects';

export const irremovable_pizzas_component_types: readonly string[] = ["Base Dough", "Base Sauce", "Cheese", "Topping"];

export interface PizzaComponentTypeProps {
	name: ComponentTypeName;
	assemblyOrder: AssemblyOrder;
	cardinality: CardinalityBounds;
}

export class PizzaComponentType {
	private constructor(private readonly props: PizzaComponentTypeProps) {}

	static create(props: PizzaComponentTypeProps): PizzaComponentType { return new PizzaComponentType({ ...props }); }
	static reconstitute(props: PizzaComponentTypeProps): PizzaComponentType { return PizzaComponentType.create(props); }


	changeAssemblyOrder(assemblyOrder: AssemblyOrder): void { this.props.assemblyOrder = assemblyOrder; }
	changeCardinality(cardinality: CardinalityBounds): void { this.props.cardinality = cardinality; }
	equals(other?: PizzaComponentType | null): boolean { return !!other && this.name.equals(other.name); }

	get name(): ComponentTypeName { return this.props.name; }
	get assemblyOrder(): AssemblyOrder { return this.props.assemblyOrder; }
	get cardinality(): CardinalityBounds { return this.props.cardinality; }
}
