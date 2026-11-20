import { Entity, Index, JoinColumn, ManyToOne, PrimaryColumn, Relation } from 'typeorm';
import { PreparationActivityEntity } from './PreparationActivityEntity';

@Entity('activity_dependencies')
@Index('idx_activity_dependencies_prerequisite', ['depends_on_activity_id'])
export class ActivityDependencyEntity {
	@PrimaryColumn('uuid')
	activity_id!: string;

	@PrimaryColumn('uuid')
	depends_on_activity_id!: string;

	@ManyToOne(() => PreparationActivityEntity, value => value.dependencies, { onDelete: 'CASCADE', nullable: false, cascade: false, eager: false })
	@JoinColumn({ name: 'activity_id', referencedColumnName: 'id', foreignKeyConstraintName: 'activity_dependencies_activity_id_fkey' })
	activity!: Relation<PreparationActivityEntity>;

	@ManyToOne(() => PreparationActivityEntity, value => value.dependents, { onDelete: 'RESTRICT', nullable: false, cascade: false, eager: false })
	@JoinColumn({ name: 'depends_on_activity_id', referencedColumnName: 'id', foreignKeyConstraintName: 'activity_dependencies_depends_on_activity_id_fkey' })
	prerequisite!: Relation<PreparationActivityEntity>;
}
