import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn, Relation } from 'typeorm';
import { UserEntity } from './UserEntity';

@Entity('auth_sessions')
@Index('idx_auth_sessions_expires_at', ['expires_at'])
export class AuthSessionEntity {
	@PrimaryColumn('uuid')
	id!: string;

	@Column('varchar')
	username!: string;

	@ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'username', foreignKeyConstraintName: 'auth_sessions_username_fkey' })
	user!: Relation<UserEntity>;

	@Column('timestamptz')
	expires_at!: Date;

	@Column('timestamptz', { nullable: true })
	revoked_at!: Date | null;

	@Column('varchar', { nullable: true })
	refresh_token_hash!: string | null;
}
