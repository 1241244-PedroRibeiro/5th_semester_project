import { Entity, Index, JoinColumn, ManyToOne, PrimaryColumn, Relation } from 'typeorm';
import { UserEntity } from './UserEntity';
import { UserRoleEntity } from './UserRoleEntity';

@Entity('user_role_assignments')
@Index('idx_role_assignments_role', ['role_name'])
export class UserRoleAssignmentEntity {
	@PrimaryColumn('varchar')
	username!: string;

	@PrimaryColumn('varchar')
	role_name!: string;

	@ManyToOne(() => UserEntity, value => value.roleAssignments, { onDelete: 'CASCADE', nullable: false, cascade: false, eager: false })
	@JoinColumn({ name: 'username', referencedColumnName: 'username', foreignKeyConstraintName: 'user_role_assignments_username_fkey' })
	user!: Relation<UserEntity>;

	@ManyToOne(() => UserRoleEntity, value => value.assignments, { onDelete: 'RESTRICT', nullable: false, cascade: false, eager: false })
	@JoinColumn({ name: 'role_name', referencedColumnName: 'name', foreignKeyConstraintName: 'user_role_assignments_role_name_fkey' })
	role!: Relation<UserRoleEntity>;
}
