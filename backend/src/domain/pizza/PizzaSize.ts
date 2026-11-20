import { PizzaSizeName } from './PizzaSizeName';

export interface PizzaSizeProps {
	name: PizzaSizeName;
	active: boolean;
}

export class PizzaSize {
	private constructor(private readonly props: PizzaSizeProps) {}
	static create(props: PizzaSizeProps): PizzaSize { return new PizzaSize({ ...props }); }

	activate(): void { this.props.active = true; }
	deactivate(): void { this.props.active = false; }
	changeName(name: PizzaSizeName): void { (this.props as { name: PizzaSizeName }).name = name; }

	get name(): PizzaSizeName { return this.props.name; }
	get active(): boolean { return this.props.active; }
}