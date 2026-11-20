import { Column, Entity, OneToMany, PrimaryColumn, Relation } from 'typeorm';
import { PizzaSnapshotAllergenEntity } from './PizzaSnapshotAllergenEntity';
import { ProductAllergenEntity } from './ProductAllergenEntity';
import { UserDietaryRestrictionEntity } from './UserDietaryRestrictionEntity';

@Entity('allergens')

export class AllergenEntity {
	@PrimaryColumn('varchar')
	name!: string;

	@Column('text', { default: '' })
	description!: string;

	@OneToMany(() => UserDietaryRestrictionEntity, value => value.allergen, { cascade: false, eager: false })
	dietaryRestrictions!: Relation<UserDietaryRestrictionEntity[]>;

	@OneToMany(() => ProductAllergenEntity, value => value.allergen, { cascade: false, eager: false })
	productAssignments!: Relation<ProductAllergenEntity[]>;

	@OneToMany(() => PizzaSnapshotAllergenEntity, value => value.allergen, { cascade: false, eager: false })
	snapshotAllergens!: Relation<PizzaSnapshotAllergenEntity[]>;
}
