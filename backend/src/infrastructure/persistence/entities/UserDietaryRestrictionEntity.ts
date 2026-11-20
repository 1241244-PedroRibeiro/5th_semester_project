import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn, Relation } from 'typeorm';
import { AllergenEntity } from './AllergenEntity';
import { UserEntity } from './UserEntity';

@Entity('user_dietary_restrictions')
@Index('idx_user_dietary_allergen', ['allergen_name'])
export class UserDietaryRestrictionEntity {
	@PrimaryColumn('varchar')
	username!: string;

	@PrimaryColumn('varchar')
	allergen_name!: string;

	@Column('timestamptz', { default: () => 'NOW()' })
	recorded_at!: Date;

	@ManyToOne(() => UserEntity, value => value.dietaryRestrictions, { onDelete: 'CASCADE', nullable: false, cascade: false, eager: false })
	@JoinColumn({ name: 'username', referencedColumnName: 'username', foreignKeyConstraintName: 'user_dietary_restrictions_username_fkey' })
	user!: Relation<UserEntity>;

	@ManyToOne(() => AllergenEntity, value => value.dietaryRestrictions, { onDelete: 'RESTRICT', nullable: false, cascade: false, eager: false })
	@JoinColumn({ name: 'allergen_name', referencedColumnName: 'name', foreignKeyConstraintName: 'user_dietary_restrictions_allergen_name_fkey' })
	allergen!: Relation<AllergenEntity>;
}
