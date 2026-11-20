import { Inject, Injectable } from '@nestjs/common';
import { DataSource, IsNull } from 'typeorm';
import { ConsumeRecoveryResult, IPasswordRecoveryStore, IssueRecoveryResult, RECOVERY_COOLDOWN_MS, RECOVERY_USABLE_MS } from '../../../application/auth/IPasswordRecoveryStore';
import { AuthSessionEntity } from '../entities/AuthSessionEntity';
import { PasswordRecoveryEntity } from '../entities/PasswordRecoveryEntity';
import { UserEntity } from '../entities/UserEntity';

@Injectable()
export class PostgresPasswordRecoveryStore implements IPasswordRecoveryStore {
	constructor(@Inject(DataSource) private readonly source: DataSource) {}

	async issue(email: string, codeHash: string, deliver: (recipient: string) => Promise<void>): Promise<IssueRecoveryResult> {
		return this.source.transaction(async manager => {
			// Serialize issue/reset operations for this account across API instances.
			const account = await manager.getRepository(UserEntity).createQueryBuilder('account')
				.where('LOWER(account.email) = :email', { email }).setLock('pessimistic_write').getOne();
			if (!account || account.status !== 'ACTIVE') return { status: 'ACCOUNT_UNAVAILABLE' };
			const previous = await manager.findOne(PasswordRecoveryEntity, { where: { email: account.email }, order: { timestamp: 'DESC' } });
			const now = new Date();
			const remaining = previous ? previous.timestamp.getTime() + RECOVERY_COOLDOWN_MS - now.getTime() : 0;
			if (remaining > 0) return { status: 'COOLDOWN', retryAfterSeconds: Math.ceil(remaining / 1000) };
			await manager.insert(PasswordRecoveryEntity, { email: account.email, recovery_code: codeHash, timestamp: now, status: 'PENDING' });
			// Failed SMTP submission rolls back the record, so the account can retry.
			await deliver(account.email);
			return { status: 'SENT' };
		});
	}

	async consume(codeHash: string, hashPassword: () => Promise<string>): Promise<ConsumeRecoveryResult> {
		return this.source.transaction(async manager => {
			const lookup = await manager.findOneBy(PasswordRecoveryEntity, { recovery_code: codeHash });
			if (!lookup) return 'INVALID';
			const account = await manager.getRepository(UserEntity).createQueryBuilder('account')
				.where('account.email = :email', { email: lookup.email }).setLock('pessimistic_write').getOne();
			if (!account || account.status !== 'ACTIVE') return 'ACCOUNT_UNAVAILABLE';
			const recovery = await manager.findOne(PasswordRecoveryEntity, { where: { recovery_code: codeHash }, lock: { mode: 'pessimistic_write' } });
			if (!recovery) return 'INVALID';
			if (recovery.status === 'USED') return 'USED';
			const now = new Date();
			if (now.getTime() < recovery.timestamp.getTime() || now.getTime() - recovery.timestamp.getTime() >= RECOVERY_USABLE_MS) return 'EXPIRED';
			const passwordHash = await hashPassword();
			await manager.update(UserEntity, { username: account.username }, { password_hash: passwordHash, updated_at: now });
			await manager.update(PasswordRecoveryEntity, { recovery_code: codeHash }, { status: 'USED' });
			await manager.update(AuthSessionEntity, { username: account.username, revoked_at: IsNull() }, { revoked_at: now });
			return 'UPDATED';
		});
	}
}
