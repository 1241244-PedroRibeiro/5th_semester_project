import { Check, Column, Entity, Index, OneToMany, OneToOne, PrimaryColumn, Relation, Unique } from 'typeorm';
import { CustomerEntity } from './CustomerEntity';
import { UserDietaryRestrictionEntity } from './UserDietaryRestrictionEntity';
import { UserRoleAssignmentEntity } from './UserRoleAssignmentEntity';

@Entity('users')
@Unique('users_email_key', ['email'])
@Check('users_first_name_check', `length(btrim(first_name)) > 0`)
@Check('users_last_name_check', `length(btrim(last_name)) > 0`)
@Check('users_status_check', `status IN ('ACTIVE', 'DEACTIVATED', 'PENDING_REGISTRATION')`)
@Index('idx_users_name', ['last_name', 'first_name'])
// Baseline SQL manages this index on LOWER(email).
@Index('idx_users_email_lower', { synchronize: false })
export class UserEntity {
	@PrimaryColumn('varchar')
	username!: string;

	@Column('varchar', { length: 75 })
	first_name!: string;

	@Column('varchar', { length: 75 })
	last_name!: string;

	@Column('varchar')
	email!: string;

	@Column('varchar', { nullable: true })
	password_hash!: string | null;

	@Column('varchar', { nullable: true })
	external_idp_subject!: string | null;

	@Column('varchar', { nullable: true })
	street!: string | null;

	@Column('varchar', { nullable: true })
	postal_code!: string | null;

	@Column('varchar', { nullable: true })
	city!: string | null;

	@Column('varchar', { nullable: true })
	extra_details!: string | null;

	@Column('varchar', { nullable: true })
	phone_number!: string | null;

	@Column('varchar', { default: 'ACTIVE' })
	status!: string;

	@Column('timestamptz', { default: () => 'NOW()' })
	created_at!: Date;

	@Column('timestamptz', { default: () => 'NOW()' })
	updated_at!: Date;

	@OneToMany(() => UserRoleAssignmentEntity, value => value.user, { cascade: false, eager: false })
	roleAssignments!: Relation<UserRoleAssignmentEntity[]>;

	@OneToOne(() => CustomerEntity, value => value.user, { cascade: false, eager: false })
	customer!: Relation<CustomerEntity>;

	@OneToMany(() => UserDietaryRestrictionEntity, value => value.user, { cascade: false, eager: false })
	dietaryRestrictions!: Relation<UserDietaryRestrictionEntity[]>;
}
