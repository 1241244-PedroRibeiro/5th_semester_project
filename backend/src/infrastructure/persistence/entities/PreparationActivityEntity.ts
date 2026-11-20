import { Check, Column, Entity, Index, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, Relation } from 'typeorm';
import { ActivityDependencyEntity } from './ActivityDependencyEntity';
import { CustomerOrderEntity } from './CustomerOrderEntity';
import { KitchenResourceEntity } from './KitchenResourceEntity';
import { OrderItemEntity } from './OrderItemEntity';

@Entity('preparation_activities')
@Check('preparation_activities_expected_duration_seconds_check', `expected_duration_seconds >= 0`)
@Check('preparation_activities_status_check', `status IN ('WAITING', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED')`)
@Index('idx_preparation_activities_order', ['order_id', 'order_item_id'])
@Index('idx_preparation_activities_resource', ['allocated_resource_id'])
export class PreparationActivityEntity {
	@PrimaryGeneratedColumn('uuid')
	id!: string;

	@Column('uuid')
	order_id!: string;

	@Column('uuid')
	order_item_id!: string;

	@Column('varchar')
	activity_type!: string;

	@Column('integer')
	expected_duration_seconds!: number;

	@Column('varchar')
	status!: string;

	@Column('uuid', { nullable: true })
	allocated_resource_id!: string | null;

	@ManyToOne(() => CustomerOrderEntity, value => value.activities, { onDelete: 'RESTRICT', nullable: false, cascade: false, eager: false })
	@JoinColumn({ name: 'order_id', referencedColumnName: 'id', foreignKeyConstraintName: 'preparation_activities_order_id_fkey' })
	order!: Relation<CustomerOrderEntity>;

	@ManyToOne(() => OrderItemEntity, value => value.activities, { onDelete: 'RESTRICT', nullable: false, cascade: false, eager: false })
	@JoinColumn({ name: 'order_item_id', referencedColumnName: 'id', foreignKeyConstraintName: 'preparation_activities_order_item_id_fkey' })
	orderItem!: Relation<OrderItemEntity>;

	@ManyToOne(() => KitchenResourceEntity, value => value.activities, { onDelete: 'RESTRICT', nullable: true, cascade: false, eager: false })
	@JoinColumn({ name: 'allocated_resource_id', referencedColumnName: 'id', foreignKeyConstraintName: 'preparation_activities_allocated_resource_id_fkey' })
	resource!: Relation<KitchenResourceEntity> | null;

	@OneToMany(() => ActivityDependencyEntity, value => value.activity, { cascade: false, eager: false })
	dependencies!: Relation<ActivityDependencyEntity[]>;

	@OneToMany(() => ActivityDependencyEntity, value => value.prerequisite, { cascade: false, eager: false })
	dependents!: Relation<ActivityDependencyEntity[]>;
}
