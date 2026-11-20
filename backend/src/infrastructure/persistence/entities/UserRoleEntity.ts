import { Entity, OneToMany, PrimaryColumn, Relation } from 'typeorm';
import { UserRoleAssignmentEntity } from './UserRoleAssignmentEntity';

@Entity('user_roles')

export class UserRoleEntity {
	@PrimaryColumn('varchar')
	name!: string;

	@OneToMany(() => UserRoleAssignmentEntity, value => value.role, { cascade: false, eager: false })
	assignments!: Relation<UserRoleAssignmentEntity[]>;
}
