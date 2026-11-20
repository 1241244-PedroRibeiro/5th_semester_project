import { Check, Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Relation } from 'typeorm';
import { UserEntity } from './UserEntity';
import { UserStatus } from '../../../domain/user/UserStatus';

@Entity('status_assignment')
@Check('status_assignment_status_check', "status IN ('ACTIVE', 'DEACTIVATED', 'PENDING_REGISTRATION')")
@Index('idx_status_assignment_from_timestamp', ['assigned_from', 'timestamp'])
@Index('idx_status_assignment_to_timestamp', ['assigned_to', 'timestamp'])
export class StatusAssignmentEntity {
	@PrimaryGeneratedColumn('increment', { type: 'bigint' })
	id!: string;

	@Column('varchar', { nullable: true })
	assigned_from!: string | null;

	@ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
	@JoinColumn({ name: 'assigned_from', referencedColumnName: 'username', foreignKeyConstraintName: 'fk_status_assignment_from' })
	assigner!: Relation<UserEntity> | null;

	@Column('varchar')
	status!: UserStatus;

	@Column('varchar')
	assigned_to!: string;

	@Column('timestamptz', { default: () => 'NOW()' })
	timestamp!: Date;
}
