import { Check, Column, Entity, Index, JoinColumn, OneToMany, OneToOne, PrimaryGeneratedColumn, Relation, Unique } from 'typeorm';
import { CustomerAddressEntity } from './CustomerAddressEntity';
import { CustomerOrderEntity } from './CustomerOrderEntity';
import { UserEntity } from './UserEntity';
import { CustomerDietaryRestrictionEntity } from './CustomerDietaryRestrictionEntity';

@Entity('customers')
@Unique('customers_username_key', ['username'])
@Check('customers_first_name_check', `length(btrim(first_name)) > 0`)
@Check('customers_last_name_check', `length(btrim(last_name)) > 0`)
@Index('idx_customers_name', ['last_name', 'first_name'])
@Index('idx_customers_phone', ['phone'])
@Index('uq_customers_email', ['email'], { unique: true })
// Baseline SQL manages this index on LOWER(email).
@Index('idx_customers_email', { synchronize: false })
export class CustomerEntity {
	@PrimaryGeneratedColumn('uuid')
	id!: string;

	@Column('varchar', { nullable: true })
	username!: string | null;

	@Column('varchar', { length: 75 })
	first_name!: string;

	@Column('varchar', { length: 75 })
	last_name!: string;

	@Column('varchar')
	phone!: string;

	@Column('varchar')
	email!: string;

	@Column('varchar', { nullable: true })
	vat_number!: string | null;

	@Column('boolean', { default: false })
	marketing_consent!: boolean;

	@Column('timestamptz', { default: () => 'NOW()' })
	consent_timestamp!: Date;

	@Column('timestamptz', { default: () => 'NOW()' })
	created_at!: Date;

	@Column('timestamptz', { default: () => 'NOW()' })
	updated_at!: Date;

	@OneToOne(() => UserEntity, value => value.customer, { onDelete: 'SET NULL', nullable: true, cascade: false, eager: false })
	@JoinColumn({ name: 'username', referencedColumnName: 'username', foreignKeyConstraintName: 'customers_username_fkey' })
	user!: Relation<UserEntity> | null;

	@OneToMany(() => CustomerAddressEntity, value => value.customer, { cascade: false, eager: false })
	addresses!: Relation<CustomerAddressEntity[]>;

	@OneToMany(() => CustomerDietaryRestrictionEntity, value => value.customer, { cascade: false, eager: false })
	dietaryRestrictions!: Relation<CustomerDietaryRestrictionEntity[]>;

	@OneToMany(() => CustomerOrderEntity, value => value.customer, { cascade: false, eager: false })
	orders!: Relation<CustomerOrderEntity[]>;
}
