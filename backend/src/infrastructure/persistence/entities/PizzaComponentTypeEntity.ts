import { Check, Column, Entity, OneToMany, PrimaryColumn, Relation, Unique } from 'typeorm';
import { ProductEntity } from './ProductEntity';

@Entity('pizza_component_types')
@Unique('pizza_component_types_assembly_order_key', ['assembly_order'])
@Check('pizza_component_types_assembly_order_check', `assembly_order > 0`)
@Check('pizza_component_types_min_cardinality_check', `min_cardinality >= 0`)
@Check('pizza_component_types_check', `max_cardinality IS NULL OR max_cardinality >= min_cardinality`)
export class PizzaComponentTypeEntity {
	@PrimaryColumn('varchar')
	name!: string;

	@Column('integer')
	assembly_order!: number;

	@Column('integer', { default: 0 })
	min_cardinality!: number;

	@Column('integer', { nullable: true })
	max_cardinality!: number | null;

	@OneToMany(() => ProductEntity, value => value.componentType, { cascade: false, eager: false })
	products!: Relation<ProductEntity[]>;
}
