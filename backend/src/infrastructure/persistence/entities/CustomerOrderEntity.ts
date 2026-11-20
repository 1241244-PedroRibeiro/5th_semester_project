import { Check, Column, Entity, Index, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, Relation } from 'typeorm';
import { CustomerEntity } from './CustomerEntity';
import { OrderItemEntity } from './OrderItemEntity';
import { PreparationActivityEntity } from './PreparationActivityEntity';

@Entity('customer_orders')
@Check('customer_orders_status_check', `status IN ('SIMULATED', 'PLACED', 'CONFIRMED', 'IN_PREPARATION', 'READY', 'DELIVERED', 'CANCELLED')`)
@Check('customer_orders_total_amount_check', `total_amount >= 0`)
@Index('idx_orders_customer', ['customer_email'])
export class CustomerOrderEntity {
	@PrimaryGeneratedColumn('uuid')
	id!: string;

	@Column('varchar', { nullable: true })
	customer_email!: string | null;

	@Column('timestamptz')
	order_placement_time!: Date;

	@Column('varchar')
	status!: string;

	@Column('numeric')
	total_amount!: string;

	@Column('varchar')
	currency!: string;

	@ManyToOne(() => CustomerEntity, value => value.orders, { onDelete: 'RESTRICT', onUpdate: 'CASCADE', nullable: true, cascade: false, eager: false })
	@JoinColumn({ name: 'customer_email', referencedColumnName: 'email', foreignKeyConstraintName: 'customer_orders_customer_email_fkey' })
	customer!: Relation<CustomerEntity> | null;

	@OneToMany(() => OrderItemEntity, value => value.order, { cascade: false, eager: false })
	items!: Relation<OrderItemEntity[]>;

	@OneToMany(() => PreparationActivityEntity, value => value.order, { cascade: false, eager: false })
	activities!: Relation<PreparationActivityEntity[]>;
}
