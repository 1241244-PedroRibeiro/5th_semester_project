import { Check, Column, Entity, OneToMany, PrimaryGeneratedColumn, Relation } from 'typeorm';
import { PreparationActivityEntity } from './PreparationActivityEntity';

@Entity('kitchen_resources')
@Check('kitchen_resources_capacity_slots_check', `capacity_slots >= 0`)
export class KitchenResourceEntity {
	@PrimaryGeneratedColumn('uuid')
	id!: string;

	@Column('varchar')
	name!: string;

	@Column('varchar')
	resource_type!: string;

	@Column('integer')
	capacity_slots!: number;

	@Column('boolean', { default: true })
	operational!: boolean;

	@OneToMany(() => PreparationActivityEntity, value => value.resource, { cascade: false, eager: false })
	activities!: Relation<PreparationActivityEntity[]>;
}
