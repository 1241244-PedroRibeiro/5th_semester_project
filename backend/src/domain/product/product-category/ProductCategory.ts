import { CategoryName } from './CategoryName';

export interface ProductCategoryProps {
	name: CategoryName;
	description: string;
}

export class ProductCategory {
	private constructor(private readonly props: ProductCategoryProps) {}

	static create(props: ProductCategoryProps): ProductCategory { return new ProductCategory({ ...props }); }
	static reconstitute(props: ProductCategoryProps): ProductCategory { return ProductCategory.create(props); }

	updateDescription(description: string): void { this.props.description = description; }

	equals(other?: ProductCategory | null): boolean { return !!other && this.name.equals(other.name); }

	get name(): CategoryName { return this.props.name; }
	get description(): string { return this.props.description; }
}
