import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Relation } from 'typeorm';
import { CustomerEntity } from './CustomerEntity';

@Entity('customer_addresses')
@Index('uq_customer_default_address', ['customer_email'], { unique: true, where: 'is_default' })
export class CustomerAddressEntity {
	@PrimaryGeneratedColumn('uuid')
	id!: string;

	@Column('varchar')
	customer_email!: string;

	@Column('varchar')
	street!: string;

	@Column('varchar')
	postal_code!: string;

	@Column('varchar')
	city!: string;

	@Column('varchar', { default: '' })
	extra_details!: string;

	@Column('boolean', { default: false })
	is_default!: boolean;

	@ManyToOne(() => CustomerEntity, value => value.addresses, { onDelete: 'CASCADE', onUpdate: 'CASCADE', nullable: false, cascade: false, eager: false })
	@JoinColumn({ name: 'customer_email', referencedColumnName: 'email', foreignKeyConstraintName: 'customer_addresses_customer_email_fkey' })
	customer!: Relation<CustomerEntity>;
}
