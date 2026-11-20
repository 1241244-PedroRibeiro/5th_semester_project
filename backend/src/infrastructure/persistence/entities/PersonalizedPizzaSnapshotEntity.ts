import { Check, Column, Entity, JoinColumn, ManyToOne, OneToMany, OneToOne, PrimaryColumn, Relation } from 'typeorm';
import { OrderItemEntity } from './OrderItemEntity';
import { PizzaSizeEntity } from './PizzaSizeEntity';
import { PizzaSnapshotAllergenEntity } from './PizzaSnapshotAllergenEntity';
import { PizzaSnapshotComponentEntity } from './PizzaSnapshotComponentEntity';
import { PredefinedPizzaEntity } from './PredefinedPizzaEntity';

@Entity('personalized_pizza_snapshots')
@Check('personalized_pizza_snapshots_computed_price_check', `computed_price >= 0`)
export class PersonalizedPizzaSnapshotEntity {
	@PrimaryColumn('uuid')
	order_item_id!: string;

	@Column('varchar', { nullable: true })
	source_predefined_pizza_sku!: string | null;

	@Column('varchar')
	chosen_pizza_size!: string;

	@Column('numeric')
	computed_price!: string;

	@Column('varchar')
	currency!: string;

	@OneToOne(() => OrderItemEntity, value => value.snapshot, { onDelete: 'CASCADE', nullable: false, cascade: false, eager: false })
	@JoinColumn({ name: 'order_item_id', referencedColumnName: 'id', foreignKeyConstraintName: 'personalized_pizza_snapshots_order_item_id_fkey' })
	orderItem!: Relation<OrderItemEntity>;

	@ManyToOne(() => PredefinedPizzaEntity, value => value.snapshots, { onDelete: 'RESTRICT', nullable: true, cascade: false, eager: false })
	@JoinColumn({ name: 'source_predefined_pizza_sku', referencedColumnName: 'sku', foreignKeyConstraintName: 'personalized_pizza_snapshots_source_predefined_pizza_sku_fkey' })
	sourcePizza!: Relation<PredefinedPizzaEntity> | null;

	@ManyToOne(() => PizzaSizeEntity, value => value.snapshots, { onDelete: 'RESTRICT', nullable: false, cascade: false, eager: false })
	@JoinColumn({ name: 'chosen_pizza_size', referencedColumnName: 'name', foreignKeyConstraintName: 'personalized_pizza_snapshots_chosen_pizza_size_fkey' })
	size!: Relation<PizzaSizeEntity>;

	@OneToMany(() => PizzaSnapshotComponentEntity, value => value.snapshot, { cascade: false, eager: false })
	components!: Relation<PizzaSnapshotComponentEntity[]>;

	@OneToMany(() => PizzaSnapshotAllergenEntity, value => value.snapshot, { cascade: false, eager: false })
	allergens!: Relation<PizzaSnapshotAllergenEntity[]>;
}
