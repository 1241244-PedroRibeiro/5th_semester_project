import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn, Relation } from 'typeorm';
import { AllergenEntity } from './AllergenEntity';
import { CustomerEntity } from './CustomerEntity';

@Entity('customer_dietary_restrictions')
@Index('idx_customer_dietary_allergen', ['allergen_name'])
export class CustomerDietaryRestrictionEntity {
	@PrimaryColumn('varchar')
	customer_email!: string;

	@PrimaryColumn('varchar')
	allergen_name!: string;

	@Column('text', { default: '' })
	description!: string;

	@Column('timestamptz', { default: () => 'NOW()' })
	recorded_at!: Date;

	@ManyToOne(() => CustomerEntity, value => value.dietaryRestrictions, { onDelete: 'CASCADE', onUpdate: 'CASCADE', nullable: false, cascade: false, eager: false })
	@JoinColumn({ name: 'customer_email', referencedColumnName: 'email', foreignKeyConstraintName: 'customer_dietary_restrictions_customer_email_fkey' })
	customer!: Relation<CustomerEntity>;

	@ManyToOne(() => AllergenEntity, { onDelete: 'RESTRICT', nullable: false, cascade: false, eager: false })
	@JoinColumn({ name: 'allergen_name', referencedColumnName: 'name', foreignKeyConstraintName: 'customer_dietary_restrictions_allergen_name_fkey' })
	allergen!: Relation<AllergenEntity>;
}
