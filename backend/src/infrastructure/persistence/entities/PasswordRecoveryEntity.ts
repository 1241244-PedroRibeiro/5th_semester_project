import { Check, Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn, Relation } from 'typeorm';
import { UserEntity } from './UserEntity';

@Entity('password_recovery')
@Check('password_recovery_status_check', `status IN ('PENDING', 'USED')`)
@Index('idx_password_recovery_email_timestamp', ['email', 'timestamp'])
export class PasswordRecoveryEntity {
	/** SHA-256 digest of the code delivered by email, never the raw credential. */
	@PrimaryColumn('varchar', { length: 64 })
	recovery_code!: string;

	@Column('varchar')
	email!: string;

	@ManyToOne(() => UserEntity, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
	@JoinColumn({ name: 'email', referencedColumnName: 'email', foreignKeyConstraintName: 'fk_password_recovery_email' })
	account!: Relation<UserEntity>;

	@Column('timestamptz', { default: () => 'NOW()' })
	timestamp!: Date;

	@Column('varchar', { default: 'PENDING' })
	status!: 'PENDING' | 'USED';
}
