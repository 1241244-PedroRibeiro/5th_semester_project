import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
import type { LoginBucket } from '../../../application/auth/ILoginAttemptStore';

@Entity('login_attempt_buckets')
@Index('idx_login_attempt_buckets_expiry', ['expiresAt'])
export class LoginAttemptBucketEntity {
	@PrimaryColumn('char', { length: 64 })
	key!: string;

	@Column('jsonb')
	state!: LoginBucket;

	@Column('timestamptz', { name: 'expires_at' })
	expiresAt!: Date;
}
