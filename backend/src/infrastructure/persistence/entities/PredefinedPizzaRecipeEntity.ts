import { Check, Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn, Relation } from 'typeorm';
import { PredefinedPizzaEntity } from './PredefinedPizzaEntity';
import { ProductEntity } from './ProductEntity';

@Entity('predefined_pizza_recipes')
@Check('predefined_pizza_recipes_default_quantity_check', `default_quantity > 0`)
@Index('idx_pizza_recipes_component', ['component_product_sku'])
export class PredefinedPizzaRecipeEntity {
	@PrimaryColumn('varchar')
	pizza_sku!: string;

	@PrimaryColumn('varchar')
	component_product_sku!: string;

	@Column('integer')
	default_quantity!: number;

	@ManyToOne(() => PredefinedPizzaEntity, value => value.recipe, { onDelete: 'CASCADE', nullable: false, cascade: false, eager: false })
	@JoinColumn({ name: 'pizza_sku', referencedColumnName: 'sku', foreignKeyConstraintName: 'predefined_pizza_recipes_pizza_sku_fkey' })
	pizza!: Relation<PredefinedPizzaEntity>;

	@ManyToOne(() => ProductEntity, value => value.recipeUsages, { onDelete: 'RESTRICT', nullable: false, cascade: false, eager: false })
	@JoinColumn({ name: 'component_product_sku', referencedColumnName: 'sku', foreignKeyConstraintName: 'predefined_pizza_recipes_component_product_sku_fkey' })
	component!: Relation<ProductEntity>;
}
