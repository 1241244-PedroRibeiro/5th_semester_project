import { Check, Column, Entity, Index, JoinColumn, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn, Relation, Unique } from 'typeorm';
import { CustomerOrderEntity } from './CustomerOrderEntity';
import { PersonalizedPizzaSnapshotEntity } from './PersonalizedPizzaSnapshotEntity';
import { PreparationActivityEntity } from './PreparationActivityEntity';
import { ProductEntity } from './ProductEntity';

@Entity('order_items')
@Unique('order_items_order_id_line_number_key', ['order_id', 'line_number'])
@Check('order_items_line_number_check', `line_number > 0`)
@Check('order_items_item_type_check', `item_type IN ('STANDARD_PRODUCT', 'PERSONALIZED_PIZZA')`)
@Check('order_items_quantity_check', `quantity > 0`)
@Check('order_items_unit_price_check', `unit_price >= 0`)
@Check('order_items_fulfillment_status_check', `fulfillment_status IN ('WAITING_PREPARATION', 'BEING_PREPARED', 'READY_TO_SERVE', 'SERVED')`)
@Index('idx_order_items_product', ['catalogue_product_sku'])
export class OrderItemEntity {
	@PrimaryGeneratedColumn('uuid')
	id!: string;

	@Column('uuid')
	order_id!: string;

	@Column('integer')
	line_number!: number;

	@Column('varchar')
	item_type!: string;

	@Column('varchar', { nullable: true })
	catalogue_product_sku!: string | null;

	@Column('integer')
	quantity!: number;

	@Column('numeric')
	unit_price!: string;

	@Column('varchar')
	currency!: string;

	@Column('varchar')
	fulfillment_status!: string;

	@ManyToOne(() => CustomerOrderEntity, value => value.items, { onDelete: 'CASCADE', nullable: false, cascade: false, eager: false })
	@JoinColumn({ name: 'order_id', referencedColumnName: 'id', foreignKeyConstraintName: 'order_items_order_id_fkey' })
	order!: Relation<CustomerOrderEntity>;

	@ManyToOne(() => ProductEntity, value => value.orderItems, { onDelete: 'RESTRICT', nullable: true, cascade: false, eager: false })
	@JoinColumn({ name: 'catalogue_product_sku', referencedColumnName: 'sku', foreignKeyConstraintName: 'order_items_catalogue_product_sku_fkey' })
	product!: Relation<ProductEntity> | null;

	@OneToOne(() => PersonalizedPizzaSnapshotEntity, value => value.orderItem, { cascade: false, eager: false })
	snapshot!: Relation<PersonalizedPizzaSnapshotEntity>;

	@OneToMany(() => PreparationActivityEntity, value => value.orderItem, { cascade: false, eager: false })
	activities!: Relation<PreparationActivityEntity[]>;
}
