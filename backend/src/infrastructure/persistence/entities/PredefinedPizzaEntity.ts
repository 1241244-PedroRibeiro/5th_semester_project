import { Column, Entity, JoinColumn, OneToMany, OneToOne, PrimaryColumn, Relation } from 'typeorm';
import { PersonalizedPizzaSnapshotEntity } from './PersonalizedPizzaSnapshotEntity';
import { PredefinedPizzaAvailableSizeEntity } from './PredefinedPizzaAvailableSizeEntity';
import { PredefinedPizzaRecipeEntity } from './PredefinedPizzaRecipeEntity';
import { ProductEntity } from './ProductEntity';

@Entity('predefined_pizzas')

export class PredefinedPizzaEntity {
	@PrimaryColumn('varchar')
	sku!: string;

	@Column('varchar')
	recipe_name!: string;

	@OneToOne(() => ProductEntity, value => value.predefinedPizza, { onDelete: 'RESTRICT', nullable: false, cascade: false, eager: false })
	@JoinColumn({ name: 'sku', referencedColumnName: 'sku', foreignKeyConstraintName: 'predefined_pizzas_sku_fkey' })
	product!: Relation<ProductEntity>;

	@OneToMany(() => PredefinedPizzaRecipeEntity, value => value.pizza, { cascade: false, eager: false })
	recipe!: Relation<PredefinedPizzaRecipeEntity[]>;

	@OneToMany(() => PersonalizedPizzaSnapshotEntity, value => value.sourcePizza, { cascade: false, eager: false })
	snapshots!: Relation<PersonalizedPizzaSnapshotEntity[]>;

	@OneToMany(() => PredefinedPizzaAvailableSizeEntity, value => value.pizza, { cascade: false, eager: false })
	availableSizes!: Relation<PredefinedPizzaAvailableSizeEntity[]>;
}
