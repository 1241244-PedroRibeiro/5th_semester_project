import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Relation } from 'typeorm';
import { UserEntity } from './UserEntity';

@Entity('unauthorized_attempts')
@Index('idx_unauthorized_attempts_user_timestamp', ['user', 'timestamp'])
export class UnauthorizedAttemptEntity {
	@PrimaryGeneratedColumn('increment', { type: 'bigint' })
	id!: string;

	@Column('varchar', { nullable: true })
	user!: string | null;

	@ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
	@JoinColumn({ name: 'user', foreignKeyConstraintName: 'fk_unauthorized_attempts_user' })
	account!: Relation<UserEntity> | null;

	@Column('timestamptz', { default: () => 'NOW()' })
	timestamp!: Date;

	@Column('text')
	endpoint!: string;
}
