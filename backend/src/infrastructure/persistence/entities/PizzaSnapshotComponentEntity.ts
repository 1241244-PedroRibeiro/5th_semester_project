import { Check, Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn, Relation } from 'typeorm';
import { PersonalizedPizzaSnapshotEntity } from './PersonalizedPizzaSnapshotEntity';
import { ProductEntity } from './ProductEntity';

@Entity('pizza_snapshot_components')
@Check('pizza_snapshot_components_quantity_check', `quantity > 0`)
@Index('idx_snapshot_components_product', ['component_product_sku'])
export class PizzaSnapshotComponentEntity {
	@PrimaryColumn('uuid')
	order_item_id!: string;

	@PrimaryColumn('varchar')
	component_product_sku!: string;

	@Column('integer')
	quantity!: number;

	@ManyToOne(() => PersonalizedPizzaSnapshotEntity, value => value.components, { onDelete: 'CASCADE', nullable: false, cascade: false, eager: false })
	@JoinColumn({ name: 'order_item_id', referencedColumnName: 'order_item_id', foreignKeyConstraintName: 'pizza_snapshot_components_order_item_id_fkey' })
	snapshot!: Relation<PersonalizedPizzaSnapshotEntity>;

	@ManyToOne(() => ProductEntity, value => value.snapshotComponents, { onDelete: 'RESTRICT', nullable: false, cascade: false, eager: false })
	@JoinColumn({ name: 'component_product_sku', referencedColumnName: 'sku', foreignKeyConstraintName: 'pizza_snapshot_components_component_product_sku_fkey' })
	product!: Relation<ProductEntity>;
}
