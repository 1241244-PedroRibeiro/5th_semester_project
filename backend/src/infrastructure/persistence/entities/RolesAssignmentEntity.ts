import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Relation } from 'typeorm';
import { UserEntity } from './UserEntity';
import { UserRoleEntity } from './UserRoleEntity';

@Entity('roles_assignment')
@Index('idx_roles_assignment_from_timestamp', ['assigned_from', 'timestamp'])
@Index('idx_roles_assignment_to_timestamp', ['assigned_to', 'timestamp'])
export class RolesAssignmentEntity {
	@PrimaryGeneratedColumn('increment', { type: 'bigint' })
	id!: string;

	@Column('varchar')
	assigned_from!: string;

	@ManyToOne(() => UserEntity, { nullable: false, onDelete: 'RESTRICT' })
	@JoinColumn({ name: 'assigned_from', referencedColumnName: 'username', foreignKeyConstraintName: 'fk_roles_assignment_from' })
	assigner!: Relation<UserEntity>;

	@Column('varchar')
	role!: string;

	@ManyToOne(() => UserRoleEntity, { nullable: false, onDelete: 'RESTRICT' })
	@JoinColumn({ name: 'role', referencedColumnName: 'name', foreignKeyConstraintName: 'fk_roles_assignment_role' })
	assignedRole!: Relation<UserRoleEntity>;

	/** Historical recipient email; later account/email changes do not rewrite history. */
	@Column('varchar')
	assigned_to!: string;

	@Column('timestamptz', { default: () => 'NOW()' })
	timestamp!: Date;
}
