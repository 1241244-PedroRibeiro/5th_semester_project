import { Entity, Index, JoinColumn, ManyToOne, PrimaryColumn, Relation } from 'typeorm';
import { AllergenEntity } from './AllergenEntity';
import { PersonalizedPizzaSnapshotEntity } from './PersonalizedPizzaSnapshotEntity';

@Entity('pizza_snapshot_allergens')
@Index('idx_snapshot_allergens_allergen', ['allergen_name'])
export class PizzaSnapshotAllergenEntity {
	@PrimaryColumn('uuid')
	order_item_id!: string;

	@PrimaryColumn('varchar')
	allergen_name!: string;

	@ManyToOne(() => PersonalizedPizzaSnapshotEntity, value => value.allergens, { onDelete: 'CASCADE', nullable: false, cascade: false, eager: false })
	@JoinColumn({ name: 'order_item_id', referencedColumnName: 'order_item_id', foreignKeyConstraintName: 'pizza_snapshot_allergens_order_item_id_fkey' })
	snapshot!: Relation<PersonalizedPizzaSnapshotEntity>;

	@ManyToOne(() => AllergenEntity, value => value.snapshotAllergens, { onDelete: 'RESTRICT', nullable: false, cascade: false, eager: false })
	@JoinColumn({ name: 'allergen_name', referencedColumnName: 'name', foreignKeyConstraintName: 'pizza_snapshot_allergens_allergen_name_fkey' })
	allergen!: Relation<AllergenEntity>;
}
