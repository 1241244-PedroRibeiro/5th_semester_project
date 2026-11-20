import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('role_change_logs')
@Index('idx_role_change_logs_target_changed_at', ['target_username', 'changed_at'])
export class RoleChangeLogEntity {
	@PrimaryGeneratedColumn('increment', { type: 'bigint' })
	id!: string;

	@Column('varchar')
	actor_username!: string;

	@Column('varchar')
	target_username!: string;

	@Column('jsonb')
	previous_roles!: string[];

	@Column('jsonb')
	new_roles!: string[];

	@Column('varchar', { nullable: true })
	reason!: string | null;

	@Column('timestamptz', { default: () => 'NOW()' })
	changed_at!: Date;
}
