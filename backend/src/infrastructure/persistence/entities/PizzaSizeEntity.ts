import { Column, Entity, OneToMany, PrimaryColumn, Relation } from 'typeorm';
import { ComponentSizeConfigurationEntity } from './ComponentSizeConfigurationEntity';
import { PersonalizedPizzaSnapshotEntity } from './PersonalizedPizzaSnapshotEntity';
import { PredefinedPizzaAvailableSizeEntity } from './PredefinedPizzaAvailableSizeEntity';

@Entity('pizza_sizes')

export class PizzaSizeEntity {
	@PrimaryColumn('varchar')
	name!: string;

	@Column('boolean', { default: true })
	is_active!: boolean;

	@OneToMany(() => ComponentSizeConfigurationEntity, value => value.size, { cascade: false, eager: false })
	configurations!: Relation<ComponentSizeConfigurationEntity[]>;

	@OneToMany(() => PersonalizedPizzaSnapshotEntity, value => value.size, { cascade: false, eager: false })
	snapshots!: Relation<PersonalizedPizzaSnapshotEntity[]>;

	@OneToMany(() => PredefinedPizzaAvailableSizeEntity, value => value.size, { cascade: false, eager: false })
	availablePizzas!: Relation<PredefinedPizzaAvailableSizeEntity[]>;
}
